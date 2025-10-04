import { getAccessToken } from "@/lib/actions/auth";
import axiosInstance from "@/lib/axios";

export default async function deleteQueryForm({
  tenantId,
  documentId,
}: {
  tenantId: string;
  documentId: string;
}) {
  const headers = await getAuthHeader();
  const { data: queryForm } = await axiosInstance.get<{
    data: { media?: null | { id: number; size: number }[] };
  }>(`/query-forms/${documentId}`, {
    params: {
      "filters[tenent_id][$eq]": tenantId,
      populate: ["media"],
      "fields[0]": "id",
    },
    headers,
  });

  const totalMediaSize =
    queryForm.data.media?.reduce((a, b) => a + b.size, 0) || 0;

  const deletionPromises: Promise<any>[] = [
    axiosInstance.delete(`/query-forms/${documentId}`, { headers }),
    increaseUserResources({ tenantId, freedResourceSize: totalMediaSize }),
    ...(queryForm.data.media || []).map((media) => deleteMedia(media.id)),
  ];

  await Promise.all(deletionPromises);

  return;
}

async function deleteMedia(id: number) {
  const headers = await getAuthHeader();
  return await axiosInstance.delete(`/upload/files/${id}`, { headers });
}

async function increaseUserResources({
  freedResourceSize,
  tenantId,
}: {
  tenantId: string;
  freedResourceSize: number;
}) {
  if (freedResourceSize <= 0) return;
  const headers = await getAuthHeader();
  const { data: userResources } = await axiosInstance.get<{
    data: { used_storage: number; documentId: string }[];
  }>("/user-resources", {
    params: {
      "filters[tenent_id][$eq]": tenantId,
      "pagination[pageSize]": 1,
    },
    headers,
  });

  if (!userResources || userResources.data.length < 1) return;

  const userResource = userResources.data[0];
  const newUsedResourceSize = Math.max(
    0,
    userResource.used_storage - freedResourceSize
  );

  return await axiosInstance.put(
    `/user-resources/${userResource.documentId}`,
    {
      data: {
        used_storage: newUsedResourceSize,
      },
    },
    { headers }
  );
}

async function getAuthHeader() {
  const token = await getAccessToken();
  if (!token) throw new Error("Authentication token not found.");

  return { Authorization: `Bearer ${token}` };
}

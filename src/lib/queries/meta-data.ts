
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
  getMetaDataEntries,
  createMetaDataEntry,
  getMetaDataEntry,
  updateMetaDataEntry,
  deleteMetaDataEntry,
  type GetMetaDataEntriesParams,
} from "@/lib/services/meta-data";
import type { MetaData, CreateMetaDataPayload } from "@/types/meta-data";
import type { FindMany } from "@/types/strapi_response";
import { useCurrentUser } from "./user";

export interface UseGetMetaDataEntriesOptions {
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortOrder?: "asc" | "desc";
  handleFilter?: string | null;
}

export const META_DATA_ENTRIES_QUERY_KEY = (
  metaFormatDocumentId: string,
  userTenentId?: string,
  options?: UseGetMetaDataEntriesOptions
) => [
  "metaDataEntries",
  metaFormatDocumentId,
  userTenentId || "all",
  options?.page,
  options?.pageSize,
  options?.sortField,
  options?.sortOrder,
  options?.handleFilter,
];

export const META_DATA_ENTRY_DETAIL_QUERY_KEY = (
  documentId?: string,
  userTenentId?: string
) => ["metaDataEntry", documentId || "detail", userTenentId || "all"];

const getDefaultMetaDataEntries = (pageSize?: number) => ({
  data: [],
  meta: {
    pagination: {
      page: 1,
      pageSize: pageSize || 10,
      pageCount: 0,
      total: 0,
    },
  },
});

export function useGetMetaDataEntries(
  metaFormatDocumentId: string,
  options?: UseGetMetaDataEntriesOptions
) {
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const userTenentId = currentUser?.tenent_id;
  const { page, pageSize, sortField, sortOrder, handleFilter } = options || {};

  return useQuery<FindMany<MetaData>, Error>({
    queryKey: META_DATA_ENTRIES_QUERY_KEY(metaFormatDocumentId, userTenentId, {
      page,
      pageSize,
      sortField,
      sortOrder,
      handleFilter,
    }),
    queryFn: async () => {
      if (!userTenentId) {
        console.warn(
          "useGetMetaDataEntries: User tenent_id not available. Returning empty array."
        );
        return getDefaultMetaDataEntries(pageSize);
      }
      if (!metaFormatDocumentId) {
        console.warn(
          "useGetMetaDataEntries: metaFormatDocumentId not available. Returning empty array."
        );
        return getDefaultMetaDataEntries(pageSize);
      }
      const params: GetMetaDataEntriesParams = {
        metaFormatDocumentId,
        userTenentId,
        page,
        pageSize,
        sortField,
        sortOrder,
        handleFilter,
      };
      return await getMetaDataEntries(params);
    },
    enabled: !!userTenentId && !!metaFormatDocumentId && !isLoadingUser,
  });
}

export function useCreateMetaDataEntry(id?: number) {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  return useMutation<MetaData, Error, CreateMetaDataPayload>({
    mutationFn: (payload) => {
      if (!id) throw new Error("Empty <id> of the form being filled.");
      if (!currentUser?.tenent_id) {
        throw new Error(
          "User tenent_id is not available. Cannot create MetaData entry."
        );
      }
      return createMetaDataEntry({
        ...payload,
        tenent_id: currentUser.tenent_id,
        user: currentUser.id,
        meta_format: id,
      });
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Success",
        description: "MetaData entry created successfully.",
      });

      // Get documentId from the populated meta_format relation in the response
      const metaFormatDocId =
        typeof data.meta_format === "object" && data.meta_format?.documentId
          ? data.meta_format.documentId
          : null;

      if (metaFormatDocId) {
        console.log(
          `[useCreateMetaDataEntry] Success. Invalidating entries for metaFormatDocId: ${metaFormatDocId}`
        );
        queryClient.invalidateQueries({
          queryKey: META_DATA_ENTRIES_QUERY_KEY(
            metaFormatDocId,
            currentUser?.tenent_id
          ),
        });
      } else {
        console.warn(
          "Created MetaData entry, but metaFormat.documentId was not found in the response. Invalidating entries generically.",
          data
        );
        queryClient.invalidateQueries({ queryKey: ["metaDataEntries"] });
      }
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error Creating MetaData",
        description: error.message,
      });
    },
  });
}

export function useGetMetaDataEntry(documentId: string | null) {
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const userTenentId = currentUser?.tenent_id;

  return useQuery<MetaData | null, Error>({
    queryKey: META_DATA_ENTRY_DETAIL_QUERY_KEY(
      documentId ?? undefined,
      userTenentId
    ),
    queryFn: () => {
      if (!documentId || !userTenentId) return null;
      return getMetaDataEntry(documentId, userTenentId);
    },
    enabled: !!documentId && !!userTenentId && !isLoadingUser,
  });
}

export function useUpdateMetaDataEntry() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  return useMutation<
    MetaData,
    Error,
    {
      documentId: string;
      payload: Partial<
        Omit<CreateMetaDataPayload, "meta_format" | "tenent_id">
      >;
    }
  >({
    mutationFn: ({ documentId, payload }) => {
      if (!currentUser?.tenent_id) {
        throw new Error(
          "User tenent_id is not available. Cannot update MetaData entry."
        );
      }
      return updateMetaDataEntry(documentId, payload, currentUser.tenent_id);
    },
    onSuccess: (data) => {
      // `data` here is the response from updateMetaDataEntry
      toast({
        title: "Success",
        description: "MetaData entry updated successfully.",
      });
      // meta_format should be populated in the response 'data' by the service
      const metaFormatDocId =
        typeof data.meta_format === "object" && data.meta_format?.documentId
          ? data.meta_format.documentId
          : null;

      if (metaFormatDocId) {
        queryClient.invalidateQueries({
          queryKey: [
            "metaDataEntries",
            metaFormatDocId,
            currentUser?.tenent_id,
          ],
        });
      } else {
        console.warn(
          "Updated MetaData entry is missing meta_format.documentId from response. Invalidating entries generically.",
          data
        );
        queryClient.invalidateQueries({ queryKey: ["metaDataEntries"] });
      }
      // Invalidate the specific detail query for the updated entry
      if (data.documentId) {
        queryClient.invalidateQueries({
          queryKey: META_DATA_ENTRY_DETAIL_QUERY_KEY(
            data.documentId,
            currentUser?.tenent_id
          ),
        });
      }
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error Updating MetaData",
        description: error.message,
      });
    },
  });
}

export function useDeleteMetaDataEntry() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  return useMutation<
    MetaData | void,
    Error,
    { documentId: string; metaFormatDocumentId: string | null }
  >({
    mutationFn: ({ documentId }) => {
      if (!currentUser?.tenent_id) {
        throw new Error(
          "User tenent_id is not available. Cannot delete MetaData entry."
        );
      }
      return deleteMetaDataEntry(documentId, currentUser.tenent_id);
    },
    onSuccess: (data, variables) => {
      // `variables` is { documentId: string, metaFormatDocumentId: string | null }
      toast({
        title: "Success",
        description: "MetaData entry deleted successfully.",
      });
      if (variables.metaFormatDocumentId) {
        queryClient.invalidateQueries({
          queryKey: [
            "metaDataEntries",
            variables.metaFormatDocumentId,
            currentUser?.tenent_id,
          ],
        });
      } else {
        console.warn(
          "MetaData entry deleted but metaFormatDocumentId was not available for precise invalidation. Invalidating entries generically.",
          data,
          variables
        );
        queryClient.invalidateQueries({ queryKey: ["metaDataEntries"] });
      }
      // Remove the specific detail query for the deleted entry
      queryClient.removeQueries({
        queryKey: META_DATA_ENTRY_DETAIL_QUERY_KEY(
          variables.documentId,
          currentUser?.tenent_id
        ),
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error Deleting MetaData",
        description: error.message,
      });
    },
  });
}

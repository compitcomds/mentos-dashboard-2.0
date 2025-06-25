"use server";

import type { MetaData, CreateMetaDataPayload } from "@/types/meta-data";
import type { FindMany, FindOne } from "@/types/strapi_response";
import axiosInstance from "@/lib/axios";
import { getAccessToken } from "@/lib/actions/auth";
import { AxiosError } from "axios";

async function getAuthHeader() {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Authentication token not found.");
  }
  return { Authorization: `Bearer ${token}` };
}

export interface GetMetaDataEntriesParams {
  metaFormatDocumentId: string;
  userTenentId: string;
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortOrder?: "asc" | "desc";
  handleFilter?: string | null;
}

export const getMetaDataEntries = async (
  params: GetMetaDataEntriesParams
): Promise<FindMany<MetaData>> => {
  const {
    metaFormatDocumentId,
    userTenentId,
    page = 1,
    pageSize = 10,
    sortField = "createdAt",
    sortOrder = "desc",
    handleFilter,
  } = params;

  if (!metaFormatDocumentId || !userTenentId) {
    console.error(
      "[Service getMetaDataEntries]: metaFormatDocumentId or userTenentId is missing."
    );
    throw new Error("metaFormatDocumentId and userTenentId are required.");
  }

  const strapiParams: any = {
    "filters[meta_format][documentId][$eq]": metaFormatDocumentId,
    "filters[tenent_id][$eq]": userTenentId,
    populate: ["meta_format", "user"],
    "pagination[page]": page,
    "pagination[pageSize]": pageSize,
    "sort[0]": `${sortField}:${sortOrder}`,
  };

  if (handleFilter && handleFilter.trim() !== "") {
    strapiParams["filters[handle][$containsi]"] = handleFilter.trim();
  }

  const url = "/meta-datas";
  console.log(
    `[getMetaDataEntries] Fetching URL: ${url} with params:`,
    JSON.stringify(strapiParams)
  );

  try {
    const headers = await getAuthHeader();
    const response = await axiosInstance.get<FindMany<MetaData>>(url, {
      params: strapiParams,
      headers,
    });

    if (
      !response.data ||
      !response.data.data ||
      !Array.isArray(response.data.data) ||
      !response.data.meta?.pagination
    ) {
      console.error(
        `[getMetaDataEntries] Unexpected API response. Expected 'data' array and 'meta.pagination', received:`,
        response.data
      );
      if (
        response.data === null ||
        response.data === undefined ||
        (response.data && !response.data.data)
      ) {
        console.warn(
          `[getMetaDataEntries] API returned null, undefined, or no 'data' property. Returning empty result.`
        );
        return {
          data: [],
          meta: { pagination: { page: 1, pageSize, pageCount: 0, total: 0 } },
        };
      }
      throw new Error(
        'Unexpected API response structure. Expected an array within a "data" property and pagination metadata.'
      );
    }
    console.log(
      `[getMetaDataEntries] Fetched ${response.data.data.length} MetaData entries. Pagination:`,
      response.data.meta.pagination
    );
    return response.data;
  } catch (error: unknown) {
    let message = `Failed to fetch MetaData entries for MetaFormat ${metaFormatDocumentId}.`;
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const errorDataMessage =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        error.message;
      console.error(
        `[getMetaDataEntries] Failed from ${url} (${status}):`,
        error.response?.data
      );
      message = `(${status}) ${errorDataMessage || "Unknown API error"}`;
    } else if (error instanceof Error) {
      message = error.message;
    }
    console.error(`[getMetaDataEntries] Error: ${message}`, error);
    throw new Error(message);
  }
};

// Create a new MetaData entry
export const createMetaDataEntry = async (
  payload: CreateMetaDataPayload
): Promise<MetaData> => {
  const url = "/meta-datas";

  if (!payload.tenent_id) {
    throw new Error("User tenent_id is required in the payload.");
  }

  try {
    const headers = await getAuthHeader();
    console.log({ data: payload });
    const response = await axiosInstance.post<FindOne<MetaData>>(
      url,
      { data: payload },
      { headers }
    );
    if (!response.data || !response.data.data) {
      throw new Error(
        "Unexpected API response structure after creating MetaData entry."
      );
    }
    console.log(
      `[createMetaDataEntry] Created MetaData entry:`,
      response.data.data
    );
    return response.data.data;
    return {} as any;
  } catch (error: unknown) {
    let message = `Failed to create MetaData entry.`;
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const errorBody = error.response?.data?.error;
      const errorMessage =
        errorBody?.message || error.response?.data?.message || error.message;

      if (
        errorBody?.details?.errorCode === "DUPLICATE_ENTRY" &&
        errorBody?.details?.details?.handle
      ) {
        message = `DUPLICATE_HANDLE_ERROR: Handle '${errorBody.details.details.handle}' is already taken for this form type.`;
      } else {
        message = `API Error (Status ${
          status || "unknown"
        }): ${errorMessage}. ${
          errorBody?.details
            ? "Details: " + JSON.stringify(errorBody.details)
            : ""
        }`;
      }
      console.error(
        `[createMetaDataEntry] Failed to create. Status: ${
          status || "unknown"
        } Body:`,
        error.response?.data
      );
    } else if (error instanceof Error) {
      message = error.message;
      console.error(
        `[createMetaDataEntry] Failed to create (Non-Axios Error):`,
        error
      );
    } else {
      console.error(
        `[createMetaDataEntry] Failed to create (Unknown Error):`,
        error
      );
    }
    throw new Error(message);
  }
};

// Get a single MetaData entry by its string documentId using filters
export const getMetaDataEntry = async (
  documentId: string,
  userTenentId: string
): Promise<MetaData | null> => {
  if (!documentId || !userTenentId) {
    console.warn(
      `[Service getMetaDataEntry]: documentId ('${documentId}') or userTenentId ('${userTenentId}') is missing.`
    );
    return null;
  }

  const params = {
    "filters[documentId][$eq]": documentId,
    "filters[tenent_id][$eq]": userTenentId,
    populate: ["meta_format", "user"], // Ensure relations are populated
    "pagination[limit]": 1, // We only expect one entry
  };
  const url = `/meta-datas`; // Query the collection endpoint
  console.log(
    `[getMetaDataEntry] Fetching MetaData entry from ${url} with filters:`,
    JSON.stringify(params)
  );

  try {
    const headers = await getAuthHeader();
    const response = await axiosInstance.get<FindMany<MetaData>>(url, {
      headers,
      params,
    }); // Expect FindMany

    if (
      !response.data ||
      !response.data.data ||
      response.data.data.length === 0
    ) {
      console.warn(
        `[getMetaDataEntry] MetaData entry with documentId ${documentId} for tenent ${userTenentId} not found.`
      );
      return null;
    }

    const entry = response.data.data[0];
    // Double-check tenent_id consistency, although filter should handle it.
    if (entry.tenent_id !== userTenentId) {
      console.warn(
        `[getMetaDataEntry] Tenent ID mismatch for MetaData ${documentId}. Expected ${userTenentId}, got ${entry.tenent_id}. This indicates a filter logic issue or unexpected data.`
      );
      return null;
    }
    if (typeof entry.id !== "number") {
      console.error(
        `[getMetaDataEntry] Fetched MetaData entry for documentId ${documentId} is missing a numeric 'id'. Entry:`,
        entry
      );
      throw new Error(
        `Fetched MetaData entry for documentId ${documentId} is missing a numeric 'id'.`
      );
    }
    console.log(
      `[getMetaDataEntry] Successfully fetched MetaData entry for documentId ${documentId}:`,
      entry
    );
    return entry;
  } catch (error: unknown) {
    let message = `Failed to fetch MetaData entry with documentId ${documentId}.`;
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const errorDataMessage =
        error.response?.data?.error?.message || error.message; // Prefer error.message if specific API error is not present
      if (status === 404) {
        // This condition might not be hit if the filters return empty array instead of 404
        console.warn(
          `[getMetaDataEntry] MetaData entry ${documentId} not found (404 status).`
        );
        return null;
      }
      message = `API Error (${status}): ${errorDataMessage}`;
    } else if (error instanceof Error) {
      message = error.message;
    }
    console.error(
      `[getMetaDataEntry] Error fetching MetaData ${documentId}:`,
      message,
      error
    );
    throw new Error(message);
  }
};

// Update a MetaData entry
export const updateMetaDataEntry = async (
  stringDocumentId: string,
  payload: Partial<Omit<CreateMetaDataPayload, "meta_format" | "tenent_id">>,
  userTenentId: string
): Promise<MetaData> => {
  // Fetch the entry by documentId to get its numeric ID for the PUT request, if your API strictly requires numeric ID in path.
  // However, if your API is set up to handle string documentId in the path for updates (e.g., PUT /meta-datas/your-string-doc-id),
  // you can skip this fetch and use stringDocumentId directly.
  // For now, assuming the API might need a numeric ID for the path parameter of a PUT request.
  const existingEntry = await getMetaDataEntry(stringDocumentId, userTenentId);
  if (!existingEntry || typeof existingEntry.id !== "number") {
    throw new Error(
      `MetaData entry with documentId '${stringDocumentId}' not found or lacks a numeric ID for update.`
    );
  }
  const numericId = existingEntry.id;
  const url = `/meta-datas/${numericId}`; // Use numeric ID for the PUT request

  console.log(
    `[updateMetaDataEntry] Updating MetaData (numeric ID: ${numericId}, string docId: ${stringDocumentId}) with payload:`,
    { data: payload }
  );
  try {
    const headers = await getAuthHeader();
    const response = await axiosInstance.put<FindOne<MetaData>>(
      url,
      { data: payload },
      { headers, params: { populate: ["meta_format", "user"] } }
    );
    if (!response.data || !response.data.data) {
      throw new Error(
        "Unexpected API response structure after updating MetaData entry."
      );
    }
    return response.data.data;
  } catch (error: unknown) {
    let message = `Failed to update MetaData entry ${stringDocumentId}.`;
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const errorBody = error.response?.data?.error;
      const errorMessage =
        errorBody?.message || error.response?.data?.message || error.message;

      if (
        errorBody?.details?.errorCode === "DUPLICATE_ENTRY" &&
        errorBody?.details?.details?.handle
      ) {
        message = `DUPLICATE_HANDLE_ERROR: Handle '${errorBody.details.details.handle}' is already taken for this form type.`;
      } else {
        message = `API Error (Status ${
          status || "unknown"
        }): ${errorMessage}. ${
          errorBody?.details
            ? "Details: " + JSON.stringify(errorBody.details)
            : ""
        }`;
      }
      console.error(
        `[updateMetaDataEntry] Failed (${status || "unknown"}):`,
        error.response?.data
      );
    } else if (error instanceof Error) {
      message = error.message;
    }
    console.error(`[updateMetaDataEntry] Error: ${message}`, error);
    throw new Error(message);
  }
};

// Delete a MetaData entry using the string documentId directly in the path
export const deleteMetaDataEntry = async (
  documentId: string,
  userTenentId: string
): Promise<MetaData | void> => {
  if (!documentId) {
    throw new Error("Document ID is required to delete a MetaData entry.");
  }
  // userTenentId is important for auth context and query invalidation,
  // but the API path for deletion might just use the documentId.
  const url = `/meta-datas/${documentId}`; // Use string documentId directly in the URL

  console.log(
    `[deleteMetaDataEntry] Deleting MetaData entry (documentId: ${documentId})`
  );
  try {
    const headers = await getAuthHeader();
    const response = await axiosInstance.delete<FindOne<MetaData>>(url, {
      headers,
    });

    if (response.status === 200 && response.data?.data) {
      // If API returns the deleted object
      return response.data.data;
    } else if (response.status === 204) {
      // If API returns No Content on successful delete
      return;
    }
    // Handle other success statuses if necessary, or consider them unexpected
    console.warn(
      `[deleteMetaDataEntry] Unexpected success status ${response.status} when deleting ${documentId}. Data:`,
      response.data
    );
    throw new Error(
      `Failed to delete MetaData entry ${documentId}. Status: ${response.status}`
    );
  } catch (error: unknown) {
    let message = `Failed to delete MetaData entry ${documentId}.`;
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const errorDetails = error.response?.data?.error?.details;
      const errorMessage =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        error.message;

      if (status === 404) {
        message = `MetaData entry with documentId ${documentId} not found.`;
      } else {
        message = `API Error (Status ${
          status || "unknown"
        }): ${errorMessage}. ${
          errorDetails ? "Details: " + JSON.stringify(errorDetails) : ""
        }`;
      }
      console.error(
        `[deleteMetaDataEntry] Failed (Status ${status || "unknown"}):`,
        error.response?.data
      );
    } else if (error instanceof Error) {
      message = error.message;
    } else {
      console.error(`[deleteMetaDataEntry] Unknown Error:`, error);
    }
    throw new Error(message);
  }
};

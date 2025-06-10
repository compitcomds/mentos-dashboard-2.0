
'use server';

import type { MetaData, CreateMetaDataPayload } from "@/types/meta-data";
import type { FindMany, FindOne } from "@/types/strapi_response";
import axiosInstance from "@/lib/axios";
import { getAccessToken } from "@/lib/actions/auth";
import { AxiosError } from 'axios';
import { getMetaFormat } from './meta-format'; // Import the service to fetch MetaFormat

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
  sortOrder?: 'asc' | 'desc';
  handleFilter?: string | null;
}

// Fetch all MetaData entries for a specific MetaFormat and tenent_id
export const getMetaDataEntries = async (params: GetMetaDataEntriesParams): Promise<FindMany<MetaData>> => {
  const {
    metaFormatDocumentId,
    userTenentId,
    page = 1, // Default page
    pageSize = 10, // Default page size
    sortField = 'createdAt', // Default sort field
    sortOrder = 'desc', // Default sort order
    handleFilter,
  } = params;


  if (!metaFormatDocumentId || !userTenentId) {
    console.error('[Service getMetaDataEntries]: metaFormatDocumentId or userTenentId is missing.');
    throw new Error('metaFormatDocumentId and userTenentId are required.');
  }

  const strapiParams: any = {
    'filters[meta_format][documentId][$eq]': metaFormatDocumentId,
    'filters[tenent_id][$eq]': userTenentId,
    'populate': ['meta_format', 'user'],
    'pagination[page]': page,
    'pagination[pageSize]': pageSize,
    'sort[0]': `${sortField}:${sortOrder}`,
  };

  if (handleFilter && handleFilter.trim() !== "") {
    strapiParams['filters[handle][$containsi]'] = handleFilter.trim();
  }

  const url = '/meta-datas';
  console.log(`[getMetaDataEntries] Fetching URL: ${url} with params:`, JSON.stringify(strapiParams));

  try {
    const headers = await getAuthHeader();
    const response = await axiosInstance.get<FindMany<MetaData>>(url, { params: strapiParams, headers });

    if (!response.data || !response.data.data || !Array.isArray(response.data.data) || !response.data.meta?.pagination) {
      console.error(`[getMetaDataEntries] Unexpected API response. Expected 'data' array and 'meta.pagination', received:`, response.data);
       if (response.data === null || response.data === undefined || (response.data && !response.data.data)) {
         console.warn(`[getMetaDataEntries] API returned null, undefined, or no 'data' property. Returning empty result.`);
         return { data: [], meta: { pagination: { page: 1, pageSize, pageCount: 0, total: 0 } } };
       }
      throw new Error('Unexpected API response structure. Expected an array within a "data" property and pagination metadata.');
    }
    console.log(`[getMetaDataEntries] Fetched ${response.data.data.length} MetaData entries. Pagination:`, response.data.meta.pagination);
    return response.data;
  } catch (error: unknown) {
    let message = `Failed to fetch MetaData entries for MetaFormat ${metaFormatDocumentId}.`;
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const errorDataMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message;
      console.error(`[getMetaDataEntries] Failed from ${url} (${status}):`, error.response?.data);
      message = `(${status}) ${errorDataMessage || 'Unknown API error'}`;
    } else if (error instanceof Error) {
      message = error.message;
    }
    console.error(`[getMetaDataEntries] Error: ${message}`, error);
    throw new Error(message);
  }
};

// Create a new MetaData entry
export const createMetaDataEntry = async (payload: CreateMetaDataPayload): Promise<MetaData> => {
  const url = '/meta-datas';

  if (!payload.tenent_id) {
    throw new Error('User tenent_id is required in the payload.');
  }
  if (!payload.meta_format) { // payload.meta_format is the string documentId
    throw new Error('MetaFormat documentId is required in the payload.');
  }

  // Fetch the MetaFormat using its documentId to get its numeric ID
  const metaFormatEntry = await getMetaFormat(payload.meta_format, payload.tenent_id);
  if (!metaFormatEntry || typeof metaFormatEntry.id !== 'number') {
    throw new Error(`Could not find or resolve MetaFormat with documentId: ${payload.meta_format} for tenent_id: ${payload.tenent_id}`);
  }
  const numericMetaFormatId = metaFormatEntry.id;

  // Create the final payload for Strapi, replacing the string documentId with the numeric id
  const finalPayloadForStrapi = {
    ...payload,
    meta_format: numericMetaFormatId, // Use numeric ID for the relation
  };
  
  console.log(`[createMetaDataEntry] Creating MetaData entry with resolved numeric meta_format ID. Final payload for Strapi:`, { data: finalPayloadForStrapi });
  try {
    const headers = await getAuthHeader();
    const response = await axiosInstance.post<FindOne<MetaData>>(url, { data: finalPayloadForStrapi }, { headers, params: { populate: ['meta_format', 'user'] } });
    if (!response.data || !response.data.data) {
      throw new Error('Unexpected API response structure after creating MetaData entry.');
    }
    console.log(`[createMetaDataEntry] Created MetaData entry:`, response.data.data);
    return response.data.data;
  } catch (error: unknown) {
    let message = `Failed to create MetaData entry.`;
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const errorBody = error.response?.data?.error; // Strapi error object
      const errorMessage = errorBody?.message || error.response?.data?.message || error.message;
      
      if (errorBody?.details?.errorCode === 'DUPLICATE_ENTRY' && errorBody?.details?.details?.handle) {
        // Construct a specific message for duplicate handle errors
        message = `DUPLICATE_HANDLE_ERROR: Handle '${errorBody.details.details.handle}' is already taken for this form type.`;
      } else {
        message = `API Error (Status ${status || 'unknown'}): ${errorMessage}. ${errorBody?.details ? 'Details: ' + JSON.stringify(errorBody.details) : ''}`;
      }
      console.error(`[createMetaDataEntry] Failed to create. Status: ${status || 'unknown'} Body:`, error.response?.data);
    } else if (error instanceof Error) {
      message = error.message;
       console.error(`[createMetaDataEntry] Failed to create (Non-Axios Error):`, error);
    } else {
       console.error(`[createMetaDataEntry] Failed to create (Unknown Error):`, error);
    }
    throw new Error(message);
  }
};

// Get a single MetaData entry by its string documentId using filters
export const getMetaDataEntry = async (documentId: string, userTenentId: string): Promise<MetaData | null> => {
  if (!documentId || !userTenentId) {
      console.warn(`[Service getMetaDataEntry]: documentId or userTenentId is missing.`);
      return null;
  }
  
  const params = {
    'filters[documentId][$eq]': documentId,
    'filters[tenent_id][$eq]': userTenentId,
    'populate': ['meta_format', 'user'],
    'pagination[limit]': 1
  };
  const url = `/meta-datas`; // Fetch from the collection endpoint with filters
  console.log(`[getMetaDataEntry] Fetching MetaData entry from ${url} with filters:`, JSON.stringify(params));
  
  try {
    const headers = await getAuthHeader();
    const response = await axiosInstance.get<FindMany<MetaData>>(url, { headers, params });
    
    if (!response.data || !response.data.data || response.data.data.length === 0) {
      console.warn(`[getMetaDataEntry] MetaData entry with documentId ${documentId} for tenent ${userTenentId} not found.`);
      return null;
    }
    // The tenent_id check is implicitly handled by the filter, but good for sanity.
    if (response.data.data[0].tenent_id !== userTenentId) {
        console.warn(`[getMetaDataEntry] Tenent ID mismatch for MetaData ${documentId}. This should not happen with current filters.`);
        return null;
    }
    return response.data.data[0]; // Return the first (and should be only) item
  } catch (error: unknown) {
    let message = `Failed to fetch MetaData entry with documentId ${documentId}.`;
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const errorDataMessage = error.response?.data?.error?.message || error.message;
      if (status === 404) {
        console.warn(`[getMetaDataEntry] MetaData entry ${documentId} not found (404).`);
        return null; // Explicitly return null for not found
      }
      message = `API Error (${status}): ${errorDataMessage}`;
    } else if (error instanceof Error) {
      message = error.message;
    }
    console.error(`[getMetaDataEntry] Error fetching MetaData ${documentId}:`, message, error);
    // Depending on query hook needs, you might throw or return null
    // For get queries, often returning null is preferred if the item not being found isn't a critical app error.
    throw new Error(message); // Or return null;
  }
};


// Update a MetaData entry
export const updateMetaDataEntry = async (stringDocumentId: string, payload: Partial<Omit<CreateMetaDataPayload, 'meta_format' | 'tenent_id'>>, userTenentId: string): Promise<MetaData> => {
  // Fetch the entry using its stringDocumentId to get its numeric id
  const existingEntry = await getMetaDataEntry(stringDocumentId, userTenentId);
  if (!existingEntry || typeof existingEntry.id !== 'number') {
    throw new Error(`MetaData entry with documentId ${stringDocumentId} not found or lacks a numeric ID.`);
  }
  const numericId = existingEntry.id;
  const url = `/meta-datas/${numericId}`; // Use numeric ID for the PUT request

  console.log(`[updateMetaDataEntry] Updating MetaData (numeric ID: ${numericId}, string docId: ${stringDocumentId}) with payload:`, { data: payload });
  try {
    const headers = await getAuthHeader();
    const response = await axiosInstance.put<FindOne<MetaData>>(url, { data: payload }, { headers, params: { populate: ['meta_format', 'user'] } });
    if (!response.data || !response.data.data) {
      throw new Error('Unexpected API response structure after updating MetaData entry.');
    }
    return response.data.data;
  } catch (error: unknown) {
    let message = `Failed to update MetaData entry ${stringDocumentId}.`;
     if (error instanceof AxiosError) {
      const status = error.response?.status;
      const errorBody = error.response?.data?.error; // Strapi error object
      const errorMessage = errorBody?.message || error.response?.data?.message || error.message;
      
      if (errorBody?.details?.errorCode === 'DUPLICATE_ENTRY' && errorBody?.details?.details?.handle) {
        message = `DUPLICATE_HANDLE_ERROR: Handle '${errorBody.details.details.handle}' is already taken for this form type.`;
      } else {
        message = `API Error (Status ${status || 'unknown'}): ${errorMessage}. ${errorBody?.details ? 'Details: ' + JSON.stringify(errorBody.details) : ''}`;
      }
      console.error(`[updateMetaDataEntry] Failed (${status || 'unknown'}):`, error.response?.data);
    } else if (error instanceof Error) {
      message = error.message;
    }
    console.error(`[updateMetaDataEntry] Error: ${message}`, error);
    throw new Error(message);
  }
};

// Delete a MetaData entry
export const deleteMetaDataEntry = async (documentId: string, userTenentId: string): Promise<MetaData | void> => {
  // Fetch the entry using its stringDocumentId to get its numeric id for deletion URL
  const existingEntry = await getMetaDataEntry(documentId, userTenentId);
  if (!existingEntry || typeof existingEntry.id !== 'number') {
    throw new Error(`MetaData entry with documentId ${documentId} not found or lacks a numeric ID for deletion.`);
  }
  const numericId = existingEntry.id;
  const url = `/meta-datas/${numericId}`; // Use numeric ID for the DELETE request

  console.log(`[deleteMetaDataEntry] Deleting MetaData entry (numeric ID: ${numericId}, string docId: ${documentId})`);
  try {
    const headers = await getAuthHeader();
    const response = await axiosInstance.delete<FindOne<MetaData>>(url, { headers });
     if (response.status === 200 && response.data?.data) {
      return response.data.data;
    } else if (response.status === 204) {
      return;
    }
    throw new Error(`Failed to delete MetaData entry ${documentId}. Status: ${response.status}`);
  } catch (error: unknown) {
    let message = `Failed to delete MetaData entry ${documentId}.`;
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const errorDetails = error.response?.data?.error?.details;
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message;
      message = `API Error (Status ${status || 'unknown'}): ${errorMessage}. ${errorDetails ? 'Details: ' + JSON.stringify(errorDetails) : ''}`;
      console.error(`[deleteMetaDataEntry] Failed (${status || 'unknown'}):`, error.response?.data);
    } else if (error instanceof Error) {
      message = error.message;
    }
    console.error(`[deleteMetaDataEntry] Error: ${message}`, error);
    throw new Error(message);
  }
};

    
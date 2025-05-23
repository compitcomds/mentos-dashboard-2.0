
'use server';

import type { MetaData, CreateMetaDataPayload } from "@/types/meta-data";
import type { FindMany, FindOne } from "@/types/strapi_response";
import axiosInstance from "@/lib/axios";
import { getAccessToken } from "@/lib/actions/auth";
import { AxiosError } from 'axios';

async function getAuthHeader() {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Authentication token not found.");
  }
  return { Authorization: `Bearer ${token}` };
}

// Fetch all MetaData entries for a specific MetaFormat and tenent_id
export const getMetaDataEntries = async (metaFormatDocumentId: string, userTenentId: string): Promise<MetaData[]> => {
  if (!metaFormatDocumentId || !userTenentId) {
    console.error('[Service getMetaDataEntries]: metaFormatDocumentId or userTenentId is missing.');
    throw new Error('metaFormatDocumentId and userTenentId are required.');
  }
  const params = {
    'filters[meta_format][documentId][$eq]': metaFormatDocumentId,
    'filters[tenent_id][$eq]': userTenentId,
    'populate': ['meta_format', 'user'], // Populate relations
    'sort[0]': 'createdAt:desc',
  };
  const url = '/meta-datas';
  console.log(`[getMetaDataEntries] Fetching URL: ${url} with params:`, params);

  try {
    const headers = await getAuthHeader();
    const response = await axiosInstance.get<FindMany<MetaData>>(url, { params, headers });

    if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
      console.error(`[getMetaDataEntries] Unexpected API response. Expected 'data' array, received:`, response.data);
      return [];
    }
    console.log(`[getMetaDataEntries] Fetched ${response.data.data.length} MetaData entries.`);
    return response.data.data;
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
  console.log(`[createMetaDataEntry] Creating MetaData entry with payload:`, { data: payload });
  try {
    const headers = await getAuthHeader();
    const response = await axiosInstance.post<FindOne<MetaData>>(url, { data: payload }, { headers, params: { populate: ['meta_format', 'user'] } });
    if (!response.data || !response.data.data) {
      throw new Error('Unexpected API response structure after creating MetaData entry.');
    }
    console.log(`[createMetaDataEntry] Created MetaData entry:`, response.data.data);
    return response.data.data;
  } catch (error: unknown) {
    let message = `Failed to create MetaData entry.`;
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const errorDetails = error.response?.data?.error?.details;
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message;
      message = `API Error (Status ${status}): ${errorMessage}. ${errorDetails ? 'Details: ' + JSON.stringify(errorDetails) : ''}`;
      console.error(`[createMetaDataEntry] Failed (${status}):`, error.response?.data);
    } else if (error instanceof Error) {
      message = error.message;
    }
    console.error(`[createMetaDataEntry] Error: ${message}`, error);
    throw new Error(message);
  }
};

// Get a single MetaData entry by its documentId
export const getMetaDataEntry = async (documentId: string, userTenentId: string): Promise<MetaData | null> => {
  if (!documentId || !userTenentId) return null;
  const url = `/meta-datas/${documentId}`;
  console.log(`[getMetaDataEntry] Fetching MetaData entry from ${url}`);
  try {
    const headers = await getAuthHeader();
    const response = await axiosInstance.get<FindOne<MetaData>>(url, { headers, params: { populate: ['meta_format', 'user'] } });
    if (!response.data || !response.data.data) return null;
    if (response.data.data.tenent_id !== userTenentId) {
      console.warn(`[getMetaDataEntry] Tenent ID mismatch for MetaData ${documentId}.`);
      return null;
    }
    return response.data.data;
  } catch (error: unknown) {
    console.error(`[getMetaDataEntry] Error fetching MetaData ${documentId}:`, error);
    return null;
  }
};

// Update a MetaData entry
export const updateMetaDataEntry = async (documentId: string, payload: Partial<Omit<CreateMetaDataPayload, 'meta_format' | 'tenent_id'>>, userTenentId: string): Promise<MetaData> => {
  const url = `/meta-datas/${documentId}`;
  console.log(`[updateMetaDataEntry] Updating MetaData ${documentId} with payload:`, { data: payload });
  try {
    const headers = await getAuthHeader();
    // Pre-check ownership (optional, backend should enforce)
    const existingEntry = await getMetaDataEntry(documentId, userTenentId);
    if (!existingEntry) throw new Error(`MetaData entry ${documentId} not found or not authorized for update.`);

    const response = await axiosInstance.put<FindOne<MetaData>>(url, { data: payload }, { headers, params: { populate: ['meta_format', 'user'] } });
    if (!response.data || !response.data.data) {
      throw new Error('Unexpected API response structure after updating MetaData entry.');
    }
    return response.data.data;
  } catch (error: unknown) {
    let message = `Failed to update MetaData entry ${documentId}.`;
     if (error instanceof AxiosError) {
      const status = error.response?.status;
      const errorDetails = error.response?.data?.error?.details;
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message;
      message = `API Error (Status ${status}): ${errorMessage}. ${errorDetails ? 'Details: ' + JSON.stringify(errorDetails) : ''}`;
      console.error(`[updateMetaDataEntry] Failed (${status}):`, error.response?.data);
    } else if (error instanceof Error) {
      message = error.message;
    }
    console.error(`[updateMetaDataEntry] Error: ${message}`, error);
    throw new Error(message);
  }
};

// Delete a MetaData entry
export const deleteMetaDataEntry = async (documentId: string, userTenentId: string): Promise<MetaData | void> => {
  const url = `/meta-datas/${documentId}`;
  console.log(`[deleteMetaDataEntry] Deleting MetaData entry ${documentId}`);
  try {
    const headers = await getAuthHeader();
    // Pre-check ownership (optional, backend should enforce)
    const existingEntry = await getMetaDataEntry(documentId, userTenentId);
    if (!existingEntry) throw new Error(`MetaData entry ${documentId} not found or not authorized for deletion.`);
    
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
      message = `API Error (Status ${status}): ${errorMessage}. ${errorDetails ? 'Details: ' + JSON.stringify(errorDetails) : ''}`;
      console.error(`[deleteMetaDataEntry] Failed (${status}):`, error.response?.data);
    } else if (error instanceof Error) {
      message = error.message;
    }
    console.error(`[deleteMetaDataEntry] Error: ${message}`, error);
    throw new Error(message);
  }
};

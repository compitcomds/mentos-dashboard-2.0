
'use server';

import type { MetaFormat } from "@/types/meta-format";
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

export const getMetaFormats = async (userTenentId: string): Promise<MetaFormat[]> => {
  if (!userTenentId) {
    console.error('[Service getMetaFormats]: userTenentId is missing.');
    throw new Error('User tenent_id is required to fetch meta formats.');
  }
  const params = {
    'filters[tenent_id][$eq]': userTenentId,
    'populate': ['user', 'from_formate', 'from_formate.Values', 'from_formate.media'], // Populate deeply
  };
  const url = '/meta-formats';
  console.log(`[getMetaFormats] Fetching URL: ${url} with params:`, params);
  try {
    const headers = await getAuthHeader();
    const response = await axiosInstance.get<FindMany<MetaFormat>>(url, { params, headers });

    if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
      console.error(`[getMetaFormats] Unexpected API response structure for tenent_id ${userTenentId}. Expected 'data' array, received:`, response.data);
      return [];
    }
    console.log(`[getMetaFormats] Fetched ${response.data.data.length} Meta Formats for tenent_id ${userTenentId}.`);
    return response.data.data;
  } catch (error: unknown) {
    let message = `Failed to fetch meta formats for tenent_id ${userTenentId}.`;
    // Error handling similar to other services
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const errorDataMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message;
      console.error(`[getMetaFormats] Failed to fetch from ${url} (${status}):`, error.response?.data);
      message = `Failed to fetch meta formats (${status}) - ${errorDataMessage || 'Unknown API error'}`;
    } else if (error instanceof Error) {
      message = error.message;
    }
    console.error(`[getMetaFormats] Error: ${message}`, error);
    throw new Error(message);
  }
};

export const getMetaFormat = async (documentId: string, userTenentId: string): Promise<MetaFormat | null> => {
  if (!documentId) {
    console.warn(`[Service getMetaFormat]: documentId is missing.`);
    return null;
  }
  if (!userTenentId) {
    console.error(`[Service getMetaFormat]: userTenentId is missing for meta format documentId ${documentId}.`);
    throw new Error('User tenent_id is required to verify fetched meta format.');
  }
  const params = {
    'populate': ['user', 'from_formate', 'from_formate.Values', 'from_formate.media'], // Populate deeply
  };
  const url = `/meta-formats/${documentId}`;
  console.log(`[getMetaFormat] Fetching URL: ${url} for userTenentId ${userTenentId} with params:`, params);
  try {
    const headers = await getAuthHeader();
    const response = await axiosInstance.get<FindOne<MetaFormat>>(url, { params, headers });
    if (!response.data || !response.data.data) {
      console.warn(`[getMetaFormat] Meta Format with documentId ${documentId} not found or no data returned.`);
      return null;
    }
    if (response.data.data.tenent_id !== userTenentId) {
      console.warn(`[getMetaFormat] tenent_id mismatch for meta format documentId ${documentId}. Access denied.`);
      return null;
    }
    console.log(`[getMetaFormat] Fetched Meta Format documentId ${documentId} Data:`, response.data.data);
    return response.data.data;
  } catch (error: unknown) {
    let message = `Failed to fetch meta format with documentId ${documentId}.`;
     // Error handling similar to other services
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const errorDataMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message;
      if (status === 404) return null;
      if (status === 403) return null; // Or throw specific auth error
      console.error(`[getMetaFormat] Failed for documentId ${documentId}. Status: ${status}, Message: ${errorDataMessage}, Data:`, error.response?.data);
      message = errorDataMessage || `Failed to fetch meta format ${documentId} (Status: ${status}).`;
    } else if (error instanceof Error) {
      message = error.message;
    }
    console.error(`[getMetaFormat] Error: ${message}`, error);
    throw new Error(message);
  }
};

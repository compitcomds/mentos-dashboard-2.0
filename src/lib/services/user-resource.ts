
'use server';

import type { UserResource, UpdateUserResourcePayload } from "@/types/user-resource";
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

export const getUserResource = async (tenentId: string): Promise<UserResource | null> => {
  if (!tenentId) {
    console.error('[Service getUserResource]: tenentId is missing.');
    // Potentially return a default object or throw, for now null to indicate not found/not set up
    return null;
  }
  const params = {
    'filters[tenent_id][$eq]': tenentId,
    'populate': ['user'],
  };
  const url = '/user-resources';
  console.log(`[getUserResource] Fetching URL: ${url} for tenent_id ${tenentId} with params:`, params);

  try {
    const headers = await getAuthHeader();
    const response = await axiosInstance.get<FindMany<UserResource>>(url, { params, headers });

    if (!response.data || !response.data.data) {
      console.warn(`[getUserResource] No data property in response for tenent_id ${tenentId}.`);
      return null;
    }
    if (!Array.isArray(response.data.data)) {
        console.error(`[getUserResource] Unexpected API response structure for tenent_id ${tenentId}. Expected 'data' array, received:`, response.data);
        return null;
    }
    if (response.data.data.length === 0) {
        console.log(`[getUserResource] No UserResource found for tenent_id ${tenentId}. Returning null.`);
        return null;
    }
    const userResource = response.data.data[0];
    console.log(`[getUserResource] Fetched UserResource for tenent_id ${tenentId}:`, userResource);
    return userResource;

  } catch (error: unknown) {
    let message = `Failed to fetch user resource for tenent_id ${tenentId}.`;
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const errorDataMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message;
      console.error(`[getUserResource] API Error (${status}) for tenent_id ${tenentId}:`, error.response?.data);
      message = `API Error (${status}): ${errorDataMessage || 'Unknown API error'}`;
    } else if (error instanceof Error) {
      message = error.message;
    }
    console.error(`[getUserResource] Error: ${message}`, error);
    // For GET, it might be better to return null than throw if it's a "not found" type scenario
    // Throwing will make the query hook go into error state. Returning null will make data undefined.
    if (error instanceof AxiosError && error.response?.status === 404) {
        return null;
    }
    throw new Error(message);
  }
};

export const updateUserResource = async (documentId: string, payload: UpdateUserResourcePayload, userTenentIdAuthContext: string): Promise<UserResource> => {
  if (!documentId) {
    throw new Error('Document ID is required to update a user resource.');
  }
  const url = `/user-resources/${documentId}`;
  console.log(`[updateUserResource] Updating UserResource ${documentId} (Auth context tenent_id: ${userTenentIdAuthContext}). Payload:`, { data: payload });

  try {
    const headers = await getAuthHeader();
    const response = await axiosInstance.put<FindOne<UserResource>>(url, { data: payload }, { headers, params: { populate: ['user'] } });
    if (!response.data || !response.data.data) {
      throw new Error('Unexpected API response structure after updating user resource.');
    }
    console.log(`[updateUserResource] Updated UserResource ${documentId}:`, response.data.data);
    return response.data.data;
  } catch (error: unknown) {
    let detailedMessage = `Failed to update user resource ${documentId}.`;
    // ... (enhanced error logging as in other services)
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const errorData = error.response?.data?.error;
      detailedMessage = `API Error (Status ${status || 'unknown'}): ${errorData?.message || error.message}.`;
      if (errorData?.details) detailedMessage += ` Details: ${JSON.stringify(errorData.details)}`;
    } else if (error instanceof Error) {
      detailedMessage = error.message;
    }
    console.error(`[updateUserResource] Error: ${detailedMessage}`, error);
    throw new Error(detailedMessage);
  }
};

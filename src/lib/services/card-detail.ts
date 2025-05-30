
'use server';

import type { CardDetail, CreateCardDetailPayload } from "@/types/card-detail";
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

export const getCardDetails = async (userTenentId: string): Promise<CardDetail[]> => {
  if (!userTenentId) {
    console.error('[Service getCardDetails]: userTenentId is missing.');
    throw new Error('User tenent_id is required to fetch card details.');
  }
  const params = {
    'filters[tenent_id][$eq]': userTenentId,
    'populate[user]': '*', // Populate user if needed, though likely not for card display
    'sort[0]': 'createdAt:desc',
  };
  const url = '/card-details';
  console.log(`[getCardDetails] Fetching URL: ${url} for tenent_id ${userTenentId} with params:`, params);

  try {
    const headers = await getAuthHeader();
    const response = await axiosInstance.get<FindMany<CardDetail>>(url, { params, headers });

    if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
      console.error(`[getCardDetails] Unexpected API response structure for tenent_id ${userTenentId}. Expected 'data' array, received:`, response.data);
      if (response.data === null || response.data === undefined || (response.data && !response.data.data)) {
        console.warn(`[getCardDetails] API returned null, undefined, or no 'data' property for tenent_id ${userTenentId}. Returning empty array.`);
        return [];
      }
      throw new Error('Unexpected API response structure. Expected an array within a "data" property.');
    }
    console.log(`[getCardDetails] Fetched ${response.data.data.length} Card Details for tenent_id ${userTenentId}.`);
    return response.data.data;

  } catch (error: unknown) {
    let message = `Failed to fetch card details for tenent_id ${userTenentId}.`;
     if (error instanceof AxiosError) {
      const status = error.response?.status;
      const errorDataMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message;
      console.error(`[getCardDetails] Failed from ${url} (${status}):`, error.response?.data);
      message = `(${status}) ${errorDataMessage || 'Unknown API error'}`;
    } else if (error instanceof Error) {
      message = error.message;
    }
    console.error(`[getCardDetails] Error: ${message}`, error);
    throw new Error(message);
  }
};

export const createCardDetail = async (payload: CreateCardDetailPayload): Promise<CardDetail> => {
  if (!payload.tenent_id) {
    throw new Error('User tenent_id is required in the payload to create a card detail.');
  }
  const url = '/card-details';
  console.log(`[createCardDetail] Creating card detail for tenent_id ${payload.tenent_id} with payload:`, { data: payload });
  try {
    const headers = await getAuthHeader();
    const response = await axiosInstance.post<FindOne<CardDetail>>(url, { data: payload }, { headers, params: { populate: '*' } });
    if (!response.data || !response.data.data) {
      throw new Error('Unexpected API response structure after creating card detail.');
    }
    console.log(`[createCardDetail] Created Card Detail for tenent_id ${payload.tenent_id}:`, response.data.data);
    return response.data.data;
  } catch (error: unknown) {
    let detailedMessage = `Failed to create card detail for tenent_id ${payload.tenent_id}.`;
    let loggableErrorData: any = error;

    if (error instanceof AxiosError) {
      loggableErrorData = error.response?.data || error.message;
      const status = error.response?.status;
      const strapiError = error.response?.data?.error;

      if (strapiError && typeof strapiError === 'object') {
        let mainMsg = strapiError.message || "Unknown API error from Strapi.";
        if (strapiError.name) {
          mainMsg = `${strapiError.name}: ${mainMsg}`;
        }
        detailedMessage = `API Error (Status ${status || strapiError.status || 'unknown'}): ${mainMsg}`;
        if (strapiError.details && Object.keys(strapiError.details).length > 0) {
          try {
            detailedMessage += ` Details: ${JSON.stringify(strapiError.details)}`;
          } catch (e) { /* ignore */ }
        }
      } else if (error.response?.data?.message && typeof error.response.data.message === 'string') {
        detailedMessage = `API Error (Status ${status || 'unknown'}): ${error.response.data.message}`;
      } else if (typeof error.response?.data === 'string' && error.response.data.trim() !== '') {
        detailedMessage = `API Error (Status ${status || 'unknown'}): ${error.response.data}`;
      } else {
        detailedMessage = `API Error (Status ${status || 'unknown'}): ${error.message}.`;
      }
    } else if (error instanceof Error) {
      detailedMessage = error.message;
    }
    console.error(`[createCardDetail] Failed. Error: ${detailedMessage}`, "Full error object/data logged:", loggableErrorData);
    throw new Error(detailedMessage);
  }
};

// Placeholder for deleteCardDetail, can be implemented later
export const deleteCardDetail = async (documentId: string, userTenentId: string): Promise<void> => {
  console.warn(`[deleteCardDetail] Called for documentId ${documentId}, userTenentId ${userTenentId}. Delete functionality not fully implemented.`);
  // const headers = await getAuthHeader();
  // await axiosInstance.delete(`/card-details/${documentId}`, { headers });
  // For now, this is a placeholder.
  return Promise.resolve();
};

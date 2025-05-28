
'use server';

import type { Payment } from "@/types/payment";
import type { FindMany } from "@/types/strapi_response";
import axiosInstance from "@/lib/axios"; // Use alias
import { getAccessToken } from "@/lib/actions/auth"; // Use alias
import { AxiosError } from 'axios';

async function getAuthHeader() {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Authentication token not found.");
  }
  return { Authorization: `Bearer ${token}` };
}

export const getPayments = async (userTenentId: string): Promise<Payment[]> => {
  if (!userTenentId) {
    console.error('[Service getPayments]: userTenentId is missing.');
    throw new Error('User tenent_id is required to fetch payments.');
  }
  const params = {
    'filters[tenent_id][$eq]': userTenentId,
    'populate[Items]': '*', // Populate the Billing_items component
    'populate[user]': '*',   // Populate the user relation if needed for display, though schema shows blog
    'sort[0]': 'Billing_From:desc',
  };
  const url = '/payments';
  console.log(`[getPayments] Fetching URL: ${url} with params:`, params);
  try {
    const headers = await getAuthHeader();
    const response = await axiosInstance.get<FindMany<Payment>>(url, { params, headers });

    if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
      console.error(`[getPayments] Unexpected API response structure for tenent_id ${userTenentId}. Expected 'data' array, received:`, response.data);
      if (response.data === null || response.data === undefined || (response.data && !response.data.data)) {
        console.warn(`[getPayments] API returned null, undefined, or no 'data' property for tenent_id ${userTenentId}. Returning empty array.`);
        return [];
      }
      throw new Error('Unexpected API response structure. Expected an array within a "data" property.');
    }
    console.log(`[getPayments] Fetched ${response.data.data.length} Payments for tenent_id ${userTenentId}.`);
    return response.data.data;

  } catch (error: unknown) {
    let message = `Failed to fetch payments for tenent_id ${userTenentId}.`;
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const errorDataMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message;
      console.error(`[getPayments] Failed to fetch payments from ${url} (${status}) for tenent_id ${userTenentId}:`, error.response?.data);
      message = `Failed to fetch payments (${status}) - ${errorDataMessage || 'Unknown API error'}`;
    } else if (error instanceof Error) {
      console.error(`[getPayments] Generic Error for tenent_id ${userTenentId}:`, error.message);
      message = error.message;
    } else {
      console.error(`[getPayments] Unknown Error for tenent_id ${userTenentId}:`, error);
    }
    throw new Error(message);
  }
};

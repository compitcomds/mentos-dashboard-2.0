
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

  // Temporarily remove complex params for debugging
  const params = {
    // 'filters[tenent_id][$eq]': userTenentId, // Temporarily removed
    // 'populate[Items]': '*',                   // Temporarily removed
    // 'populate[user]': '*',                    // Temporarily removed
    // 'sort[0]': 'Billing_From:desc',           // Temporarily removed
  };
  const url = '/payments';
  console.log(`[getPayments] Fetching URL: ${url} with SIMPLIFIED params:`, params);

  try {
    const headers = await getAuthHeader();
    // Make sure to pass even empty params object if that's how axiosInstance is configured to send them.
    // Or, if params is empty, you might be able to omit it entirely depending on axios defaults.
    // For now, let's send it as is, which might be an empty params object or specific ones if you re-enable above.
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
    let detailedMessage = `Failed to fetch payments for tenent_id ${userTenentId}.`;
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
        if (status === 500) {
            detailedMessage += " This is an Internal Server Error from the API. Please check Strapi server logs for more details.";
        }
    } else if (error instanceof Error) {
        detailedMessage = error.message;
    }
    console.error(`[getPayments] Failed for tenent_id ${userTenentId}. Error: ${detailedMessage}`, "Full error object/data logged:", loggableErrorData);
    throw new Error(detailedMessage);
  }
};

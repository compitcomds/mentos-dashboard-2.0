
'use server';

import type { QueryForm } from "@/types/query-form";
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

export const getQueryForms = async (userTenentId: string): Promise<QueryForm[]> => {
    if (!userTenentId) {
        console.error('[Service getQueryForms]: userTenentId is missing.');
        throw new Error('User tenent_id is required to fetch query forms.');
    }
    const params = {
        'filters[tenent_id][$eq]': userTenentId,
        'sort[0]': 'createdAt:desc',
    };
    const url = '/query-forms';
    console.log(`[getQueryForms] Fetching URL: ${url} with params:`, params);

    try {
        const headers = await getAuthHeader();
        const response = await axiosInstance.get<FindMany<QueryForm>>(url, { params, headers });

        if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
            console.error(`[getQueryForms] Unexpected API response structure for tenent_id ${userTenentId}. Expected 'data' array, received:`, response.data);
            if (response.data === null || response.data === undefined || (response.data && !response.data.data)) {
                console.warn(`[getQueryForms] API returned null, undefined, or no 'data' property for tenent_id ${userTenentId}. Returning empty array.`);
                return [];
            }
            throw new Error("Unexpected API response structure. Expected 'data' array.");
        }
        console.log(`[getQueryForms] Fetched ${response.data.data.length} Query Forms for tenent_id ${userTenentId}.`);
        return response.data.data;

    } catch (error: unknown) {
        let message = `Failed to fetch query forms for tenent_id ${userTenentId}.`;
        if (error instanceof AxiosError) {
            const status = error.response?.status;
            const errorDataMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message;
            console.error(`[getQueryForms] Failed to fetch query forms from ${url} (${status}) for tenent_id ${userTenentId}:`, error.response?.data);
            message = `Failed to fetch query forms (${status}) - ${errorDataMessage || 'Unknown API error'}`;
        } else if (error instanceof Error) {
            console.error(`[getQueryForms] Generic Error for tenent_id ${userTenentId}:`, error.message);
            message = error.message;
        } else {
            console.error(`[getQueryForms] Unknown Error for tenent_id ${userTenentId}:`, error);
        }
        throw new Error(message);
    }
};

export const getQueryForm = async (id: string, userTenentId: string): Promise<QueryForm | null> => {
    if (!id) return null;
    if (!userTenentId) {
        console.error(`[Service getQueryForm]: userTenentId is missing for query form ID ${id}.`);
        throw new Error('User tenent_id is required to fetch a specific query form.');
    }
    const params = {
      // No specific population needed unless relations are added to QueryForm type and required
    };

    const url = `/query-forms/${id}`;
    console.log(`[getQueryForm] Fetching URL: ${url} with params:`, params);

    try {
        const headers = await getAuthHeader();
        const response = await axiosInstance.get<FindOne<QueryForm>>(url, { params, headers });

        if (!response.data || !response.data.data) {
            console.error(`[getQueryForm] Unexpected API response structure for query form ${id} from ${url}. Expected 'data' object, received:`, response.data);
            return null;
        }
        
        // Verify tenent_id if the API doesn't filter by it and it's present in the response
        if (response.data.data.tenent_id && response.data.data.tenent_id !== userTenentId) {
            console.warn(`[getQueryForm] Fetched query form ${id} tenent_id (${response.data.data.tenent_id}) does not match requested userTenentId (${userTenentId}).`);
            return null; // Or throw authorization error
        }

        console.log(`[getQueryForm] Fetched Query Form ${id} Data for tenent_id ${userTenentId}:`, response.data.data);
        return response.data.data;

    } catch (error: unknown) {
         let message = `Failed to fetch query form ${id} for tenent_id ${userTenentId}.`;
         if (error instanceof AxiosError) {
            const status = error.response?.status;
            const errorDataMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message;
            if (status === 404) {
                 console.warn(`[getQueryForm] Query form ${id} not found for tenent_id ${userTenentId}.`);
                 return null;
            }
            console.error(`[getQueryForm] Failed to fetch query form ${id} from ${url} (Status: ${status}) for tenent_id ${userTenentId}:`, error.response?.data);
            message = `Failed to fetch query form ${id} (${status}) - ${errorDataMessage || 'Unknown API error'}`;
        } else if (error instanceof Error) {
            console.error(`[getQueryForm] Generic Error for query form ${id}, tenent_id ${userTenentId}:`, error.message);
            message = error.message;
        } else {
            console.error(`[getQueryForm] Unknown Error for query form ${id}, tenent_id ${userTenentId}:`, error);
        }
        throw new Error(message);
    }
};

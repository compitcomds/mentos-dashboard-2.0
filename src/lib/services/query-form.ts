
'use server';

import type { QueryForm } from "@/types/query-form";
import axiosInstance from "@/lib/axios";
import { getAccessToken } from "@/lib/actions/auth";
import { AxiosError } from 'axios';

// Helper to get Authorization header
async function getAuthHeader() {
  const token = await getAccessToken(); // Uses hardcoded token in preview
  if (!token) {
    throw new Error("Authentication token not found.");
  }
  return { Authorization: `Bearer ${token}` };
}

// Define expected Strapi response structure for a collection
interface StrapiCollectionResponse<T> {
  data: T[];
  meta?: { // Optional meta object
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

// Define expected Strapi response structure for a single entry
interface StrapiSingleResponse<T> {
  data: T;
  meta?: {}; // Optional meta object
}


// Get all query forms. The backend should filter by user based on JWT.
export const getQueryForms = async (): Promise<QueryForm[]> => {
    const params = {
        'sort[0]': 'createdAt:desc', // Sort by creation date
    };
    const url = '/query-forms';
    console.log(`[getQueryForms] Fetching URL: ${url} with params:`, params);

    try {
        const headers = await getAuthHeader();
        // Expecting a StrapiCollectionResponse wrapping QueryForm[]
        const response = await axiosInstance.get<StrapiCollectionResponse<QueryForm>>(url, { params, headers });

        // Access data from response.data.data
        if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
            console.error(`[getQueryForms] Unexpected API response structure. Expected 'data' array, received:`, response.data);
            throw new Error("Unexpected API response structure. Expected 'data' array.");
        }
        console.log(`[getQueryForms] Fetched ${response.data.data.length} Query Forms.`);
        return response.data.data;

    } catch (error: unknown) {
        let message = `Failed to fetch query forms.`;
        if (error instanceof AxiosError) {
            const status = error.response?.status;
            const errorDataMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message;
            console.error(`[getQueryForms] Failed to fetch query forms from ${url} (${status}):`, error.response?.data);
            message = `Failed to fetch query forms (${status}) - ${errorDataMessage || 'Unknown API error'}`;
        } else if (error instanceof Error) {
            console.error(`[getQueryForms] Generic Error:`, error.message);
            message = error.message;
        } else {
            console.error(`[getQueryForms] Unknown Error:`, error);
        }
        throw new Error(message);
    }
};

// Get a specific query form by id. The backend should filter by user based on JWT.
export const getQueryForm = async (id: string): Promise<QueryForm | null> => {
    if (!id) return null;
    const params = {
        // No 'key' parameter explicitly passed for query forms. Authorization handled by JWT.
    };

    const url = `/query-forms/${id}`;
    console.log(`[getQueryForm] Fetching URL: ${url} with params:`, params);

    try {
        const headers = await getAuthHeader();
        // Expecting a StrapiSingleResponse wrapping a QueryForm object
        const response = await axiosInstance.get<StrapiSingleResponse<QueryForm>>(url, { params, headers });

        // Access data from response.data.data
        if (!response.data || !response.data.data || typeof response.data.data !== 'object' || response.data.data === null) {
            console.error(`[getQueryForm] Unexpected API response structure for query form ${id} from ${url}. Expected 'data' object, received:`, response.data);
            throw new Error("Unexpected API response structure. Expected 'data' object.");
        }

        console.log(`[getQueryForm] Fetched Query Form ${id} Data:`, response.data.data);
        return response.data.data;

    } catch (error: unknown) {
         let message = `Failed to fetch query form ${id}.`;
         if (error instanceof AxiosError) {
            const status = error.response?.status;
            const errorDataMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message;
            if (status === 404) {
                 console.warn(`[getQueryForm] Query form ${id} not found.`);
                 return null;
            }
            console.error(`[getQueryForm] Failed to fetch query form ${id} from ${url} (Status: ${status}):`, error.response?.data);
            message = `Failed to fetch query form ${id} (${status}) - ${errorDataMessage || 'Unknown API error'}`;
        } else if (error instanceof Error) {
            console.error(`[getQueryForm] Generic Error for query form ${id}:`, error.message);
            message = error.message;
        } else {
            console.error(`[getQueryForm] Unknown Error for query form ${id}:`, error);
        }
        throw new Error(message);
    }
};

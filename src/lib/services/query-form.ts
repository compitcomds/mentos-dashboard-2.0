
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

export interface GetQueryFormsParams {
  userTenentId: string;
  type?: string | null;
  group_id?: string | null;
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export const getQueryForms = async (params: GetQueryFormsParams): Promise<FindMany<QueryForm>> => {
    const { userTenentId, type, group_id, page = 1, pageSize = 10, sortField = 'createdAt', sortOrder = 'desc' } = params;

    if (!userTenentId) {
        console.error('[Service getQueryForms]: userTenentId is missing.');
        throw new Error('User tenent_id is required to fetch query forms.');
    }

    const strapiParams: any = {
        'filters[tenent_id][$eq]': userTenentId,
        'populate': ['user', 'media'],
        'pagination[page]': page,
        'pagination[pageSize]': pageSize,
    };

    if (sortField && sortOrder) {
        strapiParams['sort[0]'] = `${sortField}:${sortOrder}`;
    }
    if (type) {
      strapiParams['filters[type][$eq]'] = type;
    }
    if (group_id) {
      // Assuming group_id is a text field, use containsi for case-insensitive partial match
      strapiParams['filters[group_id][$containsi]'] = group_id;
    }

    const url = '/query-forms';
    console.log(`[getQueryForms] Fetching URL: ${url} with params:`, JSON.stringify(strapiParams));

    try {
        const headers = await getAuthHeader();
        const response = await axiosInstance.get<FindMany<QueryForm>>(url, { params: strapiParams, headers });

        if (!response.data || !response.data.data || !Array.isArray(response.data.data) || !response.data.meta?.pagination) {
            console.error(`[getQueryForms] Unexpected API response structure. Expected 'data' array and 'meta.pagination', received:`, response.data);
            if (response.data === null || response.data === undefined || (response.data && !response.data.data)) {
                console.warn(`[getQueryForms] API returned null, undefined, or no 'data' property. Returning empty result.`);
                return { data: [], meta: { pagination: { page: 1, pageSize, pageCount: 0, total: 0 } } };
            }
            throw new Error("Unexpected API response structure. Expected 'data' array and 'meta.pagination'.");
        }
        console.log(`[getQueryForms] Fetched ${response.data.data.length} Query Forms for tenent_id ${userTenentId}. Pagination:`, response.data.meta.pagination);
        return response.data;

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
        throw new Error('User tenent_id is required to verify fetched query form.');
    }
    const params = {
      'populate': ['user', 'media'], // Populate user and media relations
    };

    const url = `/query-forms/${id}`;
    console.log(`[getQueryForm] Fetching URL: ${url} (no tenent_id filter in query) with params:`, params);

    try {
        const headers = await getAuthHeader();
        const response = await axiosInstance.get<FindOne<QueryForm>>(url, { params, headers });

        if (!response.data || !response.data.data) {
            console.error(`[getQueryForm] Unexpected API response structure for query form ${id} from ${url}. Expected 'data' object, received:`, response.data);
            return null;
        }

        if (response.data.data.tenent_id !== userTenentId) {
            console.warn(`[getQueryForm] Fetched query form ${id} tenent_id (${response.data.data.tenent_id}) does not match requested userTenentId (${userTenentId}). Access denied.`);
            return null;
        }

        console.log(`[getQueryForm] Fetched Query Form ${id} Data for tenent_id ${userTenentId}:`, response.data.data);
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
             if (status === 403) {
                 console.warn(`[getQueryForm] Access to query form ${id} forbidden.`);
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

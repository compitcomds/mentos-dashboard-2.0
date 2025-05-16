
'use server';

import type { Category, CreateCategoryPayload } from "@/types/category";
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

export const getCategories = async (userTenentId: string): Promise<Category[]> => {
  if (!userTenentId) {
    console.error('[Service getCategories]: userTenentId is missing.');
    throw new Error('User tenent_id is required to fetch categories.');
  }
  const params = {
    'filters[tenent_id][$eq]': userTenentId,
    'populate': '*', // Populate relations if needed
  };
  const url = '/categories';
  console.log(`[getCategories] Fetching URL: ${url} with params:`, params);
  try {
    const headers = await getAuthHeader();
    const response = await axiosInstance.get<FindMany<Category>>(url, { params, headers });

    if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
      console.error(`[getCategories] Unexpected API response structure for tenent_id ${userTenentId}. Expected 'data' array, received:`, response.data);
      if (response.data === null || response.data === undefined || (response.data && !response.data.data)) {
        console.warn(`[getCategories] API returned null, undefined, or no 'data' property for tenent_id ${userTenentId}. Returning empty array.`);
        return [];
      }
      throw new Error('Unexpected API response structure. Expected an array within a "data" property.');
    }
    console.log(`[getCategories] Fetched ${response.data.data.length} Categories for tenent_id ${userTenentId}.`);
    return response.data.data;

  } catch (error: unknown) {
    let message = `Failed to fetch categories for tenent_id ${userTenentId}.`;
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const errorDataMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message;
      console.error(`[getCategories] Failed to fetch categories from ${url} (${status}) for tenent_id ${userTenentId}:`, error.response?.data);
      message = `Failed to fetch categories (${status}) - ${errorDataMessage || 'Unknown API error'}`;
    } else if (error instanceof Error) {
      console.error(`[getCategories] Generic Error for tenent_id ${userTenentId}:`, error.message);
      message = error.message;
    } else {
      console.error(`[getCategories] Unknown Error for tenent_id ${userTenentId}:`, error);
    }
    throw new Error(message);
  }
};

export const getCategory = async (id: string, userTenentId: string): Promise<Category | null> => {
  if (!id || !userTenentId) return null;
  const params = {
    'populate': '*', // Populate relations
  };
  const url = `/categories/${id}`;
  console.log(`[getCategory] Fetching URL: ${url} with params:`, params);
  try {
    const headers = await getAuthHeader();
    const response = await axiosInstance.get<FindOne<Category>>(url, { params, headers });
    if (!response.data || !response.data.data) {
      console.warn(`[getCategory] Category ${id} not found or no data returned for tenent_id ${userTenentId}.`);
      return null;
    }
    // Verify tenent_id after fetching
    if (response.data.data.tenent_id !== userTenentId) {
      console.warn(`[getCategory] tenent_id mismatch for category ${id}. Expected ${userTenentId}, got ${response.data.data.tenent_id}. Access denied.`);
      return null; 
    }
    console.log(`[getCategory] Fetched Category ${id} Data for tenent_id ${userTenentId}:`, response.data.data);
    return response.data.data;
  } catch (error: unknown) {
    const message = error instanceof AxiosError ? error.response?.data?.error?.message || error.message : (error as Error).message;
    if (error instanceof AxiosError && error.response?.status === 404) {
      console.warn(`[getCategory] Category ${id} not found (404) for tenent_id ${userTenentId}.`);
      return null;
    }
    console.error(`[getCategory] Failed for ID ${id}, tenent_id ${userTenentId}:`, message);
    throw new Error(message || `Failed to fetch category ${id}.`);
  }
};

// Create a category, ensuring the userTenentId is included in the payload
export const createCategory = async (category: CreateCategoryPayload): Promise<Category> => {
  if (!category.tenent_id) {
    throw new Error('User tenent_id is required in the payload to create a category.');
  }
  const url = '/categories';
  console.log(`[createCategory] Creating category for tenent_id ${category.tenent_id} with payload:`, { data: category });
  try {
    const headers = await getAuthHeader();
    const response = await axiosInstance.post<FindOne<Category>>(url, { data: category }, { headers, params: { populate: '*' } });
    if (!response.data || !response.data.data) {
      throw new Error('Unexpected API response structure after creation.');
    }
    console.log(`[createCategory] Created Category for tenent_id ${category.tenent_id}:`, response.data.data);
    return response.data.data;
  } catch (error: unknown) {
    const message = error instanceof AxiosError ? error.response?.data?.error?.message || error.message : (error as Error).message;
    console.error(`[createCategory] Failed for tenent_id ${category.tenent_id}:`, message, error instanceof AxiosError ? error.response?.data : '');
    throw new Error(message || 'Failed to create category.');
  }
};

// Update a category by id, relying on Strapi policies for authorization
export const updateCategory = async (id: number, categoryUpdatePayload: Partial<CreateCategoryPayload>, userTenentId: string): Promise<Category> => {
  if (!userTenentId) { 
    throw new Error('User tenent_id is required for context, even if not used for pre-check.');
  }
  
  const { tenent_id, ...updateData } = categoryUpdatePayload;
  if (tenent_id && tenent_id !== userTenentId) {
    console.warn(`[Service updateCategory]: Attempted to change tenent_id during update for category ${id}. This is usually not allowed. The payload sent to Strapi will not include tenent_id.`);
  }

  const url = `/categories/${id}`;
  console.log(`[updateCategory] Updating category ${id} for user with tenent_id ${userTenentId}. Payload:`, { data: updateData });

  try {
    const headers = await getAuthHeader();
    const response = await axiosInstance.put<FindOne<Category>>(url, { data: updateData }, { headers, params: { populate: '*' } });
    if (!response.data || !response.data.data) {
      throw new Error('Unexpected API response structure after update.');
    }
    console.log(`[updateCategory] Updated Category ${id} for tenent_id ${userTenentId}:`, response.data.data);
    return response.data.data;
  } catch (error: unknown) {
    const message = error instanceof AxiosError ? error.response?.data?.error?.message || error.message : (error as Error).message;
    console.error(`[updateCategory] Failed for ID ${id}, user tenent_id ${userTenentId}:`, message, error instanceof AxiosError ? error.response?.data : '');
    throw new Error(message || `Failed to update category ${id}.`);
  }
};

// Delete a category by id, relying on Strapi policies for authorization
export const deleteCategory = async (id: number, userTenentId: string): Promise<Category | void> => {
  if (!userTenentId) {
    throw new Error('User tenent_id is required for context, even if not used for pre-check.');
  }
  const url = `/categories/${id}`;
  console.log(`[deleteCategory] Deleting category ${id} for user with tenent_id ${userTenentId}`);
  try {
    const headers = await getAuthHeader();
    const response = await axiosInstance.delete<FindOne<Category>>(url, { headers });
     if (response.status === 200 && response.data && response.data.data) {
        console.log(`[deleteCategory] Successfully deleted category ${id} for tenent_id ${userTenentId}.`);
        return response.data.data;
    } else if (response.status === 204) { 
        console.log(`[deleteCategory] Successfully deleted category ${id} (no content returned) for tenent_id ${userTenentId}.`);
        return; 
    }
    console.warn(`[deleteCategory] Unexpected status ${response.status} for category ${id}.`);
    return response.data?.data; 
  } catch (error: unknown) {
    let detailedMessage = `Failed to delete category ${id}.`;
    let loggableErrorData: any = error; // For console logging

    if (error instanceof AxiosError) {
      loggableErrorData = error.response?.data || error.message;
      const status = error.response?.status;
      const strapiError = error.response?.data?.error; // e.g. { status, name, message, details }
      let apiMsg = strapiError?.message;

      if (!apiMsg && typeof error.response?.data === 'string') {
        apiMsg = error.response.data; // Error is a plain string
      } else if (!apiMsg && typeof error.response?.data?.message === 'string') {
        apiMsg = error.response.data.message; // Error message is directly in data.message
      }
      
      detailedMessage = `API Error (Status ${status || 'unknown'}): ${apiMsg || error.message}.`;
      
      if (strapiError?.details && Object.keys(strapiError.details).length > 0) {
        try {
          detailedMessage += ` Details: ${JSON.stringify(strapiError.details)}`;
        } catch (e) { /* ignore stringify error for details */ }
      } else if (status === 500 && !strapiError) { // If it's a 500 and no structured Strapi error
          detailedMessage += " This is an Internal Server Error from the API. Please check Strapi server logs for more details."
          if (typeof error.response?.data === 'object' && error.response?.data !== null) {
            try {
                const rawDataString = JSON.stringify(error.response.data);
                if (rawDataString !== '{}') { 
                    detailedMessage += ` Raw Response Data: ${rawDataString}`;
                }
            } catch (e) { /* ignore stringify error */ }
          }
      }
    } else if (error instanceof Error) {
      detailedMessage = error.message;
    }

    console.error(
      `[deleteCategory] Failed for ID ${id}, user tenent_id ${userTenentId}. Error: ${detailedMessage}`,
      "Full error object/data logged:", loggableErrorData
    );
    
    throw new Error(detailedMessage); // Throw the more detailed message
  }
};

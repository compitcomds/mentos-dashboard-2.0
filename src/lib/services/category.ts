
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
    'populate': '*', // Ensure relations are populated if needed by the UI
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
  if (!id || !userTenentId) {
    console.warn(`[Service getCategory]: ID (${id}) or userTenentId (${userTenentId}) is missing.`);
    return null;
  }
  const params = {
    'populate': '*', // Ensure relations are populated if needed
  };
  const url = `/categories/${id}`;
  console.log(`[getCategory] Fetching URL: ${url} for userTenentId ${userTenentId} with params:`, params);
  try {
    const headers = await getAuthHeader();
    const response = await axiosInstance.get<FindOne<Category>>(url, { params, headers });
    if (!response.data || !response.data.data) {
      console.warn(`[getCategory] Category ${id} not found or no data returned for tenent_id ${userTenentId}.`);
      return null;
    }
    // Verify tenent_id after fetching, crucial for security if policies are not the sole guard
    if (response.data.data.tenent_id !== userTenentId) {
      console.warn(`[getCategory] tenent_id mismatch for category ${id}. Expected ${userTenentId}, got ${response.data.data.tenent_id}. Access denied.`);
      return null;
    }
    console.log(`[getCategory] Fetched Category ${id} Data for tenent_id ${userTenentId}:`, response.data.data);
    return response.data.data;
  } catch (error: unknown) {
    let message = `Failed to fetch category ${id}.`;
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const errorDataMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message;
      if (status === 404) {
        console.warn(`[getCategory] Category ${id} not found (404) for tenent_id ${userTenentId}.`);
        return null;
      }
      console.error(`[getCategory] Failed for ID ${id}, userTenentId ${userTenentId}. Status: ${status}, Message: ${errorDataMessage}, Data:`, error.response?.data);
      message = errorDataMessage || `Failed to fetch category ${id} (Status: ${status}).`;
    } else if (error instanceof Error) {
      console.error(`[getCategory] Generic error for ID ${id}, userTenentId ${userTenentId}:`, error.message);
      message = error.message;
    } else {
      console.error(`[getCategory] Unknown error for ID ${id}, userTenentId ${userTenentId}:`, error);
    }
    throw new Error(message);
  }
};

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
    let detailedMessage = `Failed to create category for tenent_id ${category.tenent_id}.`;
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
    console.error(`[createCategory] Failed. Error: ${detailedMessage}`, "Full error object/data logged:", loggableErrorData);
    throw new Error(detailedMessage);
  }
};

export const updateCategory = async (id: number, categoryUpdatePayload: Partial<CreateCategoryPayload>, userTenentId: string): Promise<Category> => {
  if (!userTenentId) {
    throw new Error('User tenent_id is required for authorization context to update category.');
  }
  const { tenent_id, ...updateData } = categoryUpdatePayload; // Exclude tenent_id from update payload
  if (tenent_id && tenent_id !== userTenentId) {
    console.warn(`[Service updateCategory]: Attempted to change tenent_id during update for category ${id}. This is usually not allowed and will be ignored by the service.`);
  }

  const url = `/categories/${id}`;
  console.log(`[updateCategory] Updating category ${id} for user with tenent_id ${userTenentId}. Payload:`, { data: updateData });

  try {
    const headers = await getAuthHeader();
    // No pre-flight getCategory check here; rely on Strapi policies for authorization.
    const response = await axiosInstance.put<FindOne<Category>>(url, { data: updateData }, { headers, params: { populate: '*' } });
    if (!response.data || !response.data.data) {
      throw new Error('Unexpected API response structure after update.');
    }
    // Post-update check (optional but good for sanity)
    if (response.data.data.tenent_id !== userTenentId) {
      console.error(`[updateCategory] CRITICAL: tenent_id mismatch after update for category ${id}. Expected ${userTenentId}, got ${response.data.data.tenent_id}. This might indicate a policy bypass.`);
      // Decide how to handle: throw error, or log and return data. For now, log and return.
    }
    console.log(`[updateCategory] Updated Category ${id} for tenent_id ${userTenentId}:`, response.data.data);
    return response.data.data;
  } catch (error: unknown) {
    let detailedMessage = `Failed to update category ${id}.`;
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

      if (status === 500 && (!strapiError || (strapiError && !strapiError.message))) {
        detailedMessage += " This appears to be an Internal Server Error from the API. Please check Strapi server logs for more details.";
      }
    } else if (error instanceof Error) {
      detailedMessage = error.message;
    }
    console.error(`[updateCategory] Failed for ID ${id}, user tenent_id ${userTenentId}. Error: ${detailedMessage}`, "Full error object/data logged:", loggableErrorData);
    throw new Error(detailedMessage);
  }
};

export const deleteCategory = async (id: number, userTenentId: string): Promise<Category | void> => {
  if (!userTenentId) {
    throw new Error('User tenent_id is required for authorization context to delete category.');
  }
  const url = `/categories/${id}`;
  console.log(`[deleteCategory] Deleting category ${id} for user with tenent_id ${userTenentId}`);
  try {
    const headers = await getAuthHeader();
    // No pre-flight getCategory check here; rely on Strapi policies for authorization.
    const response = await axiosInstance.delete<FindOne<Category>>(url, { headers }); // Strapi might return the deleted item or 204
    if (response.status === 200 && response.data && response.data.data) {
      console.log(`[deleteCategory] Successfully deleted category ${id} for tenent_id ${userTenentId}.`);
      return response.data.data;
    } else if (response.status === 204) {
      console.log(`[deleteCategory] Successfully deleted category ${id} (no content returned) for tenent_id ${userTenentId}.`);
      return; // Return void for 204 No Content
    }
    // If status is 200 but data.data is missing, it's an unexpected response
    console.warn(`[deleteCategory] Unexpected response structure after deleting category ${id}. Status: ${response.status}, Data:`, response.data);
    throw new Error(`Unexpected response structure after deleting category ${id} (Status: ${response.status})`);
  } catch (error: unknown) {
    let detailedMessage = `Failed to delete category ${id}.`;
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

      if (status === 500 && (!strapiError || (strapiError && !strapiError.message))) {
        detailedMessage += " This appears to be an Internal Server Error from the API. Please check Strapi server logs for more details.";
      }
    } else if (error instanceof Error) {
      detailedMessage = error.message;
    }
    console.error(`[deleteCategory] Failed for ID ${id}, user tenent_id ${userTenentId}. Error: ${detailedMessage}`, "Full error object/data logged:", loggableErrorData);
    throw new Error(detailedMessage);
  }
};
    
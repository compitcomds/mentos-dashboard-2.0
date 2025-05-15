
'use server';

import type { Category, CreateCategoryPayload } from "@/types/category";
import type { FindMany, FindOne } from "@/types/strapi_response"; // Import Strapi response types
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

export const getCategories = async (userKey: string): Promise<Category[]> => {
  if (!userKey) {
    console.error('[Service getCategories]: userKey is missing.');
    throw new Error('User key is required to fetch categories.');
  }
  const params = {
    'filters[tenent_id][$eq]': userKey,
    'populate': '*',
  };
  const url = '/categories';
  console.log(`[getCategories] Fetching URL: ${url} with params:`, params);
  try {
    const headers = await getAuthHeader();
    const response = await axiosInstance.get<FindMany<Category>>(url, { params, headers });

    if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
      console.error(`[getCategories] Unexpected API response structure for key ${userKey}. Expected 'data' array, received:`, response.data);
      if (response.data === null || response.data === undefined || (response.data && !response.data.data)) {
        console.warn(`[getCategories] API returned null, undefined, or no 'data' property for key ${userKey}. Returning empty array.`);
        return [];
      }
      throw new Error('Unexpected API response structure. Expected an array within a "data" property.');
    }
    console.log(`[getCategories] Fetched ${response.data.data.length} Categories for key ${userKey}.`);
    return response.data.data;

  } catch (error: unknown) {
    let message = `Failed to fetch categories for key ${userKey}.`;
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const errorDataMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message;
      console.error(`[getCategories] Failed to fetch categories from ${url} (${status}) for key ${userKey}:`, error.response?.data);
      message = `Failed to fetch categories (${status}) - ${errorDataMessage || 'Unknown API error'}`;
    } else if (error instanceof Error) {
      console.error(`[getCategories] Generic Error for key ${userKey}:`, error.message);
      message = error.message;
    } else {
      console.error(`[getCategories] Unknown Error for key ${userKey}:`, error);
    }
    throw new Error(message);
  }
};

export const getCategory = async (id: string, userKey: string): Promise<Category | null> => {
  if (!id || !userKey) return null;
  const params = {
    // 'filters[tenent_id][$eq]': userKey, // Filter by tenent_id if API supports it for single fetch
    'populate': '*',
  };
  const url = `/categories/${id}`;
  console.log(`[getCategory] Fetching URL: ${url} with params:`, params);
  try {
    const headers = await getAuthHeader();
    const response = await axiosInstance.get<FindOne<Category>>(url, { params, headers }); // Expect FindOne<Category>
    if (!response.data || !response.data.data) {
      console.warn(`[getCategory] Category ${id} not found or no data returned for key ${userKey}.`);
      return null;
    }
    // Key check might be redundant if filtering works or policies handle it, but good for safety
    if (response.data.data.tenent_id !== userKey) {
      console.warn(`[getCategory] Key mismatch for category ${id}. Expected ${userKey}, got ${response.data.data.tenent_id}.`);
      return null;
    }
    console.log(`[getCategory] Fetched Category ${id} Data for key ${userKey}:`, response.data.data);
    return response.data.data;
  } catch (error: unknown) {
    const message = error instanceof AxiosError ? error.response?.data?.error?.message || error.message : (error as Error).message;
    if (error instanceof AxiosError && error.response?.status === 404) {
      console.warn(`[getCategory] Category ${id} not found (404) for key ${userKey}.`);
      return null;
    }
    console.error(`[getCategory] Failed for ID ${id}, key ${userKey}:`, message);
    throw new Error(message || `Failed to fetch category ${id}.`);
  }
};

export const createCategory = async (category: CreateCategoryPayload): Promise<Category> => {
  if (!category.tenent_id) {
    throw new Error('User tenent_id is required in the payload to create a category.');
  }
  const url = '/categories';
  console.log(`[createCategory] Creating category for key ${category.tenent_id} with payload:`, { data: category });
  try {
    const headers = await getAuthHeader();
    const response = await axiosInstance.post<FindOne<Category>>(url, { data: category }, { headers, params: { populate: '*' } });
    if (!response.data || !response.data.data) {
      throw new Error('Unexpected API response structure after creation.');
    }
    console.log(`[createCategory] Created Category for key ${category.tenent_id}:`, response.data.data);
    return response.data.data;
  } catch (error: unknown) {
    const message = error instanceof AxiosError ? error.response?.data?.error?.message || error.message : (error as Error).message;
    console.error(`[createCategory] Failed for key ${category.tenent_id}:`, message, error instanceof AxiosError ? error.response?.data : '');
    throw new Error(message || 'Failed to create category.');
  }
};

export const updateCategory = async (id: number, category: Partial<CreateCategoryPayload>): Promise<Category> => {
  const userKey = category.tenent_id; // Use tenent_id from payload for consistency
  if (!userKey) {
    throw new Error('User tenent_id is required in the payload to update a category.');
  }
  const url = `/categories/${id}`;
  const { tenent_id, ...updateData } = category; // Exclude tenent_id from the direct update payload if it's not mutable
  console.log(`[updateCategory] Updating category ${id} for key ${userKey} with payload:`, { data: updateData });

  try {
    const headers = await getAuthHeader();
    const response = await axiosInstance.put<FindOne<Category>>(url, { data: updateData }, { headers, params: { populate: '*' } });
    if (!response.data || !response.data.data) {
      throw new Error('Unexpected API response structure after update.');
    }
    if (response.data.data.tenent_id !== userKey) {
      console.error(`[updateCategory] Key mismatch for category ${id} after update. Expected ${userKey}, got ${response.data.data.tenent_id}.`);
      throw new Error('Category update resulted in key mismatch.');
    }
    console.log(`[updateCategory] Updated Category ${id} for key ${userKey}:`, response.data.data);
    return response.data.data;
  } catch (error: unknown) {
    const message = error instanceof AxiosError ? error.response?.data?.error?.message || error.message : (error as Error).message;
    console.error(`[updateCategory] Failed for ID ${id}, key ${userKey}:`, message, error instanceof AxiosError ? error.response?.data : '');
    throw new Error(message || `Failed to update category ${id}.`);
  }
};

export const deleteCategory = async (id: number, userKey: string): Promise<Category | void> => {
  if (!userKey) {
    throw new Error('User key is required to delete a category.');
  }
  const url = `/categories/${id}`;
  // Strapi V5 delete usually returns the deleted object { data: Category }
  console.log(`[deleteCategory] Deleting category ${id} for key ${userKey}`);
  try {
    const headers = await getAuthHeader();
    // Adding filter for userKey, though policies should be the primary guard
    const response = await axiosInstance.delete<FindOne<Category>>(url, { 
        headers,
        // params: { 'filters[tenent_id][$eq]': userKey } // This might not work for DELETE method in all Strapi versions.
                                                          // Ensure backend policies correctly restrict based on user.
    });
     if (response.status === 200 && response.data && response.data.data) {
        console.log(`[deleteCategory] Successfully deleted category ${id} for key ${userKey}.`);
        return response.data.data; // Return deleted item
    } else if (response.status === 204) { // No content, also success
        console.log(`[deleteCategory] Successfully deleted category ${id} (no content returned) for key ${userKey}.`);
        return; // Return void
    }
    console.warn(`[deleteCategory] Unexpected status ${response.status} for category ${id}.`);
    return response.data?.data; // Return data if present, otherwise undefined
  } catch (error: unknown) {
    const message = error instanceof AxiosError ? error.response?.data?.error?.message || error.message : (error as Error).message;
    if (error instanceof AxiosError && error.response?.status === 404) {
      console.warn(`[deleteCategory] Category ${id} not found (404) for key ${userKey}. Assuming already deleted or not owned.`);
      return;
    }
    console.error(`[deleteCategory] Failed for ID ${id}, key ${userKey}:`, message, error instanceof AxiosError ? error.response?.data : '');
    throw new Error(message || `Failed to delete category ${id}.`);
  }
};

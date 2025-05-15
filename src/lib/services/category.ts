'use server';

import type { Category, CreateCategoryPayload } from "@/types/category";
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
  // Pass userKey directly as a query parameter named 'key'
  const params = {
    'sort[0]': 'name:asc',
    'key': userKey, 
  };
  const url = '/categories';
  console.log(`[getCategories] Fetching URL: ${url} with params:`, params);
  try {
    const headers = await getAuthHeader();
    // Strapi v5 collection endpoints return a direct array.
    const response = await axiosInstance.get<Category[]>(url, { params, headers });

    // Check if response.data exists and is an array
    if (!response.data || !Array.isArray(response.data)) {
        console.error(`[getCategories] Unexpected API response structure for key ${userKey}. Expected an array, received:`, response.data);
        // Handle potential non-array responses (e.g., null, undefined) gracefully
        if (response.data === null || response.data === undefined) {
            console.warn(`[getCategories] API returned null or undefined for key ${userKey}. Returning empty array.`);
            return [];
        }
        // If it's not null/undefined but still not an array, throw error
        throw new Error('Unexpected API response structure. Expected an array.');
    }
    console.log(`[getCategories] Fetched ${response.data.length} Categories for key ${userKey}.`);
    return response.data; // Return the direct array

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
  // Pass userKey directly as a query parameter named 'key'
  const params = { 'key': userKey }; 
  const url = `/categories/${id}`;
  console.log(`[getCategory] Fetching URL: ${url} with params:`, params);
  try {
    const headers = await getAuthHeader();
    // Strapi v5 single entry endpoints return { data: Category }
    const response = await axiosInstance.get<{ data: Category }>(url, { params, headers });
    if (!response.data || !response.data.data) {
        console.warn(`[getCategory] Category ${id} not found or no data returned for key ${userKey}.`);
        return null; // Return null if no data property or data is null
    }
    // Key check might be redundant if filtering works, but good for safety
    if (response.data.data.key !== userKey) {
        console.warn(`[getCategory] Key mismatch for category ${id}. Expected ${userKey}, got ${response.data.data.key}.`);
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
  if (!category.key) {
    throw new Error('User key is required in the payload to create a category.');
  }
  const url = '/categories';
  console.log(`[createCategory] Creating category for key ${category.key} with payload:`, {data: category});
  try {
    const headers = await getAuthHeader();
    const response = await axiosInstance.post<{ data: Category }>(url, { data: category }, { headers, params: { populate: '*' } });
    if (!response.data || !response.data.data) {
        throw new Error('Unexpected API response structure after creation.');
    }
    console.log(`[createCategory] Created Category for key ${category.key}:`, response.data.data);
    return response.data.data;
  } catch (error: unknown) {
    const message = error instanceof AxiosError ? error.response?.data?.error?.message || error.message : (error as Error).message;
    console.error(`[createCategory] Failed for key ${category.key}:`, message, error instanceof AxiosError ? error.response?.data : '');
    throw new Error(message || 'Failed to create category.');
  }
};

export const updateCategory = async (id: number, category: Partial<CreateCategoryPayload>): Promise<Category> => {
  if (!category.key) { // Should have key in payload for validation logic if any
    throw new Error('User key is required in the payload to update a category.');
  }
  const userKey = category.key; // Extract key for logging/validation
  const url = `/categories/${id}`;
  // Remove 'key' from the actual update payload sent to Strapi, as 'key' should not be updatable.
  const { key, ...updateData } = category;
  console.log(`[updateCategory] Updating category ${id} for key ${userKey} with payload:`, {data: updateData});

  try {
    const headers = await getAuthHeader();
    const response = await axiosInstance.put<{ data: Category }>(url, { data: updateData }, { headers, params: { populate: '*' } });
     if (!response.data || !response.data.data) {
        throw new Error('Unexpected API response structure after update.');
    }
    // Validate the key in the response matches the original key if needed
    if (response.data.data.key !== userKey) {
        console.error(`[updateCategory] Key mismatch for category ${id} after update. Expected ${userKey}, got ${response.data.data.key}.`);
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

export const deleteCategory = async (id: number, userKey: string): Promise<void> => {
  if (!userKey) {
    throw new Error('User key is required to delete a category.');
  }
  const url = `/categories/${id}`;
  console.log(`[deleteCategory] Deleting category ${id} for key ${userKey}`);
  try {
    const headers = await getAuthHeader();
    // Strapi v5 might not need the key in params if JWT implies ownership or policies handle it
    // For safety, if your policies require explicit key checking on DELETE, ensure backend handles it.
    // Pass userKey directly as a query parameter named 'key'
    await axiosInstance.delete(url, { headers, params: { key: userKey } });
    console.log(`[deleteCategory] Successfully deleted category ${id} for key ${userKey}.`);
  } catch (error: unknown) {
    const message = error instanceof AxiosError ? error.response?.data?.error?.message || error.message : (error as Error).message;
    if (error instanceof AxiosError && error.response?.status === 404) {
        console.warn(`[deleteCategory] Category ${id} not found (404) for key ${userKey}. Assuming already deleted or not owned.`);
        return; // Treat as success if not found for this user
    }
    console.error(`[deleteCategory] Failed for ID ${id}, key ${userKey}:`, message, error instanceof AxiosError ? error.response?.data : '');
    throw new Error(message || `Failed to delete category ${id}.`);
  }
};


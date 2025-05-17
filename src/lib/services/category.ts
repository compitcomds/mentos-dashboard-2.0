
'use server';

import type { Categorie, CreateCategoryPayload } from "@/types/category";
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

export const getCategories = async (userTenentId: string): Promise<Categorie[]> => {
  if (!userTenentId) {
    console.error('[Service getCategories]: userTenentId is missing.');
    throw new Error('User tenent_id is required to fetch categories.');
  }
  const params = {
    'filters[tenent_id][$eq]': userTenentId,
    'populate': '*',
  };
  const url = '/blog-sets';
  console.log(`[getCategories] Fetching URL: ${url} with params:`, params);
  try {
    const headers = await getAuthHeader();
    const response = await axiosInstance.get<FindMany<Categorie>>(url, { params, headers });

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

export const getCategory = async (documentId: string, userTenentId: string): Promise<Categorie | null> => {
  if (!documentId || !userTenentId) {
    console.warn(`[Service getCategory]: documentId (${documentId}) or userTenentId (${userTenentId}) is missing.`);
    return null;
  }
  const params = {
    'populate': '*',
  };
  const url = `/blog-sets/${documentId}`; 
  console.log(`[getCategory] Fetching URL: ${url} for userTenentId ${userTenentId} (no tenent_id filter in query) with params:`, params);
  try {
    const headers = await getAuthHeader();
    const response = await axiosInstance.get<FindOne<Categorie>>(url, { params, headers });
    if (!response.data || !response.data.data) {
      console.warn(`[getCategory] Category with documentId ${documentId} not found or no data returned.`);
      return null;
    }

    // Verify the tenent_id matches after fetching
    if (response.data.data.tenent_id !== userTenentId) {
      console.warn(`[getCategory] tenent_id mismatch for category documentId ${documentId}. Expected ${userTenentId}, got ${response.data.data.tenent_id}. Access denied.`);
      return null;
    }
    console.log(`[getCategory] Fetched Category documentId ${documentId} Data for tenent_id ${userTenentId}:`, response.data.data);
    return response.data.data;
  } catch (error: unknown) {
    let message = `Failed to fetch category with documentId ${documentId}.`;
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const errorDataMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message;
      if (status === 404) {
        console.warn(`[getCategory] Category documentId ${documentId} not found (404).`);
        return null;
      }
       if (status === 403) {
        console.warn(`[getCategory] Access to category documentId ${documentId} forbidden.`);
        return null;
      }
      console.error(`[getCategory] Failed for documentId ${documentId}, userTenentId ${userTenentId}. Status: ${status}, Message: ${errorDataMessage}, Data:`, error.response?.data);
      message = errorDataMessage || `Failed to fetch category documentId ${documentId} (Status: ${status}).`;
    } else if (error instanceof Error) {
      console.error(`[getCategory] Generic error for documentId ${documentId}, userTenentId ${userTenentId}:`, error.message);
      message = error.message;
    } else {
      console.error(`[getCategory] Unknown error for documentId ${documentId}, userTenentId ${userTenentId}:`, error);
    }
    throw new Error(message);
  }
};

export const createCategory = async (category: CreateCategoryPayload): Promise<Categorie> => {
  if (!category.tenent_id) {
    throw new Error('User tenent_id is required in the payload to create a category.');
  }
  const url = '/blog-sets';
  console.log(`[createCategory] Creating category for tenent_id ${category.tenent_id} with payload:`, { data: category });
  try {
    const headers = await getAuthHeader();
    const response = await axiosInstance.post<FindOne<Categorie>>(url, { data: category }, { headers, params: { populate: '*' } });
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

export const updateCategory = async (documentId: string, categoryUpdatePayload: Partial<CreateCategoryPayload>, userTenentIdAuthContext: string): Promise<Categorie> => {
  // userTenentIdAuthContext is for query invalidation or logging, not for filtering the PUT request
  if (!documentId) {
    throw new Error('Document ID is required to update a category.');
  }
  const { tenent_id, ...updateData } = categoryUpdatePayload; // Ensure tenent_id is not in the update payload data
  if (tenent_id) {
    console.warn(`[Service updateCategory]: tenent_id was present in update payload for category ${documentId} but is being excluded. tenent_id should not be updated.`);
  }

  const url = `/blog-sets/${documentId}`;
  console.log(`[updateCategory] Updating category with documentId ${documentId} (Auth context tenent_id: ${userTenentIdAuthContext}). Payload:`, { data: updateData });

  try {
    const headers = await getAuthHeader();
    const response = await axiosInstance.put<FindOne<Categorie>>(url, { data: updateData }, { headers, params: { populate: '*' } });
    if (!response.data || !response.data.data) {
      throw new Error('Unexpected API response structure after update.');
    }
    console.log(`[updateCategory] Updated Category with documentId ${documentId} (Auth context tenent_id ${userTenentIdAuthContext}):`, response.data.data);
    return response.data.data;
  } catch (error: unknown) {
    let detailedMessage = `Failed to update category ${documentId}.`;
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
      } else if (status === 403) {
        detailedMessage = `Forbidden: You do not have permission to update category ${documentId}.`;
      } else if (status === 404) {
        detailedMessage = `Category with documentId ${documentId} not found.`;
      }
    } else if (error instanceof Error) {
      detailedMessage = error.message;
    }
    console.error(`[updateCategory] Failed for documentId ${documentId}, user tenent_id ${userTenentIdAuthContext}. Error: ${detailedMessage}`, "Full error object/data logged:", loggableErrorData);
    throw new Error(detailedMessage);
  }
};

export const deleteCategory = async (documentId: string, userTenentIdAuthContext: string): Promise<Categorie | void> => {
  // userTenentIdAuthContext is for query invalidation or logging
  if (!documentId) {
    throw new Error('Document ID is required to delete a category.');
  }
  const url = `/blog-sets/${documentId}`; 
  console.log(`[deleteCategory] Deleting category with documentId ${documentId} (Auth context tenent_id: ${userTenentIdAuthContext})`);
  try {
    const headers = await getAuthHeader();
    const response = await axiosInstance.delete<FindOne<Categorie>>(url, { headers });

    if (response.status === 200 && response.data?.data) {
      console.log(`[deleteCategory] Successfully deleted category ${documentId}.`);
      return response.data.data;
    } else if (response.status === 204) {
      console.log(`[deleteCategory] Successfully deleted category ${documentId} (no content returned).`);
      return;
    }
    console.warn(`[deleteCategory] Unexpected response status ${response.status} after deleting category ${documentId}. Data:`, response.data);
    return response.data?.data;
  } catch (error: unknown) {
    let message = `Failed to delete category ${documentId}.`;
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
        message = `API Error (Status ${status || strapiError.status || 'unknown'}): ${mainMsg}`;
        if (strapiError.details && Object.keys(strapiError.details).length > 0) {
          try {
            message += ` Details: ${JSON.stringify(strapiError.details)}`;
          } catch (e) { /* ignore */ }
        }
      } else if (error.response?.data?.message && typeof error.response.data.message === 'string') {
        message = `API Error (Status ${status || 'unknown'}): ${error.response.data.message}`;
      } else if (typeof error.response?.data === 'string' && error.response.data.trim() !== '') {
        message = `API Error (Status ${status || 'unknown'}): ${error.response.data}`;
      } else {
        message = `API Error (Status ${status || 'unknown'}): ${error.message}.`;
      }

      if (status === 500 ) {
        message = `Internal Server Error. Please check Strapi server logs for details on deleting category ${documentId}. Raw response: ${JSON.stringify(loggableErrorData)}`;
      } else if (status === 403) {
        message = `Forbidden: You do not have permission to delete category ${documentId}.`;
      } else if (status === 404) {
        message = `Category with documentId ${documentId} not found.`;
      }
    } else if (error instanceof Error) {
      message = error.message;
    }
    console.error(`[deleteCategory] Failed for documentId ${documentId}, user tenent_id ${userTenentIdAuthContext}. Error: ${message}`, "Full error object/data logged:", loggableErrorData);
    throw new Error(message);
  }
};

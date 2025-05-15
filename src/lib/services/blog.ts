
'use server';

import type { Blog, CreateBlogPayload } from "@/types/blog";
import type { FindMany, FindOne } from "@/types/strapi_response"; // Import Strapi response types
import axiosInstance from "@/lib/axios";
import { getAccessToken } from "@/lib/actions/auth";
import { AxiosError } from 'axios';

// Helper to get Authorization header
async function getAuthHeader() {
  const token = await getAccessToken();
  console.log(`[getAuthHeader] Blog Token: ${token ? 'Exists' : 'Not Found'}`);
  if (!token) {
    throw new Error("Authentication token not found.");
  }
  return { Authorization: `Bearer ${token}` };
}

// Get all blogs for a specific user tenent_id
export const getBlogs = async (userTenentId: string): Promise<Blog[]> => {
    if (!userTenentId) {
        console.error('[Service getBlogs]: userTenentId is missing.');
        throw new Error('User tenent_id is required to fetch blogs.');
    }
     const params = {
        'filters[tenent_id][$eq]': userTenentId,
        'populate':'*', // Keep populate params
    };
    const url = '/blogs';
    console.log(`[getBlogs] Fetching URL: ${url} with params:`, params);

    try {
        const headers = await getAuthHeader();
        // Expect Strapi v5 collection response
        const response = await axiosInstance.get<FindMany<Blog>>(url, { params, headers });
        
        if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
           console.error(`[getBlogs] Unexpected API response structure for tenent_id ${userTenentId}. Expected 'data' array, received:`, response.data);
           if (response.data === null || response.data === undefined) {
                console.warn(`[getBlogs] API returned null or undefined for tenent_id ${userTenentId}. Returning empty array.`);
                return [];
           }
           return []; // Return empty array if API returns valid empty array or unexpected structure
        }
        console.log(`[getBlogs] Fetched ${response.data.data.length} Blogs for tenent_id ${userTenentId}.`);
        return response.data.data;

    } catch (error: unknown) {
        let message = `Failed to fetch blogs for tenent_id ${userTenentId}`;
        if (error instanceof AxiosError) {
            const status = error.response?.status;
            const errorData = error.response?.data || { message: error.message };
            console.error(`[getBlogs] Failed to fetch blogs from ${url} (${status}) for tenent_id ${userTenentId}:`, errorData);
            message = (errorData as any)?.error?.message || `Failed to fetch blogs (${status}) - ${(errorData as any).message || 'Unknown API error'}`;
        } else if (error instanceof Error) {
            console.error(`[getBlogs] Generic Error for tenent_id ${userTenentId}:`, error.message);
            message = error.message;
        } else {
            console.error(`[getBlogs] Unknown Error for tenent_id ${userTenentId}:`, error);
        }
        throw new Error(message);
    }
};

// Get a specific blog by id, ensuring it matches the userTenentId
export const getBlog = async (id: string, userTenentId: string): Promise<Blog | null> => {
    if (!id) return null;
    if (!userTenentId) {
        console.error(`[Service getBlog]: userTenentId is missing for blog ID ${id}.`);
        throw new Error('User tenent_id is required to fetch a specific blog.');
    }
    const params = {
        // Strapi v5 doesn't typically filter by user key on single GET by ID if policies handle access
        // However, if your backend /blogs/:id requires tenent_id for filtering, add it:
        // 'filters[tenent_id][$eq]': userTenentId,
        'populate':'*', // Keep populate params
    };
    const url = `/blogs/${id}`;
    console.log(`[getBlog] Fetching URL: ${url} with params:`, params);

    try {
        const headers = await getAuthHeader();
        const response = await axiosInstance.get<FindOne<Blog>>(url, { params, headers });

        if (!response.data || !response.data.data || typeof response.data.data !== 'object' || response.data.data === null) {
            console.error(`[getBlog] Unexpected API response structure for blog ${id} from ${url}. Expected 'data' object, received:`, response.data);
            return null; // Return null for unexpected structure, could also throw
        }

        // Important: Verify the tenent_id matches
        if (response.data.data.tenent_id !== userTenentId) {
             console.warn(`[getBlog] Fetched blog ${id} tenent_id (${response.data.data.tenent_id}) does not match requested userTenentId (${userTenentId}). Access denied or wrong item.`);
             return null; // Or throw an authorization error
        }

        console.log(`[getBlog] Fetched Blog ${id} Data for tenent_id ${userTenentId}:`, response.data.data);
        return response.data.data;

    } catch (error: unknown) {
         let message = `Failed to fetch blog ${id} for tenent_id ${userTenentId}`;
         if (error instanceof AxiosError) {
            const status = error.response?.status;
            const errorData = error.response?.data || { message: error.message };
             if (status === 404) {
                 console.warn(`[getBlog] Blog ${id} not found for tenent_id ${userTenentId}.`);
                 return null;
             }
             if (status === 403) {
                console.warn(`[getBlog] Blog ${id} forbidden for tenent_id ${userTenentId}.`);
                return null;
            }
            console.error(`[getBlog] Failed to fetch blog ${id} from ${url} (Status: ${status}) for tenent_id ${userTenentId}:`, JSON.stringify(errorData, null, 2));
            const strapiErrorMessage = (errorData as any)?.error?.message;
            message = strapiErrorMessage || `Failed to fetch blog ${id} (${status}) - ${(errorData as any).message || 'Unknown API error'}`;
        } else if (error instanceof Error) {
            console.error(`[getBlog] Generic Error for blog ${id}, tenent_id ${userTenentId}:`, error.message);
            message = error.message;
        } else {
            console.error(`[getBlog] Unknown Error for blog ${id}, tenent_id ${userTenentId}:`, error);
        }
        throw new Error(message);
    }
};

// Create a blog, ensuring the userTenentId is included in the payload
export const createBlog = async (blog: CreateBlogPayload): Promise<Blog> => {
    if (!blog.tenent_id) { // Expect tenent_id directly in payload
        console.error('[Service createBlog]: tenent_id is missing in payload.');
        throw new Error('User tenent_id is required in the payload to create a blog.');
    }
    const userTenentId = blog.tenent_id;
    const url = '/blogs';
    const params = { populate: '*' }; // Populate to get full response
    console.log(`[createBlog] Creating blog at ${url} with tenent_id ${userTenentId} and payload:`, JSON.stringify({ data: blog }, null, 2));
    try {
        const headers = await getAuthHeader();
        const response = await axiosInstance.post<FindOne<Blog>>(url, // Expect FindOne<Blog>
            { data: blog },
            { headers, params }
        );

        if (!response.data || !response.data.data) {
            console.error(`[createBlog] Unexpected API response structure after creation from ${url}:`, response.data);
            throw new Error('Unexpected API response structure after creation.');
        }
        console.log(`[createBlog] Created Blog Data for tenent_id ${userTenentId}:`, response.data.data);
        return response.data.data;

    } catch (error: unknown) {
        let message = `Failed to create blog for tenent_id ${userTenentId}.`;
        if (error instanceof AxiosError) {
            const status = error.response?.status;
            const errorData = error.response?.data || { message: error.message };
            console.error(`[createBlog] Failed to create blog at ${url} (${status}) for tenent_id ${userTenentId}:`, errorData);
            const strapiErrorMessage = (errorData as any)?.error?.message;
            const strapiErrorDetails = (errorData as any)?.error?.details;
            console.error("[createBlog] Strapi Error Details:", strapiErrorDetails);
            message = strapiErrorMessage || `Failed to create blog (${status}) - ${(errorData as any).message || 'Unknown API error'}`;
        } else if (error instanceof Error) {
            console.error(`[createBlog] Generic Error for tenent_id ${userTenentId}:`, error.message);
            message = error.message;
        } else {
            console.error(`[createBlog] Unknown Error for tenent_id ${userTenentId}:`, error);
        }
        throw new Error(message);
    }
};

// Update a blog by id, ensuring it's for the correct userTenentId
export const updateBlog = async (id: string, blog: Partial<CreateBlogPayload>, userTenentId: string): Promise<Blog> => {
    if (!userTenentId) {
        console.error(`[Service updateBlog]: userTenentId is missing for update of blog ID ${id}.`);
        throw new Error('User tenent_id is required to update a blog.');
    }
     // Ensure the payload doesn't accidentally try to change the tenent_id
     const { tenent_id, ...updateData } = blog;
     if (tenent_id && tenent_id !== userTenentId) {
         console.warn(`[Service updateBlog]: Attempted to change tenent_id during update for blog ${id}. Tenent_id change ignored.`);
     }

    const url = `/blogs/${id}`;
    console.log(`[updateBlog] Updating blog ${id} at ${url} (userTenentId: ${userTenentId}) with payload:`, JSON.stringify({ data: updateData }, null, 2));
    try {
        const headers = await getAuthHeader();
        const response = await axiosInstance.put<FindOne<Blog>>(url, // Expect FindOne<Blog>
            { data: updateData },
            {
                headers,
                params: {
                    populate: '*',
                }
            }
        );

        if (!response.data || !response.data.data) {
            console.error(`[updateBlog] Unexpected API response structure after update for blog ${id} from ${url}:`, response.data);
            throw new Error('Unexpected API response structure after update.');
        }
        // Verify the tenent_id in the response matches the original userTenentId
        if (response.data.data.tenent_id !== userTenentId) {
            console.error(`[updateBlog] Tenent_id mismatch after update for blog ${id}. Expected ${userTenentId}, got ${response.data.data.tenent_id}.`);
            throw new Error('Blog update resulted in tenent_id mismatch. This indicates a potential authorization bypass or an issue with the API update logic.');
        }
        console.log(`[updateBlog] Updated Blog ${id} Data for tenent_id ${userTenentId}:`, response.data.data);
        return response.data.data;

    } catch (error: unknown) {
         let message = `Failed to update blog ${id} for tenent_id ${userTenentId}.`;
         if (error instanceof AxiosError) {
            const status = error.response?.status;
            const errorData = error.response?.data || { message: error.message };
             if (status === 404 || status === 403) {
                 console.error(`[updateBlog] Blog ${id} not found or not authorized for tenent_id ${userTenentId} (Status: ${status}).`);
                 throw new Error(`Blog not found or update not authorized (Status: ${status}).`);
             }
            console.error(`[updateBlog] Failed to update blog ${id} at ${url} (${status}) for tenent_id ${userTenentId}:`, errorData);
            const strapiErrorMessage = (errorData as any)?.error?.message;
            const strapiErrorDetails = (errorData as any)?.error?.details;
            console.error("[updateBlog] Strapi Error Details:", strapiErrorDetails);
            message = strapiErrorMessage || `Failed to update blog ${id} (${status}) - ${(errorData as any).message || 'Unknown API error'}`;
        } else if (error instanceof Error) {
            console.error(`[updateBlog] Generic Error for blog ${id}, tenent_id ${userTenentId}:`, error.message);
            message = error.message;
        } else {
            console.error(`[updateBlog] Unknown Error for blog ${id}, tenent_id ${userTenentId}:`, error);
        }
        throw new Error(message);
    }
};

// Delete a blog by id, ensuring it's for the correct userTenentId
export const deleteBlog = async (id: string, userTenentId: string): Promise<Blog | void> => {
     if (!userTenentId) {
        console.error(`[Service deleteBlog]: userTenentId is missing for deletion of blog ID ${id}.`);
        throw new Error('User tenent_id is required to delete a blog.');
    }
    const url = `/blogs/${id}`;
    // For delete, Strapi v5 might need a way to confirm ownership if not handled by policies alone.
    // This could be by attempting to fetch it first (less ideal) or by adding tenent_id to the query if your backend supports it for DELETE.
    // For now, we assume policies handle ownership based on the JWT.
    console.log(`[deleteBlog] Deleting blog ${id} at ${url} (userTenentId: ${userTenentId})`);
    try {
        const headers = await getAuthHeader();
        const response = await axiosInstance.delete<FindOne<Blog>>(url, { // Expect FindOne<Blog>
            headers,
            // params: { 'filters[tenent_id][$eq]': userTenentId } // Adding filter here might not work for DELETE standard REST.
                                                               // Backend policies are the primary guard.
        });

        if (response.status === 200 || response.status === 204) {
            console.log(`[deleteBlog] Successfully deleted blog ${id} for tenent_id ${userTenentId}.`);
            return response.data?.data; // response.data.data will contain the deleted item
        } else {
             console.warn(`[deleteBlog] Unexpected success status ${response.status} when deleting blog ${id} at ${url} for tenent_id ${userTenentId}.`);
             return response.data?.data;
        }

    } catch (error: unknown) {
        let message = `Failed to delete blog ${id} for tenent_id ${userTenentId}.`;
        if (error instanceof AxiosError) {
            const status = error.response?.status;
            const errorData = error.response?.data || { message: error.message };
             if (status === 404 || status === 403) {
                 console.error(`[deleteBlog] Blog ${id} not found or not authorized for tenent_id ${userTenentId} (Status: ${status}).`);
                 throw new Error(`Blog not found or deletion not authorized (Status: ${status}).`);
             }
            console.error(`[deleteBlog] Failed to delete blog ${id} at ${url} (${status}) for tenent_id ${userTenentId}:`, errorData);
            const strapiErrorMessage = (errorData as any)?.error?.message;
            message = strapiErrorMessage || `Failed to delete blog ${id} (${status}) - ${(errorData as any).message || 'Unknown API error'}`;
        } else if (error instanceof Error) {
            console.error(`[deleteBlog] Generic Error for blog ${id}, tenent_id ${userTenentId}:`, error.message);
            message = error.message;
        } else {
            console.error(`[deleteBlog] Unknown Error for blog ${id}, tenent_id ${userTenentId}:`, error);
        }
        throw new Error(message);
    }
};

    
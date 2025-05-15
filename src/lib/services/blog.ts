
'use server';

import type { Blog, CreateBlogPayload } from "@/types/blog";
import axiosInstance from "@/lib/axios";
import { getAccessToken } from "@/lib/actions/auth";
import { AxiosError } from 'axios';

// Helper to get Authorization header
async function getAuthHeader() {
  const token = await getAccessToken();
  console.log(`[getAuthHeader] Blog Token: ${token}`);
  if (!token) {
    throw new Error("Authentication token not found.");
  }
  return { Authorization: `Bearer ${token}` };
}

// Get all blogs for a specific user key
export const getBlogs = async (userKey: string): Promise<Blog[]> => {
    if (!userKey) {
        console.error('[Service getBlogs]: userKey is missing.');
        throw new Error('User key is required to fetch blogs.');
    }
     const params = {
        'filters[tenent_id][$eq]':userKey,
        'populate':'*', // Keep populate params
    };
    const url = '/blogs';
    console.log(`[getBlogs] Fetching URL: ${url} with params:`, params);

    try {
        const headers = await getAuthHeader();
        const response = await axiosInstance.get<Blog[]>(url, { params, headers });
        if (!response.data || !Array.isArray(response.data)) {
           console.error(`[getBlogs] Unexpected API response structure for key ${userKey}. Expected an array, received:`, response.data);
            // Handle cases where API might return non-array for empty results
           if (response.data === null || response.data === undefined || !Array.isArray(response.data)) {
                throw new Error('Unexpected API response structure. Expected an array.');
           }
           return []; // Return empty array if API returns valid empty array
        }
        return response.data;

    } catch (error: unknown) {
        let message = `Failed to fetch blogs for key ${userKey}`;
        if (error instanceof AxiosError) {
            const status = error.response?.status;
            const errorData = error.response?.data || { message: error.message };
            console.error(`[getBlogs] Failed to fetch blogs from ${url} (${status}) for key ${userKey}:`, errorData);
            message = errorData?.error?.message || `Failed to fetch blogs (${status}) - ${errorData.message || 'Unknown API error'}`;
        } else if (error instanceof Error) {
            console.error(`[getBlogs] Generic Error for key ${userKey}:`, error.message);
            message = error.message;
        } else {
            console.error(`[getBlogs] Unknown Error for key ${userKey}:`, error);
        }
        throw new Error(message);
    }
};

// Get a specific blog by id, ensuring it matches the userKey
export const getBlog = async (id: string, userKey: string): Promise<Blog | null> => {
    if (!id) return null;
    if (!userKey) {
        console.error(`[Service getBlog]: userKey is missing for blog ID ${id}.`);
        throw new Error('User key is required to fetch a specific blog.');
    }
    const params = {
        'filters[tenent_id][$eq]':userKey,
        'populate':'*', // Keep populate params
    };
    const url = `/blogs/${id}`;
    console.log(`[getBlog] Fetching URL: ${url} with params:`, params);

    try {
        const headers = await getAuthHeader();
        const response = await axiosInstance.get<Blog>(url, { params, headers });

        if (!response || !response.data || typeof response.data !== 'object' || response.data === null) {
            console.error(`[getBlog] Unexpected API response structure for blog ${id} from ${url}. Expected an object, received:`, response.data);
            throw new Error('Unexpected API response structure.');
        }

        // Important: Verify the key matches (though the API filter should handle this)
        if (response.data.key !== userKey) {
             console.warn(`[getBlog] Fetched blog ${id} key (${response.data.key}) does not match requested userKey (${userKey}).`);
             // Decide behavior: return null, throw error, etc. Returning null might be safer.
             return null;
        }

        console.log(`[getBlog] Fetched Blog ${id} Data for key ${userKey}:`, response.data);
        return response.data;

    } catch (error: unknown) {
         let message = `Failed to fetch blog ${id} for key ${userKey}`;
         if (error instanceof AxiosError) {
            const status = error.response?.status;
            const errorData = error.response?.data || { message: error.message };
             // Handle 404 specifically (blog not found or doesn't belong to user)
             if (status === 404) {
                 console.warn(`[getBlog] Blog ${id} not found for key ${userKey}.`);
                 return null; // Return null for not found
             }
            console.error(`[getBlog] Failed to fetch blog ${id} from ${url} (Status: ${status}) for key ${userKey}:`, JSON.stringify(errorData, null, 2));
            const strapiErrorMessage = errorData?.error?.message;
            message = strapiErrorMessage || `Failed to fetch blog ${id} (${status}) - ${errorData.message || 'Unknown API error'}`;
        } else if (error instanceof Error) {
            console.error(`[getBlog] Generic Error for blog ${id}, key ${userKey}:`, error.message);
            message = error.message;
        } else {
            console.error(`[getBlog] Unknown Error for blog ${id}, key ${userKey}:`, error);
        }
        throw new Error(message);
    }
};

// Create a blog, ensuring the userKey is included in the payload
export const createBlog = async (blog: CreateBlogPayload): Promise<Blog> => {
    if (!blog.key) {
        console.error('[Service createBlog]: userKey (blog.key) is missing in payload.');
        throw new Error('User key is required in the payload to create a blog.');
    }
    const userKey = blog.key;
    const url = '/blogs';
    const params = { populate: '*' }; // Populate to get full response
    console.log(`[createBlog] Creating blog at ${url} with key ${userKey} and payload:`, JSON.stringify({ data: blog }, null, 2));
    try {
        const headers = await getAuthHeader();
        const response = await axiosInstance.post<{ data: Blog }>(url,
            { data: blog },
            { headers, params }
        );

        if (!response.data || !response.data.data) {
            console.error(`[createBlog] Unexpected API response structure after creation from ${url}:`, response.data);
            throw new Error('Unexpected API response structure after creation.');
        }
        console.log(`[createBlog] Created Blog Data for key ${userKey}:`, response.data.data);
        return response.data.data;

    } catch (error: unknown) {
        let message = `Failed to create blog for key ${userKey}.`;
        if (error instanceof AxiosError) {
            const status = error.response?.status;
            const errorData = error.response?.data || { message: error.message };
            console.error(`[createBlog] Failed to create blog at ${url} (${status}) for key ${userKey}:`, errorData);
            const strapiErrorMessage = errorData?.error?.message;
            const strapiErrorDetails = errorData?.error?.details;
            console.error("[createBlog] Strapi Error Details:", strapiErrorDetails);
            message = strapiErrorMessage || `Failed to create blog (${status}) - ${errorData.message || 'Unknown API error'}`;
        } else if (error instanceof Error) {
            console.error(`[createBlog] Generic Error for key ${userKey}:`, error.message);
            message = error.message;
        } else {
            console.error(`[createBlog] Unknown Error for key ${userKey}:`, error);
        }
        throw new Error(message);
    }
};

// Update a blog by id, potentially validating against userKey if needed
export const updateBlog = async (id: string, blog: Partial<CreateBlogPayload>, userKey: string): Promise<Blog> => {
    if (!userKey) {
        // This check might be redundant if useUpdateBlog ensures key, but good for safety
        console.error(`[Service updateBlog]: userKey is missing for update of blog ID ${id}.`);
        throw new Error('User key is required to update a blog.');
    }
     // Ensure the payload doesn't accidentally try to change the key
     const { key, ...updateData } = blog;
     if (key && key !== userKey) {
         console.warn(`[Service updateBlog]: Attempted to change key during update for blog ${id}. Key change ignored.`);
     }

    const url = `/blogs/${id}`;
    console.log(`[updateBlog] Updating blog ${id} at ${url} (userKey: ${userKey}) with payload:`, JSON.stringify({ data: updateData }, null, 2));
    try {
        const headers = await getAuthHeader();
        // Add key to query params for potential backend validation/scoping, though PUT usually relies on ID
        const response = await axiosInstance.put<{ data: Blog }>(url,
            { data: updateData },
            {
                headers,
                params: {
                    populate: '*', // Populate to get full response
                    // key: userKey // Optionally send key in params if backend uses it for validation on PUT
                }
            }
        );

        if (!response.data || !response.data.data) {
            console.error(`[updateBlog] Unexpected API response structure after update for blog ${id} from ${url}:`, response.data);
            throw new Error('Unexpected API response structure after update.');
        }
        // Optionally re-verify the key after update
        if (response.data.data.key !== userKey) {
            console.error(`[updateBlog] Key mismatch after update for blog ${id}. Expected ${userKey}, got ${response.data.data.key}.`);
            throw new Error('Blog update resulted in key mismatch.');
        }
        console.log(`[updateBlog] Updated Blog ${id} Data for key ${userKey}:`, response.data.data);
        return response.data.data;

    } catch (error: unknown) {
         let message = `Failed to update blog ${id} for key ${userKey}.`;
         if (error instanceof AxiosError) {
            const status = error.response?.status;
            const errorData = error.response?.data || { message: error.message };
             // Handle 404 (not found) or 403 (forbidden - likely wrong user)
             if (status === 404 || status === 403) {
                 console.error(`[updateBlog] Blog ${id} not found or not authorized for key ${userKey} (Status: ${status}).`);
                 // Throw a more specific error
                 throw new Error(`Blog not found or update not authorized (Status: ${status}).`);
             }
            console.error(`[updateBlog] Failed to update blog ${id} at ${url} (${status}) for key ${userKey}:`, errorData);
            const strapiErrorMessage = errorData?.error?.message;
            const strapiErrorDetails = errorData?.error?.details;
            console.error("[updateBlog] Strapi Error Details:", strapiErrorDetails);
            message = strapiErrorMessage || `Failed to update blog ${id} (${status}) - ${errorData.message || 'Unknown API error'}`;
        } else if (error instanceof Error) {
            console.error(`[updateBlog] Generic Error for blog ${id}, key ${userKey}:`, error.message);
            message = error.message;
        } else {
            console.error(`[updateBlog] Unknown Error for blog ${id}, key ${userKey}:`, error);
        }
        throw new Error(message);
    }
};

// Delete a blog by id, potentially validating against userKey if backend supports it
export const deleteBlog = async (id: string, userKey: string): Promise<Blog | void> => {
     if (!userKey) {
        console.error(`[Service deleteBlog]: userKey is missing for deletion of blog ID ${id}.`);
        throw new Error('User key is required to delete a blog.');
    }
    const url = `/blogs/${id}`;
    console.log(`[deleteBlog] Deleting blog ${id} at ${url} (userKey: ${userKey})`);
    try {
        const headers = await getAuthHeader();
        // Add key to query params if backend uses it for delete validation
        const response = await axiosInstance.delete<{ data?: Blog }>(url, {
            headers,
            // params: { key: userKey } // Optional: Add if backend validates key on delete
        });

        if (response.status === 200 || response.status === 204) {
            console.log(`[deleteBlog] Successfully deleted blog ${id} for key ${userKey}.`);
            return response.data?.data;
        } else {
             console.warn(`[deleteBlog] Unexpected success status ${response.status} when deleting blog ${id} at ${url} for key ${userKey}.`);
             return response.data?.data;
        }

    } catch (error: unknown) {
        let message = `Failed to delete blog ${id} for key ${userKey}.`;
        if (error instanceof AxiosError) {
            const status = error.response?.status;
            const errorData = error.response?.data || { message: error.message };
             // Handle 404 (not found) or 403 (forbidden - likely wrong user)
             if (status === 404 || status === 403) {
                 console.error(`[deleteBlog] Blog ${id} not found or not authorized for key ${userKey} (Status: ${status}).`);
                 throw new Error(`Blog not found or deletion not authorized (Status: ${status}).`);
             }
            console.error(`[deleteBlog] Failed to delete blog ${id} at ${url} (${status}) for key ${userKey}:`, errorData);
            const strapiErrorMessage = errorData?.error?.message;
            message = strapiErrorMessage || `Failed to delete blog ${id} (${status}) - ${errorData.message || 'Unknown API error'}`;
        } else if (error instanceof Error) {
            console.error(`[deleteBlog] Generic Error for blog ${id}, key ${userKey}:`, error.message);
            message = error.message;
        } else {
            console.error(`[deleteBlog] Unknown Error for blog ${id}, key ${userKey}:`, error);
        }
        throw new Error(message);
    }
};

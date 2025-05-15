
'use server';

import axiosInstance from '@/lib/axios';
import { getAccessToken } from '@/lib/actions/auth';
import type {
    WebMedia,
    UpdateWebMediaPayload,
    CreateWebMediaPayload,
    UploadFile,
    CombinedMediaData,
} from '@/types/media';
import { AxiosError } from 'axios'; // Import AxiosError

// Helper to get Authorization header
async function getAuthHeader() {
    const token = await getAccessToken(); // Use the action to get token (hardcoded in preview)
    if (!token) {
        throw new Error("Authentication token not found.");
    }
    return { Authorization: `Bearer ${token}` };
}

/**
 * Fetches combined media data (metadata from web_medias and linked file info).
 * Filters by the provided userKey.
 * Adjusts for Strapi v5 direct response structure (no 'data' wrapper for lists).
 * @param {string} userKey The user's key to filter media by.
 * @returns {Promise<CombinedMediaData[]>} A promise that resolves with the combined media data.
 */
export async function fetchMediaFiles(userKey: string): Promise<CombinedMediaData[]> {
    if (!userKey) {
        console.error('[Service fetchMediaFiles]: userKey is missing. Cannot fetch media.');
        throw new Error('User key is required to fetch media files.');
    }
    console.log(`[Service fetchMediaFiles]: Fetching web media entries with key '${userKey}'...`);
    const headers = await getAuthHeader();
    // Change filtering method to use 'key' directly as requested
    const params = {
        'populate[media]': '*', // Populate the media relation
        'sort[0]': 'createdAt:desc', // Sort by creation date
        'key': userKey, // Filter by the key field using direct parameter
    };
    const url = '/web-medias';
    console.log(`[fetchMediaFiles] Fetching URL: ${url} with params:`, JSON.stringify(params));

    try {
        const response = await axiosInstance.get<WebMedia[]>(url, { headers, params });

        console.log('[Service fetchMediaFiles]: Raw API Response Status:', response.status);
        // Log raw data before any processing
        console.log('[Service fetchMediaFiles]: Raw API Response Data:', JSON.stringify(response.data, null, 2));


        // Check if response.data exists and is an array
        if (!response.data || !Array.isArray(response.data)) {
             console.error('[Service fetchMediaFiles]: Unexpected API response structure. Expected an array, received:', response.data);
             // Handle potential non-array responses (e.g., null, undefined) gracefully
             if (response.data === null || response.data === undefined) {
                  console.warn('[Service fetchMediaFiles]: API returned null or undefined. Returning empty array.');
                  return [];
             }
             // If it's not null/undefined but still not an array, throw error
             throw new Error('Unexpected API response structure. Expected an array.');
        }

        // Check if the array is empty
        if (response.data.length === 0) {
            console.log(`[Service fetchMediaFiles]: API returned an empty array for key '${userKey}'. No media found.`);
            return []; // Return empty array if API correctly returns empty
        }


        // Transform the data into the CombinedMediaData structure (Strapi v5)
        const combinedData: CombinedMediaData[] = response.data.map((item: WebMedia) => {
            // Safely access the base URL (remove trailing /api if present)
            const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/api$/, '');
            // console.log(`[fetchMediaFiles] Using API Base URL for constructing URLs: ${apiBaseUrl}`);

            // Helper to construct full URLs safely
             const constructUrl = (path: string | null | undefined): string | null => {
                 if (!path) return null;
                 if (path.startsWith('http')) return path; // Already absolute
                 const cleanPath = path.startsWith('/') ? path : `/${path}`;
                 const fullUrl = `${apiBaseUrl}${cleanPath}`;
                 // console.log(`[constructUrl] Input: ${path}, Output: ${fullUrl}`);
                 return fullUrl;
             };


            const mediaFile = item.media; // Access media directly

            // Log each item and its media relation for debugging
            // console.log(`[fetchMediaFiles] Processing item ID: ${item.id}, Media relation:`, mediaFile);

             // Validate essential mediaFile properties
             if (!mediaFile || typeof mediaFile !== 'object') {
                console.warn(`[fetchMediaFiles] Item ID ${item.id} has missing or invalid media relation. Skipping.`);
                return null; // Return null for filtering later
            }
             if (typeof mediaFile.id !== 'number') {
                 console.warn(`[fetchMediaFiles] Item ID ${item.id}, Media relation ID ${mediaFile.id} is invalid. Skipping.`);
                 return null;
             }


            return {
                webMediaId: item.id,
                name: item.name || mediaFile.name || 'Unnamed Media', // Add fallback for name
                alt: item.alt,
                key: item.key, // Include the key from the web_media entry
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
                publishedAt: item.publishedAt,
                // --- File related data ---
                fileId: mediaFile.id, // Already validated as number
                fileUrl: constructUrl(mediaFile.url),
                fileName: mediaFile.name ?? 'N/A', // Use original file name
                mime: mediaFile.mime ?? null,
                // Prefer sizeInBytes if available, fallback to size (KB), ensure valid number
                size: typeof mediaFile.sizeInBytes === 'number' ? mediaFile.sizeInBytes : (typeof mediaFile.size === 'number' ? mediaFile.size * 1024 : null),
                // Construct full thumbnail URL using helper, fallback to main URL
                thumbnailUrl: constructUrl(mediaFile.formats?.thumbnail?.url) ?? constructUrl(mediaFile.url),
            };
        }).filter((item): item is CombinedMediaData => item !== null); // Filter out skipped items and assert type

        console.log(`[Service fetchMediaFiles]: Successfully transformed ${combinedData.length} items for key '${userKey}'.`);
        return combinedData;

    } catch (error: unknown) { // Catch unknown type
        let message = `Failed to fetch media files for key '${userKey}'.`;
        if (error instanceof AxiosError) {
            console.error('[Service fetchMediaFiles] Axios Error:', error.response?.status, JSON.stringify(error.response?.data, null, 2) || error.message);
            const strapiError = error.response?.data?.error;
            message = strapiError?.message || error.message || message;
        } else if (error instanceof Error) {
            console.error('[Service fetchMediaFiles] Generic Error:', error.message, error.stack);
            message = error.message;
        } else {
            console.error('[Service fetchMediaFiles] Unknown Error:', error);
        }
        // Throw a new error with a more informative message
        throw new Error(`Failed to fetch media files: ${message}`);
    }
}


/**
 * Uploads a file using the Strapi upload plugin (Strapi v5).
 * @param {FormData} formData The form data containing the file to upload.
 * @returns {Promise<UploadFile[]>} A promise that resolves with the uploaded file data (array).
 */
export async function uploadFile(formData: FormData): Promise<UploadFile[]> {
    console.log('[Service uploadFile]: Attempting file upload...');
    const headers = await getAuthHeader();

    try {
        // Strapi v5 upload returns an array of uploaded files
        const response = await axiosInstance.post<UploadFile[]>('/upload', formData, {
            headers: {
                ...headers,
                // Let Axios set Content-Type for FormData
                 'Content-Type': 'multipart/form-data',
            },
        });
        console.log('[Service uploadFile]: File uploaded successfully:', response.data);
        if (!Array.isArray(response.data) || response.data.length === 0) {
            throw new Error("Upload response was empty or not an array.");
        }
        return response.data; // Return the validated data
    } catch (error: unknown) {
        let message = 'Unknown upload error';
        if (error instanceof AxiosError) {
            console.error('[Service uploadFile] Axios Error:', error.response?.status, error.response?.data || error.message);
            message = error.response?.data?.error?.message || error.message || message;
        } else if (error instanceof Error) {
            console.error('[Service uploadFile] Generic Error:', error.message);
            message = error.message;
        } else {
            console.error('[Service uploadFile] Unknown Error:', error);
        }
        throw new Error(`File upload failed: ${message}`);
    }
}


/**
 * Creates a new entry in the web_medias collection (Strapi v5 format).
 * @param {CreateWebMediaPayload} payload The data for the new web media entry, MUST include the user's key.
 * @returns {Promise<WebMedia>} A promise that resolves with the created web media data.
 */
export async function createWebMedia(payload: CreateWebMediaPayload): Promise<WebMedia> {
     if (!payload.key) {
        console.error('[Service createWebMedia]: userKey (payload.key) is missing. Cannot create web media entry.');
        throw new Error('User key is required in the payload to create a web media entry.');
    }
     console.log('[Service createWebMedia]: Attempting to create web media entry with payload:', JSON.stringify({ data: payload }, null, 2));
     const headers = await getAuthHeader();
     try {
         // Strapi v5 expects payload wrapped in 'data' object
         const response = await axiosInstance.post<{ data: WebMedia }>('/web-medias', { data: payload }, {
             headers,
             params: { populate: 'media' } // Populate media relation in response
         });

         if (!response.data || !response.data.data) {
             throw new Error("Invalid response structure after creating web media.");
         }
         console.log(`[Service createWebMedia]: Web media entry created successfully for key '${payload.key}':`, response.data.data);
         return response.data.data; // Return the 'data' part of the response
     } catch (error: unknown) {
         let message = `Failed to create web media entry for key '${payload.key}'.`;
         if (error instanceof AxiosError) {
            console.error('[Service createWebMedia] Axios Error:', error.response?.status, JSON.stringify(error.response?.data, null, 2) || error.message);
            const strapiError = error.response?.data?.error;
            message = strapiError?.message || error.message || message;
        } else if (error instanceof Error) {
            console.error('[Service createWebMedia] Generic Error:', error.message, error.stack);
            message = error.message;
        } else {
            console.error('[Service createWebMedia] Unknown Error:', error);
        }
         throw new Error(message);
     }
}


/**
 * Updates an existing entry in the web_medias collection (Strapi v5 format).
 * Note: Does not update the 'key' field.
 * @param {number} id The ID of the web media entry to update.
 * @param {UpdateWebMediaPayload} payload The data to update (name, alt).
 * @returns {Promise<WebMedia>} A promise that resolves with the updated web media data.
 */
export async function updateWebMedia(id: number, payload: UpdateWebMediaPayload): Promise<WebMedia> {
    console.log(`[Service updateWebMedia]: Attempting to update web media entry ${id} with payload:`, payload);
    const headers = await getAuthHeader();
    try {
         // Strapi v5 update expects payload wrapped in 'data'
         const response = await axiosInstance.put<{ data: WebMedia }>(`/web-medias/${id}`, { data: payload }, {
             headers,
             params: { populate: 'media' } // Populate media relation in response
         });

         if (!response.data || !response.data.data) {
             throw new Error(`Invalid response structure after updating web media ${id}.`);
         }
         console.log(`[Service updateWebMedia]: Web media entry ${id} updated successfully:`, response.data.data);
         return response.data.data; // Return the 'data' part of the response
    } catch (error: unknown) {
         let message = `Failed to update web media entry ${id}`;
         if (error instanceof AxiosError) {
            console.error(`[Service updateWebMedia] Axios Error updating ${id}:`, error.response?.status, JSON.stringify(error.response?.data, null, 2) || error.message);
            const strapiError = error.response?.data?.error;
            message = strapiError?.message || error.message || message;
        } else if (error instanceof Error) {
            console.error(`[Service updateWebMedia] Generic Error updating ${id}:`, error.message, error.stack);
            message = error.message;
        } else {
            console.error(`[Service updateWebMedia] Unknown Error updating ${id}:`, error);
        }
         throw new Error(message);
    }
}

/**
 * Deletes a file from the Strapi upload plugin (Strapi v5).
 * @param {number} fileId The ID of the file to delete.
 * @returns {Promise<UploadFile>} A promise that resolves with the deleted file data.
 */
export async function deleteUploadFile(fileId: number): Promise<UploadFile> {
     console.log(`[Service deleteUploadFile]: Attempting to delete file with ID: ${fileId}`);
    const headers = await getAuthHeader();
    try {
        // Strapi v5 delete for uploads returns the deleted object
        const response = await axiosInstance.delete<UploadFile>(`/upload/files/${fileId}`, {
            headers,
        });
        console.log(`[Service deleteUploadFile]: File ${fileId} deleted successfully from uploads.`);
        if (!response.data || typeof response.data !== 'object') {
            throw new Error("Invalid response structure after deleting file.");
        }
        return response.data; // Return the deleted file data
    } catch (error: unknown) {
        let message = `Failed to delete file ${fileId}`;
         if (error instanceof AxiosError) {
            console.error(`[Service deleteUploadFile] Axios Error deleting ${fileId}:`, error.response?.status, error.response?.data || error.message);
            message = error.response?.data?.error?.message || error.message || message;
        } else if (error instanceof Error) {
            console.error(`[Service deleteUploadFile] Generic Error deleting ${fileId}:`, error.message);
            message = error.message;
        } else {
            console.error(`[Service deleteUploadFile] Unknown Error deleting ${fileId}:`, error);
        }
        throw new Error(message);
    }
}

/**
 * Deletes an entry from the web_medias collection (Strapi v5).
 * @param {number} webMediaId The ID of the web media entry to delete.
 * @returns {Promise<WebMedia>} A promise that resolves with the deleted web media data.
 */
export async function deleteWebMedia(webMediaId: number): Promise<WebMedia> {
     console.log(`[Service deleteWebMedia]: Attempting to delete web media entry with ID: ${webMediaId}`);
    const headers = await getAuthHeader();
    try {
        // Strapi v5 delete for content types returns the deleted object, potentially in { data: ... }
        const response = await axiosInstance.delete<{ data: WebMedia }>(`/web-medias/${webMediaId}`, {
            headers,
        });

         if (!response || !response.data) {
             throw new Error(`Invalid response structure after deleting web media ${webMediaId}.`);
         }
        console.log(`[Service deleteWebMedia]: Web media entry ${webMediaId} deleted successfully.`);
        return response.data.data; // Return the 'data' part of the response
    } catch (error: unknown) {
         let message = `Failed to delete web media entry ${webMediaId}`;
         if (error instanceof AxiosError) {
            console.error(`[Service deleteWebMedia] Axios Error deleting ${webMediaId}:`, error.response?.status, error.response?.data || error.message);
            message = error.response?.data?.error?.message || error.message || message;
        } else if (error instanceof Error) {
            console.error(`[Service deleteWebMedia] Generic Error deleting ${webMediaId}:`, error.message);
            message = error.message;
        } else {
            console.error(`[Service deleteWebMedia] Unknown Error deleting ${webMediaId}:`, error);
        }
        throw new Error(message);
    }
}


/**
 * Combined delete operation: Deletes web_media entry and the associated uploaded file.
 * Handles potential errors in each step.
 * @param {number} webMediaId The ID of the web_media entry.
 * @param {number | null} fileId The ID of the associated file in uploads (can be null).
 * @returns {Promise<{ webMediaDeleted: boolean; fileDeleted: boolean }>} Result status.
 */
export async function deleteMediaAndFile(webMediaId: number, fileId: number): Promise<{ webMediaDeleted: boolean; fileDeleted: boolean }> {
    console.log(`[Service deleteMediaAndFile]: Initiating delete for webMediaId: ${webMediaId}, fileId: ${fileId}`);
    let webMediaDeleted = false;
    let fileDeleted = false;

    // 1. Delete the web_media entry first (as it holds the relation)
    try {
        await deleteWebMedia(webMediaId);
        webMediaDeleted = true;
        console.log(`[Service deleteMediaAndFile]: Web media entry ${webMediaId} deleted.`);
    } catch (error) {
        console.error(`[Service deleteMediaAndFile]: Error deleting web media entry ${webMediaId}:`, error);
        // If web_media delete fails, we might not want to delete the file, or log and proceed carefully.
        // Throwing here will stop the process.
        throw new Error(`Failed to delete web media entry ${webMediaId}. Aborting file delete.`);
    }

    // 2. If web_media was deleted and fileId exists, delete the file
    if (webMediaDeleted && fileId !== null) {
        try {
            await deleteUploadFile(fileId);
            fileDeleted = true;
            console.log(`[Service deleteMediaAndFile]: Associated file ${fileId} deleted.`);
        } catch (error) {
            console.error(`[Service deleteMediaAndFile]: Error deleting associated file ${fileId}:`, error);
            // Log the error, but don't throw, as the primary web_media entry is already gone.
            // The file might be orphaned in Strapi uploads, which might require manual cleanup later.
        }
    } else if (webMediaDeleted && fileId === null) {
         console.log(`[Service deleteMediaAndFile]: Web media entry ${webMediaId} deleted, but no associated file ID was provided.`);
    }

    return { webMediaDeleted, fileDeleted };
}

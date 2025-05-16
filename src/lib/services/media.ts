
'use server';

import axiosInstance from '@/lib/axios';
import { getAccessToken } from '@/lib/actions/auth';
import type {
    WebMedia,
    UpdateWebMediaPayload,
    CreateWebMediaPayload,
    UploadFile,
    CombinedMediaData,
    Media,
} from '@/types/media';
import type { FindMany, FindOne } from '@/types/strapi_response';
import { AxiosError } from 'axios';

async function getAuthHeader() {
    const token = await getAccessToken();
    if (!token) {
        throw new Error("Authentication token not found.");
    }
    return { Authorization: `Bearer ${token}` };
}

export async function fetchMediaFiles(userTenentId: string): Promise<CombinedMediaData[]> {
    if (!userTenentId) {
        console.error('[Service fetchMediaFiles]: userTenentId is missing. Cannot fetch media.');
        throw new Error('User tenent_id is required to fetch media files.');
    }
    console.log(`[Service fetchMediaFiles]: Fetching web media entries with tenent_id '${userTenentId}'...`);
    const headers = await getAuthHeader();
    const params = {
        'filters[tenent_id][$eq]': userTenentId,
        'populate': '*',
    };
    const url = '/web-medias';
    console.log(`[fetchMediaFiles] Fetching URL: ${url} with params:`, JSON.stringify(params));

    try {
        const response = await axiosInstance.get<FindMany<WebMedia>>(url, { headers, params });

        console.log('[Service fetchMediaFiles]: Raw API Response Status:', response.status);

        if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
            console.error('[Service fetchMediaFiles]: Unexpected API response structure. Expected "data" array, received:', response.data);
            if (response.data === null || response.data === undefined || (response.data && !response.data.data)) {
                console.warn('[Service fetchMediaFiles]: API returned null, undefined, or no "data" property. Returning empty array.');
                return [];
            }
            throw new Error('Unexpected API response structure. Expected an array within a "data" property.');
        }

        if (response.data.data.length === 0) {
            console.log(`[Service fetchMediaFiles]: API returned an empty array for tenent_id '${userTenentId}'. No media found.`);
            return [];
        }

        const combinedData: CombinedMediaData[] = response.data.data.map((item: WebMedia) => {
            const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/api$/, '');
            const constructUrl = (path: string | null | undefined): string | null => {
                if (!path) return null;
                if (path.startsWith('http')) return path;
                const cleanPath = path.startsWith('/') ? path : `/${path}`;
                return `${apiBaseUrl}${cleanPath}`;
            };

            const mediaFile = item.media;

            if (!mediaFile || typeof mediaFile !== 'object' || typeof mediaFile.id !== 'number') {
                console.warn(`[fetchMediaFiles] Item WebMedia ID ${item.id} has missing or invalid media relation or media.id is not a number. Skipping. Media file:`, mediaFile);
                return null;
            }
            if (item.id === undefined) { 
                 console.warn(`[fetchMediaFiles] WebMedia item has undefined ID. Skipping. Item:`, item);
                 return null;
            }

            const sizeInBytes = typeof mediaFile.size === 'number' ? mediaFile.size * 1024 : null; // Strapi size is in KB

            return {
                webMediaId: item.id, 
                webMediaDocumentId: item.documentId, // Keep this if it exists and is used elsewhere
                name: item.name || mediaFile.name || 'Unnamed Media',
                alt: item.alt || null,
                tenent_id: item.tenent_id,
                createdAt: item.createdAt!,
                updatedAt: item.updatedAt!,
                publishedAt: item.publishedAt || null,
                fileId: mediaFile.id, 
                fileDocumentId: mediaFile.documentId, // Keep this if it exists and is used elsewhere
                fileUrl: constructUrl(mediaFile.url),
                fileName: mediaFile.name ?? 'N/A',
                mime: mediaFile.mime ?? null,
                size: sizeInBytes,
                thumbnailUrl: constructUrl(mediaFile.formats?.thumbnail?.url) ?? constructUrl(mediaFile.url),
                category: item.category || null,
                tags: item.tags,
            };
        }).filter((item): item is CombinedMediaData => item !== null);

        console.log(`[Service fetchMediaFiles]: Successfully transformed ${combinedData.length} items for tenent_id '${userTenentId}'.`);
        return combinedData;

    } catch (error: unknown) {
        let message = `Failed to fetch media files for tenent_id '${userTenentId}'.`;
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
        throw new Error(`Failed to fetch media files: ${message}`);
    }
}

export async function uploadFile(formData: FormData): Promise<UploadFile[]> {
    console.log('[Service uploadFile]: Attempting file upload...');
    const headers = await getAuthHeader();

    try {
        const response = await axiosInstance.post<UploadFile[]>('/upload', formData, {
            headers: {
                ...headers,
                'Content-Type': 'multipart/form-data',
            },
        });
        console.log('[Service uploadFile]: File uploaded successfully:', response.data);
        if (!Array.isArray(response.data) || response.data.length === 0) {
            throw new Error("Upload response was empty or not an array.");
        }
        return response.data.map(file => ({ ...file, id: Number(file.id) }));
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

export async function createWebMedia(payload: CreateWebMediaPayload): Promise<WebMedia> {
    if (!payload.tenent_id) {
        console.error('[Service createWebMedia]: tenent_id is missing. Cannot create web media entry.');
        throw new Error('User tenent_id is required in the payload to create a web media entry.');
    }
    console.log('[Service createWebMedia]: Attempting to create web media entry with payload:', JSON.stringify({ data: payload }, null, 2));
    const headers = await getAuthHeader();
    try {
        const response = await axiosInstance.post<FindOne<WebMedia>>('/web-medias', { data: payload }, {
            headers,
        });

        if (!response.data || !response.data.data) {
            throw new Error("Invalid response structure after creating web media.");
        }
        const createdWebMedia = { ...response.data.data, id: response.data.data.id !== undefined ? Number(response.data.data.id) : undefined };
        console.log(`[Service createWebMedia]: Web media entry created successfully for tenent_id '${payload.tenent_id}':`, createdWebMedia);
        return createdWebMedia;
    } catch (error: unknown) {
        let message = `Failed to create web media entry for tenent_id '${payload.tenent_id}'.`;
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

export async function updateWebMedia(webMediaId: number, payload: UpdateWebMediaPayload): Promise<WebMedia> {
    console.log(`[Service updateWebMedia]: Attempting to update web media entry with ID ${webMediaId} using payload:`, payload);
    const headers = await getAuthHeader();
    try {
        const response = await axiosInstance.put<FindOne<WebMedia>>(`/web-medias/${webMediaId}`, { data: payload }, {
            headers,
        });
        if (!response.data || !response.data.data) {
            throw new Error(`Invalid response structure after updating web media ${webMediaId}.`);
        }
        const updatedWebMedia = { ...response.data.data, id: response.data.data.id !== undefined ? Number(response.data.data.id) : undefined };
        console.log(`[Service updateWebMedia]: Web media entry ${webMediaId} updated successfully:`, updatedWebMedia);
        return updatedWebMedia;
    } catch (error: unknown) {
        let message = `Failed to update web media entry ${webMediaId}`;
        if (error instanceof AxiosError) {
            console.error(`[Service updateWebMedia] Axios Error updating ${webMediaId}:`, error.response?.status, JSON.stringify(error.response?.data, null, 2) || error.message);
            const strapiError = error.response?.data?.error;
            message = strapiError?.message || error.message || message;
        } else if (error instanceof Error) {
            console.error(`[Service updateWebMedia] Generic Error updating ${webMediaId}:`, error.message, error.stack);
            message = error.message;
        } else {
            console.error(`[Service updateWebMedia] Unknown Error updating ${webMediaId}:`, error);
        }
        throw new Error(message);
    }
}

// Updated to use numeric fileId
export async function deleteUploadFile(fileId: number): Promise<Media> {
    console.log(`[Service deleteUploadFile]: Attempting to delete file with numeric ID: ${fileId}`);
    const headers = await getAuthHeader();
    const url = `/upload/files/${fileId}`;
    console.log(`[Service deleteUploadFile]: Requesting DELETE on URL: ${url}`);
    try {
        const response = await axiosInstance.delete<Media>(url, { headers });
        console.log(`[Service deleteUploadFile]: File ${fileId} deleted successfully from uploads. Response status: ${response.status}`);
        
        // Strapi v5 delete for /upload/files typically returns the deleted file object or 200/204.
        if (response.status === 200 && response.data && typeof response.data === 'object') {
            return { ...response.data, id: Number(response.data.id) };
        } else if (response.status === 204) {
             console.warn(`[Service deleteUploadFile]: File ${fileId} deleted (204 No Content), but no data returned. This is acceptable for delete operations.`);
             // If no data is returned, we can't return the Media object.
             // Adjust the return type or how this is handled if necessary. For now, throw error if data expected.
             // For simplicity, let's assume if it's 204, it was successful but we can't return the object.
             // To make the mutation hook consistent, we need to decide what to return or how to handle.
             // Throwing a specific kind of "success but no data" error or adjusting `useDeleteMediaMutation`'s expected success type might be needed.
             // For now, let's assume for a 204, we can't return the specific Media object, and rely on the HTTP status.
             // To satisfy the return type Media, we would need a dummy object or adjust the function signature.
             // Let's throw an error if the data isn't what's expected for a 200 response to keep return type Media.
             throw new Error(`File deletion successful (204 No Content) but expected Media object was not returned for file ID ${fileId}.`);

        } else {
            console.error(`[Service deleteUploadFile]: Unexpected response status ${response.status} or data structure for file ${fileId}:`, response.data);
            throw new Error(`Unexpected response after deleting file ${fileId}. Status: ${response.status}`);
        }
    } catch (error: unknown) {
        let message = `Failed to delete file ${fileId}`;
        if (error instanceof AxiosError) {
            console.error(`[Service deleteUploadFile] Axios Error deleting ${fileId}:`, error.response?.status, error.response?.data || error.message);
            if (error.response?.status === 404) {
                console.warn(`[Service deleteUploadFile] File ${fileId} not found (404).`);
            }
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

export async function deleteWebMedia(webMediaId: number): Promise<WebMedia> {
    console.log(`[Service deleteWebMedia]: Attempting to delete web media entry with ID: ${webMediaId}`);
    const headers = await getAuthHeader();
    const url = `/web-medias/${webMediaId}`;
    console.log(`[Service deleteWebMedia]: Requesting DELETE on URL: ${url}`);
    try {
        const response = await axiosInstance.delete<FindOne<WebMedia>>(url, { headers });

        if (!response || !response.data || !response.data.data) {
            throw new Error(`Invalid response structure after deleting web media ${webMediaId}.`);
        }
        const deletedWebMedia = { ...response.data.data, id: response.data.data.id !== undefined ? Number(response.data.data.id) : undefined };
        console.log(`[Service deleteWebMedia]: Web media entry ${webMediaId} deleted successfully.`);
        return deletedWebMedia;
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

// Updated to use numeric fileId
export async function deleteMediaAndFile(webMediaId: number, fileId: number | null): Promise<{ webMediaDeleted: boolean; fileDeleted: boolean }> {
    console.log(`[Service deleteMediaAndFile]: Initiating delete for webMediaId: ${webMediaId}, fileId: ${fileId}`);
    let webMediaDeleted = false;
    let fileDeleted = false;

    try {
        await deleteWebMedia(webMediaId);
        webMediaDeleted = true;
        console.log(`[Service deleteMediaAndFile]: Web media entry ${webMediaId} deleted.`);
    } catch (error) {
        console.error(`[Service deleteMediaAndFile]: Error deleting web media entry ${webMediaId}:`, error);
        // If deleting the WebMedia entry fails, we shouldn't proceed to delete the file.
        throw new Error(`Failed to delete web media entry ${webMediaId}. Associated file (ID: ${fileId}) was not attempted to be deleted.`);
    }

    if (webMediaDeleted && fileId !== null) {
        console.log(`[Service deleteMediaAndFile]: WebMedia entry ${webMediaId} deleted. Proceeding to delete file with ID: ${fileId}`);
        try {
            await deleteUploadFile(fileId);
            fileDeleted = true;
            console.log(`[Service deleteMediaAndFile]: Associated file ${fileId} deleted.`);
        } catch (error) {
            console.error(`[Service deleteMediaAndFile]: Error deleting associated file ${fileId} (WebMedia entry ${webMediaId} was already deleted):`, error);
            // File deletion failed, but WebMedia entry was deleted.
            // Caller can decide how to handle this partial success.
        }
    } else if (webMediaDeleted && fileId === null) {
        console.log(`[Service deleteMediaAndFile]: Web media entry ${webMediaId} deleted, but no associated file ID was provided to delete.`);
    }

    return { webMediaDeleted, fileDeleted };
}

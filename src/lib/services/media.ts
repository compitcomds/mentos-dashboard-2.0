
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

export interface FetchMediaFilesParams {
    userTenentId: string;
    page?: number;
    pageSize?: number;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
    categoryFilter?: string | null;
    nameFilter?: string | null;
    tagsFilter?: string[] | null; // Added for tag filtering
}

export async function fetchMediaFiles(params: FetchMediaFilesParams): Promise<FindMany<CombinedMediaData>> {
    const { userTenentId, page = 1, pageSize = 10, sortField = 'createdAt', sortOrder = 'desc', categoryFilter, nameFilter, tagsFilter } = params;

    if (!userTenentId) {
        console.error('[Service fetchMediaFiles]: userTenentId is missing. Cannot fetch media.');
        throw new Error('User tenent_id is required to fetch media files.');
    }
    console.log(`[Service fetchMediaFiles]: Fetching web media entries for tenent_id '${userTenentId}' with params:`, params);
    const headers = await getAuthHeader();

    const strapiParams: any = {
        'filters[tenent_id][$eq]': userTenentId,
        'populate': ['media', 'tags', 'user'],
        'pagination[page]': page,
        'pagination[pageSize]': pageSize,
    };

    if (sortField && sortOrder) {
        strapiParams['sort[0]'] = `${sortField}:${sortOrder}`;
    }
    if (categoryFilter) {
        strapiParams['filters[category][$containsi]'] = categoryFilter;
    }
    if (nameFilter) {
        strapiParams['filters[name][$containsi]'] = nameFilter;
    }
    if (tagsFilter && tagsFilter.length > 0) {
      // Assuming 'tags' is a component and 'tag_value' is a field within that component
      // Strapi's $in filter for components requires an array of filters for each tag
      // filters[relation][component_field][$in]=value
      tagsFilter.forEach((tag, index) => {
          strapiParams[`filters[tags][tag_value][$in][${index}]`] = tag;
      });
      // Note: This creates an OR condition for tags (matches if ANY of the tags are present).
      // If you need AND (matches if ALL tags are present), Strapi's filtering might require
      // multiple `$and` conditions or a different approach like a custom endpoint.
      // For now, `$in` is implemented for "any of these tags".
    }


    const url = '/web-medias';
    console.log(`[fetchMediaFiles] Fetching URL: ${url} with Strapi params:`, JSON.stringify(strapiParams));

    try {
        const response = await axiosInstance.get<FindMany<WebMedia>>(url, { headers, params: strapiParams });
        console.log('[Service fetchMediaFiles]: Raw API Response Status:', response.status);

        if (!response.data || !response.data.data || !Array.isArray(response.data.data) || !response.data.meta?.pagination) {
            console.error('[Service fetchMediaFiles]: Unexpected API response structure. Expected "data" array and "meta.pagination", received:', response.data);
            return { data: [], meta: { pagination: { page: 1, pageSize, pageCount: 0, total: 0 } } };
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

            if (!mediaFile || typeof mediaFile.id !== 'number') {
                console.warn(`[fetchMediaFiles] Item WebMedia ID ${item.id} has missing or invalid media relation or media.id is not a number. Skipping. Media file:`, mediaFile);
                return null;
            }
            if (item.id === undefined) {
                 console.warn(`[fetchMediaFiles] WebMedia item has undefined ID. Skipping. Item:`, item);
                 return null;
            }

            const sizeInBytes = typeof mediaFile.size === 'number' ? mediaFile.size * 1024 : null;

            return {
                webMediaId: item.id,
                webMediaDocumentId: item.documentId || String(item.id),
                name: item.name || mediaFile.name || 'Unnamed Media',
                alt: item.alt || null,
                tenent_id: item.tenent_id,
                createdAt: item.createdAt!,
                updatedAt: item.updatedAt!,
                publishedAt: item.publishedAt || null,
                fileId: mediaFile.id,
                fileDocumentId: mediaFile.documentId || String(mediaFile.id),
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
        return { data: combinedData, meta: response.data.meta };

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
        let detailedMessage = 'File upload failed.';
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
                 if (mainMsg.toLowerCase().includes("unsupported image format") || (strapiError.details as any)?.errors?.some((e: any) => e.message?.toLowerCase().includes("unsupported image format"))) {
                    detailedMessage = `Strapi reported an unsupported image format. Please check server logs and ensure the file type is supported by the backend media library configuration. Original error: ${mainMsg}`;
                } else if (mainMsg.toLowerCase().includes("fileNameToLong")) {
                    detailedMessage = `The filename is too long. Please shorten it and try again. Original error: ${mainMsg}`;
                } else if (mainMsg.toLowerCase().includes("fileSize")) {
                    detailedMessage = `The file size is too large or too small. Please check Strapi's media library size limits. Original error: ${mainMsg}`;
                }

            } else if (error.response?.data?.message && typeof error.response.data.message === 'string') {
                detailedMessage = `API Error (Status ${status || 'unknown'}): ${error.response.data.message}`;
            } else if (typeof error.response?.data === 'string' && error.response.data.trim() !== '') {
                detailedMessage = `API Error (Status ${status || 'unknown'}): ${error.response.data}`;
            } else {
                detailedMessage = `API Error (Status ${status || 'unknown'}): ${error.message}.`;
            }
            if (status === 500) {
                detailedMessage = `Internal Server Error. This is an Internal Server Error from the API. Please check Strapi server logs for more details on why the upload was rejected (e.g., unsupported format, processing error). Original error: ${error.message}`;
            }
        } else if (error instanceof Error) {
            detailedMessage = error.message;
        }
        console.error(`[uploadFile] Failed. Error: ${detailedMessage}`, "Full error object/data logged:", loggableErrorData);
        throw new Error(detailedMessage);
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
            params: { populate: ['media', 'tags', 'user'] }
        });

        if (!response.data || !response.data.data) {
            throw new Error("Invalid response structure after creating web media.");
        }
        const createdWebMedia = { ...response.data.data, id: response.data.data.id !== undefined ? Number(response.data.data.id) : undefined };
        console.log(`[Service createWebMedia]: Web media entry created successfully for tenent_id '${payload.tenent_id}':`, createdWebMedia);
        return createdWebMedia;
    } catch (error: unknown) {
        let detailedMessage = `Failed to create web media entry for tenent_id '${payload.tenent_id}'.`;
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
        console.error(`[createWebMedia] Failed for tenent_id ${payload.tenent_id}. Error: ${detailedMessage}`, "Full error object/data logged:", loggableErrorData);
        throw new Error(detailedMessage);
    }
}

export async function updateWebMedia(webMediaId: number, payload: UpdateWebMediaPayload): Promise<WebMedia> {
    console.log(`[Service updateWebMedia]: Attempting to update web media entry with ID ${webMediaId} using payload:`, payload);
    const { tenent_id, ...updateData } = payload as any; // tenent_id should not be in update payload to Strapi
    if (tenent_id) {
        console.warn(`[Service updateWebMedia]: tenent_id was present in update payload for WebMedia ${webMediaId} but is being excluded. tenent_id should not be updated.`);
    }
    const headers = await getAuthHeader();
    try {
        const response = await axiosInstance.put<FindOne<WebMedia>>(`/web-medias/${webMediaId}`, { data: updateData }, {
            headers,
            params: { populate: ['media', 'tags', 'user'] }
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

export async function deleteUploadFile(fileId: number): Promise<Media | void> {
    console.log(`[Service deleteUploadFile]: Attempting to delete file with numeric ID: ${fileId}`);
    const headers = await getAuthHeader();
    const url = `/upload/files/${fileId}`;
    console.log(`[Service deleteUploadFile]: Requesting DELETE on URL: ${url}`);
    try {
        const response = await axiosInstance.delete<Media>(url, { headers });

        if (response.status === 200 && response.data && typeof response.data === 'object') {
            console.log(`[Service deleteUploadFile]: File ${fileId} deleted successfully (200 OK). Response data:`, response.data);
            return { ...response.data, id: Number(response.data.id) };
        } else if (response.status === 204) {
             console.log(`[Service deleteUploadFile]: File ${fileId} deleted successfully (204 No Content).`);
             return;
        } else {
            const errorMsg = `Unexpected success response (status ${response.status}) after deleting file ${fileId}. Data: ${JSON.stringify(response.data)}`;
            console.error(`[Service deleteUploadFile]: ${errorMsg}`);
            throw new Error(errorMsg);
        }
    } catch (error: unknown) {
        let message = `Failed to delete file ${fileId}`;
        if (error instanceof AxiosError) {
            console.error(`[Service deleteUploadFile] Axios Error deleting ${fileId}: Status: ${error.response?.status}, Data:`, error.response?.data || error.message);
            if (error.response?.status === 404) {
                console.warn(`[Service deleteUploadFile] File ${fileId} not found (404).`);
                 message = `File with ID ${fileId} not found in media library.`;
            } else {
                message = error.response?.data?.error?.message || error.message || message;
            }
        } else if (error instanceof Error) {
            console.error(`[Service deleteUploadFile] Generic Error deleting ${fileId}:`, error.message);
            message = error.message;
        } else {
            console.error(`[Service deleteUploadFile] Unknown Error deleting ${fileId}:`, error);
        }
        throw new Error(message);
    }
}

export async function deleteWebMedia(webMediaId: number): Promise<WebMedia | void> {
    console.log(`[Service deleteWebMedia]: Attempting to delete web media entry with ID: ${webMediaId}`);
    const headers = await getAuthHeader();
    const url = `/web-medias/${webMediaId}`;
    console.log(`[Service deleteWebMedia]: Requesting DELETE on URL: ${url}`);
    try {
        const response = await axiosInstance.delete<FindOne<WebMedia>>(url, { headers });

        if (response.status === 200 && response.data?.data) {
            console.log(`[Service deleteWebMedia]: Web media entry ${webMediaId} deleted successfully (200 OK). Response data:`, response.data.data);
            return { ...response.data.data, id: Number(response.data.data.id) };
        } else if (response.status === 204) {
            console.log(`[Service deleteWebMedia]: Web media entry ${webMediaId} deleted successfully (204 No Content).`);
            return;
        } else {
            const errorMsg = `Unexpected success response (status ${response.status}) after deleting web media ${webMediaId}. Data: ${JSON.stringify(response.data)}`;
            console.error(`[Service deleteWebMedia]: ${errorMsg}`);
            throw new Error(errorMsg);
        }
    } catch (error: unknown) {
        let detailedMessage = `Failed to delete web media entry ${webMediaId}`;
        let loggableErrorData: any = error;
        const errorResponseData = error instanceof AxiosError ? error.response?.data : null;


        if (error instanceof AxiosError) {
            loggableErrorData = error.response?.data || error.message;
            const status = error.response?.status;
            const strapiError = (errorResponseData as any)?.error;
            detailedMessage = strapiError?.message || (errorResponseData as any)?.message || error.message || detailedMessage;
            if (status === 403) {
                detailedMessage = `Forbidden: You do not have permission to delete web media entry ${webMediaId}.`;
            } else if (status === 404) {
                detailedMessage = `Web media entry ${webMediaId} not found.`;
            } else if (status === 500) {
                 detailedMessage = `Internal Server Error while deleting web media entry ${webMediaId}. Check Strapi logs. Details: ${strapiError?.details ? JSON.stringify(strapiError.details) : detailedMessage}`;
            }
        } else if (error instanceof Error) {
            detailedMessage = error.message;
        }
        console.error(`[deleteWebMedia] Failed for WebMedia ID ${webMediaId}. Error: ${detailedMessage}`, "Full error object/data logged:", loggableErrorData);
        throw new Error(detailedMessage);
    }
}

export async function deleteMediaAndFile(webMediaId: number, fileId: number | null): Promise<{ webMediaDeleted: boolean; fileDeleted: boolean }> {
    console.log(`[Service deleteMediaAndFile]: Initiating delete for webMediaId: ${webMediaId}, fileId: ${fileId}`);
    let webMediaDeleted = false;
    let fileDeleted = false;

    try {
        await deleteWebMedia(webMediaId);
        webMediaDeleted = true;
        console.log(`[Service deleteMediaAndFile]: Web media entry ${webMediaId} deleted successfully.`);
    } catch (error) {
        console.error(`[Service deleteMediaAndFile]: Error deleting web media entry ${webMediaId}:`, error);
        throw new Error(`Failed to delete web media entry ${webMediaId}. Associated file (ID: ${fileId}) was not attempted to be deleted. Original error: ${(error as Error).message}`);
    }

    if (webMediaDeleted && fileId !== null) {
        console.log(`[Service deleteMediaAndFile]: WebMedia entry ${webMediaId} deleted. Proceeding to delete file with ID: ${fileId}`);
        try {
            await deleteUploadFile(fileId);
            fileDeleted = true;
            console.log(`[Service deleteMediaAndFile]: Associated file ${fileId} deleted successfully.`);
        } catch (error) {
            console.error(`[Service deleteMediaAndFile]: Error deleting associated file ${fileId} (WebMedia entry ${webMediaId} was already deleted):`, error);
        }
    } else if (webMediaDeleted && fileId === null) {
        console.log(`[Service deleteMediaAndFile]: Web media entry ${webMediaId} deleted, but no associated file ID was provided to delete.`);
    }

    return { webMediaDeleted, fileDeleted };
}


export async function getMediaFileDetailsById(id: number): Promise<Media | null> {
    if (!id) {
        console.warn('[Service getMediaFileDetailsById]: id is missing.');
        return null;
    }
    const url = `/upload/files/${id}`;
    console.log(`[getMediaFileDetailsById] Fetching media details for ID: ${id} from URL: ${url}`);
    try {
        const headers = await getAuthHeader();
        const response = await axiosInstance.get<Media>(url, { headers });
        console.log("[getMediaFileDetailsById] Raw Response:", response)
        if (!response.data || typeof response.data !== 'object' || response.data === null) {
            console.error(`[getMediaFileDetailsById] Unexpected API response structure for media ${id}. Expected an object, received:`, response.data);
            return null;
        }
        const mediaData = { ...response.data, id: Number(response.data.id) };
        console.log(`[getMediaFileDetailsById] Fetched Media ${id} Data:`, mediaData);
        return mediaData;

    } catch (error: unknown) {
        let message = `Failed to fetch media details for ID ${id}.`;
        if (error instanceof AxiosError) {
            const status = error.response?.status;
            if (status === 404) {
                console.warn(`[getMediaFileDetailsById] Media with ID ${id} not found.`);
                return null;
            }
            const errorData = error.response?.data || { message: error.message };
            console.error(`[getMediaFileDetailsById] Failed to fetch media ${id} (Status: ${status}):`, JSON.stringify(errorData, null, 2));
            const strapiErrorMessage = (errorData as any)?.error?.message;
            message = strapiErrorMessage || `Failed to fetch media ${id} (${status}) - ${(errorData as any).message || 'Unknown API error'}`;
        } else if (error instanceof Error) {
            console.error(`[getMediaFileDetailsById] Generic Error for media ${id}:`, error.message);
            message = error.message;
        } else {
            console.error(`[getMediaFileDetailsById] Unknown Error for media ${id}:`, error);
        }
        console.error(message);
        return null;
    }
}

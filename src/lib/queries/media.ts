
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import {
    fetchMediaFiles,
    uploadFile,
    createWebMedia,
    updateWebMedia,
    deleteMediaAndFile,
    getMediaFileDetailsById,
    type FetchMediaFilesParams,
} from '@/lib/services/media';
import type {
    CombinedMediaData,
    UpdateWebMediaPayload,
    CreateWebMediaPayload,
    WebMedia,
    Media,
} from '@/types/media';
import type { FindMany } from '@/types/strapi_response';
import { AxiosError } from 'axios';
import { useCurrentUser } from './user';


const MEDIA_QUERY_KEY = (userKey?: string, options?: Omit<FetchMediaFilesParams, 'userTenentId'>) =>
    ['mediaFiles', userKey || 'all', options?.page, options?.pageSize, options?.sortField, options?.sortOrder, options?.categoryFilter, options?.nameFilter];

const MEDIA_DETAIL_QUERY_KEY = (id: number) => ['mediaFileDetail', id];

export function useFetchMedia(options?: Omit<FetchMediaFilesParams, 'userTenentId'>) {
    const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
    const userTenentId = currentUser?.tenent_id;
    const { page, pageSize, sortField, sortOrder, categoryFilter, nameFilter } = options || {};

    return useQuery<FindMany<CombinedMediaData>, Error>({
        queryKey: MEDIA_QUERY_KEY(userTenentId, { page, pageSize, sortField, sortOrder, categoryFilter, nameFilter }),
        queryFn: () => {
            if (!userTenentId) {
                console.warn("useFetchMedia: User key not provided. Returning empty result.");
                return Promise.resolve({ data: [], meta: { pagination: { page: 1, pageSize: pageSize || 10, pageCount: 0, total: 0 } } });
            }
            return fetchMediaFiles({ userTenentId, page, pageSize, sortField, sortOrder, categoryFilter, nameFilter });
        },
        enabled: !!userTenentId && !isLoadingUser,
        staleTime: 1000 * 60 * 2,
        gcTime: 1000 * 60 * 10,
        retry: 1,
    });
}

export function useUploadMediaMutation() {
    const queryClient = useQueryClient();
    const { data: currentUser } = useCurrentUser();
    const userKey = currentUser?.tenent_id;

    return useMutation<WebMedia, Error, { file: File; name: string; alt: string | null; category?: string | null, tags?: {tag_value: string}[] | null }>({
        mutationFn: async ({ file, name, alt, category, tags }) => {
             if (!userKey) {
                throw new Error('User key is not available. Cannot upload media.');
            }
            console.log(`[useUploadMediaMutation] User key for upload: ${userKey}`);
            const formData = new FormData();
            formData.append('files', file);

            console.log(`[useUploadMediaMutation] Calling uploadFile service...`);
            const uploadResponseArray = await uploadFile(formData);
            console.log(`[useUploadMediaMutation] Response from uploadFile service:`, uploadResponseArray);


            if (!uploadResponseArray || uploadResponseArray.length === 0 || typeof uploadResponseArray[0].id !== 'number') {
                console.error("[useUploadMediaMutation] File upload response did not contain expected data (numeric ID) or failed. Response:", uploadResponseArray);
                throw new Error('File upload response did not contain expected data (numeric ID) or failed.');
            }

            const uploadedFile = uploadResponseArray[0];
            console.log(`[useUploadMediaMutation] Uploaded file details from service:`, uploadedFile);

            if(!uploadedFile.id){
                console.log("[useUploadMediaMutation] Uploaded file does not have a valid ID. Cannot proceed with creating WebMedia.");
                throw new Error('Uploaded file does not have a valid ID. Cannot proceed with creating WebMedia.');
            }
             const createPayload: CreateWebMediaPayload = {
                name: name || uploadedFile.name,
                alt: alt || name || uploadedFile.name || null,
                tenent_id: userKey,
                media: uploadedFile.id,
                category: category || null,
                tags: tags || [], // Ensure tags is an array, defaults to empty if null/undefined
            };
            console.log(`[useUploadMediaMutation] Payload for createWebMedia service:`, createPayload);


            const webMediaResponse = await createWebMedia(createPayload);
            console.log(`[useUploadMediaMutation] Response from createWebMedia service:`, webMediaResponse);
            return webMediaResponse;
        },
        onSuccess: (data) => {
            console.log(`[useUploadMediaMutation] onSuccess: Invalidating media queries for userKey: ${userKey}`);
            queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEY(userKey) });
        },
        onError: (error: unknown) => {
            let message = 'Could not upload the media file.';
            if (error instanceof AxiosError) {
                 message = error.response?.data?.error?.message || error.message || message;
                 console.error("[useUploadMediaMutation] Upload/Create WebMedia Axios Error:", error.response?.data || error);
            } else if (error instanceof Error) {
                 message = error.message;
                 console.error("[useUploadMediaMutation] Upload/Create WebMedia Error:", error);
            } else {
                 console.error("[useUploadMediaMutation] Unknown Upload/Create WebMedia Error:", error);
            }
            toast({
                variant: 'destructive',
                title: 'Upload Failed',
                description: message,
            });
        },
    });
}


export function useUpdateMediaMutation() {
    const queryClient = useQueryClient();
     const { data: currentUser } = useCurrentUser();
     const userKey = currentUser?.tenent_id;

    return useMutation<WebMedia, Error, { webMediaId: number; payload: UpdateWebMediaPayload }>({
        mutationFn: ({ webMediaId, payload }) => updateWebMedia(webMediaId, payload),
        onSuccess: (data) => {
            toast({
                title: 'Success!',
                description: `Media "${data.name}" updated successfully.`,
            });
            queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEY(userKey) });
        },
        onError: (error: unknown, variables) => {
             let message = `Could not update media (ID: ${variables.webMediaId}).`;
             if (error instanceof AxiosError) {
                 message = error.response?.data?.error?.message || error.message || message;
                 console.error("Update WebMedia Axios Error:", error.response?.data || error);
             } else if (error instanceof Error) {
                 message = error.message;
                 console.error("Update WebMedia Error:", error);
             } else {
                 console.error("Unknown Update WebMedia Error:", error);
             }
            toast({
                variant: 'destructive',
                title: 'Update Failed',
                description: message,
            });
        },
    });
}


export function useDeleteMediaMutation() {
    const queryClient = useQueryClient();
     const { data: currentUser } = useCurrentUser();
     const userKey = currentUser?.tenent_id;

    return useMutation< { webMediaDeleted: boolean; fileDeleted: boolean }, Error, { webMediaId: number; fileId: number | null } >({
        mutationFn: ({ webMediaId, fileId }) => deleteMediaAndFile(webMediaId, fileId),
        onSuccess: (data, variables) => {
            let description = `Media entry (ID: ${variables.webMediaId}) deleted successfully.`;
            if (variables.fileId !== null) {
                 description += data.fileDeleted ? ` Associated file (ID: ${variables.fileId}) also deleted.` : ` Could not delete associated file (ID: ${variables.fileId}). Check server logs and permissions.`;
            } else {
                 description += " No associated file ID provided to attempt deletion.";
            }
            toast({
                title: 'Deletion Status',
                description: description,
                variant: (variables.fileId !== null && !data.fileDeleted) ? 'destructive' : 'default',
            });
            queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEY(userKey) });
        },
        onError: (error: unknown, variables) => {
             let message = `Could not delete media (WebMedia ID: ${variables.webMediaId}).`;
             if (error instanceof AxiosError) {
                 message = error.response?.data?.error?.message || error.message || message;
                 console.error("Delete Media Axios Error:", error.response?.data || error);
             } else if (error instanceof Error) {
                 message = error.message;
                 console.error("Delete Media Error:", error);
             } else {
                 console.error("Unknown Delete Media Error:", error);
             }
            toast({
                variant: 'destructive',
                title: 'Deletion Failed',
                description: message,
            });
        },
    });
}

export function useGetMediaFileDetailsById(id: number | null) {
    const { isLoading: isLoadingUser } = useCurrentUser();
    return useQuery<Media | null, Error>({
        queryKey: MEDIA_DETAIL_QUERY_KEY(id ?? 0),
        queryFn: () => {
            if (id === null || id === undefined) {
                console.warn("useGetMediaFileDetailsById: id is null or undefined. Returning null.");
                return Promise.resolve(null);
            }
            return getMediaFileDetailsById(id);
        },
        enabled: id !== null && id !== undefined && !isLoadingUser,
        staleTime: 1000 * 60 * 10,
        gcTime: 1000 * 60 * 30,
        retry: (failureCount, error) => {
            if (error instanceof AxiosError && error.response?.status === 404) {
                return false;
            }
            return failureCount < 2;
        },
    });
}

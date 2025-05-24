
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import {
    fetchMediaFiles,
    uploadFile,
    createWebMedia,
    updateWebMedia,
    deleteMediaAndFile,
    getMediaFileDetailsByDocumentId, // Import new service
} from '@/lib/services/media';
import type {
    CombinedMediaData,
    UpdateWebMediaPayload,
    CreateWebMediaPayload,
    WebMedia,
    Media,
} from '@/types/media';
import { AxiosError } from 'axios';
import { useCurrentUser } from './user';


const MEDIA_QUERY_KEY = (userKey?: string) => ['mediaFiles', userKey || 'all'];
const MEDIA_DETAIL_QUERY_KEY = (documentId: string) => ['mediaFileDetail', documentId]; // New query key

export function useFetchMedia(userKey?: string) {
    const { isLoading: isLoadingUser } = useCurrentUser();

    return useQuery<CombinedMediaData[], Error>({
        queryKey: MEDIA_QUERY_KEY(userKey),
        queryFn: () => {
            if (!userKey) {
                console.warn("useFetchMedia: User key not provided. Returning empty array.");
                return Promise.resolve([]);
            }
            return fetchMediaFiles(userKey);
        },
        enabled: !!userKey && !isLoadingUser,
        staleTime: 1000 * 60 * 5,
         gcTime: 1000 * 60 * 30,
         retry: 1,
    });
}

export function useUploadMediaMutation() {
    const queryClient = useQueryClient();
    const { data: currentUser } = useCurrentUser();
    const userKey = currentUser?.tenent_id;

    return useMutation<WebMedia, Error, { file: File; name: string; alt: string | null }>({
        mutationFn: async ({ file, name, alt }) => {
             if (!userKey) {
                throw new Error('User key is not available. Cannot upload media.');
            }
            const formData = new FormData();
            formData.append('files', file);

            const uploadResponseArray = await uploadFile(formData);

            if (!uploadResponseArray || uploadResponseArray.length === 0 || typeof uploadResponseArray[0].id !== 'number') {
                throw new Error('File upload response did not contain expected data (numeric ID) or failed.');
            }

            const uploadedFile = uploadResponseArray[0];

             const createPayload: CreateWebMediaPayload = {
                name: name || uploadedFile.name,
                alt: alt || name || uploadedFile.name || null,
                tenent_id: userKey,
                media: uploadedFile.id,
            };

            const webMediaResponse = await createWebMedia(createPayload);
            return webMediaResponse;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEY(userKey) });
        },
        onError: (error: unknown) => {
            let message = 'Could not upload the media file.';
            if (error instanceof AxiosError) {
                 message = error.response?.data?.error?.message || error.message || message;
                 console.error("Upload/Create WebMedia Axios Error:", error.response?.data || error);
            } else if (error instanceof Error) {
                 message = error.message;
                 console.error("Upload/Create WebMedia Error:", error);
            } else {
                 console.error("Unknown Upload/Create WebMedia Error:", error);
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

export function useGetMediaFileDetailsByDocumentId(documentId: string | null) {
    const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser(); // Assuming you might need tenant_id for other reasons
    return useQuery<Media | null, Error>({
        queryKey: MEDIA_DETAIL_QUERY_KEY(documentId || 'null-doc-id'), // Ensure queryKey is always valid
        queryFn: () => {
            if (!documentId) {
                console.warn("useGetMediaFileDetailsByDocumentId: documentId is null. Returning null.");
                return Promise.resolve(null);
            }
            // We assume getMediaFileDetailsByDocumentId handles auth internally if needed.
            // If it also requires userTenentId, it should be passed here.
            return getMediaFileDetailsByDocumentId(documentId);
        },
        enabled: !!documentId && !isLoadingUser, // Only run if documentId is present and user is loaded
        staleTime: 1000 * 60 * 10, // Cache for 10 minutes
        gcTime: 1000 * 60 * 30,
        retry: (failureCount, error) => {
            // Do not retry on 404 errors
            if (error instanceof AxiosError && error.response?.status === 404) {
                return false;
            }
            // Retry up to 2 times for other errors
            return failureCount < 2;
        },
    });
}

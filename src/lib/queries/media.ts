
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import {
    fetchMediaFiles,
    uploadFile,
    createWebMedia,
    updateWebMedia,
    deleteMediaAndFile,
} from '@/lib/services/media';
import type {
    CombinedMediaData,
    UpdateWebMediaPayload,
    CreateWebMediaPayload,
    WebMedia,
    Media, // Media type is imported but useDeleteMediaMutation below expects { webMediaDeleted: boolean; fileDeleted: boolean }
} from '@/types/media';
import { AxiosError } from 'axios';
import { useCurrentUser } from './user';


const MEDIA_QUERY_KEY = (userKey?: string) => ['mediaFiles', userKey || 'all'];

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

            if (!uploadResponseArray || uploadResponseArray.length === 0 || typeof uploadResponseArray[0].id !== 'number') { // Check if id is number
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


// Updated to use numeric fileId
export function useDeleteMediaMutation() {
    const queryClient = useQueryClient();
     const { data: currentUser } = useCurrentUser();
     const userKey = currentUser?.tenent_id;

    return useMutation< { webMediaDeleted: boolean; fileDeleted: boolean }, Error, { webMediaId: number; fileId: number | null } >({
        mutationFn: ({ webMediaId, fileId }) => deleteMediaAndFile(webMediaId, fileId),
        onSuccess: (data, variables) => {
            let description = `Media entry (ID: ${variables.webMediaId}) deleted successfully.`;
            if (variables.fileId !== null) { // Check if fileId was provided for deletion attempt
                 description += data.fileDeleted ? ` Associated file (ID: ${variables.fileId}) also deleted.` : ` Could not delete associated file (ID: ${variables.fileId}). Check server logs and permissions.`;
            } else {
                 description += " No associated file ID provided to attempt deletion.";
            }
            toast({
                title: 'Deletion Status',
                description: description,
                variant: (variables.fileId !== null && !data.fileDeleted) ? 'destructive' : 'default', // Make toast destructive if file deletion failed
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

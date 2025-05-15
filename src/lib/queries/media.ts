
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import {
    fetchMediaFiles,
    uploadFile,
    createWebMedia,
    updateWebMedia,
    deleteMediaAndFile, // Use the combined delete function
} from '@/lib/services/media';
import type {
    CombinedMediaData,
    UpdateWebMediaPayload,
    CreateWebMediaPayload,
    UploadFile,
    WebMedia, // Import WebMedia type for mutation return
} from '@/types/media';
import { AxiosError } from 'axios'; // Import AxiosError for type checking
import { useCurrentUser } from './user'; // Import the hook to get the current user


const MEDIA_QUERY_KEY = (userKey?: string) => ['mediaFiles', userKey || 'all'];

// Hook to fetch all combined media data for the current user
// Accepts userKey as an argument to allow passing it from the component
export function useFetchMedia(userKey?: string) {
    const { isLoading: isLoadingUser } = useCurrentUser(); // Only need loading state here

    return useQuery<CombinedMediaData[], Error>({
        queryKey: MEDIA_QUERY_KEY(userKey), // Use the passed userKey for the query key
        // Pass the userKey to the service function
        queryFn: () => {
            if (!userKey) {
                // Optionally return empty array or throw error if key is mandatory
                console.warn("useFetchMedia: User key not provided. Returning empty array.");
                return Promise.resolve([]);
                // Or: throw new Error("User key is required to fetch media.");
            }
            return fetchMediaFiles(userKey);
        },
        enabled: !!userKey && !isLoadingUser, // Only enable the query when the userKey is available and user is loaded
        staleTime: 1000 * 60 * 5, // 5 minutes
         gcTime: 1000 * 60 * 30, // 30 minutes
         retry: 1, // Retry once
    });
}

// Hook for uploading a file and creating the corresponding web_media entry
export function useUploadMediaMutation() {
    const queryClient = useQueryClient();
    const { data: currentUser } = useCurrentUser();
    const userKey = currentUser?.key;

    // This mutation handles both the file upload and the web_media creation
    return useMutation<WebMedia, Error, { file: File; name: string; alt: string | null }>({
        mutationFn: async ({ file, name, alt }) => {
             if (!userKey) {
                throw new Error('User key is not available. Cannot upload media.');
            }
            // Step 1: Upload the file
            const formData = new FormData();
            formData.append('files', file); // Strapi v5 expects the key 'files'
            // The uploadFile service function now returns UploadFile[]
            const uploadResponseArray = await uploadFile(formData);
            console.log("Upload Response Array:", uploadResponseArray); // Debugging log
            // Check if the array is valid and has at least one element
            if (!uploadResponseArray || uploadResponseArray.length === 0 || !uploadResponseArray[0].id) {
                throw new Error('File upload response did not contain expected data or failed.');
            }
            // Get the first uploaded file details from the array
            const uploadedFile = uploadResponseArray[0];
            console.log("Uploaded File:", uploadedFile); // Debugging log
             // Step 2: Create the web_media entry linking to the uploaded file ID
             const createPayload: CreateWebMediaPayload = {
                name: name || uploadedFile.name, // Use provided name or fallback to filename
                alt: alt || name || uploadedFile.name || null, // Use provided alt or fallback to name
                key: userKey, // Pass the user's key
                media: uploadedFile.id, // Link using the uploaded file ID
            };
            // createWebMedia now returns the created WebMedia object
            const webMediaResponse = await createWebMedia(createPayload);
            return webMediaResponse; // Return the created web_media data
        },
        onSuccess: (data) => {
            // Toast is now handled in the component for better user experience after delay
            // toast({
            //     title: 'Success!',
            //     description: `Media "${data.name}" uploaded and saved successfully.`,
            // });
            // Invalidate the media query for the current user to refetch the list
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


// Hook for updating web media metadata
export function useUpdateMediaMutation() {
    const queryClient = useQueryClient();
     const { data: currentUser } = useCurrentUser();
     const userKey = currentUser?.key;

    // updateWebMedia service function expects Strapi v5 payload and returns WebMedia
    // We don't need the userKey for update, just the webMedia ID
    return useMutation<WebMedia, Error, { id: number; payload: UpdateWebMediaPayload }>({
        mutationFn: ({ id, payload }) => updateWebMedia(id, payload),
        onSuccess: (data) => {
            toast({
                title: 'Success!',
                // Access name directly (Strapi v5)
                description: `Media "${data.name}" updated successfully.`,
            });
            // Optimistic update or invalidate query for the current user
            queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEY(userKey) });
        },
        onError: (error: unknown, variables) => {
             let message = `Could not update media (ID: ${variables.id}).`;
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



// Hook for deleting a web_media entry and its associated file
export function useDeleteMediaMutation() {
    const queryClient = useQueryClient();
     const { data: currentUser } = useCurrentUser();
     const userKey = currentUser?.key;

    // deleteMediaAndFile service function returns { webMediaDeleted: boolean; fileDeleted: boolean }
    // We don't need the userKey for delete, just the IDs
    return useMutation< { webMediaDeleted: boolean; fileDeleted: boolean }, Error, { webMediaId: number; fileId: number | null } >({
        mutationFn: ({ webMediaId, fileId }) => deleteMediaAndFile(webMediaId, fileId),
        onSuccess: (data, variables) => {
            let description = `Media entry (ID: ${variables.webMediaId}) deleted successfully.`;
            if (variables.fileId !== null) { // Check if fileId was provided
                 description += data.fileDeleted ? ` Associated file (ID: ${variables.fileId}) also deleted.` : ` Could not delete associated file (ID: ${variables.fileId}). Check server logs.`;
            } else {
                 description += " No associated file to delete.";
            }
            toast({
                title: 'Deletion Status',
                description: description,
                // Use default variant unless there was a file deletion issue
                variant: (variables.fileId !== null && !data.fileDeleted) ? 'destructive' : 'default',
            });
            // Invalidate the media query for the current user to refetch the list
            queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEY(userKey) });
        },
        onError: (error: unknown, variables) => {
             let message = `Could not delete media (ID: ${variables.webMediaId}).`;
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

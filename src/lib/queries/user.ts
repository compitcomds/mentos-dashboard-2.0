
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCurrentUser, updateUserProfile as updateUserProfileService } from '@/lib/services/user'; // Import the service function
import type { User, ProfileFormValues } from '@/types/auth'; // Import the User type
import { toast } from '@/hooks/use-toast';

const USER_QUERY_KEY = ['currentUser'];

/**
 * Hook to fetch the currently authenticated user's data.
 * Uses TanStack Query for caching and state management.
 */
export function useCurrentUser() {
  return useQuery<User, Error>({
    queryKey: USER_QUERY_KEY,
    queryFn: fetchCurrentUser,
    staleTime: 1000 * 60 * 15, // 15 minutes data is considered fresh
    gcTime: 1000 * 60 * 60,   // 1 hour garbage collection time
    retry: 1,                 // Retry once on failure
    refetchOnWindowFocus: false, // Don't refetch just because the window gained focus
  });
}

/**
 * Hook to update the current user's profile information.
 */
export function useUpdateUserProfileMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<User, Error, { id: number; payload: Partial<ProfileFormValues> }>({
    mutationFn: ({ id, payload }) => updateUserProfileService(id, payload),
    onSuccess: (data) => {
      toast({
        title: 'Profile Updated',
        description: 'Your profile information has been saved successfully.',
      });
      // Invalidate and refetch the currentUser query to get the updated data
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
      console.log('User profile updated:', data);
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message
                     || error.response?.data?.message
                     || error.message
                     || 'Failed to update profile.';
      toast({
        variant: 'destructive',
        title: 'Profile Update Failed',
        description: message,
      });
      console.error("Profile update error:", error.response?.data || error);
    },
  });
}

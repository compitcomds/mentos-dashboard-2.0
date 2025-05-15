
'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchCurrentUser } from '@/lib/services/user'; // Import the service function
import type { User } from '@/types/auth'; // Import the User type

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

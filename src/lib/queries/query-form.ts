'use client';

import { useQuery } from "@tanstack/react-query";
import { getQueryForms, getQueryForm } from "@/lib/services/query-form";
import type { QueryForm } from "@/types/query-form";
// REMOVED: import { useCurrentUser } from './user'; // Not needed if userKey isn't passed

const QUERY_FORMS_QUERY_KEY = ['queryForms']; // Updated: Removed userKey
const QUERY_FORM_DETAIL_QUERY_KEY = (id?: string) => ['queryForm', id || 'detail']; // Updated: Removed userKey

export const useGetQueryForms = () => {
  // REMOVED: const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  // REMOVED: const userKey = currentUser?.key;

  return useQuery<QueryForm[], Error>({
    queryKey: QUERY_FORMS_QUERY_KEY, // Updated: Use key without userKey
    queryFn: () => {
        // REMOVED: userKey check
        return getQueryForms(); // Updated: Call without userKey
    },
    // REMOVED: enabled condition based on userKey and isLoadingUser
    // The query will now enable as soon as the component mounts,
    // assuming authentication (JWT) is handled by getAuthHeader in the service.
    enabled: true, 
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15,  // 15 minutes
  });
};

export const useGetQueryForm = (id: string | null) => {
  // REMOVED: const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  // REMOVED: const userKey = currentUser?.key;

  return useQuery<QueryForm | null, Error>({
    queryKey: QUERY_FORM_DETAIL_QUERY_KEY(id ?? undefined), // Updated: Use key without userKey
    queryFn: () => {
        if (!id) return null;
        // REMOVED: userKey check
        return getQueryForm(id); // Updated: Call without userKey
    },
    enabled: !!id, // Updated: Enable only based on id
    staleTime: 1000 * 60 * 5,
  });
};


'use client';

import { useQuery } from "@tanstack/react-query";
import { getQueryForms, getQueryForm } from "@/lib/services/query-form";
import type { QueryForm } from "@/types/query-form";
import { useCurrentUser } from './user'; 

const QUERY_FORMS_QUERY_KEY = (userTenentId?: string) => ['queryForms', userTenentId || 'all'];
const QUERY_FORM_DETAIL_QUERY_KEY = (id?: string, userTenentId?: string) => ['queryForm', id || 'detail', userTenentId || 'all'];

export const useGetQueryForms = () => {
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const userTenentId = currentUser?.tenent_id;

  return useQuery<QueryForm[], Error>({
    queryKey: QUERY_FORMS_QUERY_KEY(userTenentId),
    queryFn: () => {
        if (!userTenentId) {
            console.warn("useGetQueryForms: User tenent_id not available. Returning empty array.");
            return Promise.resolve([]);
        }
        return getQueryForms(userTenentId);
    },
    enabled: !!userTenentId && !isLoadingUser,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  });
};

export const useGetQueryForm = (id: string | null) => {
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const userTenentId = currentUser?.tenent_id;

  return useQuery<QueryForm | null, Error>({
    queryKey: QUERY_FORM_DETAIL_QUERY_KEY(id ?? undefined, userTenentId),
    queryFn: () => {
        if (!id || !userTenentId) return null;
        return getQueryForm(id, userTenentId);
    },
    enabled: !!id && !!userTenentId && !isLoadingUser,
    staleTime: 1000 * 60 * 5,
  });
};


'use client';

import { useQuery } from "@tanstack/react-query";
import { getQueryForms as getQueryFormsService, getQueryForm as getQueryFormService } from "@/lib/services/query-form";
import type { QueryForm } from "@/types/query-form";
import type { FindMany } from "@/types/strapi_response";
import { useCurrentUser } from './user';

export interface UseGetQueryFormsOptions {
  type?: string | null;
  group_id?: string | null;
  page?: number;
  pageSize?: number;
}

const QUERY_FORMS_QUERY_KEY = (userTenentId?: string, type?: string | null, group_id?: string | null, page?: number, pageSize?: number) =>
  ['queryForms', userTenentId || 'all', type || 'allTypes', group_id || 'allGroups', page || 1, pageSize || 10];

const QUERY_FORM_DETAIL_QUERY_KEY = (id?: string, userTenentId?: string) => ['queryForm', id || 'detail', userTenentId || 'all'];

export const useGetQueryForms = (options?: UseGetQueryFormsOptions) => {
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const userTenentId = currentUser?.tenent_id;
  const { type, group_id, page = 1, pageSize = 10 } = options || {};

  return useQuery<FindMany<QueryForm>, Error>({
    queryKey: QUERY_FORMS_QUERY_KEY(userTenentId, type, group_id, page, pageSize),
    queryFn: () => {
        if (!userTenentId) {
            console.warn("useGetQueryForms: User tenent_id not available. Returning empty result.");
            return Promise.resolve({ data: [], meta: { pagination: { page: 1, pageSize, pageCount: 0, total: 0 } } });
        }
        return getQueryFormsService({ userTenentId, type, group_id, page, pageSize });
    },
    enabled: !!userTenentId && !isLoadingUser,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10,  // 10 minutes
  });
};

export const useGetQueryForm = (id: string | null) => {
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const userTenentId = currentUser?.tenent_id;

  return useQuery<QueryForm | null, Error>({
    queryKey: QUERY_FORM_DETAIL_QUERY_KEY(id ?? undefined, userTenentId),
    queryFn: () => {
        if (!id || !userTenentId) return null;
        return getQueryFormService(id, userTenentId);
    },
    enabled: !!id && !!userTenentId && !isLoadingUser,
    staleTime: 1000 * 60 * 5,
  });
};


'use client';

import { useQuery } from "@tanstack/react-query";
import { getQueryForms as getQueryFormsService, getQueryForm as getQueryFormService, type GetQueryFormsParams } from "@/lib/services/query-form";
import type { QueryForm } from "@/types/query-form";
import type { FindMany } from "@/types/strapi_response";
import { useCurrentUser } from './user';

export interface UseGetQueryFormsOptions {
  type?: string | null;
  group_id?: string | null;
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  dateFrom?: Date | null;
  dateTo?: Date | null;
  // Add an option to signal fetching all data for export
  fetchAllForExport?: boolean;
}

const QUERY_FORMS_QUERY_KEY = (userTenentId?: string, options?: UseGetQueryFormsOptions) =>
  ['queryForms', userTenentId || 'all', options?.type || 'allTypes', options?.group_id || 'allGroups', options?.page || 1, options?.pageSize || 10, options?.sortField, options?.sortOrder, options?.dateFrom?.toISOString(), options?.dateTo?.toISOString(), options?.fetchAllForExport];

const QUERY_FORM_DETAIL_QUERY_KEY = (id?: string, userTenentId?: string) => ['queryForm', id || 'detail', userTenentId || 'all'];

export const useGetQueryForms = (options?: UseGetQueryFormsOptions) => {
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const userTenentId = currentUser?.tenent_id;
  const { type, group_id, page = 1, pageSize = 10, sortField, sortOrder, dateFrom, dateTo, fetchAllForExport = false } = options || {};

  const effectivePageSize = fetchAllForExport ? 1000 : pageSize; // Use a large page size for export, or default
  const effectivePage = fetchAllForExport ? 1 : page; // For export, always fetch from page 1

  return useQuery<FindMany<QueryForm>, Error>({
    queryKey: QUERY_FORMS_QUERY_KEY(userTenentId, { type, group_id, page: effectivePage, pageSize: effectivePageSize, sortField, sortOrder, dateFrom, dateTo, fetchAllForExport }),
    queryFn: () => {
        if (!userTenentId) {
            console.warn("useGetQueryForms: User tenent_id not available. Returning empty result.");
            return Promise.resolve({ data: [], meta: { pagination: { page: 1, pageSize: effectivePageSize, pageCount: 0, total: 0 } } });
        }
        const params: GetQueryFormsParams = { userTenentId, type, group_id, page: effectivePage, pageSize: effectivePageSize, sortField, sortOrder, dateFrom, dateTo };
        return getQueryFormsService(params);
    },
    enabled: !!userTenentId && !isLoadingUser, // Query is enabled if userTenentId exists and user is not loading
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

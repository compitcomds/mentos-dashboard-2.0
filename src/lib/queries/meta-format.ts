
'use client';

import { useQuery } from "@tanstack/react-query";
import { getMetaFormats, getMetaFormat } from "@/lib/services/meta-format";
import type { MetaFormat } from "@/types/meta-format";
import { useCurrentUser } from './user';

const META_FORMATS_QUERY_KEY = (userTenentId?: string) => ['metaFormats', userTenentId || 'all'];
const META_FORMAT_DETAIL_QUERY_KEY = (documentId?: string, userTenentId?: string) => ['metaFormat', documentId || 'detail', userTenentId || 'all'];

export const useGetMetaFormats = () => {
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const userTenentId = currentUser?.tenent_id;

  return useQuery<MetaFormat[], Error>({
    queryKey: META_FORMATS_QUERY_KEY(userTenentId),
    queryFn: () => {
      if (!userTenentId) {
        console.warn("useGetMetaFormats: User tenent_id not available. Returning empty array.");
        return Promise.resolve([]);
      }
      return getMetaFormats(userTenentId);
    },
    enabled: !!userTenentId && !isLoadingUser,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
  });
};

export const useGetMetaFormat = (documentId: string | null) => {
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const userTenentId = currentUser?.tenent_id;

  return useQuery<MetaFormat | null, Error>({
    queryKey: META_FORMAT_DETAIL_QUERY_KEY(documentId ?? undefined, userTenentId),
    queryFn: () => {
      if (!documentId || !userTenentId) return null;
      return getMetaFormat(documentId, userTenentId);
    },
    enabled: !!documentId && !!userTenentId && !isLoadingUser,
    staleTime: 1000 * 60 * 5,
  });
};

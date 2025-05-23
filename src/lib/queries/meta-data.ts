
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import {
  getMetaDataEntries,
  createMetaDataEntry,
  getMetaDataEntry,
  updateMetaDataEntry,
  deleteMetaDataEntry,
} from '@/lib/services/meta-data';
import type { MetaData, CreateMetaDataPayload } from '@/types/meta-data';
import { useCurrentUser } from './user';

export const META_DATA_ENTRIES_QUERY_KEY = (metaFormatDocumentId: string, userTenentId?: string) => ['metaDataEntries', metaFormatDocumentId, userTenentId || 'all'];
export const META_DATA_ENTRY_DETAIL_QUERY_KEY = (documentId?: string, userTenentId?: string) => ['metaDataEntry', documentId || 'detail', userTenentId || 'all'];

export function useGetMetaDataEntries(metaFormatDocumentId: string) {
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const userTenentId = currentUser?.tenent_id;

  return useQuery<MetaData[], Error>({
    queryKey: META_DATA_ENTRIES_QUERY_KEY(metaFormatDocumentId, userTenentId),
    queryFn: () => {
      if (!userTenentId) {
        console.warn("useGetMetaDataEntries: User tenent_id not available. Returning empty array.");
        return Promise.resolve([]);
      }
      if (!metaFormatDocumentId) {
        console.warn("useGetMetaDataEntries: metaFormatDocumentId not available. Returning empty array.");
        return Promise.resolve([]);
      }
      return getMetaDataEntries(metaFormatDocumentId, userTenentId);
    },
    enabled: !!userTenentId && !!metaFormatDocumentId && !isLoadingUser,
  });
}

export function useCreateMetaDataEntry() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  return useMutation<MetaData, Error, CreateMetaDataPayload>({
    mutationFn: (payload) => {
      if (!currentUser?.tenent_id) {
        throw new Error('User tenent_id is not available. Cannot create MetaData entry.');
      }
      // Ensure tenent_id and user are correctly set in payload by the caller or here.
      // Caller should provide meta_format documentId.
      return createMetaDataEntry({ ...payload, tenent_id: currentUser.tenent_id, user: currentUser.id });
    },
    onSuccess: (data) => {
      toast({ title: "Success", description: "MetaData entry created successfully." });
      if (data.meta_format && typeof data.meta_format !== 'number' && data.meta_format.documentId) { // Check if meta_format is populated
         queryClient.invalidateQueries({ queryKey: META_DATA_ENTRIES_QUERY_KEY(data.meta_format.documentId, currentUser?.tenent_id) });
      } else {
         // Fallback if meta_format is not populated or only ID is available - this might require a broader invalidation or specific logic
         queryClient.invalidateQueries({ queryKey: ['metaDataEntries'] }); // More generic invalidation
      }
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error Creating MetaData", description: error.message });
    },
  });
}

export function useGetMetaDataEntry(documentId: string | null) {
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const userTenentId = currentUser?.tenent_id;

  return useQuery<MetaData | null, Error>({
    queryKey: META_DATA_ENTRY_DETAIL_QUERY_KEY(documentId ?? undefined, userTenentId),
    queryFn: () => {
      if (!documentId || !userTenentId) return null;
      return getMetaDataEntry(documentId, userTenentId);
    },
    enabled: !!documentId && !!userTenentId && !isLoadingUser,
  });
}

export function useUpdateMetaDataEntry() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  return useMutation<MetaData, Error, { documentId: string; payload: Partial<Omit<CreateMetaDataPayload, 'meta_format' | 'tenent_id'>> }>({
    mutationFn: ({ documentId, payload }) => {
      if (!currentUser?.tenent_id) {
        throw new Error('User tenent_id is not available. Cannot update MetaData entry.');
      }
      return updateMetaDataEntry(documentId, payload, currentUser.tenent_id);
    },
    onSuccess: (data) => {
      toast({ title: "Success", description: "MetaData entry updated successfully." });
      const metaFormatDocId = typeof data.meta_format === 'object' && data.meta_format?.documentId ? data.meta_format.documentId : null;
      if (metaFormatDocId) {
        queryClient.invalidateQueries({ queryKey: META_DATA_ENTRIES_QUERY_KEY(metaFormatDocId, currentUser?.tenent_id) });
      } else {
         queryClient.invalidateQueries({ queryKey: ['metaDataEntries'] });
      }
      if (data.documentId) {
        queryClient.invalidateQueries({ queryKey: META_DATA_ENTRY_DETAIL_QUERY_KEY(data.documentId, currentUser?.tenent_id) });
      }
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error Updating MetaData", description: error.message });
    },
  });
}

export function useDeleteMetaDataEntry() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  return useMutation<MetaData | void, Error, { documentId: string, metaFormatDocumentId: string | null }>({
    mutationFn: ({ documentId }) => {
      if (!currentUser?.tenent_id) {
        throw new Error('User tenent_id is not available. Cannot delete MetaData entry.');
      }
      return deleteMetaDataEntry(documentId, currentUser.tenent_id);
    },
    onSuccess: (data, variables) => {
      toast({ title: "Success", description: "MetaData entry deleted successfully." });
      if (variables.metaFormatDocumentId) {
        queryClient.invalidateQueries({ queryKey: META_DATA_ENTRIES_QUERY_KEY(variables.metaFormatDocumentId, currentUser?.tenent_id) });
      } else {
         queryClient.invalidateQueries({ queryKey: ['metaDataEntries'] });
      }
      queryClient.removeQueries({ queryKey: META_DATA_ENTRY_DETAIL_QUERY_KEY(variables.documentId, currentUser?.tenent_id) });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error Deleting MetaData", description: error.message });
    },
  });
}

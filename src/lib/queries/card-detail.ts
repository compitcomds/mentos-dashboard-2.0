
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import {
  getCardDetails as getCardDetailsService,
  createCardDetail as createCardDetailService,
  deleteCardDetail as deleteCardDetailService,
} from '@/lib/services/card-detail';
import type { CardDetail, CreateCardDetailPayload } from '@/types/card-detail';
import { useCurrentUser } from './user'; // For tenent_id and user ID

export const CARD_DETAILS_QUERY_KEY = (userTenentId?: string) => ['cardDetails', userTenentId || 'all'];

export function useGetCardDetails() {
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const userTenentId = currentUser?.tenent_id;

  return useQuery<CardDetail[], Error>({
    queryKey: CARD_DETAILS_QUERY_KEY(userTenentId),
    queryFn: () => {
      if (!userTenentId) {
        console.warn("useGetCardDetails: User tenent_id not available. Returning empty array.");
        return Promise.resolve([]);
      }
      return getCardDetailsService(userTenentId);
    },
    enabled: !!userTenentId && !isLoadingUser,
  });
}

export function useCreateCardDetail() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  return useMutation<CardDetail, Error, Omit<CreateCardDetailPayload, 'tenent_id' | 'user'>>({
    mutationFn: async (formData) => {
      if (!currentUser || !currentUser.tenent_id || currentUser.id === undefined) {
        throw new Error("User information is missing. Cannot save card details.");
      }
      const payload: CreateCardDetailPayload = {
        ...formData,
        tenent_id: currentUser.tenent_id,
        user: currentUser.id,
      };
      return createCardDetailService(payload);
    },
    onSuccess: (data) => {
      toast({ title: "Success", description: "Card details saved successfully." });
      queryClient.invalidateQueries({ queryKey: CARD_DETAILS_QUERY_KEY(currentUser?.tenent_id) });
    },
    onError: (error: any) => {
      const message = error.message || "Failed to save card details.";
      toast({
        variant: "destructive",
        title: "Error Saving Card",
        description: message,
      });
    },
  });
}

// Placeholder for delete mutation
export function useDeleteCardDetail() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  return useMutation<void, Error, { documentId: string }>({
    mutationFn: async ({ documentId }) => {
      if (!currentUser?.tenent_id) {
        throw new Error("User tenent_id is not available. Cannot delete card detail.");
      }
      // For now, this is a placeholder and might not actually delete from backend
      // return deleteCardDetailService(documentId, currentUser.tenent_id);
      console.warn(`Placeholder deleteCardDetail called for ${documentId}`);
      return Promise.resolve();
    },
    onSuccess: (_, variables) => {
      toast({ title: "Card Deleted (Placeholder)", description: `Card ${variables.documentId} removal simulated.` });
      queryClient.invalidateQueries({ queryKey: CARD_DETAILS_QUERY_KEY(currentUser?.tenent_id) });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error Deleting Card", description: error.message });
    },
  });
}

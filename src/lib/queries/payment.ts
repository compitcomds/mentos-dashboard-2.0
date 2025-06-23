
'use client';

import { useQuery } from "@tanstack/react-query";
import { getPayments as getPaymentsService } from "@/lib/services/payment"; // Service import
import type { Payment } from "@/types/payment";
import { useCurrentUser } from '@/lib/queries/user'; // Changed to absolute path

const PAYMENTS_QUERY_KEY = (userTenentId?: string) => ['payments', userTenentId || 'all'];

export const useGetPayments = () => {
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const userTenentId = currentUser?.tenent_id;

  return useQuery<Payment[], Error>({
    queryKey: PAYMENTS_QUERY_KEY(userTenentId),
    queryFn: () => {
        if (!userTenentId) {
            console.warn("useGetPayments: User tenent_id not available. Returning empty array.");
            return Promise.resolve([]);
        }
        return getPaymentsService(userTenentId);
    },
    enabled: !!userTenentId && !isLoadingUser,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    gcTime: 1000 * 60 * 60 * 25, // 25 hours
  });
};

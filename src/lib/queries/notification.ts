
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import {
  getNotifications as getNotificationsService,
  markNotificationAsRead as markNotificationAsReadService,
  markAllNotificationsAsRead as markAllNotificationsAsReadService,
} from '@/lib/services/notification';
import type { Notification, NotificationsResponse } from '@/types/notification';
import { useCurrentUser } from './user';

// Updated Query Key to include isRead status for differentiation
const NOTIFICATIONS_QUERY_KEY = (userId?: number, userTenentId?: string, isRead?: boolean | null, page?: number) =>
  ['notifications', userId || 'allUsers', userTenentId || 'allTenents', isRead === undefined ? 'all_status' : (isRead === null ? 'all_status_explicit' : (isRead ? 'read' : 'unread')), page || 1];

interface UseGetNotificationsOptions {
  limit?: number;
  isRead?: boolean | null; // Allow null for fetching all
  page?: number;
  enabled?: boolean; // To control query execution
  refetchInterval?: number | false; // Allow disabling refetch interval
}

export function useGetNotifications(options?: UseGetNotificationsOptions) {
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const userId = currentUser?.id;
  const userTenentId = currentUser?.tenent_id;
  const { limit = 10, isRead, page = 1, enabled = true, refetchInterval = 1000 * 60 * 2 } = options || {};


  return useQuery<NotificationsResponse, Error>({
    queryKey: NOTIFICATIONS_QUERY_KEY(userId, userTenentId, isRead, page),
    queryFn: () => {
      if (!userId || !userTenentId) {
        console.warn("[useGetNotifications] User ID or tenent_id not available. Returning empty data.");
        return Promise.resolve({ data: [], meta: { pagination: { page, pageSize: limit, pageCount: 0, total: 0 } } });
      }
      return getNotificationsService({ userId, userTenentId, limit, isRead, page });
    },
    enabled: !!userId && !!userTenentId && !isLoadingUser && enabled,
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: refetchInterval, // Use passed or default interval
  });
}

export function useMarkNotificationAsReadMutation() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  return useMutation<Notification, Error, { notificationId: number }>({
    mutationFn: ({ notificationId }) => markNotificationAsReadService(notificationId),
    onSuccess: () => {
      // No toast by default, individual components can show it
      // Invalidate both "all" and "unread" queries, and paginated queries
      queryClient.invalidateQueries({ queryKey: ['notifications', currentUser?.id, currentUser?.tenent_id] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Could not mark notification as read.",
      });
    },
  });
}

export function useMarkAllNotificationsAsReadMutation() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  return useMutation<void, Error>({
    mutationFn: () => {
      if (!currentUser?.id || !currentUser?.tenent_id) {
        throw new Error("User information is missing. Cannot mark all as read.");
      }
      return markAllNotificationsAsReadService(currentUser.id, currentUser.tenent_id);
    },
    onSuccess: () => {
      toast({ title: "Notifications Updated", description: "All notifications marked as read." });
      // Invalidate both "all" and "unread" queries, and paginated queries
      queryClient.invalidateQueries({ queryKey: ['notifications', currentUser?.id, currentUser?.tenent_id] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Could not mark all notifications as read.",
      });
    },
  });
}


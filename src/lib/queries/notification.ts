
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

const NOTIFICATIONS_QUERY_KEY = (userId?: number, userTenentId?: string) => ['notifications', userId || 'allUsers', userTenentId || 'allTenents'];

export function useGetNotifications(limit: number = 5) {
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const userId = currentUser?.id;
  const userTenentId = currentUser?.tenent_id;

  return useQuery<NotificationsResponse, Error>({
    queryKey: NOTIFICATIONS_QUERY_KEY(userId, userTenentId),
    queryFn: () => {
      if (!userId || !userTenentId) {
        console.warn("[useGetNotifications] User ID or tenent_id not available. Returning empty data.");
        return Promise.resolve({ data: [], meta: { pagination: { page: 1, pageSize: limit, pageCount: 0, total: 0 } } });
      }
      // Fetch only unread notifications for the bell
      return getNotificationsService({ userId, userTenentId, limit, isRead: false });
    },
    enabled: !!userId && !!userTenentId && !isLoadingUser,
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 1000 * 60 * 2, // Poll every 2 minutes
  });
}

export function useMarkNotificationAsReadMutation() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  return useMutation<Notification, Error, { notificationId: number }>({
    mutationFn: ({ notificationId }) => markNotificationAsReadService(notificationId),
    onSuccess: () => {
      toast({ title: "Notification Updated", description: "Notification marked as read." });
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY(currentUser?.id, currentUser?.tenent_id) });
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
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY(currentUser?.id, currentUser?.tenent_id) });
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

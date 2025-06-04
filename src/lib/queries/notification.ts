
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import {
  getNotifications as getNotificationsService,
  markNotificationAsRead as markNotificationAsReadService,
  markAllNotificationsAsRead as markAllNotificationsAsReadService,
} from '@/lib/services/notification';
// Using the updated Notification and NotificationsResponse types
import type { Notification, NotificationsResponse } from '@/types/notification';
import { useCurrentUser } from './user';

const NOTIFICATIONS_QUERY_KEY = (userId?: number, userTenentId?: string, isRead?: boolean | null, page?: number) =>
  ['notifications', userId || 'allUsers', userTenentId || 'allTenents', isRead === undefined ? 'all_status' : (isRead === null ? 'all_status_explicit' : (isRead ? 'read' : 'unread')), page || 1];

interface UseGetNotificationsOptions {
  limit?: number;
  isRead?: boolean | null;
  page?: number;
  enabled?: boolean;
  refetchInterval?: number | false;
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
    staleTime: 1000 * 60,
    refetchInterval: refetchInterval,
  });
}

export function useMarkNotificationAsReadMutation() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  return useMutation<Notification, Error, { notificationId: number }>({
    mutationFn: ({ notificationId }) => markNotificationAsReadService(notificationId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notifications', currentUser?.id, currentUser?.tenent_id] });
      // Also, update the specific notification in the cache if possible
      // This provides a more instant UI update before full refetch
      queryClient.setQueryData<NotificationsResponse>(
        NOTIFICATIONS_QUERY_KEY(currentUser?.id, currentUser?.tenent_id, null, undefined), // Example: invalidate 'all' status for all pages
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            data: oldData.data.map(n => n.id === variables.notificationId ? { ...n, isRead: true } : n),
          };
        }
      );
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
      queryClient.invalidateQueries({ queryKey: ['notifications', currentUser?.id, currentUser?.tenent_id] });
      // Optimistically update all currently fetched notifications to read
      queryClient.setQueryData<NotificationsResponse>(
         NOTIFICATIONS_QUERY_KEY(currentUser?.id, currentUser?.tenent_id, null, undefined),
         (oldData) => {
           if (!oldData) return oldData;
           return {
             ...oldData,
             data: oldData.data.map(n => ({ ...n, isRead: true })),
           };
         }
      );
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

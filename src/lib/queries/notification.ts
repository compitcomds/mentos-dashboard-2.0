
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

  return useMutation<Notification, Error, { documentId: string }>({ // Changed notificationId to documentId
    mutationFn: ({ documentId }) => markNotificationAsReadService(documentId), // Pass documentId
    onSuccess: (updatedNotification, variables) => { // variables now { documentId: string }
      queryClient.invalidateQueries({ queryKey: ['notifications', currentUser?.id, currentUser?.tenent_id] });

      // Optimistic update using documentId to find the notification, then its numeric id for matching in cache
      queryClient.setQueryData<NotificationsResponse>(
        NOTIFICATIONS_QUERY_KEY(currentUser?.id, currentUser?.tenent_id, null, undefined),
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            data: oldData.data.map(n =>
              n.documentId === variables.documentId || n.id === updatedNotification.id // Match by documentId or numeric id
                ? { ...n, isRead: true }
                : n
            ),
          };
        }
      );
      queryClient.setQueryData<NotificationsResponse>(
        NOTIFICATIONS_QUERY_KEY(currentUser?.id, currentUser?.tenent_id, false, undefined),
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            data: oldData.data.filter(n => !(n.documentId === variables.documentId || n.id === updatedNotification.id)),
            meta: {
                ...oldData.meta,
                pagination: {
                    ...oldData.meta.pagination,
                    total: Math.max(0, oldData.meta.pagination.total - 1)
                }
            }
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

      queryClient.invalidateQueries({
        queryKey: ['notifications', currentUser?.id, currentUser?.tenent_id]
      });

      queryClient.setQueryData<NotificationsResponse>(
        NOTIFICATIONS_QUERY_KEY(currentUser?.id, currentUser?.tenent_id, false, undefined),
        (oldData) => {
          const defaultPageSize = oldData?.meta?.pagination?.pageSize || 10;
          if (!oldData) {
            return {
              data: [],
              meta: {
                pagination: { page: 1, pageSize: defaultPageSize, pageCount: 0, total: 0 }
              }
            };
          }
          return {
            ...oldData,
            data: [],
            meta: {
                ...oldData.meta,
                pagination: {
                    ...oldData.meta.pagination,
                    total: 0,
                    pageCount: 0,
                    page: 1
                }
            }
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

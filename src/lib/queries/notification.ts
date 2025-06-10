
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

  return useMutation<Notification, Error, { documentId: string }>({
    mutationFn: ({ documentId }) => markNotificationAsReadService(documentId),
    onSuccess: (updatedNotification, variables) => {
      // Invalidate broad queries to ensure freshness for other views/pages.
      // This is a safe fallback if optimistic updates are too complex or miss some cases.
      queryClient.invalidateQueries({ queryKey: ['notifications', currentUser?.id, currentUser?.tenent_id] });

      // Optimistically update the "unread" list (isRead: false, page 1 implicitly if not specified)
      queryClient.setQueryData<NotificationsResponse>(
        NOTIFICATIONS_QUERY_KEY(currentUser?.id, currentUser?.tenent_id, false, undefined), // Targets 'unread' list, default page
        (oldData) => {
          const defaultPageSize = oldData?.meta?.pagination?.pageSize || 10;
          if (!oldData) {
            // If 'unread' list wasn't cached (e.g., never fetched or was empty),
            // after marking one as read, it effectively remains empty or reflects no *other* unread items.
            return { data: [], meta: { pagination: { page: 1, pageSize: defaultPageSize, pageCount: 0, total: 0 } } };
          }
          // If oldData exists, filter out the item being marked as read.
          const newDataArray = oldData.data.filter(n =>
            !(n.documentId === variables.documentId || (updatedNotification && n.id === updatedNotification.id))
          );
          const itemsRemovedCount = oldData.data.length - newDataArray.length;
          const newTotal = Math.max(0, oldData.meta.pagination.total - itemsRemovedCount);
          const newPageCount = Math.ceil(newTotal / (oldData.meta.pagination.pageSize || defaultPageSize)) || 0;
          
          return {
            ...oldData,
            data: newDataArray,
            meta: {
              ...oldData.meta,
              pagination: {
                ...oldData.meta.pagination,
                total: newTotal,
                pageCount: newPageCount,
                // page should remain the same unless it becomes invalid (e.g., last item on last page removed)
                // For simplicity, not adjusting page here, relying on invalidation if needed for complex cases.
              },
            },
          };
        }
      );

      // Optimistically update the "all statuses" list (isRead: null, page 1 implicitly if not specified)
      queryClient.setQueryData<NotificationsResponse>(
        NOTIFICATIONS_QUERY_KEY(currentUser?.id, currentUser?.tenent_id, null, undefined), // Targets 'all_status_explicit' list, default page
        (oldData) => {
          const defaultPageSize = oldData?.meta?.pagination?.pageSize || 10;
          if (!updatedNotification) { 
            // This case should ideally not happen if the mutation was successful.
            // If oldData is also undefined, returning a default empty state is safest.
            if (!oldData) return { data: [], meta: { pagination: { page: 1, pageSize: defaultPageSize, pageCount: 0, total: 0 } } };
            return oldData; // Return oldData if updatedNotification is missing for some reason.
          }

          if (!oldData) {
            // If 'all' list wasn't cached, initialize it with just the updated notification.
            // updatedNotification should have isRead: true from the backend response.
            return {
              data: [{ ...updatedNotification, isRead: true }], // Ensure isRead is true
              meta: { pagination: { page: 1, pageSize: defaultPageSize, pageCount: 1, total: 1 } }
            };
          }
          // If oldData exists, map and update the specific notification.
          const itemExistsInOldData = oldData.data.some(n => n.documentId === variables.documentId || n.id === updatedNotification.id);
          
          let newDataArray;
          if (itemExistsInOldData) {
            newDataArray = oldData.data.map(n =>
              (n.documentId === variables.documentId || n.id === updatedNotification.id)
                ? { ...updatedNotification, isRead: true } // Ensure it uses the data from the server response and sets isRead
                : n
            );
          } else {
            // If item not in current page/cache of 'all', add it.
            // This might make totals inaccurate if not careful, invalidation helps.
            newDataArray = [{ ...updatedNotification, isRead: true }, ...oldData.data]; 
            // For simplicity, not adjusting total here, relying on main invalidation.
          }
          
          return {
            ...oldData,
            data: newDataArray,
            // 'total' and 'pageCount' for 'all' list generally don't change when marking one item as read.
            // If adding, it might change, but invalidation handles this.
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

      // Optimistically clear the 'unread' list (isRead: false)
      queryClient.setQueryData<NotificationsResponse>(
        NOTIFICATIONS_QUERY_KEY(currentUser?.id, currentUser?.tenent_id, false, undefined),
        (oldData) => {
          const defaultPageSize = oldData?.meta?.pagination?.pageSize || 10;
          // Regardless of oldData, the unread list is now empty.
          return {
            data: [],
            meta: {
              pagination: { page: 1, pageSize: defaultPageSize, pageCount: 0, total: 0 }
            }
          };
        }
     );
     // Optimistically update the 'all' list (isRead: null) to mark all as read
     queryClient.setQueryData<NotificationsResponse>(
        NOTIFICATIONS_QUERY_KEY(currentUser?.id, currentUser?.tenent_id, null, undefined),
        (oldData) => {
          if (!oldData) {
            // If 'all' list isn't cached, we can't update it accurately.
            // Invalidation above will handle refetching.
            // Return a default empty state to prevent 'undefined' data.
            const defaultPageSize = 10;
            return { data: [], meta: { pagination: { page: 1, pageSize: defaultPageSize, pageCount: 0, total: 0 } } };
          }
          return {
            ...oldData,
            data: oldData.data.map(n => ({ ...n, isRead: true })),
            // Pagination meta (total, pageCount) remains the same for 'all' list.
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

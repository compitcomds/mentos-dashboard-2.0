
'use server';

// Using the updated Notification, NotificationsResponse, NotificationResponse types
import type { Notification, NotificationsResponse, UpdateNotificationPayload, NotificationResponse, CreateNotificationPayload } from '@/types/notification';
import axiosInstance from '@/lib/axios';
import { getAccessToken } from '@/lib/actions/auth';
import { AxiosError } from 'axios';

async function getAuthHeader() {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Authentication token not found.");
  }
  return { Authorization: `Bearer ${token}` };
}

interface GetNotificationsParams {
  userId: number;
  userTenentId: string;
  limit?: number;
  isRead?: boolean | null;
  page?: number;
}

export const getNotifications = async (params: GetNotificationsParams): Promise<NotificationsResponse> => {
  const { userId, userTenentId, limit = 10, isRead: filterIsRead, page = 1 } = params;

  if (!userId || !userTenentId) {
    console.error('[Service getNotifications]: userId or userTenentId is missing.');
    throw new Error('User ID and tenent_id are required to fetch notifications.');
  }

  const strapiFilters: any = {
    'user': { id: { '$eq': userId } },
    'tenent_id': { '$eq': userTenentId },
  };

  if (filterIsRead === true || filterIsRead === false) {
    strapiFilters['isRead'] = { '$eq': filterIsRead };
  }

  const queryParams: any = {
    filters: strapiFilters,
    sort: ['createdAt:desc'],
    'pagination[page]': page,
    'pagination[pageSize]': limit,
  };

  const url = '/notifications';
  console.log(`[getNotifications] Fetching URL: ${url} for user ${userId}, tenent ${userTenentId} with params:`, JSON.stringify(queryParams));

  try {
    const headers = await getAuthHeader();
    const response = await axiosInstance.get<NotificationsResponse>(url, { params: queryParams, headers });

    if (!response.data || !response.data.data || !Array.isArray(response.data.data) || !response.data.meta?.pagination) {
      console.error(`[getNotifications] Unexpected API response structure for user ${userId}. Expected 'data' array and 'meta.pagination', received:`, response.data);
      return { data: [], meta: { pagination: { page, pageSize: limit, pageCount: 0, total: 0 } } };
    }
    console.log(`[getNotifications] Fetched ${response.data.data.length} notifications for user ${userId}. Pagination:`, response.data.meta.pagination);
    return response.data;
  } catch (error: unknown) {
    let message = `Failed to fetch notifications for user ${userId}.`;
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const errorDataMessage = error.response?.data?.error?.message || error.message;
      console.error(`[getNotifications] API Error (${status}) for user ${userId}:`, error.response?.data);
      message = `API Error (${status}): ${errorDataMessage || 'Unknown API error'}`;
    } else if (error instanceof Error) {
      message = error.message;
    }
    console.error(`[getNotifications] Error: ${message}`, error);
    throw new Error(message);
  }
};

export const markNotificationAsRead = async (documentId: string): Promise<Notification> => {
  if (!documentId) {
    throw new Error("Notification documentId is required to mark as read.");
  }
  const url = `/notifications/${documentId}`; // Use documentId in the URL
  const payload: { data: UpdateNotificationPayload } = { data: { isRead: true } };
  console.log(`[markNotificationAsRead] Marking notification documentId ${documentId} as read. Payload:`, payload);

  try {
    const headers = await getAuthHeader();
    const response = await axiosInstance.put<NotificationResponse>(url, payload, { headers });

    if (!response.data || !response.data.data) {
      throw new Error('Unexpected API response structure after updating notification.');
    }
    console.log(`[markNotificationAsRead] Notification ${documentId} marked as read successfully.`);
    return response.data.data;
  } catch (error: unknown) {
    let message = `Failed to mark notification ${documentId} as read.`;
     if (error instanceof AxiosError) {
      const status = error.response?.status;
      const errorDataMessage = error.response?.data?.error?.message || error.message;
      console.error(`[markNotificationAsRead] API Error (${status}) for documentId ${documentId}:`, error.response?.data);
      message = `API Error (${status}): ${errorDataMessage || 'Unknown API error'}`;
    } else if (error instanceof Error) {
      message = error.message;
    }
    console.error(`[markNotificationAsRead] Error: ${message}`, error);
    throw new Error(message);
  }
};

export const markAllNotificationsAsRead = async (userId: number, userTenentId: string): Promise<void> => {
  console.log(`[markAllNotificationsAsRead] Attempting for user ${userId}, tenent ${userTenentId}.`);

  const unreadNotificationsResponse = await getNotifications({ userId, userTenentId, isRead: false, limit: -1 }); // Fetch all unread
  const unreadNotifications = unreadNotificationsResponse.data;

  if (unreadNotifications.length === 0) {
    console.log(`[markAllNotificationsAsRead] No unread notifications found for user ${userId}.`);
    return;
  }

  console.log(`[markAllNotificationsAsRead] Found ${unreadNotifications.length} unread notifications to mark as read for user ${userId}. Processing one by one...`);

  const updatePromises = unreadNotifications.map(notification => {
    if (!notification.documentId) {
      console.warn(`[markAllNotificationsAsRead] Notification with ID ${notification.id} is missing a documentId. Skipping.`);
      return Promise.resolve({ status: 'skipped', id: notification.id });
    }
    return markNotificationAsRead(notification.documentId)
      .then(updatedNotification => ({ status: 'fulfilled', value: updatedNotification }))
      .catch(error => ({ status: 'rejected', reason: error, id: notification.documentId }));
  });

  try {
    const results = await Promise.allSettled(updatePromises);
    const successfulUpdates = results.filter(result => result.status === 'fulfilled').length;
    const skippedUpdates = results.filter(result => (result.status === 'fulfilled' && (result.value as any)?.status === 'skipped') || (result.status === 'rejected' && (result.reason as any)?.status === 'skipped')).length;
    const failedUpdates = results.length - successfulUpdates - skippedUpdates;


    console.log(`[markAllNotificationsAsRead] Processed ${results.length} notifications for user ${userId}. Successful: ${successfulUpdates}, Skipped (no documentId): ${skippedUpdates}, Failed: ${failedUpdates}.`);

    if (failedUpdates > 0) {
      console.error(`[markAllNotificationsAsRead] Some notifications failed to update for user ${userId}. Failures:`, results.filter(r => r.status === 'rejected' && (r.reason as any)?.status !== 'skipped'));
      throw new Error(`Failed to mark all notifications as read. ${failedUpdates} of ${results.length - skippedUpdates} (attempted) failed.`);
    }
  } catch (error) {
    console.error(`[markAllNotificationsAsRead] Overall error marking all notifications as read for user ${userId}:`, error);
    if (!(error instanceof Error && error.message.startsWith("Failed to mark all notifications as read."))) {
        throw new Error("An unexpected error occurred while marking all notifications as read.");
    }
    throw error;
  }
};

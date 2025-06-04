
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

  // Strapi filters are applied directly to the fields in your flat structure
  const strapiFilters: any = {
    'user': { id: { '$eq': userId } }, // Assuming 'user' is a relation and you filter by its id
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
    // No 'populate' needed if the structure is already flat as per API response
  };

  const url = '/notifications';
  console.log(`[getNotifications] Fetching URL: ${url} for user ${userId}, tenent ${userTenentId} with params:`, JSON.stringify(queryParams));

  try {
    const headers = await getAuthHeader();
    // Expect NotificationsResponse which directly contains Notification[] in its data field
    const response = await axiosInstance.get<NotificationsResponse>(url, { params: queryParams, headers });

    // The response.data should already be in the NotificationsResponse structure
    // with data: Notification[] directly if the API sends it flat.
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

export const markNotificationAsRead = async (notificationId: number): Promise<Notification> => {
  if (!notificationId) {
    throw new Error("Notification ID is required to mark as read.");
  }
  const url = `/notifications/${notificationId}`;
  // Standard Strapi PUT request includes a 'data' wrapper in the payload
  const payload: { data: UpdateNotificationPayload } = { data: { isRead: true } };
  console.log(`[markNotificationAsRead] Marking notification ID ${notificationId} as read. Payload:`, payload);

  try {
    const headers = await getAuthHeader();
    // Expect NotificationResponse which directly contains Notification in its data field
    const response = await axiosInstance.put<NotificationResponse>(url, payload, { headers });

    if (!response.data || !response.data.data) {
      throw new Error('Unexpected API response structure after updating notification.');
    }
    console.log(`[markNotificationAsRead] Notification ${notificationId} marked as read successfully.`);
    return response.data.data; // Return the flat notification object
  } catch (error: unknown) {
    let message = `Failed to mark notification ${notificationId} as read.`;
     if (error instanceof AxiosError) {
      const status = error.response?.status;
      const errorDataMessage = error.response?.data?.error?.message || error.message;
      console.error(`[markNotificationAsRead] API Error (${status}) for ID ${notificationId}:`, error.response?.data);
      message = `API Error (${status}): ${errorDataMessage || 'Unknown API error'}`;
    } else if (error instanceof Error) {
      message = error.message;
    }
    console.error(`[markNotificationAsRead] Error: ${message}`, error);
    throw new Error(message);
  }
};

// Renaming to avoid conflict if another markNotificationAsRead exists, or ensure correct import
const markNotificationAsReadService = markNotificationAsRead;

export const markAllNotificationsAsRead = async (userId: number, userTenentId: string): Promise<void> => {
  console.log(`[markAllNotificationsAsRead] Attempting for user ${userId}, tenent ${userTenentId}.`);
  const unreadNotificationsResponse = await getNotifications({ userId, userTenentId, isRead: false, limit: -1 });

  if (unreadNotificationsResponse.data.length === 0) {
    console.log(`[markAllNotificationsAsRead] No unread notifications found for user ${userId}.`);
    return;
  }

  const updatePromises = unreadNotificationsResponse.data.map(notification =>
    markNotificationAsReadService(notification.id)
  );

  try {
    await Promise.all(updatePromises);
    console.log(`[markAllNotificationsAsRead] Successfully marked ${unreadNotificationsResponse.data.length} notifications as read for user ${userId}.`);
  } catch (error) {
    console.error(`[markAllNotificationsAsRead] Error marking all notifications as read for user ${userId}:`, error);
    throw new Error("Failed to mark all notifications as read. Some may have failed.");
  }
};

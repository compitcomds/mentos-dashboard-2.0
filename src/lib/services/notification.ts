
'use server';

import type { Notification, NotificationsResponse, UpdateNotificationPayload, NotificationResponse } from '@/types/notification';
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
  isRead?: boolean | null; // Updated to allow null/undefined for fetching all
  page?: number; // Added for pagination
}

export const getNotifications = async (params: GetNotificationsParams): Promise<NotificationsResponse> => {
  const { userId, userTenentId, limit = 10, isRead: filterIsRead, page = 1 } = params; // Default limit for pages

  if (!userId || !userTenentId) {
    console.error('[Service getNotifications]: userId or userTenentId is missing.');
    throw new Error('User ID and tenent_id are required to fetch notifications.');
  }

  const strapiFilters: any = {
    'user': { id: { '$eq': userId } },
    'tenent_id': { '$eq': userTenentId },
  };

  // Only add the isRead filter if it's explicitly true or false
  if (filterIsRead === true || filterIsRead === false) {
    strapiFilters['isRead'] = { '$eq': filterIsRead };
  }
  // If filterIsRead is null or undefined, no isRead filter is applied, fetching all.

  const queryParams: any = {
    filters: strapiFilters,
    sort: ['createdAt:desc'],
    'pagination[page]': page,
    'pagination[pageSize]': limit, // Use limit as pageSize for pagination
    populate: ['user'],
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

export const markNotificationAsRead = async (notificationId: number): Promise<Notification> => {
  if (!notificationId) {
    throw new Error("Notification ID is required to mark as read.");
  }
  const url = `/notifications/${notificationId}`;
  const payload: { data: UpdateNotificationPayload } = { data: { isRead: true } };
  console.log(`[markNotificationAsRead] Marking notification ID ${notificationId} as read. Payload:`, payload);

  try {
    const headers = await getAuthHeader();
    const response = await axiosInstance.put<NotificationResponse>(url, payload, { headers });
    if (!response.data || !response.data.data) {
      throw new Error('Unexpected API response structure after updating notification.');
    }
    console.log(`[markNotificationAsRead] Notification ${notificationId} marked as read successfully.`);
    return response.data.data;
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

export const markAllNotificationsAsRead = async (userId: number, userTenentId: string): Promise<void> => {
  console.log(`[markAllNotificationsAsRead] Attempting for user ${userId}, tenent ${userTenentId}.`);
  // 1. Fetch all unread notifications for the user for the given tenent_id
  const unreadNotificationsResponse = await getNotifications({ userId, userTenentId, isRead: false, limit: -1 }); // limit -1 for all

  if (unreadNotificationsResponse.data.length === 0) {
    console.log(`[markAllNotificationsAsRead] No unread notifications found for user ${userId}.`);
    return;
  }

  // 2. Iterate and mark each as read
  const updatePromises = unreadNotificationsResponse.data.map(notification =>
    markNotificationAsReadService(notification.id) // Ensure this function is correctly named or imported
  );

  try {
    await Promise.all(updatePromises);
    console.log(`[markAllNotificationsAsRead] Successfully marked ${unreadNotificationsResponse.data.length} notifications as read for user ${userId}.`);
  } catch (error) {
    console.error(`[markAllNotificationsAsRead] Error marking all notifications as read for user ${userId}:`, error);
    throw new Error("Failed to mark all notifications as read. Some may have failed.");
  }
};
// Renaming to avoid conflict if another markNotificationAsRead exists, or ensure correct import
const markNotificationAsReadService = markNotificationAsRead;


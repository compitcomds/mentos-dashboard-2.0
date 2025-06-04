
import type { User } from './auth';

export type NotificationType = "info" | "warning" | "error" | "success" | "custom";

export interface Notification {
  id: number; // Assuming ID is always present when fetched
  documentId?: string; // Optional, if you use a separate string ID
  attributes: {
    type: NotificationType;
    title: string;
    message?: string | null;
    isRead: boolean;
    actionUrl?: string | null;
    user?: { data: User | null }; // Strapi relation structure
    context?: Record<string, any> | null;
    tenent_id: string;
    createdAt?: string | Date;
    updatedAt?: string | Date;
    publishedAt?: string | Date | null;
  };
}

// Strapi V4 response structure for a single item
export interface NotificationResponse {
  data: Notification | null;
  meta: {};
}

// Strapi V4 response structure for multiple items
export interface NotificationsResponse {
  data: Notification[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}


// For creating a notification (if needed, though likely backend-driven)
export interface CreateNotificationPayload {
  type: NotificationType;
  title: string;
  message?: string | null;
  isRead?: boolean;
  actionUrl?: string | null;
  user: number; // User ID
  context?: Record<string, any> | null;
  tenent_id: string;
}

// For updating a notification (e.g., marking as read)
export interface UpdateNotificationPayload {
  isRead?: boolean;
  // Potentially other fields if they can be updated
}


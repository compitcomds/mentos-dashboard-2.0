
import type { User } from './auth';

export type NotificationType = "info" | "warning" | "error" | "success" | "custom";

// This interface directly reflects the API response structure for a single notification item
export interface Notification {
  id: number;
  documentId?: string; // Assuming this is added by your service or is optional from API
  type?: NotificationType | null; // Make it nullable if API can return null
  title: string;
  message?: string | null;
  isRead?: boolean | null; // Make it nullable
  actionUrl?: string | null;
  user?: User | null; // Strapi might return user as an object or just ID. Adapt if needed.
  context?: Record<string, any> | null;
  tenent_id?: string | null; // Make it nullable
  createdAt?: string | Date;
  updatedAt?: string | Date;
  publishedAt?: string | Date | null;
}

// Strapi V4 response structure for a single item, assuming flat notification data
export interface NotificationResponse {
  data: Notification | null;
  meta: Record<string, any>; // Keep meta flexible
}

// Strapi V4 response structure for multiple items, assuming flat notification data
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
// This payload should match what Strapi expects (usually wrapped in 'data')
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
// This payload should match what Strapi expects (usually wrapped in 'data')
export interface UpdateNotificationPayload {
  isRead?: boolean;
  // Potentially other fields if they can be updated
}

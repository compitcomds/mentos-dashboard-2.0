
import type { User } from './auth';
import type { Media } from './media'; // Import Media type

// Based on user-provided 'QueryForm'
export interface QueryForm {
  id?: number;
  documentId?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  publishedAt?: Date | string | null; // Ensure publishedAt can be null
  locale?: string | null;
  name?: string;
  email?: string;
  description?: string | null;
  other_meta?: Record<string, any> | null;
  user?: User | null;
  tenent_id: string;
  type?: "contact" | "career" | "event" | "membership" | null; // Added type
  group_id?: string | null; // Added group_id
  media?: Media[] | null; // Added media relation (array of Media objects)
  media_size_Kb?: number | null; // Added media_size_Kb
}

// Payload for creating a query form
export interface CreateQueryFormPayload {
  name?: string;
  email?: string;
  description?: string | null;
  other_meta?: Record<string, any> | null;
  tenent_id: string;
  user?: number | null; // Send user ID for relation
  type?: "contact" | "career" | "event" | "membership" | null;
  group_id?: string | null;
  media?: number[] | null; // Array of media IDs for relation
  media_size_Kb?: number | null;
}

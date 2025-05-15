import type { User } from './auth'; // Assuming User type is in auth.ts

// Based on user-provided 'QueryForm'
export interface QueryForm {
  id?: number;
  documentId?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  publishedAt?: Date | string;
  locale?: string | null;
  name?: string; // Optional
  email?: string; // Optional
  description?: string | null; // Optional
  other_meta?: Record<string, any> | null; // JSON can be 'any' or a more specific type
  user?: User | null; // Optional user relation
  tenent_id?: string; // Changed from key, made optional as per user's QueryForm
}
  
// Payload for creating a query form
export interface CreateQueryFormPayload {
  name?: string;
  email?: string;
  description?: string | null;
  other_meta?: Record<string, any> | null;
  tenent_id: string; // Changed from key, assuming this is mandatory for creation
  user?: number | null; // Send user ID for relation
}

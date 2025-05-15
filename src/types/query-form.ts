import type { User } from './auth'; // Assuming User type is in auth.ts

// Based on user-provided 'QueryForm'
export interface QueryForm {
  id?: number;
  documentId?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  publishedAt?: Date | string;
  locale?: string | null;
  name?: string; 
  email?: string; 
  description?: string | null; 
  other_meta?: Record<string, any> | null; 
  user?: User | null; 
  tenent_id: string; // Changed from optional to mandatory
}
  
// Payload for creating a query form
export interface CreateQueryFormPayload {
  name?: string;
  email?: string;
  description?: string | null;
  other_meta?: Record<string, any> | null;
  tenent_id: string; 
  user?: number | null; // Send user ID for relation
}

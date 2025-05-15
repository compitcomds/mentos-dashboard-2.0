import type { User } from './auth'; // Assuming User type is in auth.ts

// Based on user-provided 'Categorie'
export interface Categorie {
  id?: number;
  documentId?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  publishedAt?: Date | string;
  locale?: string | null;
  name: string;
  description?: string | null; // description is optional
  tenent_id: string; // Changed from key
  slug?: string | null; // slug is optional
  user?: User | null; // user relation is optional
}
  
// Payload for creating/updating a category
export interface CreateCategoryPayload {
  name: string;
  description?: string | null;
  slug?: string | null; // slug is optional
  tenent_id: string; // Changed from key
  user?: number | null; // Send user ID for relation
}


import type { User } from './auth'; // Assuming User type is in auth.ts

// Based on user-provided 'Categorie'
export interface Categorie {
  id?: number;
  documentId?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  publishedAt?: Date | string | null; // Updated to allow null
  locale?: string | null;
  name: string;
  description?: string | null;
  tenent_id: string;
  slug?: string | null;
  user?: User | null;
}

// Payload for creating/updating a category
export interface CreateCategoryPayload {
  name: string;
  description?: string | null;
  slug?: string | null;
  tenent_id: string;
  user?: number | null; // Send user ID for relation
}

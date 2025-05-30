
import type { User } from './auth';

export interface UserResource {
  id?: number;
  documentId?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  publishedAt?: Date | string | null;
  tenent_id: string;
  user?: User | null;
  storage: number; // Assuming this is in MB
  used_storage?: number | null; // Assuming this is in MB, can be null or 0 initially
}

export interface UpdateUserResourcePayload {
  storage: number; // New total storage in MB
  // used_storage might be updated by backend, not directly by user here
}

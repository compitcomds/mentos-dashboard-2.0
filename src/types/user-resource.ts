
import type { User } from './auth';

export interface UserResource {
  id?: number;
  documentId?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  publishedAt?: Date | string | null;
  tenent_id: string;
  user?: User | null;
  storage: number; // Storage capacity in Kilobytes (KB)
  used_storage?: number | null; // Used storage in Kilobytes (KB), can be null or 0 initially
}

export interface UpdateUserResourcePayload {
  storage: number; // New total storage capacity in Kilobytes (KB)
}

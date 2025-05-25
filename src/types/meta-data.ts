
import type { User } from './auth';
import type { MetaFormat } from './meta-format';

export interface MetaData {
  id?: number;
  documentId?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  publishedAt?: Date | string | null;
  locale?: string | null;
  tenent_id: string; // Assuming tenent_id is always present
  meta_format?: MetaFormat | null; // Relation to MetaFormat
  user?: User | null;
  meta_data?: Record<string, any>; // The actual dynamic data as JSON
  handle: string; // New required handle field
}

export interface CreateMetaDataPayload {
  tenent_id: string;
  meta_format: string; // documentId of the MetaFormat
  user?: number | null; // User ID
  meta_data: Record<string, any>;
  publishedAt?: string | null; // For draft/publish functionality
  handle: string; // New required handle field
}

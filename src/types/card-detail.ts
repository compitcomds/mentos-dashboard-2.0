
import type { User } from './auth';

export interface CardDetail {
  id?: number;
  documentId?: string;
  card_holder_name?: string | null;
  card_number?: string | null; // Store as string for display, last 4 digits
  Expiry_Date?: string | null;
  // CVV is typically not stored or fetched after creation for PCI compliance
  tenent_id: string;
  user?: User | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  publishedAt?: Date | string | null;
}

export interface CreateCardDetailPayload {
  card_holder_name: string;
  card_number: string; // Send as string
  Expiry_Date: string;
  cvv: string; // Sent on creation, not stored long-term ideally
  tenent_id: string;
  user: number; // User ID
}

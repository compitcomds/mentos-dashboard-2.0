// src/types/common.ts
import type { Media } from './media'; // For SpeakerComponent

// Based on the user-provided 'Other' interface, renamed for clarity
export interface OtherTag {
  id?: number;
  tag_value?: string;
}

// Interface for user-provided Role
export interface Role {
  id?: number;
  documentId?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  name: string;
  description: string;
  type: string;
}

// Speaker Component Type based on Strapi schema
export interface SpeakerComponent {
  id?: number; // Strapi component instances often have an ID when fetched
  name?: string | null;
  image?: number | null; // Media ID for the image relation
  excerpt?: string | null;
}

// Billing Item Component Type based on Strapi schema
export interface BillingItem {
  id?: number; // Component instance ID
  Particulars?: string | null;
  SGST?: number | null;
  IGST?: number | null;
  CGST?: number | null;
  SKU?: string | null;
  Discount?: number | null;
  Price?: string | null; // API returns string, parse to float for calculations in UI
  Quantity?: number | null;
  Description?: string | null;
  HSN?: string | null;
}

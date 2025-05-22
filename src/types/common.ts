
// src/types/common.ts

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

// New Speaker Component Type based on Strapi schema
export interface SpeakerComponent {
  id?: number; // Strapi component instances often have an ID when fetched
  name?: string | null;
  image?: number | null; // Media ID for the image relation
  excerpt?: string | null;
}

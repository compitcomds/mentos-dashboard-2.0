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

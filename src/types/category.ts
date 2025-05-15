export interface Category {
    id: number;
    name: string;
    description?: string | null;
    slug: string;
    key: string; // User-specific key
    createdAt?: string;
    updatedAt?: string;
    publishedAt?: string | null;
    // users field relation is managed by Strapi, not directly in this type for client use typically
  }
  
  export interface CreateCategoryPayload {
    name: string;
    description?: string | null;
    slug: string;
    key: string; // User-specific key
  }
  
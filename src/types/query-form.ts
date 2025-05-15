
export interface QueryForm {
    id: number;
    name: string;
    email: string;
    description?: string | null;
    other_meta?: any | null; // JSON can be 'any' or a more specific type if known
    key: string;
    createdAt?: string;
    updatedAt?: string;
    publishedAt?: string | null;
    // Add any other fields that might be returned by the API
  }
  
  // Payload for creating a query form (if needed in the future)
  export interface CreateQueryFormPayload {
    name: string;
    email: string;
    description?: string | null;
    other_meta?: any | null;
    key: string;
  }
  
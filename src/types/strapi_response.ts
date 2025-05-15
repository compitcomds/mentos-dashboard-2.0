
export interface FindOne<T> {
  data: T;
  meta: Record<string, any>; // Meta for a single item is typically an empty object or non-paginated metadata
};

export interface FindMany<T> {
  data: T[];
  meta: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    }
  };
};

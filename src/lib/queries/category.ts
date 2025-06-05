
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCategory as createCategoryService,
  deleteCategory as deleteCategoryService,
  getCategory as getCategoryService,
  getCategories as getCategoriesService,
  updateCategory as updateCategoryService,
  type GetCategoriesParams,
} from "@/lib/services/category";
import type { CreateCategoryPayload, Categorie } from "@/types/category"; // Changed Category to Categorie
import type { FindMany } from "@/types/strapi_response";
import { toast } from "@/hooks/use-toast";
import { useCurrentUser } from "./user";

export interface UseGetCategoriesOptions {
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

const CATEGORIES_QUERY_KEY_PREFIX = 'categories'; // For simpler invalidation
const CATEGORIES_QUERY_KEY = (userTenentId?: string, options?: UseGetCategoriesOptions) =>
  [CATEGORIES_QUERY_KEY_PREFIX, userTenentId || 'all', options?.page, options?.pageSize, options?.sortField, options?.sortOrder];

const CATEGORY_DETAIL_QUERY_KEY = (identifier?: string, userTenentId?: string) => ['category', identifier || 'new', userTenentId || 'all'];

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  return useMutation<Categorie, Error, CreateCategoryPayload>({ // Changed Category to Categorie
    mutationFn: (categoryData: CreateCategoryPayload) => {
      if (!categoryData.tenent_id) {
        if (!currentUser?.tenent_id) {
          throw new Error("User tenent_id not available. Cannot create category.");
        }
        const payloadWithTenentId = { ...categoryData, tenent_id: currentUser.tenent_id };
        return createCategoryService(payloadWithTenentId);
      }
      return createCategoryService(categoryData);
    },
    onSuccess: (data) => {
      toast({ title: "Success", description: "Category created successfully." });
      queryClient.invalidateQueries({ queryKey: [CATEGORIES_QUERY_KEY_PREFIX, data.tenent_id || currentUser?.tenent_id] });
    },
    onError: (error: any) => {
      const strapiError = error.response?.data?.error;
      const message = strapiError?.message || error.message || "Failed to create category.";
      const details = strapiError?.details;
      console.error("Create Category Strapi Error:", strapiError || error.response?.data || error);
      toast({
        variant: "destructive",
        title: "Error Creating Category",
        description: `${message}${details ? ` Details: ${JSON.stringify(details)}` : ''}`
      });
    }
  });
};

export const useGetCategories = (options?: UseGetCategoriesOptions) => {
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const userTenentId = currentUser?.tenent_id;
  const { page, pageSize, sortField, sortOrder } = options || {};

  return useQuery<FindMany<Categorie>, Error>({ // Changed Category to Categorie and return type
    queryKey: CATEGORIES_QUERY_KEY(userTenentId, { page, pageSize, sortField, sortOrder }),
    queryFn: () => {
        if (!userTenentId) {
            console.warn("useGetCategories: User tenent_id not available. Returning empty result.");
            return Promise.resolve({ data: [], meta: { pagination: { page: 1, pageSize: pageSize || 10, pageCount: 0, total: 0 } } });
        }
        const params: GetCategoriesParams = { userTenentId, page, pageSize, sortField, sortOrder };
        return getCategoriesService(params);
    },
    enabled: !!userTenentId && !isLoadingUser,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });
};

export const useGetCategory = (identifier: string | null, userTenentId?: string) => {
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const keyToUse = userTenentId || currentUser?.tenent_id;

  return useQuery<Categorie | null, Error>({ // Changed Category to Categorie
    queryKey: CATEGORY_DETAIL_QUERY_KEY(identifier ?? undefined, keyToUse),
    queryFn: () => {
      if (!identifier || !keyToUse) return null;
      return getCategoryService(identifier, keyToUse);
    },
    enabled: !!identifier && !!keyToUse && !isLoadingUser,
    staleTime: 1000 * 60 * 5,
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  return useMutation<Categorie, Error, { documentId: string; category: Partial<CreateCategoryPayload> }>({ // Changed Category to Categorie
    mutationFn: ({ documentId, category }) => {
      if (!currentUser?.tenent_id) {
        throw new Error("User tenent_id not available. Cannot update category.");
      }
      // const { tenent_id, ...updatePayload } = category; // tenent_id is already correctly excluded by logic in categories/page.tsx
      return updateCategoryService(documentId, category, currentUser.tenent_id);
    },
    onSuccess: (data, variables) => {
      toast({ title: "Success", description: "Category updated successfully." });
      const tenentIdForInvalidation = data.tenent_id || currentUser?.tenent_id;
      queryClient.invalidateQueries({ queryKey: [CATEGORIES_QUERY_KEY_PREFIX, tenentIdForInvalidation] });
      queryClient.invalidateQueries({ queryKey: CATEGORY_DETAIL_QUERY_KEY(variables.documentId, tenentIdForInvalidation) });
    },
    onError: (error: any, variables) => {
      const strapiError = error.response?.data?.error;
      const message = strapiError?.message || error.message || `Failed to update category ${variables.documentId}.`;
      const details = strapiError?.details;
      console.error(`Update Category Strapi Error (documentId: ${variables.documentId}):`, strapiError || error.response?.data || error);
      toast({
        variant: "destructive",
        title: "Error Updating Category",
        description: `${message}${details ? ` Details: ${JSON.stringify(details)}` : ''}`
      });
    }
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  return useMutation<Categorie | void, Error, { documentId: string; userKey?: string }>({ // Changed Category to Categorie
    mutationFn: ({ documentId, userKey }) => {
      const tenentIdForAuth = userKey || currentUser?.tenent_id;
      if (!tenentIdForAuth) {
        throw new Error("User tenent_id not available. Cannot delete category.");
      }
      if (!documentId) {
        throw new Error("Document ID is required for deleting a category.");
      }
      return deleteCategoryService(documentId, tenentIdForAuth);
    },
    onSuccess: (data, variables) => {
      toast({ title: "Success", description: "Category deleted successfully." });
      const tenentIdForInvalidation = variables.userKey || currentUser?.tenent_id;
      queryClient.invalidateQueries({ queryKey: [CATEGORIES_QUERY_KEY_PREFIX, tenentIdForInvalidation] });
      queryClient.removeQueries({ queryKey: CATEGORY_DETAIL_QUERY_KEY(variables.documentId, tenentIdForInvalidation) });
    },
    onError: (error: any, variables) => {
      const strapiError = error.response?.data?.error;
      const message = strapiError?.message || error.message || `Failed to delete category ${variables.documentId}.`;
      const details = strapiError?.details;
      console.error(`Delete Category Strapi Error (documentId: ${variables.documentId}):`, strapiError || error.response?.data || error);
      toast({
        variant: "destructive",
        title: "Error Deleting Category",
        description: `${message}${details ? ` Details: ${JSON.stringify(details)}` : ''}`
      });
    }
  });
};


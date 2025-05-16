
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCategory as createCategoryService,
  deleteCategory as deleteCategoryService,
  getCategory as getCategoryService,
  getCategories as getCategoriesService,
  updateCategory as updateCategoryService,
} from "@/lib/services/category";
import type { CreateCategoryPayload, Category } from "@/types/category";
import { toast } from "@/hooks/use-toast";
import { useCurrentUser } from "./user"; 

const CATEGORIES_QUERY_KEY = (userTenentId?: string) => ['categories', userTenentId || 'all'];
const CATEGORY_DETAIL_QUERY_KEY = (id?: string | number, userTenentId?: string) => ['category', id ? String(id) : 'new', userTenentId || 'all'];

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser(); 

  return useMutation<Category, Error, CreateCategoryPayload>({
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
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY(data.tenent_id || currentUser?.tenent_id) });
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

export const useGetCategories = (userTenentId?: string) => { 
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const keyToUse = userTenentId || currentUser?.tenent_id;

  return useQuery<Category[], Error>({
    queryKey: CATEGORIES_QUERY_KEY(keyToUse),
    queryFn: () => {
        if (!keyToUse) { 
            console.warn("useGetCategories: User tenent_id not available. Returning empty array.");
            return Promise.resolve([]);
        }
        return getCategoriesService(keyToUse); 
    },
    enabled: !!keyToUse && !isLoadingUser, 
    staleTime: 1000 * 60 * 5, 
    gcTime: 1000 * 60 * 30, 
  });
};

export const useGetCategory = (id: string | number | null, userTenentId?: string) => { 
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const keyToUse = userTenentId || currentUser?.tenent_id;
  const categoryId = id !== null ? String(id) : null;


  return useQuery<Category | null, Error>({
    queryKey: CATEGORY_DETAIL_QUERY_KEY(categoryId ?? undefined, keyToUse),
    queryFn: () => {
      if (!categoryId || !keyToUse) return null;
      return getCategoryService(categoryId, keyToUse); 
    },
    enabled: !!categoryId && !!keyToUse && !isLoadingUser, 
    staleTime: 1000 * 60 * 5,
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  return useMutation<Category, Error, { id: number; category: Partial<CreateCategoryPayload> }>({
    mutationFn: ({ id, category }) => {
      if (!currentUser?.tenent_id) {
        throw new Error("User tenent_id not available. Cannot update category.");
      }
      const { tenent_id, ...updatePayload } = category;
      return updateCategoryService(id, updatePayload, currentUser.tenent_id);
    },
    onSuccess: (data, variables) => {
      toast({ title: "Success", description: "Category updated successfully." });
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY(data.tenent_id || currentUser?.tenent_id) });
      queryClient.invalidateQueries({ queryKey: CATEGORY_DETAIL_QUERY_KEY(variables.id, data.tenent_id || currentUser?.tenent_id) });
    },
    onError: (error: any, variables) => {
      const strapiError = error.response?.data?.error;
      const message = strapiError?.message || error.message || `Failed to update category ${variables.id}.`;
      const details = strapiError?.details;
      console.error(`Update Category Strapi Error (ID: ${variables.id}):`, strapiError || error.response?.data || error);
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

  return useMutation<Category | void, Error, {id: number, userKey?: string}>({ 
    mutationFn: ({id, userKey}) => {
      const tenentIdForAuth = userKey || currentUser?.tenent_id; 
      if (!tenentIdForAuth) {
        throw new Error("User tenent_id not available. Cannot delete category.");
      }
      return deleteCategoryService(id, tenentIdForAuth);
    },
    onSuccess: (data, variables) => {
      toast({ title: "Success", description: "Category deleted successfully." });
      const tenentIdForInvalidation = variables.userKey || currentUser?.tenent_id;
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY(tenentIdForInvalidation) });
      queryClient.removeQueries({ queryKey: CATEGORY_DETAIL_QUERY_KEY(variables.id, tenentIdForInvalidation) });
    },
    onError: (error: any, variables) => {
      const strapiError = error.response?.data?.error;
      const message = strapiError?.message || error.message || `Failed to delete category ${variables.id}.`;
      const details = strapiError?.details;
      console.error(`Delete Category Strapi Error (ID: ${variables.id}):`, strapiError || error.response?.data || error);
      toast({ 
        variant: "destructive", 
        title: "Error Deleting Category", 
        description: `${message}${details ? ` Details: ${JSON.stringify(details)}` : ''}` 
      });
    }
  });
};

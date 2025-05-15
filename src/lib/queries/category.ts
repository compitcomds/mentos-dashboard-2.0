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
const CATEGORY_DETAIL_QUERY_KEY = (id?: string, userTenentId?: string) => ['category', id || 'new', userTenentId || 'all'];

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser(); 

  return useMutation<Category, Error, CreateCategoryPayload>({
    mutationFn: (categoryData: CreateCategoryPayload) => {
      // The tenent_id should already be in categoryData from the form/component
      if (!categoryData.tenent_id) {
         // Fallback to current user's tenent_id if not explicitly provided in payload
         // though it's better if the form provides it based on the current user.
        if (!currentUser?.tenent_id) {
          throw new Error("User tenent_id not available. Cannot create category.");
        }
        // This modification directly in the mutationFn might be okay for this case,
        // but generally, the payload should be complete before calling mutate.
        const payloadWithTenentId = { ...categoryData, tenent_id: currentUser.tenent_id };
        return createCategoryService(payloadWithTenentId);
      }
      return createCategoryService(categoryData);
    },
    onSuccess: (data) => {
      toast({ title: "Success", description: "Category created successfully." });
      // Invalidate based on the tenent_id of the created/fetched category or current user
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY(data.tenent_id || currentUser?.tenent_id) });
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || error.message || "Failed to create category.";
      toast({ variant: "destructive", title: "Error Creating Category", description: message });
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

export const useGetCategory = (id: string | null, userTenentId?: string) => { 
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const keyToUse = userTenentId || currentUser?.tenent_id;

  return useQuery<Category | null, Error>({
    queryKey: CATEGORY_DETAIL_QUERY_KEY(id ?? undefined, keyToUse),
    queryFn: () => {
      if (!id || !keyToUse) return null;
      return getCategoryService(id, keyToUse); 
    },
    enabled: !!id && !!keyToUse && !isLoadingUser, 
    staleTime: 1000 * 60 * 5,
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();


  return useMutation<Category, Error, { id: number; category: Partial<CreateCategoryPayload> }>({
    mutationFn: ({ id, category }) => {
      // The user's tenent_id is used for authorization in the service
      if (!currentUser?.tenent_id) {
        throw new Error("User tenent_id not available. Cannot update category.");
      }
      // The 'category' payload here should NOT contain tenent_id for update
      const { tenent_id, ...updatePayload } = category;
      return updateCategoryService(id, updatePayload, currentUser.tenent_id);
    },
    onSuccess: (data, variables) => {
      toast({ title: "Success", description: "Category updated successfully." });
      // Invalidate based on the tenent_id of the updated category or current user
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY(data.tenent_id || currentUser?.tenent_id) });
      queryClient.invalidateQueries({ queryKey: CATEGORY_DETAIL_QUERY_KEY(variables.id.toString(), data.tenent_id || currentUser?.tenent_id) });
    },
    onError: (error: any, variables) => {
      const message = error.response?.data?.error?.message || error.message || `Failed to update category ${variables.id}.`;
      toast({ variant: "destructive", title: "Error Updating Category", description: message });
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
      queryClient.removeQueries({ queryKey: CATEGORY_DETAIL_QUERY_KEY(variables.id.toString(), tenentIdForInvalidation) });
    },
    onError: (error: any, variables) => {
      const message = error.response?.data?.error?.message || error.message || `Failed to delete category ${variables.id}.`;
      toast({ variant: "destructive", title: "Error Deleting Category", description: message });
    }
  });
};

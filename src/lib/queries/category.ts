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
import { useCurrentUser } from "./user"; // Import useCurrentUser

const CATEGORIES_QUERY_KEY = (userKey?: string) => ['categories', userKey || 'all'];
const CATEGORY_DETAIL_QUERY_KEY = (id?: string, userKey?: string) => ['category', id || 'new', userKey || 'all'];

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser(); // Get current user for the key

  return useMutation<Category, Error, CreateCategoryPayload>({
    mutationFn: (categoryData: CreateCategoryPayload) => {
      if (!currentUser?.key) {
        throw new Error("User key not available. Cannot create category.");
      }
      // Ensure the payload includes the user's key
      const payloadWithKey = { ...categoryData, key: currentUser.key };
      return createCategoryService(payloadWithKey);
    },
    onSuccess: (data, variables) => {
      toast({ title: "Success", description: "Category created successfully." });
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY(variables.key) });
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || error.message || "Failed to create category.";
      toast({ variant: "destructive", title: "Error Creating Category", description: message });
    }
  });
};

export const useGetCategories = (userKey?: string) => { // Accept userKey as an argument
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  // Use the passed userKey if available, otherwise fallback to current user's key
  const keyToUse = userKey || currentUser?.key;


  return useQuery<Category[], Error>({
    queryKey: CATEGORIES_QUERY_KEY(keyToUse),
    queryFn: () => {
        if (!keyToUse) { // Check keyToUse instead of just currentUser.key
            console.warn("useGetCategories: User key not available. Returning empty array.");
            return Promise.resolve([]);
        }
        return getCategoriesService(keyToUse); // Pass the resolved keyToUse
    },
    enabled: !!keyToUse && !isLoadingUser, // Enable if keyToUse is available and user is not loading
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
};

export const useGetCategory = (id: string | null, userKey?: string) => { // Accept userKey
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const keyToUse = userKey || currentUser?.key;

  return useQuery<Category | null, Error>({
    queryKey: CATEGORY_DETAIL_QUERY_KEY(id ?? undefined, keyToUse),
    queryFn: () => {
      if (!id || !keyToUse) return null;
      return getCategoryService(id, keyToUse); // Pass keyToUse
    },
    enabled: !!id && !!keyToUse && !isLoadingUser, // Enable if id and keyToUse are available
    staleTime: 1000 * 60 * 5,
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();


  return useMutation<Category, Error, { id: number; category: Partial<CreateCategoryPayload> }>({
    mutationFn: ({ id, category }) => {
      const keyToUse = category.key || currentUser?.key; // Prefer key from payload, fallback to current user
      if (!keyToUse) {
        throw new Error("User key not available. Cannot update category.");
      }
      // Ensure the payload passed to service includes the correct key
      const payloadWithKey = { ...category, key: keyToUse };
      return updateCategoryService(id, payloadWithKey);
    },
    onSuccess: (data, variables) => {
      toast({ title: "Success", description: "Category updated successfully." });
      // Use the key from the variables (which should now be correct) for invalidation
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY(variables.category.key) });
      queryClient.invalidateQueries({ queryKey: CATEGORY_DETAIL_QUERY_KEY(variables.id.toString(), variables.category.key) });
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

  return useMutation<Category | void, Error, {id: number, userKey?: string}>({ // Make userKey optional in input
    mutationFn: ({id, userKey}) => {
      const keyToDeleteWith = userKey || currentUser?.key; // Use passed key or fallback
      if (!keyToDeleteWith) {
        throw new Error("User key not available. Cannot delete category.");
      }
      return deleteCategoryService(id, keyToDeleteWith);
    },
    onSuccess: (data, variables) => {
      toast({ title: "Success", description: "Category deleted successfully." });
      const keyInvalidatedWith = variables.userKey || currentUser?.key;
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY(keyInvalidatedWith) });
      queryClient.removeQueries({ queryKey: CATEGORY_DETAIL_QUERY_KEY(variables.id.toString(), keyInvalidatedWith) });
    },
    onError: (error: any, variables) => {
      const message = error.response?.data?.error?.message || error.message || `Failed to delete category ${variables.id}.`;
      toast({ variant: "destructive", title: "Error Deleting Category", description: message });
    }
  });
};

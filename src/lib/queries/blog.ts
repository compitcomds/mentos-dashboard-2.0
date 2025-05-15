
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createBlog as createBlogService, // Rename imported function
  deleteBlog as deleteBlogService, // Rename imported function
  getBlog as getBlogService,       // Rename imported function
  getBlogs as getBlogsService,     // Rename imported function
  updateBlog as updateBlogService  // Rename imported function
} from "@/lib/services/blog"; // Assuming blog services are now in a separate file
import type { CreateBlogPayload, Blog } from "@/types/blog";
import { toast } from "@/hooks/use-toast";
import { useCurrentUser } from './user'; // Import the hook to get the current user

const BLOGS_QUERY_KEY = (userKey?: string) => ['blogs', userKey || 'all'];
const BLOG_DETAIL_QUERY_KEY = (id?: string, userKey?: string) => ['blog', id || 'new', userKey || 'all'];


export const useCreateBlog = () => {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const userKey = currentUser?.tenent_id;

  return useMutation<Blog, Error, CreateBlogPayload>({
    mutationFn: (blog: CreateBlogPayload) => {
        if (!userKey) {
            throw new Error('User key is not available. Cannot create blog.');
        }
         // Add the userKey to the payload before sending
         const payloadWithKey: CreateBlogPayload = { ...blog, key: userKey };
         return createBlogService(payloadWithKey); // Pass payload with key
    },
    onSuccess: (data) => {
       toast({ title: "Success", description: "Blog post created successfully." });
       queryClient.invalidateQueries({ queryKey: BLOGS_QUERY_KEY(userKey) });
    },
     onError: (error: any) => {
        const message = error?.response?.data?.error?.message
                     || error.message
                     || "An unknown error occurred while creating the blog post.";
        toast({ variant: "destructive", title: "Error Creating Blog", description: message });
     }
  });
};

export const useGetBlogs = () => {
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const userKey = currentUser?.tenent_id;

  return useQuery<Blog[], Error>({
    queryKey: BLOGS_QUERY_KEY(userKey),
    queryFn: () => {
        if (!userKey) {
             console.warn("useGetBlogs: User key not available yet. Returning empty array.");
             return Promise.resolve([]);
        }
        return getBlogsService(userKey); // Pass userKey to service
    },
    enabled: !!userKey && !isLoadingUser, // Only enable when key is available
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 15,
  });
};

export const useGetBlog = (id: string | null) => {
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const userKey = currentUser?.tenent_id;

  return useQuery<Blog | null, Error>({
    queryKey: BLOG_DETAIL_QUERY_KEY(id ?? undefined, userKey),
    queryFn: () => {
        if (!id || !userKey) return null; // Return null if no ID or userKey
        return getBlogService(id, userKey); // Pass userKey to service
    },
    enabled: !!id && !!userKey && !isLoadingUser, // Enable only when id and userKey are available
    staleTime: 1000 * 60 * 5,
  });
};

export const useUpdateBlog = () => {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const userKey = currentUser?.tenent_id;

  return useMutation<Blog, Error, { id: string; blog: Partial<CreateBlogPayload> }>({
    mutationFn: ({ id, blog }: { id: string; blog: Partial<CreateBlogPayload> }) => {
        if (!userKey) {
             throw new Error('User key is not available. Cannot update blog.');
        }
        // The service layer should ideally handle ensuring the key isn't wrongly updated
        // but we pass it here for potential checks if needed.
        return updateBlogService(id, blog, userKey); // Pass userKey for validation/scoping if service needs it
    },
    onSuccess: (data, variables) => {
      toast({ title: "Success", description: "Blog post updated successfully." });
      // Invalidate both the list and the specific detail query for the current user
      queryClient.invalidateQueries({ queryKey: BLOGS_QUERY_KEY(userKey) });
      queryClient.invalidateQueries({ queryKey: BLOG_DETAIL_QUERY_KEY(variables.id, userKey) });
    },
     onError: (error: any, variables) => {
        const message = error?.response?.data?.error?.message
                     || error.message
                     || `An unknown error occurred while updating blog post ${variables.id}.`;
        toast({ variant: "destructive", title: "Error Updating Blog", description: message });
     }
  });
};

export const useDeleteBlog = () => {
  const queryClient = useQueryClient();
   const { data: currentUser } = useCurrentUser();
   const userKey = currentUser?.tenent_id;

  return useMutation<Blog | void, Error, string>({
    mutationFn: (id: string) => {
         if (!userKey) {
             throw new Error('User key is not available. Cannot delete blog.');
        }
        // Pass userKey for validation/scoping if service needs it
        return deleteBlogService(id, userKey);
    },
    onSuccess: (data, id) => {
      toast({ title: "Success", description: "Blog post deleted successfully." });
      // Invalidate list and remove specific detail query for the current user
      queryClient.invalidateQueries({ queryKey: BLOGS_QUERY_KEY(userKey) });
      queryClient.removeQueries({ queryKey: BLOG_DETAIL_QUERY_KEY(id, userKey) });
    },
    onError: (error: any, id) => {
        const message = error?.response?.data?.error?.message
                     || error.message
                     || `An unknown error occurred while deleting blog post ${id}.`;
        toast({ variant: "destructive", title: "Error Deleting Blog", description: message });
    }
  });
};

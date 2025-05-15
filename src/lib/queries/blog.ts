
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

const BLOGS_QUERY_KEY = (userTenentId?: string) => ['blogs', userTenentId || 'all'];
const BLOG_DETAIL_QUERY_KEY = (id?: string, userTenentId?: string) => ['blog', id || 'new', userTenentId || 'all'];


export const useCreateBlog = () => {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const userTenentId = currentUser?.tenent_id;

  return useMutation<Blog, Error, CreateBlogPayload>({
    mutationFn: (blog: CreateBlogPayload) => {
        if (!userTenentId) {
            throw new Error('User tenent_id is not available. Cannot create blog.');
        }
         // Ensure the payload includes the user's tenent_id
         const payloadWithTenentId: CreateBlogPayload = { ...blog, tenent_id: userTenentId };
         return createBlogService(payloadWithTenentId);
    },
    onSuccess: (data) => {
       toast({ title: "Success", description: "Blog post created successfully." });
       queryClient.invalidateQueries({ queryKey: BLOGS_QUERY_KEY(userTenentId) });
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
  const userTenentId = currentUser?.tenent_id;

  return useQuery<Blog[], Error>({
    queryKey: BLOGS_QUERY_KEY(userTenentId),
    queryFn: () => {
        if (!userTenentId) {
             console.warn("useGetBlogs: User tenent_id not available yet. Returning empty array.");
             return Promise.resolve([]);
        }
        return getBlogsService(userTenentId); // Pass userTenentId to service
    },
    enabled: !!userTenentId && !isLoadingUser, // Only enable when tenent_id is available
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 15,
  });
};

export const useGetBlog = (id: string | null) => {
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const userTenentId = currentUser?.tenent_id;

  return useQuery<Blog | null, Error>({
    queryKey: BLOG_DETAIL_QUERY_KEY(id ?? undefined, userTenentId),
    queryFn: () => {
        if (!id || !userTenentId) return null; // Return null if no ID or userTenentId
        return getBlogService(id, userTenentId); // Pass userTenentId to service
    },
    enabled: !!id && !!userTenentId && !isLoadingUser, // Enable only when id and userTenentId are available
    staleTime: 1000 * 60 * 5,
  });
};

export const useUpdateBlog = () => {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const userTenentId = currentUser?.tenent_id;

  return useMutation<Blog, Error, { id: string; blog: Partial<CreateBlogPayload> }>({
    mutationFn: ({ id, blog }: { id: string; blog: Partial<CreateBlogPayload> }) => {
        if (!userTenentId) {
             throw new Error('User tenent_id is not available. Cannot update blog.');
        }
        // Ensure the payload being sent for update contains the correct tenent_id if it's part of the payload.
        // The service function updateBlogService already takes userTenentId as a separate param for validation.
        const payloadWithTenentId = { ...blog, tenent_id: userTenentId };
        return updateBlogService(id, payloadWithTenentId, userTenentId);
    },
    onSuccess: (data, variables) => {
      toast({ title: "Success", description: "Blog post updated successfully." });
      // Invalidate both the list and the specific detail query for the current user
      queryClient.invalidateQueries({ queryKey: BLOGS_QUERY_KEY(userTenentId) });
      queryClient.invalidateQueries({ queryKey: BLOG_DETAIL_QUERY_KEY(variables.id, userTenentId) });
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
   const userTenentId = currentUser?.tenent_id;

  return useMutation<Blog | void, Error, string>({
    mutationFn: (id: string) => {
         if (!userTenentId) {
             throw new Error('User tenent_id is not available. Cannot delete blog.');
        }
        return deleteBlogService(id, userTenentId);
    },
    onSuccess: (data, id) => {
      toast({ title: "Success", description: "Blog post deleted successfully." });
      // Invalidate list and remove specific detail query for the current user
      queryClient.invalidateQueries({ queryKey: BLOGS_QUERY_KEY(userTenentId) });
      queryClient.removeQueries({ queryKey: BLOG_DETAIL_QUERY_KEY(id, userTenentId) });
    },
    onError: (error: any, id) => {
        const message = error?.response?.data?.error?.message
                     || error.message
                     || `An unknown error occurred while deleting blog post ${id}.`;
        toast({ variant: "destructive", title: "Error Deleting Blog", description: message });
    }
  });
};

    
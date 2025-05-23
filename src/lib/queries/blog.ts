
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createBlog as createBlogService, 
  deleteBlog as deleteBlogService, 
  getBlog as getBlogService,       
  getBlogs as getBlogsService,     
  updateBlog as updateBlogService  
} from "@/lib/services/blog"; 
import type { CreateBlogPayload, Blog } from "@/types/blog";
import { toast } from "@/hooks/use-toast";
import { useCurrentUser } from './user'; 

const BLOGS_QUERY_KEY = (userTenentId?: string) => ['blogs', userTenentId || 'all'];
// Query key for single blog post now uses string documentId
const BLOG_DETAIL_QUERY_KEY = (documentId?: string, userTenentId?: string) => ['blog', documentId || 'new-detail', userTenentId || 'all'];


export const useCreateBlog = () => {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const userTenentId = currentUser?.tenent_id;

  return useMutation<Blog, Error, CreateBlogPayload>({
    mutationFn: (blog: CreateBlogPayload) => {
        if (!userTenentId) {
            throw new Error('User tenent_id is not available. Cannot create blog.');
        }
         const payloadWithTenentId: CreateBlogPayload = { ...blog, tenent_id: userTenentId };
         return createBlogService(payloadWithTenentId);
    },
    onSuccess: (data) => {
       toast({ title: "Success", description: "Blog post created successfully." });
       queryClient.invalidateQueries({ queryKey: BLOGS_QUERY_KEY(userTenentId) });
       if (data.documentId) {
        queryClient.invalidateQueries({ queryKey: BLOG_DETAIL_QUERY_KEY(data.documentId, userTenentId) });
       }
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
        return getBlogsService(userTenentId); 
    },
    enabled: !!userTenentId && !isLoadingUser, 
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 15,
  });
};

// Hook to get a single blog post by its string documentId
export const useGetBlog = (documentId: string | null) => {
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const userTenentId = currentUser?.tenent_id;

  return useQuery<Blog | null, Error>({
    queryKey: BLOG_DETAIL_QUERY_KEY(documentId ?? undefined, userTenentId),
    queryFn: async () => {
      if (!documentId || !userTenentId) {
        console.log("[useGetBlog] documentId or userTenentId missing, returning null.", { documentId, userTenentId });
        return null;
      }
      console.log(`[useGetBlog] Attempting to fetch blog with documentId: ${documentId} for userTenentId: ${userTenentId}`);
      const blog = await getBlogService(documentId, userTenentId);
      if (!blog) {
        console.warn(`[useGetBlog] getBlogService returned null for documentId: ${documentId}`);
      }
      return blog;
    },
    enabled: !!documentId && !!userTenentId && !isLoadingUser,
    staleTime: 1000 * 60 * 5,
  });
};


// Update uses numeric ID for the API path, but invalidates based on string documentId
export const useUpdateBlog = () => {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const userTenentId = currentUser?.tenent_id;

  // numericId is the string documentId for cache invalidation
  return useMutation<Blog, Error, { id: number; blog: Partial<CreateBlogPayload>; documentIdForInvalidation?: string }>({
    mutationFn: ({ id, blog }: { id: number; blog: Partial<CreateBlogPayload> }) => {
        if (!userTenentId) {
             throw new Error('User tenent_id is not available. Cannot update blog.');
        }
        return updateBlogService(id, blog, userTenentId);
    },
    onSuccess: (data, variables) => {
      toast({ title: "Success", description: "Blog post updated successfully." });
      queryClient.invalidateQueries({ queryKey: BLOGS_QUERY_KEY(userTenentId) });
      // Invalidate detail query using the string documentId (passed as variables.documentIdForInvalidation)
      if (variables.documentIdForInvalidation) {
        queryClient.invalidateQueries({ queryKey: BLOG_DETAIL_QUERY_KEY(variables.documentIdForInvalidation, userTenentId) });
      } else if (data.documentId) { 
        queryClient.invalidateQueries({ queryKey: BLOG_DETAIL_QUERY_KEY(data.documentId, userTenentId) });
      }
    },
     onError: (error: any, variables) => {
        const message = error?.response?.data?.error?.message
                     || error.message
                     || `An unknown error occurred while updating blog post with id ${variables.id}.`;
        toast({ variant: "destructive", title: "Error Updating Blog", description: message });
     }
  });
};

// Delete uses string documentId for the API path
export const useDeleteBlog = () => {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const userTenentId = currentUser?.tenent_id;

  return useMutation<Blog | void, Error, { documentId: string; documentIdForInvalidation?: string }>({
    mutationFn: ({ documentId }: { documentId: string; documentIdForInvalidation?: string }) => {
      if (!userTenentId) {
        throw new Error('User tenent_id is not available. Cannot delete blog.');
      }
      if (!documentId) {
        throw new Error('Document ID is required for deleting a blog.');
      }
      return deleteBlogService(documentId, userTenentId);
    },
    onSuccess: (data, variables) => {
      toast({ title: "Success", description: "Blog post deleted successfully." });
      queryClient.invalidateQueries({ queryKey: BLOGS_QUERY_KEY(userTenentId) });
      // Remove detail query using string documentId (which is variables.documentId or documentIdForInvalidation)
      const idToInvalidate = variables.documentIdForInvalidation || variables.documentId;
      if (idToInvalidate) {
        queryClient.removeQueries({ queryKey: BLOG_DETAIL_QUERY_KEY(idToInvalidate, userTenentId) });
      }
    },
    onError: (error: any, variables) => {
        const message = error?.response?.data?.error?.message
                     || error.message
                     || `An unknown error occurred while deleting blog post with documentId ${variables.documentId}.`;
        toast({ variant: "destructive", title: "Error Deleting Blog", description: message });
    }
  });
};

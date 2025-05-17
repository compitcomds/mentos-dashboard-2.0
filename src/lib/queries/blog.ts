
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
        return getBlogsService(userTenentId); 
    },
    enabled: !!userTenentId && !isLoadingUser, 
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
        if (!id || !userTenentId) return null; 
        return getBlogService(id, userTenentId); 
    },
    enabled: !!id && !!userTenentId && !isLoadingUser, 
    staleTime: 1000 * 60 * 5,
  });
};

export const useUpdateBlog = () => {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const userTenentId = currentUser?.tenent_id;

  return useMutation<Blog, Error, { documentId: string; blog: Partial<CreateBlogPayload>; numericId?: string }>({
    mutationFn: ({ documentId, blog }: { documentId: string; blog: Partial<CreateBlogPayload> }) => {
        if (!userTenentId) {
             throw new Error('User tenent_id is not available. Cannot update blog.');
        }
        return updateBlogService(documentId, blog, userTenentId);
    },
    onSuccess: (data, variables) => {
      toast({ title: "Success", description: "Blog post updated successfully." });
      queryClient.invalidateQueries({ queryKey: BLOGS_QUERY_KEY(userTenentId) });
      // Invalidate detail query using the numericId if available (passed from form)
      if (variables.numericId) {
        queryClient.invalidateQueries({ queryKey: BLOG_DETAIL_QUERY_KEY(variables.numericId, userTenentId) });
      } else if (data.id) { // Fallback to using id from response data if numericId wasn't passed
        queryClient.invalidateQueries({ queryKey: BLOG_DETAIL_QUERY_KEY(String(data.id), userTenentId) });
      }
    },
     onError: (error: any, variables) => {
        const message = error?.response?.data?.error?.message
                     || error.message
                     || `An unknown error occurred while updating blog post with documentId ${variables.documentId}.`;
        toast({ variant: "destructive", title: "Error Updating Blog", description: message });
     }
  });
};

export const useDeleteBlog = () => {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const userTenentId = currentUser?.tenent_id;

  return useMutation<Blog | void, Error, { documentId: string; numericId?: string }>({
    mutationFn: ({ documentId }: { documentId: string; numericId?: string }) => {
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
      if (variables.numericId) {
        queryClient.removeQueries({ queryKey: BLOG_DETAIL_QUERY_KEY(variables.numericId, userTenentId) });
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

    

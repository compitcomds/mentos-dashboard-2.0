
'use client';

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUserResource as getUserResourceService, updateUserResource as updateUserResourceService } from "@/lib/services/user-resource";
import type { UserResource, UpdateUserResourcePayload } from "@/types/user-resource";
import { useCurrentUser } from './user';
import { toast } from '@/hooks/use-toast';

export const USER_RESOURCE_QUERY_KEY = (tenentId?: string) => ['userResource', tenentId || 'current'];

export const useGetUserResource = () => {
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const tenentId = currentUser?.tenent_id;

  return useQuery<UserResource | null, Error>({
    queryKey: USER_RESOURCE_QUERY_KEY(tenentId),
    queryFn: () => {
      if (!tenentId) {
        console.warn("[useGetUserResource] User tenent_id not available. Not fetching.");
        return Promise.resolve(null);
      }
      return getUserResourceService(tenentId);
    },
    enabled: !!tenentId && !isLoadingUser,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useUpdateUserResource = () => {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const tenentId = currentUser?.tenent_id;

  return useMutation<UserResource, Error, { documentId: string; payload: UpdateUserResourcePayload }>({
    mutationFn: ({ documentId, payload }) => {
      if (!tenentId) {
        throw new Error("User tenent_id not available. Cannot update user resource.");
      }
      return updateUserResourceService(documentId, payload, tenentId);
    },
    onSuccess: (data) => {
      toast({ title: "Success", description: "Storage resource updated successfully." });
      queryClient.invalidateQueries({ queryKey: USER_RESOURCE_QUERY_KEY(data.tenent_id) });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error Updating Storage",
        description: error.message || "Could not update storage resource.",
      });
    },
  });
};

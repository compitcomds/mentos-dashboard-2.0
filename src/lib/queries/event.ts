
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createEvent as createEventService,
  deleteEvent as deleteEventService,
  getEvent as getEventService,
  updateEvent as updateEventService,
  getEvents as getEventsService,
  type GetEventsParams, // Import params type
} from "@/lib/services/event";
import type { CreateEventPayload, Event } from "@/types/event";
import type { FindMany } from "@/types/strapi_response"; // Import FindMany
import { toast } from "@/hooks/use-toast";
import { useCurrentUser } from './user';

export interface UseGetEventsOptions {
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  titleFilter?: string | null;
  categoryFilter?: string | null;
  statusFilter?: string | null;
}

const EVENTS_QUERY_KEY_PREFIX = 'events'; // For simpler invalidation
const EVENTS_QUERY_KEY = (userTenentId?: string, options?: UseGetEventsOptions) =>
  [EVENTS_QUERY_KEY_PREFIX, userTenentId || 'all', options?.page, options?.pageSize, options?.sortField, options?.sortOrder, options?.titleFilter, options?.categoryFilter, options?.statusFilter];

const EVENT_DETAIL_QUERY_KEY = (documentId?: string, userTenentId?: string) => ['event', documentId || 'new-detail-event', userTenentId || 'all'];

export const useCreateEvent = () => {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  
  return useMutation<Event, Error, CreateEventPayload>({
    mutationFn: (event: CreateEventPayload) => {
      if (!event.tenent_id) {
        if (!currentUser?.tenent_id) {
          throw new Error('User tenent_id is not available. Cannot create event.');
        }
        const payloadWithTenentId = { ...event, tenent_id: currentUser.tenent_id };
        return createEventService(payloadWithTenentId);
      }
      return createEventService(event);
    },
    onSuccess: (data) => {
      toast({ title: "Success", description: "Event created successfully." });
      const tenentIdForInvalidation = data.tenent_id || currentUser?.tenent_id;
      queryClient.invalidateQueries({ queryKey: [EVENTS_QUERY_KEY_PREFIX, tenentIdForInvalidation] });
      if (data.documentId) { // Use documentId from the response
        queryClient.invalidateQueries({ queryKey: EVENT_DETAIL_QUERY_KEY(data.documentId, tenentIdForInvalidation) });
      }
    },
    onError: (error: any) => {
        const strapiError = error.response?.data?.error;
        let message = error.message || "An unknown error occurred while creating the event.";
        if (strapiError && typeof strapiError === 'object') {
            message = `${strapiError.name || 'API Error'}: ${strapiError.message || 'Unknown Strapi error.'}`;
            if (strapiError.details && Object.keys(strapiError.details).length > 0) {
                message += ` Details: ${JSON.stringify(strapiError.details)}`;
            }
        } else if (error.response?.data?.message && typeof error.response.data.message === 'string') {
            message = `API Error (Status ${error.response.status || 'unknown'}): ${error.response.data.message}`;
        } else if (typeof error.response?.data === 'string' && error.response.data.trim() !== '') {
            message = `API Error (Status ${error.response.status || 'unknown'}): ${error.response.data}`;
        }
        toast({ variant: "destructive", title: "Error Creating Event", description: message });
        console.error("Create Event Error Details:", strapiError || error.response?.data || error);
    }
  });
};

export const useGetEvents = (options?: UseGetEventsOptions) => {
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const userTenentId = currentUser?.tenent_id;
  const { page, pageSize, sortField, sortOrder, titleFilter, categoryFilter, statusFilter } = options || {};

  return useQuery<FindMany<Event>, Error>({
    queryKey: EVENTS_QUERY_KEY(userTenentId, { page, pageSize, sortField, sortOrder, titleFilter, categoryFilter, statusFilter }),
    queryFn: () => {
      if (!userTenentId) {
        console.warn("useGetEvents: User tenent_id not available yet. Returning empty array.");
        return Promise.resolve({ data: [], meta: { pagination: { page: 1, pageSize: pageSize || 10, pageCount: 0, total: 0 } } });
      }
      const params: GetEventsParams = { userTenentId, page, pageSize, sortField, sortOrder, titleFilter, categoryFilter, statusFilter };
      return getEventsService(params);
    },
    enabled: !!userTenentId && !isLoadingUser,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 15,
  });
};

export const useGetEvent = (documentId: string | null) => { // Parameter 'id' changed to 'documentId' for clarity
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const userTenentId = currentUser?.tenent_id;

  return useQuery<Event | null, Error>({
    queryKey: EVENT_DETAIL_QUERY_KEY(documentId ?? undefined, userTenentId), // Use documentId here
    queryFn: () => {
      if (!documentId || !userTenentId) return null;
      return getEventService(documentId, userTenentId); // Pass documentId to service
    },
    enabled: !!documentId && !!userTenentId && !isLoadingUser,
    staleTime: 1000 * 60 * 5,
  });
};

export const useUpdateEvent = () => {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  
  return useMutation<Event, Error, { documentId: string; event: Partial<CreateEventPayload> }>({
    mutationFn: ({ documentId, event }: { documentId: string; event: Partial<CreateEventPayload> }) => {
      if (!currentUser?.tenent_id) {
        throw new Error('User tenent_id is not available. Cannot update event.');
      }
      return updateEventService(documentId, event, currentUser.tenent_id);
    },
    onSuccess: (data, variables) => {
      toast({ title: "Success", description: "Event updated successfully." });
      const tenentIdForInvalidation = data.tenent_id || currentUser?.tenent_id;
      queryClient.invalidateQueries({ queryKey: [EVENTS_QUERY_KEY_PREFIX, tenentIdForInvalidation] });
      // Use variables.documentId for detail invalidation
      if (variables.documentId) {
        queryClient.invalidateQueries({ queryKey: EVENT_DETAIL_QUERY_KEY(variables.documentId, tenentIdForInvalidation) });
      }
    },
    onError: (error: any, variables) => {
        const strapiError = error.response?.data?.error;
        let message = error.message || `An unknown error occurred while updating event with documentId ${variables.documentId}.`;
        if (strapiError && typeof strapiError === 'object') {
            message = `${strapiError.name || 'API Error'}: ${strapiError.message || 'Unknown Strapi error.'}`;
            if (strapiError.details && Object.keys(strapiError.details).length > 0) {
                message += ` Details: ${JSON.stringify(strapiError.details)}`;
            }
        } else if (error.response?.data?.message && typeof error.response.data.message === 'string') {
            message = `API Error (Status ${error.response.status || 'unknown'}): ${error.response.data.message}`;
        } else if (typeof error.response?.data === 'string' && error.response.data.trim() !== '') {
            message = `API Error (Status ${error.response.status || 'unknown'}): ${error.response.data}`;
        }
        toast({ variant: "destructive", title: "Error Updating Event", description: message });
        console.error("Update Event Error Details:", strapiError || error.response?.data || error);
    }
  });
};

export const useDeleteEvent = () => {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  
  return useMutation<Event | void, Error, { documentId: string; numericId?: string }>({ 
    mutationFn: async ({ documentId }) => { 
      if (!currentUser?.tenent_id) {
        throw new Error('User tenent_id is not available. Cannot delete event.');
      }
      if (!documentId) {
        throw new Error('Document ID is required for deleting an event.');
      }
      return deleteEventService(documentId, currentUser.tenent_id);
    },
    onSuccess: (data, variables) => { 
      toast({ title: "Success", description: "Event deleted successfully." });
      const tenentIdForInvalidation = (data as Event)?.tenent_id || currentUser?.tenent_id;
      queryClient.invalidateQueries({ queryKey: [EVENTS_QUERY_KEY_PREFIX, tenentIdForInvalidation] });
      if (variables.documentId) {
        queryClient.removeQueries({ queryKey: EVENT_DETAIL_QUERY_KEY(variables.documentId, tenentIdForInvalidation) });
      }
    },
    onError: (error: any, variables) => {
      const strapiError = error.response?.data?.error;
      let message = error.message || `An unknown error occurred while deleting event with documentId ${variables.documentId}.`;
      if (strapiError && typeof strapiError === 'object') {
          message = `${strapiError.name || 'API Error'}: ${strapiError.message || 'Unknown Strapi error.'}`;
          if (strapiError.details && Object.keys(strapiError.details).length > 0) {
              message += ` Details: ${JSON.stringify(strapiError.details)}`;
          }
      } else if (error.response?.data?.message && typeof error.response.data.message === 'string') {
          message = `API Error (Status ${error.response.status || 'unknown'}): ${error.response.data.message}`;
      } else if (typeof error.response?.data === 'string' && error.response.data.trim() !== '') {
          message = `API Error (Status ${error.response.status || 'unknown'}): ${error.response.data}`;
      }
      toast({ variant: "destructive", title: "Error Deleting Event", description: message });
      console.error("Delete Event Error Details:", strapiError || error.response?.data || error);
    }
  });
};


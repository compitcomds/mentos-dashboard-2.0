
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createEvent as createEventService,
  deleteEvent as deleteEventService,
  getEvent as getEventService, // Stays as getEventService(id: string, ...)
  getEvents as getEventsService,
  updateEvent as updateEventService,
} from "@/lib/services/event";
import type { CreateEventPayload, Event } from "@/types/event";
import { toast } from "@/hooks/use-toast";
import { useCurrentUser } from './user';

// EVENTS_QUERY_KEY still uses numeric ID for the list if needed, or general key if not id-specific for list
const EVENTS_QUERY_KEY = (userTenentId?: string) => ['events', userTenentId || 'all'];
// EVENT_DETAIL_QUERY_KEY uses numeric id, as it's fetched by numeric id from URL params for the form
const EVENT_DETAIL_QUERY_KEY = (id?: string, userTenentId?: string) => ['event', id || 'new', userTenentId || 'all'];

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
      queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEY(data.tenent_id || currentUser?.tenent_id) });
      // Potentially invalidate the new event's detail query if an ID is available
      if (data.id) {
        queryClient.invalidateQueries({ queryKey: EVENT_DETAIL_QUERY_KEY(String(data.id), data.tenent_id || currentUser?.tenent_id) });
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

export const useGetEvents = () => {
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const userTenentId = currentUser?.tenent_id;

  return useQuery<Event[], Error>({
    queryKey: EVENTS_QUERY_KEY(userTenentId),
    queryFn: () => {
      if (!userTenentId) {
        console.warn("useGetEvents: User tenent_id not available yet. Returning empty array.");
        return Promise.resolve([]);
      }
      return getEventsService(userTenentId);
    },
    enabled: !!userTenentId && !isLoadingUser,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 15,
  });
};

// getEvent query still uses numeric id (string format) from URL
export const useGetEvent = (id: string | null) => {
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const userTenentId = currentUser?.tenent_id;

  return useQuery<Event | null, Error>({
    queryKey: EVENT_DETAIL_QUERY_KEY(id ?? undefined, userTenentId),
    queryFn: () => {
      if (!id || !userTenentId) return null;
      return getEventService(id, userTenentId); // Fetches by numeric id
    },
    enabled: !!id && !!userTenentId && !isLoadingUser,
    staleTime: 1000 * 60 * 5,
  });
};

// useUpdateEvent now expects documentId (string)
export const useUpdateEvent = () => {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  
  return useMutation<Event, Error, { documentId: string; event: Partial<CreateEventPayload> }>({
    mutationFn: ({ documentId, event }: { documentId: string; event: Partial<CreateEventPayload> }) => {
      if (!currentUser?.tenent_id) {
        throw new Error('User tenent_id is not available. Cannot update event.');
      }
      // tenent_id is already excluded from payload in service
      return updateEventService(documentId, event, currentUser.tenent_id);
    },
    onSuccess: (data, variables) => {
      toast({ title: "Success", description: "Event updated successfully." });
      const tenentIdForInvalidation = data.tenent_id || currentUser?.tenent_id;
      queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEY(tenentIdForInvalidation) });
      // Invalidate detail query using the numeric id (data.id) if available.
      // variables.documentId is string, EVENT_DETAIL_QUERY_KEY uses numeric string id.
      if (data.id) {
        queryClient.invalidateQueries({ queryKey: EVENT_DETAIL_QUERY_KEY(String(data.id), tenentIdForInvalidation) });
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

// useDeleteEvent now takes numericId, fetches event to get documentId, then calls deleteEventService with documentId
export const useDeleteEvent = () => {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  
  return useMutation<Event | void, Error, string>({ // Accepts numericId (string) from UI
    mutationFn: async (numericId: string) => {
      if (!currentUser?.tenent_id) {
        throw new Error('User tenent_id is not available. Cannot delete event.');
      }
      // Fetch the event by its numeric ID to get the documentId
      const eventToDelete = await getEventService(numericId, currentUser.tenent_id);
      if (!eventToDelete || !eventToDelete.documentId) {
        throw new Error(`Event with ID ${numericId} not found or documentId is missing.`);
      }
      return deleteEventService(eventToDelete.documentId, currentUser.tenent_id);
    },
    onSuccess: (data, numericId) => { // numericId is the original variable passed to mutate
      toast({ title: "Success", description: "Event deleted successfully." });
      const tenentIdForInvalidation = (data as Event)?.tenent_id || currentUser?.tenent_id;
      queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEY(tenentIdForInvalidation) });
      queryClient.removeQueries({ queryKey: EVENT_DETAIL_QUERY_KEY(numericId, tenentIdForInvalidation) });
    },
    onError: (error: any, numericId) => {
      const strapiError = error.response?.data?.error;
      let message = error.message || `An unknown error occurred while deleting event with ID ${numericId}.`;
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

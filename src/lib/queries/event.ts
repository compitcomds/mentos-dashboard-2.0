
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createEvent as createEventService,
  deleteEvent as deleteEventService,
  getEvent as getEventService,
  getEvents as getEventsService,
  updateEvent as updateEventService,
} from "@/lib/services/event";
import type { CreateEventPayload, Event } from "@/types/event";
import { toast } from "@/hooks/use-toast";
import { useCurrentUser } from './user';

const EVENTS_QUERY_KEY = (userTenentId?: string) => ['events', userTenentId || 'all'];
const EVENT_DETAIL_QUERY_KEY = (id?: string, userTenentId?: string) => ['event', id || 'new', userTenentId || 'all'];

export const useCreateEvent = () => {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  

  return useMutation<Event, Error, CreateEventPayload>({
    mutationFn: (event: CreateEventPayload) => {
      // The tenent_id should already be in event payload from the form/component
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
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message
                   || error.message
                   || "An unknown error occurred while creating the event.";
      toast({ variant: "destructive", title: "Error Creating Event", description: message });
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

export const useGetEvent = (id: string | null) => {
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const userTenentId = currentUser?.tenent_id;

  return useQuery<Event | null, Error>({
    queryKey: EVENT_DETAIL_QUERY_KEY(id ?? undefined, userTenentId),
    queryFn: () => {
      if (!id || !userTenentId) return null;
      return getEventService(id, userTenentId);
    },
    enabled: !!id && !!userTenentId && !isLoadingUser,
    staleTime: 1000 * 60 * 5,
  });
};

export const useUpdateEvent = () => {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  

  return useMutation<Event, Error, { id: string; event: Partial<CreateEventPayload> }>({
    mutationFn: ({ id, event }: { id: string; event: Partial<CreateEventPayload> }) => {
      if (!currentUser?.tenent_id) {
        throw new Error('User tenent_id is not available. Cannot update event.');
      }
      const { tenent_id, ...updatePayload } = event; // Exclude tenent_id from update payload data
      return updateEventService(id, updatePayload, currentUser.tenent_id);
    },
    onSuccess: (data, variables) => {
      toast({ title: "Success", description: "Event updated successfully." });
      queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEY(data.tenent_id || currentUser?.tenent_id) });
      queryClient.invalidateQueries({ queryKey: EVENT_DETAIL_QUERY_KEY(variables.id, data.tenent_id || currentUser?.tenent_id) });
    },
    onError: (error: any, variables) => {
      const message = error.response?.data?.error?.message
                   || error.message
                   || `An unknown error occurred while updating event ${variables.id}.`;
      toast({ variant: "destructive", title: "Error Updating Event", description: message });
    }
  });
};

export const useDeleteEvent = () => {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  
  return useMutation<Event | void, Error, string>({
    mutationFn: (id: string) => {
      if (!currentUser?.tenent_id) {
        throw new Error('User tenent_id is not available. Cannot delete event.');
      }
      return deleteEventService(id, currentUser.tenent_id);
    },
    onSuccess: (data, id) => {
      toast({ title: "Success", description: "Event deleted successfully." });
      // If data (deleted event) is returned, use its tenent_id, otherwise fallback to current user's
      const tenentIdForInvalidation = (data as Event)?.tenent_id || currentUser?.tenent_id;
      queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEY(tenentIdForInvalidation) });
      queryClient.removeQueries({ queryKey: EVENT_DETAIL_QUERY_KEY(id, tenentIdForInvalidation) });
    },
    onError: (error: any, id) => {
      const message = error.response?.data?.error?.message
                   || error.message
                   || `An unknown error occurred while deleting event ${id}.`;
      toast({ variant: "destructive", title: "Error Deleting Event", description: message });
    }
  });
};

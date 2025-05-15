
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

const EVENTS_QUERY_KEY = (userKey?: string) => ['events', userKey || 'all'];
const EVENT_DETAIL_QUERY_KEY = (id?: string, userKey?: string) => ['event', id || 'new', userKey || 'all'];

export const useCreateEvent = () => {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const userKey = currentUser?.key;

  return useMutation<Event, Error, CreateEventPayload>({
    mutationFn: (event: CreateEventPayload) => {
      if (!userKey) {
        throw new Error('User key is not available. Cannot create event.');
      }
      const payloadWithKey = { ...event, key: userKey };
      return createEventService(payloadWithKey);
    },
    onSuccess: (data) => {
      toast({ title: "Success", description: "Event created successfully." });
      queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEY(userKey) });
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
  const userKey = currentUser?.key;

  return useQuery<Event[], Error>({
    queryKey: EVENTS_QUERY_KEY(userKey),
    queryFn: () => {
      if (!userKey) {
        console.warn("useGetEvents: User key not available yet. Returning empty array.");
        return Promise.resolve([]);
      }
      return getEventsService(userKey);
    },
    enabled: !!userKey && !isLoadingUser,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 15,
  });
};

export const useGetEvent = (id: string | null) => {
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const userKey = currentUser?.key;

  return useQuery<Event | null, Error>({
    queryKey: EVENT_DETAIL_QUERY_KEY(id ?? undefined, userKey),
    queryFn: () => {
      if (!id || !userKey) return null;
      return getEventService(id, userKey);
    },
    enabled: !!id && !!userKey && !isLoadingUser,
    staleTime: 1000 * 60 * 5,
  });
};

export const useUpdateEvent = () => {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const userKey = currentUser?.key;

  return useMutation<Event, Error, { id: string; event: Partial<CreateEventPayload> }>({
    mutationFn: ({ id, event }: { id: string; event: Partial<CreateEventPayload> }) => {
      if (!userKey) {
        throw new Error('User key is not available. Cannot update event.');
      }
      return updateEventService(id, event, userKey);
    },
    onSuccess: (data, variables) => {
      toast({ title: "Success", description: "Event updated successfully." });
      queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEY(userKey) });
      queryClient.invalidateQueries({ queryKey: EVENT_DETAIL_QUERY_KEY(variables.id, userKey) });
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
  const userKey = currentUser?.key;

  return useMutation<Event | void, Error, string>({
    mutationFn: (id: string) => {
      if (!userKey) {
        throw new Error('User key is not available. Cannot delete event.');
      }
      return deleteEventService(id, userKey);
    },
    onSuccess: (data, id) => {
      toast({ title: "Success", description: "Event deleted successfully." });
      queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEY(userKey) });
      queryClient.removeQueries({ queryKey: EVENT_DETAIL_QUERY_KEY(id, userKey) });
    },
    onError: (error: any, id) => {
      const message = error.response?.data?.error?.message
                   || error.message
                   || `An unknown error occurred while deleting event ${id}.`;
      toast({ variant: "destructive", title: "Error Deleting Event", description: message });
    }
  });
};


'use server';

import type { Event, CreateEventPayload } from "@/types/event";
import type { FindMany, FindOne } from "@/types/strapi_response";
import axiosInstance from "@/lib/axios";
import { getAccessToken } from "@/lib/actions/auth";
import { AxiosError } from 'axios';

async function getAuthHeader() {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Authentication token not found.");
  }
  return { Authorization: `Bearer ${token}` };
}

export const getEvents = async (userTenentId: string): Promise<Event[]> => {
    if (!userTenentId) {
        console.error('[Service getEvents]: userTenentId is missing.');
        throw new Error('User tenent_id is required to fetch events.');
    }
     const params = {
        'filters[tenent_id][$eq]': userTenentId,
        'populate':'*',
    };
    const url = '/events';
    console.log(`[getEvents] Fetching URL: ${url} with params:`, params);

    try {
        const headers = await getAuthHeader();
        const response = await axiosInstance.get<FindMany<Event>>(url, { params, headers });

        if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
            console.error(`[getEvents] Unexpected API response structure for tenent_id ${userTenentId}. Expected 'data' array, received:`, response.data);
             if (response.data === null || response.data === undefined || (response.data && !response.data.data)) {
                console.warn(`[getEvents] API returned null, undefined, or no 'data' property for tenent_id ${userTenentId}. Returning empty array.`);
                return [];
            }
            throw new Error('Unexpected API response structure. Expected an array within a "data" property.');
        }
        console.log(`[getEvents] Fetched ${response.data.data.length} Events for tenent_id ${userTenentId}.`);
        return response.data.data;

    } catch (error: unknown) {
        let message = `Failed to fetch events for tenent_id ${userTenentId}`;
        if (error instanceof AxiosError) {
            const status = error.response?.status;
            const errorData = error.response?.data || { message: error.message };
            console.error(`[getEvents] Failed to fetch events from ${url} (${status}) for tenent_id ${userTenentId}:`, errorData);
            message = (errorData as any)?.error?.message || `Failed to fetch events (${status}) - ${(errorData as any).message || 'Unknown API error'}`;
        } else if (error instanceof Error) {
            console.error(`[getEvents] Generic Error for tenent_id ${userTenentId}:`, error.message);
            message = error.message;
        } else {
            console.error(`[getEvents] Unknown Error for tenent_id ${userTenentId}:`, error);
        }
        throw new Error(message);
    }
};

export const getEvent = async (id: string, userTenentId: string): Promise<Event | null> => {
    if (!id) return null;
    if (!userTenentId) {
        console.error(`[Service getEvent]: userTenentId is missing for event ID ${id}.`);
        throw new Error('User tenent_id is required to fetch a specific event.');
    }
    const params = {
        'populate':'*',
    };
    const url = `/events/${id}`;
    console.log(`[getEvent] Fetching URL: ${url} with params:`, params);

    try {
        const headers = await getAuthHeader();
        const response = await axiosInstance.get<FindOne<Event>>(url, { params, headers });

        if (!response.data || !response.data.data) {
            console.warn(`[getEvent] Event ${id} not found or no data returned for tenent_id ${userTenentId}.`);
            return null;
        }
        // Verify tenent_id after fetching
        if (response.data.data.tenent_id !== userTenentId) {
             console.warn(`[getEvent] Fetched event ${id} tenent_id (${response.data.data.tenent_id}) does not match requested userTenentId (${userTenentId}). Access denied.`);
             return null; 
        }

        console.log(`[getEvent] Fetched Event ${id} Data for tenent_id ${userTenentId}:`, response.data.data);
        return response.data.data;

    } catch (error: unknown) {
         let message = `Failed to fetch event ${id} for tenent_id ${userTenentId}`;
         if (error instanceof AxiosError) {
            const status = error.response?.status;
            const errorData = error.response?.data || { message: error.message };
             if (status === 404) {
                 console.warn(`[getEvent] Event ${id} not found for tenent_id ${userTenentId}.`);
                 return null;
             }
            console.error(`[getEvent] Failed to fetch event ${id} from ${url} (Status: ${status}) for tenent_id ${userTenentId}:`, JSON.stringify(errorData, null, 2));
            const strapiErrorMessage = (errorData as any)?.error?.message;
            message = strapiErrorMessage || `Failed to fetch event ${id} (${status}) - ${(errorData as any).message || 'Unknown API error'}`;
        } else if (error instanceof Error) {
            console.error(`[getEvent] Generic Error for event ${id}, tenent_id ${userTenentId}:`, error.message);
            message = error.message;
        } else {
            console.error(`[getEvent] Unknown Error for event ${id}, tenent_id ${userTenentId}:`, error);
        }
        throw new Error(message);
    }
};

// Create an event, ensuring the userTenentId is included in the payload
export const createEvent = async (event: CreateEventPayload): Promise<Event> => {
    if (!event.tenent_id) {
        console.error('[Service createEvent]: tenent_id is missing in payload.');
        throw new Error('User tenent_id is required in the payload to create an event.');
    }
    const userTenentId = event.tenent_id;
    const url = '/events';
    const params = { populate: '*' };
    console.log(`[createEvent] Creating event at ${url} with tenent_id ${userTenentId} and payload:`, JSON.stringify({ data: event }, null, 2));
    try {
        const headers = await getAuthHeader();
        const response = await axiosInstance.post<FindOne<Event>>(url,
            { data: event },
            { headers, params }
        );

        if (!response.data || !response.data.data) {
            console.error(`[createEvent] Unexpected API response structure after creation from ${url}:`, response.data);
            throw new Error('Unexpected API response structure after creation.');
        }
        console.log(`[createEvent] Created Event Data for tenent_id ${userTenentId}:`, response.data.data);
        return response.data.data;

    } catch (error: unknown) {
        let message = `Failed to create event for tenent_id ${userTenentId}.`;
        if (error instanceof AxiosError) {
            const status = error.response?.status;
            const errorData = error.response?.data || { message: error.message };
            console.error(`[createEvent] Failed to create event at ${url} (${status}) for tenent_id ${userTenentId}:`, errorData);
            const strapiErrorMessage = (errorData as any)?.error?.message;
            const strapiErrorDetails = (errorData as any)?.error?.details;
            console.error("[createEvent] Strapi Error Details:", strapiErrorDetails);
            message = strapiErrorMessage || `Failed to create event (${status}) - ${(errorData as any).message || 'Unknown API error'}`;
        } else if (error instanceof Error) {
            console.error(`[createEvent] Generic Error for tenent_id ${userTenentId}:`, error.message);
            message = error.message;
        } else {
            console.error(`[createEvent] Unknown Error for tenent_id ${userTenentId}:`, error);
        }
        throw new Error(message);
    }
};

// Update an event by id, ensuring it's for the correct userTenentId
export const updateEvent = async (id: string, eventUpdatePayload: Partial<CreateEventPayload>, userTenentId: string): Promise<Event> => {
    if (!userTenentId) {
        console.error(`[Service updateEvent]: userTenentId is missing for update of event ID ${id}.`);
        throw new Error('User tenent_id is required to authorize event update.');
    }
    
    // Ensure tenent_id is not part of the actual update data payload sent to Strapi
     const { tenent_id, ...updateData } = eventUpdatePayload;
     if (tenent_id && tenent_id !== userTenentId) {
         console.warn(`[Service updateEvent]: Attempted to change tenent_id during update for event ${id}. This is not allowed.`);
     }

    const url = `/events/${id}`;
    console.log(`[updateEvent] Updating event ${id} for user with tenent_id ${userTenentId}. Payload:`, JSON.stringify({ data: updateData }, null, 2));
    try {
        const headers = await getAuthHeader();
        // First, verify ownership by fetching the event and checking its tenent_id
        const existingEvent = await getEvent(id, userTenentId);
        if (!existingEvent) {
            throw new Error(`Event with ID ${id} not found or user ${userTenentId} is not authorized to update it.`);
        }

        const response = await axiosInstance.put<FindOne<Event>>(url,
            { data: updateData },
            {
                headers,
                params: { populate: '*' }
            }
        );

        if (!response.data || !response.data.data) {
            console.error(`[updateEvent] Unexpected API response structure after update for event ${id} from ${url}:`, response.data);
            throw new Error('Unexpected API response structure after update.');
        }
        console.log(`[updateEvent] Updated Event ${id} Data for tenent_id ${userTenentId}:`, response.data.data);
        return response.data.data;

    } catch (error: unknown) {
         let message = `Failed to update event ${id} for tenent_id ${userTenentId}.`;
         if (error instanceof AxiosError) {
            const status = error.response?.status;
            const errorData = error.response?.data || { message: error.message };
             if (status === 404 || status === 403) {
                 console.error(`[updateEvent] Event ${id} not found or not authorized for tenent_id ${userTenentId} (Status: ${status}).`);
                 throw new Error(`Event not found or update not authorized (Status: ${status}).`);
             }
            console.error(`[updateEvent] Failed to update event ${id} at ${url} (${status}) for tenent_id ${userTenentId}:`, errorData);
            const strapiErrorMessage = (errorData as any)?.error?.message;
            const strapiErrorDetails = (errorData as any)?.error?.details;
            console.error("[updateEvent] Strapi Error Details:", strapiErrorDetails);
            message = strapiErrorMessage || `Failed to update event ${id} (${status}) - ${(errorData as any).message || 'Unknown API error'}`;
        } else if (error instanceof Error) {
            console.error(`[updateEvent] Generic Error for event ${id}, tenent_id ${userTenentId}:`, error.message);
            message = error.message;
        } else {
            console.error(`[updateEvent] Unknown Error for event ${id}, tenent_id ${userTenentId}:`, error);
        }
        throw new Error(message);
    }
};

// Delete an event by id, ensuring it's for the correct userTenentId
export const deleteEvent = async (id: string, userTenentId: string): Promise<Event | void> => {
     if (!userTenentId) {
        console.error(`[Service deleteEvent]: userTenentId is missing for deletion of event ID ${id}.`);
        throw new Error('User tenent_id is required to authorize event deletion.');
    }

    const url = `/events/${id}`;
    console.log(`[deleteEvent] Deleting event ${id} for user with tenent_id ${userTenentId}`);
    try {
        const headers = await getAuthHeader();
        // First, verify ownership
        const existingEvent = await getEvent(id, userTenentId);
        if (!existingEvent) {
            throw new Error(`Event with ID ${id} not found or user ${userTenentId} is not authorized to delete it.`);
        }
        
        const response = await axiosInstance.delete<FindOne<Event>>(url, { headers });

        if (response.status === 200 && response.data && response.data.data) {
            console.log(`[deleteEvent] Successfully deleted event ${id} for tenent_id ${userTenentId}.`);
            return response.data.data;
        } else if (response.status === 204) { // Strapi might return 204 No Content on successful delete
            console.log(`[deleteEvent] Successfully deleted event ${id} (no content returned) for tenent_id ${userTenentId}.`);
            return; // Return void for 204
        } else {
             console.warn(`[deleteEvent] Unexpected success status ${response.status} when deleting event ${id} at ${url} for tenent_id ${userTenentId}.`);
             return response.data?.data; // Return data if present, even with unexpected status
        }

    } catch (error: unknown) {
        let message = `Failed to delete event ${id} for tenent_id ${userTenentId}.`;
        if (error instanceof AxiosError) {
            const status = error.response?.status;
            const errorData = error.response?.data || { message: error.message };
             if (status === 404 || status === 403) {
                 console.error(`[deleteEvent] Event ${id} not found or not authorized for tenent_id ${userTenentId} (Status: ${status}).`);
                 throw new Error(`Event not found or deletion not authorized (Status: ${status}).`);
             }
            console.error(`[deleteEvent] Failed to delete event ${id} at ${url} (${status}) for tenent_id ${userTenentId}:`, errorData);
            const strapiErrorMessage = (errorData as any)?.error?.message;
            message = strapiErrorMessage || `Failed to delete event ${id} (${status}) - ${(errorData as any).message || 'Unknown API error'}`;
        } else if (error instanceof Error) {
            console.error(`[deleteEvent] Generic Error for event ${id}, tenent_id ${userTenentId}:`, error.message);
            message = error.message;
        } else {
            console.error(`[deleteEvent] Unknown Error for event ${id}, tenent_id ${userTenentId}:`, error);
        }
        throw new Error(message);
    }
};

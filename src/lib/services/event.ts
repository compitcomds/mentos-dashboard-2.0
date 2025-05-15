
'use server';

import type { Event, CreateEventPayload } from "@/types/event";
import type { FindMany, FindOne } from "@/types/strapi_response"; // Import Strapi response types
import axiosInstance from "@/lib/axios";
import { getAccessToken } from "@/lib/actions/auth";
import { AxiosError } from 'axios';

// Helper to get Authorization header
async function getAuthHeader() {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Authentication token not found.");
  }
  return { Authorization: `Bearer ${token}` };
}

// Get all events for a specific user key
export const getEvents = async (userKey: string): Promise<Event[]> => {
    if (!userKey) {
        console.error('[Service getEvents]: userKey is missing.');
        throw new Error('User key is required to fetch events.');
    }
     const params = {
        'filters[tenent_id][$eq]':userKey,
        'populate':'*',
    };
    const url = '/events';
    console.log(`[getEvents] Fetching URL: ${url} with params:`, params);

    try {
        const headers = await getAuthHeader();
        const response = await axiosInstance.get<FindMany<Event>>(url, { params, headers });

        if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
            console.error(`[getEvents] Unexpected API response structure for key ${userKey}. Expected 'data' array, received:`, response.data);
             if (response.data === null || response.data === undefined || (response.data && !response.data.data)) {
                console.warn(`[getEvents] API returned null, undefined, or no 'data' property for key ${userKey}. Returning empty array.`);
                return [];
            }
            throw new Error('Unexpected API response structure. Expected an array within a "data" property.');
        }
        console.log(`[getEvents] Fetched ${response.data.data.length} Events for key ${userKey}.`);
        return response.data.data;

    } catch (error: unknown) {
        let message = `Failed to fetch events for key ${userKey}`;
        if (error instanceof AxiosError) {
            const status = error.response?.status;
            const errorData = error.response?.data || { message: error.message };
            console.error(`[getEvents] Failed to fetch events from ${url} (${status}) for key ${userKey}:`, errorData);
            message = errorData?.error?.message || `Failed to fetch events (${status}) - ${errorData.message || 'Unknown API error'}`;
        } else if (error instanceof Error) {
            console.error(`[getEvents] Generic Error for key ${userKey}:`, error.message);
            message = error.message;
        } else {
            console.error(`[getEvents] Unknown Error for key ${userKey}:`, error);
        }
        throw new Error(message);
    }
};

// Get a specific event by id, ensuring it matches the userKey
export const getEvent = async (id: string, userKey: string): Promise<Event | null> => {
    if (!id) return null;
    if (!userKey) {
        console.error(`[Service getEvent]: userKey is missing for event ID ${id}.`);
        throw new Error('User key is required to fetch a specific event.');
    }
    const params = {
        // 'filters[tenent_id][$eq]':userKey, // Assuming backend policy handles this for single fetch
        'populate':'*',
    };
    const url = `/events/${id}`;
    console.log(`[getEvent] Fetching URL: ${url} with params:`, params);

    try {
        const headers = await getAuthHeader();
        const response = await axiosInstance.get<FindOne<Event>>(url, { params, headers });

        if (!response.data || !response.data.data) {
            console.warn(`[getEvent] Event ${id} not found or no data returned for key ${userKey}.`);
            return null;
        }
        // For Strapi v5, `tenent_id` is directly on the event object
        if (response.data.data.tenent_id !== userKey) {
             console.warn(`[getEvent] Fetched event ${id} tenent_id (${response.data.data.tenent_id}) does not match requested userKey (${userKey}).`);
             return null;
        }

        console.log(`[getEvent] Fetched Event ${id} Data for key ${userKey}:`, response.data.data);
        return response.data.data;

    } catch (error: unknown) {
         let message = `Failed to fetch event ${id} for key ${userKey}`;
         if (error instanceof AxiosError) {
            const status = error.response?.status;
            const errorData = error.response?.data || { message: error.message };
             if (status === 404) {
                 console.warn(`[getEvent] Event ${id} not found for key ${userKey}.`);
                 return null;
             }
            console.error(`[getEvent] Failed to fetch event ${id} from ${url} (Status: ${status}) for key ${userKey}:`, JSON.stringify(errorData, null, 2));
            const strapiErrorMessage = errorData?.error?.message;
            message = strapiErrorMessage || `Failed to fetch event ${id} (${status}) - ${errorData.message || 'Unknown API error'}`;
        } else if (error instanceof Error) {
            console.error(`[getEvent] Generic Error for event ${id}, key ${userKey}:`, error.message);
            message = error.message;
        } else {
            console.error(`[getEvent] Unknown Error for event ${id}, key ${userKey}:`, error);
        }
        throw new Error(message);
    }
};

// Create an event, ensuring the userKey is included in the payload
export const createEvent = async (event: CreateEventPayload): Promise<Event> => {
    if (!event.tenent_id) { // Check tenent_id directly from payload
        console.error('[Service createEvent]: tenent_id is missing in payload.');
        throw new Error('User tenent_id is required in the payload to create an event.');
    }
    const userKey = event.tenent_id;
    const url = '/events';
    const params = { populate: '*' };
    console.log(`[createEvent] Creating event at ${url} with key ${userKey} and payload:`, JSON.stringify({ data: event }, null, 2));
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
        console.log(`[createEvent] Created Event Data for key ${userKey}:`, response.data.data);
        return response.data.data;

    } catch (error: unknown) {
        let message = `Failed to create event for key ${userKey}.`;
        if (error instanceof AxiosError) {
            const status = error.response?.status;
            const errorData = error.response?.data || { message: error.message };
            console.error(`[createEvent] Failed to create event at ${url} (${status}) for key ${userKey}:`, errorData);
            const strapiErrorMessage = errorData?.error?.message;
            const strapiErrorDetails = errorData?.error?.details;
            console.error("[createEvent] Strapi Error Details:", strapiErrorDetails);
            message = strapiErrorMessage || `Failed to create event (${status}) - ${errorData.message || 'Unknown API error'}`;
        } else if (error instanceof Error) {
            console.error(`[createEvent] Generic Error for key ${userKey}:`, error.message);
            message = error.message;
        } else {
            console.error(`[createEvent] Unknown Error for key ${userKey}:`, error);
        }
        throw new Error(message);
    }
};

// Update an event by id, validating against userKey
export const updateEvent = async (id: string, event: Partial<CreateEventPayload>, userKey: string): Promise<Event> => {
    if (!userKey) {
        console.error(`[Service updateEvent]: userKey is missing for update of event ID ${id}.`);
        throw new Error('User key is required to update an event.');
    }
     const { tenent_id, ...updateData } = event; // Use tenent_id from payload
     if (tenent_id && tenent_id !== userKey) {
         console.warn(`[Service updateEvent]: Attempted to change tenent_id during update for event ${id}. Tenent_id change ignored.`);
     }

    const url = `/events/${id}`;
    console.log(`[updateEvent] Updating event ${id} at ${url} (userKey: ${userKey}) with payload:`, JSON.stringify({ data: updateData }, null, 2));
    try {
        const headers = await getAuthHeader();
        const response = await axiosInstance.put<FindOne<Event>>(url,
            { data: updateData },
            {
                headers,
                params: {
                    populate: '*',
                    // 'filters[tenent_id][$eq]': userKey // Ensure backend policy handles ownership
                }
            }
        );

        if (!response.data || !response.data.data) {
            console.error(`[updateEvent] Unexpected API response structure after update for event ${id} from ${url}:`, response.data);
            throw new Error('Unexpected API response structure after update.');
        }
        if (response.data.data.tenent_id !== userKey) {
            console.error(`[updateEvent] Key mismatch after update for event ${id}. Expected ${userKey}, got ${response.data.data.tenent_id}.`);
            throw new Error('Event update resulted in key mismatch.');
        }
        console.log(`[updateEvent] Updated Event ${id} Data for key ${userKey}:`, response.data.data);
        return response.data.data;

    } catch (error: unknown) {
         let message = `Failed to update event ${id} for key ${userKey}.`;
         if (error instanceof AxiosError) {
            const status = error.response?.status;
            const errorData = error.response?.data || { message: error.message };
             if (status === 404 || status === 403) {
                 console.error(`[updateEvent] Event ${id} not found or not authorized for key ${userKey} (Status: ${status}).`);
                 throw new Error(`Event not found or update not authorized (Status: ${status}).`);
             }
            console.error(`[updateEvent] Failed to update event ${id} at ${url} (${status}) for key ${userKey}:`, errorData);
            const strapiErrorMessage = errorData?.error?.message;
            const strapiErrorDetails = errorData?.error?.details;
            console.error("[updateEvent] Strapi Error Details:", strapiErrorDetails);
            message = strapiErrorMessage || `Failed to update event ${id} (${status}) - ${errorData.message || 'Unknown API error'}`;
        } else if (error instanceof Error) {
            console.error(`[updateEvent] Generic Error for event ${id}, key ${userKey}:`, error.message);
            message = error.message;
        } else {
            console.error(`[updateEvent] Unknown Error for event ${id}, key ${userKey}:`, error);
        }
        throw new Error(message);
    }
};

// Delete an event by id, validating against userKey
export const deleteEvent = async (id: string, userKey: string): Promise<Event | void> => {
     if (!userKey) {
        console.error(`[Service deleteEvent]: userKey is missing for deletion of event ID ${id}.`);
        throw new Error('User key is required to delete an event.');
    }
    const url = `/events/${id}`;
    console.log(`[deleteEvent] Deleting event ${id} at ${url} (userKey: ${userKey})`);
    try {
        const headers = await getAuthHeader();
        const response = await axiosInstance.delete<FindOne<Event>>(url, { // Expect FindOne<Event>
            headers,
            // params: { 'filters[tenent_id][$eq]': userKey } // Backend policy should handle ownership
        });

        if (response.status === 200 || response.status === 204) {
            console.log(`[deleteEvent] Successfully deleted event ${id} for key ${userKey}.`);
            return response.data?.data; // response.data.data will contain the deleted item if status 200
        } else {
             console.warn(`[deleteEvent] Unexpected success status ${response.status} when deleting event ${id} at ${url} for key ${userKey}.`);
             return response.data?.data;
        }

    } catch (error: unknown) {
        let message = `Failed to delete event ${id} for key ${userKey}.`;
        if (error instanceof AxiosError) {
            const status = error.response?.status;
            const errorData = error.response?.data || { message: error.message };
             if (status === 404 || status === 403) {
                 console.error(`[deleteEvent] Event ${id} not found or not authorized for key ${userKey} (Status: ${status}).`);
                 throw new Error(`Event not found or deletion not authorized (Status: ${status}).`);
             }
            console.error(`[deleteEvent] Failed to delete event ${id} at ${url} (${status}) for key ${userKey}:`, errorData);
            const strapiErrorMessage = errorData?.error?.message;
            message = strapiErrorMessage || `Failed to delete event ${id} (${status}) - ${errorData.message || 'Unknown API error'}`;
        } else if (error instanceof Error) {
            console.error(`[deleteEvent] Generic Error for event ${id}, key ${userKey}:`, error.message);
            message = error.message;
        } else {
            console.error(`[deleteEvent] Unknown Error for event ${id}, key ${userKey}:`, error);
        }
        throw new Error(message);
    }
};

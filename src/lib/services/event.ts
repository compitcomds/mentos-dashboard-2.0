
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
        throw new Error('User tenent_id is required to verify fetched event.');
    }
    const params = {
        'populate':'*',
    };
    const url = `/events/${id}`;
    console.log(`[getEvent] Fetching URL: ${url} (no tenent_id filter in query) with params:`, params);

    try {
        const headers = await getAuthHeader();
        const response = await axiosInstance.get<FindOne<Event>>(url, { params, headers });

        if (!response.data || !response.data.data) {
            console.warn(`[getEvent] Event ${id} not found or no data returned.`);
            return null;
        }
        
        // Verify the tenent_id matches after fetching
        if (response.data.data.tenent_id !== userTenentId) {
             console.warn(`[getEvent] Fetched event ${id} tenent_id (${response.data.data.tenent_id}) does not match requested userTenentId (${userTenentId}). Access denied.`);
             return null; 
        }

        console.log(`[getEvent] Fetched Event ${id} Data for tenent_id ${userTenentId}:`, response.data.data);
        return response.data.data;

    } catch (error: unknown) {
         let message = `Failed to fetch event ${id}.`;
         if (error instanceof AxiosError) {
            const status = error.response?.status;
            const errorData = error.response?.data || { message: error.message };
             if (status === 404) {
                 console.warn(`[getEvent] Event ${id} not found.`);
                 return null;
             }
             if (status === 403) { 
                console.warn(`[getEvent] Access to event ${id} forbidden.`);
                return null;
            }
            console.error(`[getEvent] Failed to fetch event ${id} from ${url} (Status: ${status}):`, JSON.stringify(errorData, null, 2));
            const strapiErrorMessage = (errorData as any)?.error?.message;
            message = strapiErrorMessage || `Failed to fetch event ${id} (${status}) - ${(errorData as any).message || 'Unknown API error'}`;
        } else if (error instanceof Error) {
            console.error(`[getEvent] Generic Error for event ${id}:`, error.message);
            message = error.message;
        } else {
            console.error(`[getEvent] Unknown Error for event ${id}:`, error);
        }
        throw new Error(message);
    }
};

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
        let detailedMessage = `Failed to create event for tenent_id ${userTenentId}.`;
        let loggableErrorData: any = error;

        if (error instanceof AxiosError) {
        loggableErrorData = error.response?.data || error.message;
        const status = error.response?.status;
        const strapiError = error.response?.data?.error;

        if (strapiError && typeof strapiError === 'object') {
            let mainMsg = strapiError.message || "Unknown API error from Strapi.";
            if (strapiError.name) {
            mainMsg = `${strapiError.name}: ${mainMsg}`;
            }
            detailedMessage = `API Error (Status ${status || strapiError.status || 'unknown'}): ${mainMsg}`;
            if (strapiError.details && Object.keys(strapiError.details).length > 0) {
            try {
                detailedMessage += ` Details: ${JSON.stringify(strapiError.details)}`;
            } catch (e) { /* ignore */ }
            }
        } else if (error.response?.data?.message && typeof error.response.data.message === 'string') {
            detailedMessage = `API Error (Status ${status || 'unknown'}): ${error.response.data.message}`;
        } else if (typeof error.response?.data === 'string' && error.response.data.trim() !== '') {
            detailedMessage = `API Error (Status ${status || 'unknown'}): ${error.response.data}`;
        } else {
            detailedMessage = `API Error (Status ${status || 'unknown'}): ${error.message}.`;
        }
        } else if (error instanceof Error) {
        detailedMessage = error.message;
        }
        console.error(`[createEvent] Failed for tenent_id ${userTenentId}. Error: ${detailedMessage}`, "Full error object/data logged:", loggableErrorData);
        throw new Error(detailedMessage);
    }
};

export const updateEvent = async (id: string, eventUpdatePayload: Partial<CreateEventPayload>, userTenentIdAuthContext: string): Promise<Event> => {
    // userTenentIdAuthContext is for query invalidation or logging, not for filtering the PUT request
    const { tenent_id, ...updateData } = eventUpdatePayload; // Ensure tenent_id is not in the update payload data
    if (tenent_id) {
        console.warn(`[Service updateEvent]: tenent_id was present in update payload for event ${id} but is being excluded. tenent_id should not be updated.`);
    }

    const url = `/events/${id}`;
    console.log(`[updateEvent] Updating event ${id} for user (Auth context tenent_id ${userTenentIdAuthContext}). Payload:`, JSON.stringify({ data: updateData }, null, 2));
    try {
        const headers = await getAuthHeader();
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
        
        console.log(`[updateEvent] Updated Event ${id} Data (Auth context tenent_id ${userTenentIdAuthContext}):`, response.data.data);
        return response.data.data;

    } catch (error: unknown) {
         let detailedMessage = `Failed to update event ${id}.`;
         let loggableErrorData: any = error;
 
         if (error instanceof AxiosError) {
            loggableErrorData = error.response?.data || error.message;
            const status = error.response?.status;
            const strapiError = error.response?.data?.error;
    
            if (strapiError && typeof strapiError === 'object') {
                let mainMsg = strapiError.message || "Unknown API error from Strapi.";
                if (strapiError.name) {
                mainMsg = `${strapiError.name}: ${mainMsg}`;
                }
                detailedMessage = `API Error (Status ${status || strapiError.status || 'unknown'}): ${mainMsg}`;
                if (strapiError.details && Object.keys(strapiError.details).length > 0) {
                try {
                    detailedMessage += ` Details: ${JSON.stringify(strapiError.details)}`;
                } catch (e) { /* ignore */ }
                }
            } else if (error.response?.data?.message && typeof error.response.data.message === 'string') {
                detailedMessage = `API Error (Status ${status || 'unknown'}): ${error.response.data.message}`;
            } else if (typeof error.response?.data === 'string' && error.response.data.trim() !== '') {
                detailedMessage = `API Error (Status ${status || 'unknown'}): ${error.response.data}`;
            } else {
                detailedMessage = `API Error (Status ${status || 'unknown'}): ${error.message}.`;
            }
            if (status === 403) { 
                detailedMessage = `Forbidden: You do not have permission to update event ${id}. (User: ${userTenentIdAuthContext})`;
            } else if (status === 404) {
                detailedMessage = `Event with ID ${id} not found.`;
            }
         } else if (error instanceof Error) {
            detailedMessage = error.message;
         }
         console.error(`[updateEvent] Failed for event ID ${id}, user tenent_id ${userTenentIdAuthContext}. Error: ${detailedMessage}`, "Full error object/data logged:", loggableErrorData);
         throw new Error(detailedMessage);
    }
};

export const deleteEvent = async (id: string, userTenentIdAuthContext: string): Promise<Event | void> => {
    // userTenentIdAuthContext is for query invalidation or logging
    const url = `/events/${id}`;
    console.log(`[deleteEvent] Deleting event ${id} (Auth context tenent_id: ${userTenentIdAuthContext})`);
    try {
        const headers = await getAuthHeader();
        const response = await axiosInstance.delete<FindOne<Event>>(url, { headers });

        if (response.status === 200 && response.data && response.data.data) {
            console.log(`[deleteEvent] Successfully deleted event ${id}.`);
            return response.data.data;
        } else if (response.status === 204) { 
            console.log(`[deleteEvent] Successfully deleted event ${id} (no content returned).`);
            return; 
        } else {
             console.warn(`[deleteEvent] Unexpected success status ${response.status} when deleting event ${id} at ${url}.`);
             return response.data?.data; 
        }

    } catch (error: unknown) {
        let detailedMessage = `Failed to delete event ${id}.`;
        let loggableErrorData: any = error;

        if (error instanceof AxiosError) {
            loggableErrorData = error.response?.data || error.message;
            const status = error.response?.status;
            const strapiError = error.response?.data?.error;

            if (strapiError && typeof strapiError === 'object') {
                let mainMsg = strapiError.message || "Unknown API error from Strapi.";
                if (strapiError.name) {
                mainMsg = `${strapiError.name}: ${mainMsg}`;
                }
                detailedMessage = `API Error (Status ${status || strapiError.status || 'unknown'}): ${mainMsg}`;
                if (strapiError.details && Object.keys(strapiError.details).length > 0) {
                try {
                    detailedMessage += ` Details: ${JSON.stringify(strapiError.details)}`;
                } catch (e) { /* ignore */ }
                }
            } else if (error.response?.data?.message && typeof error.response.data.message === 'string') {
                detailedMessage = `API Error (Status ${status || 'unknown'}): ${error.response.data.message}`;
            } else if (typeof error.response?.data === 'string' && error.response.data.trim() !== '') {
                detailedMessage = `API Error (Status ${status || 'unknown'}): ${error.response.data}`;
            } else {
                detailedMessage = `API Error (Status ${status || 'unknown'}): ${error.message}.`;
            }
            if (status === 403) { 
                detailedMessage = `Forbidden: You do not have permission to delete event ${id}. (User: ${userTenentIdAuthContext})`;
            } else if (status === 404) {
                detailedMessage = `Event with ID ${id} not found.`;
            }
        } else if (error instanceof Error) {
            detailedMessage = error.message;
        }
        console.error(`[deleteEvent] Failed for event ID ${id}, user tenent_id ${userTenentIdAuthContext}. Error: ${detailedMessage}`, "Full error object/data logged:", loggableErrorData);
        throw new Error(detailedMessage);
    }
};

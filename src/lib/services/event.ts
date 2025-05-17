
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
        
        if (response.data.data.tenent_id !== userTenentId) {
             console.warn(`[getEvent] Fetched event ${id} tenent_id (${response.data.data.tenent_id}) does not match requested userTenentId (${userTenentId}). Access denied.`);
             return null; 
        }

        console.log(`[getEvent] Fetched Event ${id} Data for tenent_id ${userTenentId}:`, response.data.data);
        return response.data.data;

    } catch (error: unknown) {
         let message = `Failed to fetch event ${id} for tenent_id ${userTenentId}.`;
         if (error instanceof AxiosError) {
            const status = error.response?.status;
            const errorData = error.response?.data || { message: error.message };
             if (status === 404) {
                 console.warn(`[getEvent] Event ${id} not found for tenent_id ${userTenentId}.`);
                 return null;
             }
             if (status === 403) { // Added 403 check
                console.warn(`[getEvent] Event ${id} forbidden for tenent_id ${userTenentId} (Status: 403).`);
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

export const updateEvent = async (id: string, eventUpdatePayload: Partial<CreateEventPayload>, userTenentId: string): Promise<Event> => {
    if (!userTenentId) {
        console.error(`[Service updateEvent]: userTenentId is missing for update of event ID ${id}.`);
        throw new Error('User tenent_id is required to authorize event update.');
    }
    
    const { tenent_id, ...updateData } = eventUpdatePayload;
     if (tenent_id && tenent_id !== userTenentId) {
         console.warn(`[Service updateEvent]: Attempted to change tenent_id during update for event ${id}. This is not allowed and will be ignored by the service if the backend enforces it.`);
     }

    const url = `/events/${id}`;
    console.log(`[updateEvent] Updating event ${id} for user with tenent_id ${userTenentId}. Payload:`, JSON.stringify({ data: updateData }, null, 2));
    try {
        const headers = await getAuthHeader();
        // No pre-flight GET, rely on Strapi policies for PUT authorization
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
        // Verify tenent_id after update if backend doesn't enforce it strictly via policies during PUT
        if (response.data.data.tenent_id !== userTenentId) {
             console.error(`[updateEvent] CRITICAL: tenent_id mismatch after update for event ${id}. Expected ${userTenentId}, got ${response.data.data.tenent_id}. This might indicate a policy bypass or an issue with the API update logic.`);
             // Potentially throw an error here
        }
        console.log(`[updateEvent] Updated Event ${id} Data for tenent_id ${userTenentId}:`, response.data.data);
        return response.data.data;

    } catch (error: unknown) {
         let detailedMessage = `Failed to update event ${id} for tenent_id ${userTenentId}.`;
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
         if (status === 403) { // Specifically handle 403
            detailedMessage = `Forbidden: You do not have permission to update event ${id}. (User: ${userTenentId})`;
         }
         } else if (error instanceof Error) {
         detailedMessage = error.message;
         }
         console.error(`[updateEvent] Failed for event ID ${id}, user tenent_id ${userTenentId}. Error: ${detailedMessage}`, "Full error object/data logged:", loggableErrorData);
         throw new Error(detailedMessage);
    }
};

export const deleteEvent = async (id: string, userTenentId: string): Promise<Event | void> => {
     if (!userTenentId) {
        console.error(`[Service deleteEvent]: userTenentId is missing for deletion of event ID ${id}.`);
        throw new Error('User tenent_id is required to authorize event deletion.');
    }

    const url = `/events/${id}`;
    console.log(`[deleteEvent] Deleting event ${id} for user with tenent_id ${userTenentId}`);
    try {
        const headers = await getAuthHeader();
        // No pre-flight GET, rely on Strapi policies for DELETE authorization
        const response = await axiosInstance.delete<FindOne<Event>>(url, { headers });

        if (response.status === 200 && response.data && response.data.data) {
            console.log(`[deleteEvent] Successfully deleted event ${id} for tenent_id ${userTenentId}.`);
            return response.data.data;
        } else if (response.status === 204) { 
            console.log(`[deleteEvent] Successfully deleted event ${id} (no content returned) for tenent_id ${userTenentId}.`);
            return; 
        } else {
             console.warn(`[deleteEvent] Unexpected success status ${response.status} when deleting event ${id} at ${url} for tenent_id ${userTenentId}.`);
             return response.data?.data; 
        }

    } catch (error: unknown) {
        let detailedMessage = `Failed to delete event ${id} for tenent_id ${userTenentId}.`;
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
        if (status === 403) { // Specifically handle 403
            detailedMessage = `Forbidden: You do not have permission to delete event ${id}. (User: ${userTenentId})`;
        }
        } else if (error instanceof Error) {
        detailedMessage = error.message;
        }
        console.error(`[deleteEvent] Failed for event ID ${id}, user tenent_id ${userTenentId}. Error: ${detailedMessage}`, "Full error object/data logged:", loggableErrorData);
        throw new Error(detailedMessage);
    }
};

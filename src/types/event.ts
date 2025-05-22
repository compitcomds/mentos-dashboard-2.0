
import { z } from 'zod';
import type { Media } from './media';
import type { User } from './auth';
import type { OtherTag, SpeakerComponent as ApiSpeakerComponent } from './common'; // Renamed to avoid conflict

// --- Zod Schema Definition ---

// Schema for the Speaker component (used in array for speakers field)
// This is for the form's internal state.
export const speakerFormSchema = z.object({
  id: z.number().optional(), // Strapi component ID, if updating an existing one
  name: z.string().min(1, "Speaker name cannot be empty.").optional().nullable(),
  image_id: z.number().nullable().optional(), // Media ID for the selected image
  image_preview_url: z.string().url({message: "Invalid image preview URL"}).nullable().optional(), // For UI preview
  excerpt: z.string().max(200, "Excerpt must be 200 characters or less.").optional().nullable(),
});
export type SpeakerFormSchemaValues = z.infer<typeof speakerFormSchema>;


// Schema for the Event form validation
export const eventFormSchema = z.object({
  title: z.string().min(1, { message: "Event Title is required." }),
  description: z.string().optional().default('<p></p>'),
  event_date_time: z.date({ required_error: "Event Date & Time is required." }),
  category: z.string().min(1, { message: "Category is required." }),
  location: z.string().min(1, { message: "Location is required." }),
  location_url: z.string().url({ message: "Invalid Location URL (optional)" }).nullable().optional(),
  organizer_name: z.string().min(1, { message: "Organizer Name is required." }),
  poster: z.number().nullable().optional(), // Media ID for Poster
  tags: z.string().optional().default(''), // Kept as string for TagInputField
  speakers: z.array(speakerFormSchema).optional().nullable().default([]), // Array of speaker form objects
  registration_link: z.string().url({ message: "Invalid Registration Link" }).nullable().optional(),
  event_status: z.enum(["Draft", "Published"]).default("Draft"),
  publish_date: z.date().nullable().optional(),
  tenent_id: z.string(),
  // user field removed from form schema
});

// Type derived from Zod schema for the form values
export type EventFormValues = z.infer<typeof eventFormSchema>;


// --- API Type Definitions ---

// Type for the main event creation/update payload
export type CreateEventPayload = {
    title: string;
    description?: string | null;
    event_date_time: string; // Send as ISO string
    category?: string;
    location?: string;
    location_url?: string | null;
    organizer_name?: string;
    poster?: number | null; // Media ID
    tags?: OtherTag[];
    speakers?: ApiSpeakerComponent[] | null; // Array of SpeakerComponent objects for API
    registration_link?: string | null;
    event_status?: "Draft" | "Published";
    publish_date?: string | null; // Send as ISO string
    tenent_id: string;
    // user field removed from payload
};

// Represents the actual Event data structure as received from the API
export interface Event {
  id?: number;
  documentId?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  publishedAt?: Date | string | null;
  locale?: string | null;
  category?: string | null;
  title?: string | null;
  event_date_time?: Date | string | null;
  location?: string | null;
  location_url?: string | null;
  description?: string | null;
  poster?: Media | null;
  tags?: OtherTag[] | null;
  speakers?: ApiSpeakerComponent[] | null; // Updated to ApiSpeakerComponent array
  registration_link?: string | null;
  publish_date?: Date | string | null;
  tenent_id: string;
  organizer_name?: string | null;
  event_status?: "Draft" | "Published" | null;
  user?: User | null; // Kept here as API might still return it
};


// Utility function type for safely getting tag values
export type GetTagValuesFunction = (tagField: OtherTag[] | null | undefined) => string[];

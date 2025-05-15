import { z } from 'zod';
import type { Media } from './media'; // Import the updated Media type
import type { User } from './auth';
import type { OtherTag } from './common'; // Import OtherTag

// --- Zod Schema Definition ---

// Schema for the Event form validation
export const eventFormSchema = z.object({
  title: z.string().min(1, { message: "Event Title is required." }),
  description: z.string().optional().default('<p></p>'), // Changed from 'des' to 'description' for clarity
  event_date_time: z.date({ required_error: "Event Date & Time is required." }),
  category: z.string().min(1, { message: "Category is required." }),
  location: z.string().min(1, { message: "Location is required." }),
  location_url: z.string().url({ message: "Invalid Location URL (optional)" }).nullable().optional(),
  organizer_name: z.string().min(1, { message: "Organizer Name is required." }),
  poster: z.number().nullable().optional(), // Media ID for Poster
  tags: z.string().optional().default(''), // Changed from target_audience
  speakers: z.string().optional().default(''), // Changed from Speakers
  registration_link: z.string().url({ message: "Invalid Registration Link" }).nullable().optional(),
  event_status: z.enum(["Draft", "Published"]).default("Draft"),
  publish_date: z.date().nullable().optional(),
  tenent_id: z.string().optional(), // Will be populated by system (changed from key)
});

// Type derived from Zod schema for the form values
export type EventFormValues = z.infer<typeof eventFormSchema>;


// --- API Type Definitions ---

// Type for the main event creation/update payload
export type CreateEventPayload = {
    title: string;
    description?: string | null; // Changed from des
    event_date_time: string; // Send as ISO string
    category?: string; // Made optional as per new Event type
    location?: string; // Made optional
    location_url?: string | null;
    organizer_name?: string; // Made optional
    poster?: number | null; // Media ID
    tags?: OtherTag[]; // Changed from target_audience, using OtherTag
    speakers?: OtherTag[]; // Using OtherTag
    registration_link?: string | null;
    event_status?: "Draft" | "Published";
    publish_date?: string | null; // Send as ISO string
    tenent_id: string; // Changed from key
    user?: number | null; // User ID for relation
};

// Represents the actual Event data structure as received from the API
export type Event = {
  id?: number;
  documentId?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  publishedAt?: Date | string;
  locale?: string | null;
  category?: string | null;
  title?: string | null;
  event_date_time?: Date | string | null;
  location?: string | null;
  location_url?: string | null;
  description?: string | null;
  poster?: Media | null;
  tags?: OtherTag[] | null;
  speakers?: OtherTag[] | null;
  registration_link?: string | null;
  publish_date?: Date | string | null;
  tenent_id: string; // Made mandatory
  organizer_name?: string | null;
  event_status?: "Draft" | "Published" | null;
  user?: User | null;
};


// Utility function type for safely getting tag values
export type GetTagValuesFunction = (tagField: OtherTag[] | null | undefined) => string[];

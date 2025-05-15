import { z } from 'zod';
import type { UploadFile } from './media'; // Import the type

// Type representing a Tag component structure (used for repeatable fields)
export type TagComponent = {
    id?: number;
    value: string;
};

// --- Zod Schema Definition ---

// Schema for the Event form validation
export const eventFormSchema = z.object({
  title: z.string().min(1, { message: "Event Title is required." }),
  des: z.string().optional().default('<p></p>'), // Description (Rich Text)
  event_date_time: z.date({ required_error: "Event Date & Time is required." }),
  category: z.string().min(1, { message: "Category is required." }),
  location: z.string().min(1, { message: "Location is required." }),
  location_url: z.string().url({ message: "Invalid Location URL (optional)" }).nullable().optional(),
  organizer_name: z.string().min(1, { message: "Organizer Name is required." }),
  poster: z.number().nullable().optional(), // Media ID for Poster
  target_audience: z.string().optional().default(''), // Comma-separated string for tags
  Speakers: z.string().optional().default(''), // Comma-separated string for tags
  registration_link: z.string().url({ message: "Invalid Registration Link" }).nullable().optional(),
  event_status: z.enum(["Draft", "Published"]).default("Draft"), // Default to Draft
  publish_date: z.date().nullable().optional(), // Make optional and nullable
  key: z.string().optional(), // User key, populated automatically
});

// Type derived from Zod schema for the form values
export type EventFormValues = z.infer<typeof eventFormSchema>;

// --- Type Definitions ---

// Type for the main event creation payload (sent within 'data' object)
export type CreateEventPayload = {
    title: string;
    des?: string | null;
    event_date_time: string; // Send as ISO string
    category: string;
    location: string;
    location_url?: string | null;
    organizer_name: string;
    poster?: number | null;
    target_audience?: TagComponent[];
    Speakers?: TagComponent[];
    registration_link?: string | null;
    event_status?: "Draft" | "Published";
    publish_date?: string | null; // Send as ISO string
    key?: string | null;
};

// Represents the actual Event data structure as received from the API
export type Event = {
    id: number;
    title: string;
    des: string | null;
    event_date_time: string; // ISO string from API
    category: string;
    location: string;
    location_url: string | null;
    organizer_name: string;
    poster: UploadFile | null; // Populated media type
    target_audience: TagComponent[] | null;
    Speakers: TagComponent[] | null;
    registration_link: string | null;
    event_status: "Draft" | "Published";
    publish_date: string | null; // ISO string from API
    key: string | null;
    createdAt: string;
    updatedAt: string;
    publishedAt: string | null;
    locale?: string | null;
};


// Utility function type for safely getting tag values
export type GetTagValuesFunction = (tagField: TagComponent[] | null | undefined) => string[];

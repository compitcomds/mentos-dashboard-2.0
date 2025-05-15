
import type { UploadFile } from './media'; // Import the type
import { z } from 'zod'; // Import Zod

// Re-export UploadFile from here for convenience
export type { UploadFile };

// Type representing a Tag component structure (adjust if different)
export type TagComponent = {
    id?: number; // Optional ID if API includes it
    value: string;
};

// --- Zod Schema Definition ---

// Zod schema for the OpenGraph component part
export const openGraphSchema = z.object({
    id: z.number().optional(), // Optional ID if present in data
    ogTitle: z.string()
        .min(1, { message: "OG Title is required." })
        .max(70, { message: "OG Title must be at most 70 characters." }),
    ogDescription: z.string()
        .min(1, { message: "OG Description is required." })
        .max(200, { message: "OG Description must be at most 200 characters." }),
    ogImage: z.number().nullable().optional(), // Media ID for OG Image
    ogUrl: z.string().url({ message: "Invalid OG URL" }).nullable().optional(),
    ogType: z.string().nullable().optional().default('article'),
});
// Infer the type from the schema
export type OpenGraphPayload = z.infer<typeof openGraphSchema>;


// Zod schema for the SEO component part
export const seoBlogSchema = z.object({
    id: z.number().optional(), // Optional ID if present in data
    metaTitle: z.string()
        .min(1, { message: "Meta Title is required." })
        .max(60, { message: "Meta Title must be at most 60 characters." }),
    metaDescription: z.string()
        .min(50, { message: "Meta Description must be at least 50 characters." })
        .max(160, { message: "Meta Description must be at most 160 characters." }),
    metaImage: z.number().nullable().optional(), // Media ID for Meta Image
    openGraph: openGraphSchema.default({
        ogTitle: "",
        ogDescription: "",
        ogImage: null,
        ogUrl: null,
        ogType: "article"
    }),
    keywords: z.string().nullable().optional(),
    metaRobots: z.string().nullable().optional().default('index, follow'),
    metaViewport: z.string().nullable().optional().default('width=device-width, initial-scale=1.0'),
    canonicalURL: z.string().url({ message: "Invalid Canonical URL" }).nullable().optional(),
    structuredData: z.string().nullable().optional().default('{ "@context": "https://schema.org", "@type": "Article" }')
        .refine((val) => {
            if (!val) return true; // Allow null or empty string
            try { JSON.parse(val); return true; } catch { return false; }
        }, { message: "Invalid JSON format for Structured Data" }),
});
// Infer the type from the schema
export type SeoBlogPayload = z.infer<typeof seoBlogSchema>;


// Main Zod schema for the blog form validation
export const blogFormSchema = z.object({
    title: z.string()
      .min(10, { message: "Title must be at least 10 characters." })
      .max(100, { message: "Title must be at most 100 characters." }),
    excerpt: z.string()
      .min(1, { message: "Excerpt is required." })
      .max(250, { message: "Excerpt must be at most 250 characters." }),
    slug: z.string()
      .min(1, { message: "Slug is required." })
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: "Slug must be lowercase alphanumeric with hyphens" }),
    content: z.string().optional().default('<p></p>'), // Default to empty paragraph
    image: z.number().nullable().optional(), // Optional media ID
    categories: z.number().nullable().optional(), // Optional relation ID (single selection in form)
    authors: z.number().nullable().optional(), // Optional relation ID
    tags: z.string().optional().default('') // Default to empty string
        .refine((val) => {
            const tagCount = val ? val.split(',').map(tag => tag.trim()).filter(Boolean).length : 0;
            return tagCount <= 15;
        }, { message: "Maximum of 15 tags allowed." }),
    view: z.number().int().nonnegative().optional().default(0),
    Blog_status: z.enum(["draft", "published", "archived"]).optional().default("draft"),
    seo_blog: seoBlogSchema.optional().default({
        metaTitle: "",
        metaDescription: "",
        metaImage: null,
        openGraph: {
            ogTitle: "",
            ogDescription: "",
            ogImage: null,
            ogUrl: null,
            ogType: "article"
        },
        keywords: null,
        metaRobots: 'index, follow',
        metaViewport: 'width=device-width, initial-scale=1.0',
        canonicalURL: null,
        structuredData: '{ "@context": "https://schema.org", "@type": "Article" }',
    }),
    key: z.string().optional(), // User key
});

// --- Type Definitions ---

// Type for the main blog creation payload (sent within 'data' object)
export type CreateBlogPayload = {
    title: string;
    excerpt: string;
    slug: string;
    content?: string | null; // Content can be null or omitted if optional
    image?: number | null;
    categories?: number | null; // For creation, send a single ID
    authors?: number | null;
    tag?: TagComponent[]; // Array of tag component objects
    view?: number;
    Blog_status?: "draft" | "published" | "archived";
    seo_blog?: SeoBlogPayload | null;
    key?: string | null;
};


// Represents the actual Blog data structure as received from the API
export type Blog = {
    id: number;
    title: string;
    excerpt: string | null;
    slug: string;
    content: string | null;
    createdAt: string;
    updatedAt: string;
    publishedAt: string | null;
    locale?: string | null;
    key: string | null;
    view: number | null;
    Blog_status: "draft" | "published" | "archived";
    image?: UploadFile | null; // Populated media type
    categories?: { id: number; name: string }[] | null; // Array of category objects
    authors?: { id: number; name: string } | null; // Example structure
    tag?: TagComponent[] | null; // Populated component type
    seo_blog?: {
        id?: number; // SEO component might have its own ID
        metaTitle?: string | null;
        metaDescription?: string | null;
        metaImage?: UploadFile | null; // Populated media
        keywords?: string | null;
        metaRobots?: string | null;
        metaViewport?: string | null;
        canonicalURL?: string | null;
        structuredData?: string | null;
        openGraph?: {
            id?: number; // OG component might have its own ID
            ogTitle?: string | null;
            ogDescription?: string | null;
            ogImage?: UploadFile | null; // Populated media
            ogUrl?: string | null;
            ogType?: string | null;
        } | null;
    } | null;
};

// Type derived from Zod schema for the form values
export type BlogFormValues = z.infer<typeof blogFormSchema>;


// Utility function type for safely getting media URL from populated data
export type GetMediaUrlFunction = (mediaField: UploadFile | null | undefined) => string | null;

// Utility function type for safely getting media ID from populated data
export type GetMediaIdFunction = (mediaField: UploadFile | null | undefined) => number | null;

// Utility function type for safely getting tag values
export type GetTagValuesFunction = (tagField: TagComponent[] | null | undefined) => string[];

// Re-export for combined media data
export type { CombinedMediaData } from './media';

export { z }; // Export Zod itself if needed elsewhere

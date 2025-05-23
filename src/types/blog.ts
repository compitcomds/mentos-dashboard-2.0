
import type { Media } from './media';
import type { Categorie } from './category'; // Changed from BlogSet to Categorie
import type { User } from './auth';
import type { OtherTag } from './common';
import { z } from 'zod';

// --- Shared SEO and OpenGraph Types (Based on user-provided 'Shared') ---
export interface SharedOpenGraph {
  id?: number;
  ogTitle: string;
  ogDescription: string;
  ogImage?: Media | null; // API returns populated Media object
  ogUrl?: string | null;
  ogType?: string | null;
}

export interface SharedSeo {
  id?: number;
  metaTitle: string;
  metaDescription: string;
  metaImage?: Media | null; // API returns populated Media object
  openGraph?: SharedOpenGraph | null;
  keywords?: string | null;
  metaRobots?: string | null;
  metaViewport?: string | null;
  canonicalURL?: string | null;
  structuredData?: Record<string, any> | string | null; // API returns object, form uses string
}


// --- Zod Schema Definitions ---

// Zod schema for the OpenGraph component part (for form/payload)
export const openGraphSchema = z.object({
    id: z.number().optional(),
    ogTitle: z.string()
        .min(1, { message: "OG Title is required." })
        .max(70, { message: "OG Title must be at most 70 characters." }),
    ogDescription: z.string()
        .min(1, { message: "OG Description is required." })
        .max(200, { message: "OG Description must be at most 200 characters." }),
    ogImage: z.number().nullable().optional(), // Media ID for form/payload
    ogUrl: z.string().url({ message: "Invalid OG URL" }).nullable().optional(),
    ogType: z.string().nullable().optional().default('article'),
});
export type OpenGraphPayload = z.infer<typeof openGraphSchema>;


// Zod schema for the SEO component part (for form/payload)
export const seoBlogSchema = z.object({
    id: z.number().optional(),
    metaTitle: z.string()
        .min(1, { message: "Meta Title is required." })
        .max(60, { message: "Meta Title must be at most 60 characters." }),
    metaDescription: z.string()
        .min(50, { message: "Meta Description must be at least 50 characters." })
        .max(160, { message: "Meta Description must be at most 160 characters." }),
    metaImage: z.number().nullable().optional(), // Media ID for form/payload
    openGraph: openGraphSchema.default({ // Uses the OpenGraph Zod schema
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
            if (!val) return true;
            try { JSON.parse(val); return true; } catch { return false; }
        }, { message: "Invalid JSON format for Structured Data" }),
});
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
    content: z.string().optional().default('<p></p>'),
    image: z.number().nullable().optional(), // Media ID
    categories: z.number().nullable().optional(), // Category ID (single selection in form)
    author: z.string().nullable().optional(), // Author Name (string, as per new Blog type)
    sub_category: z.string().optional().nullable(), // New sub_category field
    tags: z.string().optional().default('')
        .refine((val) => {
            const tagCount = val ? val.split(',').map(tag => tag.trim()).filter(Boolean).length : 0;
            return tagCount <= 15;
        }, { message: "Maximum of 15 tags allowed." }),
    view: z.number().int().nonnegative().optional().default(0),
    Blog_status: z.enum(["draft", "published", "archived"]).optional().default("draft"),
    seo_blog: seoBlogSchema.optional(),
    tenent_id: z.string().optional(),
});
export type BlogFormValues = z.infer<typeof blogFormSchema>;


// --- API Type Definitions ---

// Type for the main blog creation/update payload
export type CreateBlogPayload = {
    title: string;
    excerpt: string;
    slug: string;
    content?: string | null;
    image?: number | null; // Media ID
    categories?: number | null; // Single Category ID for oneToOne relation
    author?: string | null; // Author name as string
    sub_category?: string | null; // New sub_category field
    tags?: OtherTag[]; // Array of { tag_value: string }
    view?: number;
    Blog_status?: "draft" | "published" | "archived";
    seo_blog?: SeoBlogPayload | null; // Payload uses Zod-derived type
    tenent_id: string;
    related_blogs?: number[] | null; // Array of Blog IDs for relations
    user?: number | null; // User ID for relation
};


// Represents the actual Blog data structure as received from the API
export type Blog = {
  id?: number;
  documentId?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  publishedAt?: Date | string | null;
  locale?: string | null;
  title?: string;
  tags?: OtherTag[] | null;
  view?: number;
  content?: string;
  excerpt?: string;
  slug: string;
  Blog_status?: "draft" | "published" | "archived";
  author?: string;
  image?: Media | null;
  tenent_id: string;
  sub_category?: string | null;
  seo_blog?: SharedSeo | null;
  categories?: Categorie | null; // Changed to single Categorie for oneToOne relation
  related_blogs?: Blog[] | null;
  user?: User | null;
};


// Utility function type for safely getting media URL from populated data
export type GetMediaUrlFunction = (mediaField: Media | null | undefined) => string | null;

// Utility function type for safely getting media ID from populated data
export type GetMediaIdFunction = (mediaField: Media | null | undefined) => number | null;

// Utility function type for safely getting tag values
export type GetTagValuesFunction = (tagField: OtherTag[] | null | undefined) => string[];

// Re-export for combined media data if needed by blog form/page
export type { CombinedMediaData, UploadFile } from './media';

export { z };

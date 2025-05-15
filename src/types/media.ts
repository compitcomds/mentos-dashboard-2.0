// src/types/media.ts
import type { OtherTag } from './common';

// Based on user-provided 'MediaFormat'
export interface MediaFormat {
  name: string;
  hash: string;
  ext: string;
  mime: string;
  width: number;
  height: number;
  size: number; // Assuming bytes, as formatBytes utility expects bytes
  path: string | null; // path can be null for some providers like S3
  url: string;
}

// Based on user-provided 'Media', replaces old 'UploadFile'
export interface Media {
  id: number;
  name: string;
  alternativeText: string | null; // Changed from alternativeText: string
  caption: string | null; // Changed from caption: string
  width: number | null; // Changed from width: number
  height: number | null; // Changed from height: number
  formats: {
    thumbnail?: MediaFormat; // Made formats optional
    small?: MediaFormat;
    medium?: MediaFormat;
    large?: MediaFormat;
  } | null; // formats can be null
  hash: string;
  ext: string;
  mime: string;
  size: number; // Assuming bytes
  url: string;
  previewUrl: string | null; // Changed from previewUrl: string
  provider: string;
  createdAt: Date | string; // Changed to allow string
  updatedAt: Date | string; // Changed to allow string
  // Fields not in user's Media but were in old UploadFile or might be useful:
  // documentId?: string;
  // publishedAt?: string | null;
  // locale?: string | null;
  // provider_metadata: any | null;
  // folderPath?: string;
  // sizeInBytes?: number; // If 'size' is not in bytes, this could be useful
}

// Based on user-provided 'WebMedia'
export interface WebMedia {
  id?: number; // Optional for creation/payloads
  documentId?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  publishedAt?: Date | string;
  locale?: string | null;
  name: string;
  alt?: string | null; // alt is optional
  tenent_id: string; // Changed from key
  tags?: OtherTag[] | null; // New field
  media: Media | null; // Relation to the Media type, can be null
  user?: any | null; // Using `any` for User if full User type from auth.ts isn't always populated
  category?: string; // New field
}

// Combined type often useful for display components like the table
export interface CombinedMediaData {
  webMediaId: number; // from WebMedia.id
  name: string; // from WebMedia.name
  alt: string | null; // from WebMedia.alt
  tenent_id: string; // from WebMedia.tenent_id (changed from key)
  createdAt: Date | string; // from WebMedia.createdAt
  updatedAt: Date | string; // from WebMedia.updatedAt
  publishedAt: Date | string | null; // from WebMedia.publishedAt

  // --- File related data from Media (WebMedia.media) ---
  fileId: number | null; // from Media.id (can be null if media is not populated)
  fileUrl: string | null; // from Media.url
  fileName: string | null; // from Media.name (original file name)
  mime: string | null; // from Media.mime
  size: number | null; // from Media.size (assuming bytes)
  thumbnailUrl: string | null; // Constructed from Media.formats.thumbnail.url or Media.url
  category?: string | null; // from WebMedia.category
  tags?: OtherTag[] | null; // from WebMedia.tags
}

// Type for updating web media metadata
export interface UpdateWebMediaPayload {
  name?: string; // Name is optional for update
  alt?: string | null;
  // category and tags could be added if updatable
}

// Type for creating a web media entry after upload
export interface CreateWebMediaPayload {
    name: string;
    alt: string | null;
    tenent_id: string; // Changed from key
    media: number; // The ID of the uploaded file (Media.id)
    category?: string; // Optional
    tags?: number[]; // Array of OtherTag IDs, if creating relations by ID
}

// Re-export UploadFile as Media for broader compatibility if needed,
// but prefer using Media directly.
export type UploadFile = Media;

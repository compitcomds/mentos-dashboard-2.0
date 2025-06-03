
// src/types/media.ts
import type { OtherTag } from './common';
import type { User } from './auth'; // Assuming User type is in auth.ts

// Based on user-provided 'MediaFormat'
export interface MediaFormat {
  name: string;
  hash: string;
  ext: string;
  mime: string;
  width: number;
  height: number;
  size: number; // Assuming bytes, as formatBytes utility expects bytes
  path: string | null;
  url: string;
}

// Based on user-provided 'Media', replaces old 'UploadFile'
export interface Media {
  id: number; // Numeric primary key
  documentId?: string; // Optional string identifier if you have one
  name: string;
  alternativeText: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  formats: {
    thumbnail?: MediaFormat;
    small?: MediaFormat;
    medium?: MediaFormat;
    large?: MediaFormat;
  } | null;
  hash: string;
  ext: string;
  mime: string;
  size: number; // Assuming bytes
  url: string;
  previewUrl: string | null;
  provider: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Based on user-provided 'WebMedia'
export interface WebMedia {
  id?: number; // Numeric primary key, optional as it might not be present on create responses before full population
  documentId?: string; // Optional string identifier
  createdAt?: Date | string;
  updatedAt?: Date | string;
  publishedAt?: Date | string | null; // publishedAt can be null
  locale?: string | null;
  name: string;
  alt?: string | null;
  tenent_id: string;
  tags?: OtherTag[] | null;
  media: Media | null; // Relation to the Media type, can be null
  user?: User | null;
  category?: string | null;
}

// Combined type often useful for display components like the table
export interface CombinedMediaData {
  webMediaId: number; // Numeric WebMedia.id
  webMediaDocumentId: string; // Optional if you have a separate string documentId
  name: string;
  alt: string | null;
  tenent_id: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  publishedAt: Date | string | null;

  // --- File related data from Media (WebMedia.media) ---
  fileId: number | null; // Numeric Media.id
  fileDocumentId: string | null; // Optional if Media has a separate string documentId
  fileUrl: string | null;
  fileName: string | null;
  mime: string | null;
  size: number | null;
  thumbnailUrl: string | null;
  category?: string | null;
  tags?: OtherTag[] | null;
}

// Type for updating web media metadata
export interface UpdateWebMediaPayload {
  name?: string;
  alt?: string | null;
  category?: string | null;
  tags?: { tag_value: string }[];
}

// Type for creating a web media entry after upload
export interface CreateWebMediaPayload {
    name: string;
    alt: string | null;
    tenent_id: string;
    media: number; // The ID of the uploaded file (Media.id), now number
    category?: string | null;
    tags?: { tag_value: string }[];
}

// Re-export UploadFile as Media for broader compatibility if needed,
// but prefer using Media directly.
export type UploadFile = Media;

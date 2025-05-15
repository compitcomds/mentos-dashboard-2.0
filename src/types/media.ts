
// Represents the structure of a file format object within Strapi's upload plugin response
export interface UploadFileFormat {
    name: string;
    hash: string;
    ext: string;
    mime: string;
    path: string | null;
    width: number | null;
    height: number | null;
    size: number; // Size in KB (as per sample, though Strapi docs often mention bytes)
    sizeInBytes?: number; // Add optional bytes field
    url: string;
  }
  
  // Represents the structure of a file object returned by Strapi's upload plugin (v5)
  // No 'attributes' wrapper based on user samples
  export interface UploadFile {
    id: number;
    documentId?: string; // Added from sample
    name: string;
    alternativeText: string | null;
    caption: string | null;
    width: number | null;
    height: number | null;
    formats: {
      thumbnail?: UploadFileFormat;
      small?: UploadFileFormat;
      medium?: UploadFileFormat;
      large?: UploadFileFormat;
    } | null;
    hash: string;
    ext: string;
    mime: string;
    size: number; // Size in KB (as per sample)
    sizeInBytes?: number; // Add optional bytes field
    url: string;
    previewUrl: string | null;
    provider: string;
    provider_metadata: any | null;
    folderPath?: string; // Added based on sample
    createdAt: string;
    updatedAt: string;
    publishedAt?: string | null; // Added based on sample
    locale?: string | null; // Added based on sample
  }
  
  // Represents the structure of the custom web_medias collection (Strapi v5)
  // No 'attributes' wrapper based on user samples
  export interface WebMedia {
    id: number;
    documentId?: string;
    name: string;
    alt: string | null;
    key: string | null;
    createdAt: string;
    updatedAt: string;
    publishedAt: string | null;
    locale: string | null;
    media?: UploadFile | null; // Relation, populated type
  }
  
  // Combined type often useful for display components like the table
  export interface CombinedMediaData {
    webMediaId: number;
    name: string;
    alt: string | null;
    key: string | null;
    createdAt: string; // from WebMedia
    updatedAt: string; // from WebMedia
    publishedAt: string | null; // from WebMedia
    // --- File related data ---
    fileId: number ;
    fileUrl: string ; // Full URL potentially constructed
    fileName: string; // Original file name from UploadFile
    mime: string ;
    size: number ; // Size (prefer sizeInBytes if available, fallback to KB)
    thumbnailUrl: string | null; // Full URL potentially constructed
  }
  
  // Type for updating web media metadata (no change needed for structure)
  export interface UpdateWebMediaPayload {
    name: string;
    alt: string | null;
  }
  
  // Type for creating a web media entry after upload (Strapi v5 format)
  // Expects data to be sent directly, no 'data' wrapper in payload
  export interface CreateWebMediaPayload {
      name: string;
      alt: string | null;
      key: string | null; // The unique identifier (e.g., hash from upload response)
      media: number; // The ID of the uploaded file (used for relation)
  }
  
      
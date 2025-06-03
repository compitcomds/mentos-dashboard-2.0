
import type { User } from './auth';
import type { Media } from './media';
import type { OtherTag } from './common';

// Base interface for all dynamic zone components
export interface DynamicComponentBase {
  id: number; // Strapi assigns an ID to each component instance in a DZ
  __component: string; // Strapi's identifier, e.g., "dynamic-component.text-field"
  label?: string | null;
  description?: string | null;
  placeholder?: string | null;
  required?: boolean | null;
  is_array?: boolean | null; // Indicates if this component instance itself can have multiple values
}

// --- Text Field Component ---
export interface DynamicComponentTextField extends DynamicComponentBase {
  __component: "dynamic-component.text-field";
  min?: number | null;
  max?: number | null;
  default?: string | null;
  inputType?: "default" | "tip-tap" | "email" | null;
}

// --- Number Field Component ---
export interface DynamicComponentNumberField extends DynamicComponentBase {
  __component: "dynamic-component.number-field";
  type?: "integer" | "float" | "decimal" | null;
  min?: number | null;
  max?: number | null;
  default?: string | null; // Strapi might store numeric defaults as strings
}

// --- Media Field Component ---
export interface DynamicComponentMediaField extends DynamicComponentBase {
  __component: "dynamic-component.media-field";
  // is_array is inherited from DynamicComponentBase. If a media field *always* has this explicitly defined (e.g. not optional), it could be `is_array: boolean;` here.
  // For payload, it would be the media ID(s).
  media?: Media | null; // This would be populated. For payload, it'd be an ID.
  type?: 'image' | 'video' | 'pdf' | 'media' | 'other' | null; // Added type for media classification
}

// --- Enum Field Component ---
export interface DynamicComponentEnumField extends DynamicComponentBase {
  __component: "dynamic-component.enum-field";
  Values?: OtherTag[] | null; // Array of { id?, tag_value? }
  default?: string | null;
  type?: "single-select" | "multi-select" | null;
}

// --- Date Field Component ---
export interface DynamicComponentDateField extends DynamicComponentBase {
  __component: "dynamic-component.date-field";
  // Strapi schema has "data&time", assuming it maps to "datetime" conceptually
  type?: "date" | "time" | "datetime" | "data&time" | null;
  default?: string | null; // Dates can have defaults
}

// --- Boolean Field Component ---
export interface DynamicComponentBooleanField extends DynamicComponentBase {
  __component: "dynamic-component.boolean-field";
  default?: string | null; // Strapi might store boolean default as string "true"/"false"
}

// Union type for any component that can be in the 'from_formate' dynamic zone
export type FormFormatComponent =
  | DynamicComponentTextField
  | DynamicComponentNumberField
  | DynamicComponentMediaField
  | DynamicComponentEnumField
  | DynamicComponentDateField
  | DynamicComponentBooleanField;

// --- Main MetaFormat Interface ---
export interface MetaFormat {
  id?: number;
  documentId?: string; // If you use a separate string ID in addition to numeric id
  createdAt?: Date | string;
  updatedAt?: Date | string;
  publishedAt?: Date | string | null; // Aligning with draftAndPublish: true
  locale?: string | null;
  name?: string | null;
  tenent_id?: string | null; // Making optional as not all fields are 'required' in Strapi schema
  user?: User | null;
  description?: string | null;
  from_formate?: FormFormatComponent[] | null; // Dynamic zone is an array of components
  url?: string | null;
  placing?: "sidebar" | "page" | "both" | null;
}

// Payload for creating/updating MetaFormat entities
// For dynamic zones, the payload structure can be complex.
// Often, you send an array of objects, each with __component and its specific attributes.
// For relations (like Media in MediaField), you'd send the ID.
export interface CreateMetaFormatPayload {
  name?: string | null;
  tenent_id?: string | null;
  user?: number | null; // User ID for relation
  description?: string | null;
  // For `from_formate`, the payload would be an array of component data.
  // Example for a text field: { __component: "dynamic-component.text-field", lable: "Your Name", ... }
  // Example for a media field: { __component: "dynamic-component.media-field", label: "Profile Picture", media: MEDIA_ID_HERE }
  from_formate?: (Omit<Partial<FormFormatComponent>, 'id' | 'media'> & { __component: string; media?: number | null })[] | null;
  url?: string | null;
  placing?: "sidebar" | "page" | "both" | null;
}

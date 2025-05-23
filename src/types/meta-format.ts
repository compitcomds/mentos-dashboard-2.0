
import type { User } from './auth';
import type { Media } from './media';
import type { OtherTag } from './common';

// Base interface for all dynamic zone components
export interface DynamicComponentBase {
  id: number; // Strapi assigns an ID to each component instance in a DZ
  __component: string; // Strapi's identifier, e.g., "dynamic-component.text-field"
}

// --- Text Field Component ---
export interface DynamicComponentTextField extends DynamicComponentBase {
  __component: "dynamic-component.text-field";
  label?: string | null; // Corrected from lable
  min?: number | null;
  max?: number | null;
  default?: string | null;
  required?: boolean | null;
  placeholder?: string | null;
  inputType?: "default" | "tip-tap" | "email" | null;
}

// --- Number Field Component ---
export interface DynamicComponentNumberField extends DynamicComponentBase {
  __component: "dynamic-component.number-field";
  label?: string | null;
  type?: "integer" | "float" | "decimal" | null;
  min?: number | null;
  max?: number | null;
  default?: string | null; // Strapi might store numeric defaults as strings
  required?: boolean | null;
  placeholder?: string | null;
}

// --- Media Field Component ---
export interface DynamicComponentMediaField extends DynamicComponentBase {
  __component: "dynamic-component.media-field";
  label?: string | null;
  placeholder?: string | null;
  required?: boolean | null;
  // In Strapi, a media field within a component usually holds a relation to one or more Media items.
  // When fetched with population, this would be a Media object or Media[].
  // For payload, it would be the media ID(s).
  // Let's assume for now it holds a single Media relation when populated.
  media?: Media | null; // This would be populated. For payload, it'd be an ID.
}

// --- Enum Field Component ---
export interface DynamicComponentEnumField extends DynamicComponentBase {
  __component: "dynamic-component.enum-field";
  Values?: OtherTag[] | null; // Array of { id?, tag_value? }
  label?: string | null;
  default?: string | null;
  placeholder?: string | null;
  type?: "single-select" | "multi-select" | null;
}

// --- Date Field Component ---
export interface DynamicComponentDateField extends DynamicComponentBase {
  __component: "dynamic-component.date-field";
  label?: string | null; // Corrected from lable
  // Strapi schema has "data&time", assuming it maps to "datetime" conceptually
  type?: "date" | "time" | "datetime" | "data&time" | null;
}

// --- Boolean Field Component ---
export interface DynamicComponentBooleanField extends DynamicComponentBase {
  __component: "dynamic-component.boolean-field";
  label?: string | null;
  default?: string | null; // Strapi might store boolean default as string "true"/"false"
  placeholder?: string | null;
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

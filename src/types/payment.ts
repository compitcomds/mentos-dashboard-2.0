
import type { User } from './auth'; // Import the User type
import type { Blog } from './blog';   // This will no longer be used for Payment.user but kept if used elsewhere
import type { BillingItem } from './common'; // Import BillingItem

// Updated interface based on provided schema
export interface Payment {
  id?: number;
  documentId?: string; // If you use a string document ID
  createdAt?: Date | string;
  updatedAt?: Date | string;
  publishedAt?: Date | string | null; // draftAndPublish is true
  locale?: string | null;

  user?: User | null; // Changed from Blog | null to User | null

  tenent_id: string; // Kept as mandatory for frontend filtering logic
  Items?: BillingItem[] | null; // Array of BillingItem components
  Billing_From?: Date | string | null; // Dates can be null
  Billing_To?: Date | string | null;   // Dates can be null
  Payment_Status?: "Pay" | "Unpaid" | "Wave off" | "Processing" | null;
  Last_date_of_payment?: Date | string | null; // Dates can be null
}

// Consider adding payload types if you ever need to create/update payments from frontend
// export interface CreatePaymentPayload { ... }
// export interface UpdatePaymentPayload { ... }

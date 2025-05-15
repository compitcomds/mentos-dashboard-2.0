
import * as z from 'zod';

// Schema for the registration form UI
export const registerSchema = z
  .object({
    full_name: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
    email: z.string().email({ message: 'Please enter a valid email address.' }),
    // Phone is string in form, allow empty, service layer handles conversion
    phone: z.string().min(10, { message: 'Phone number seems too short.' }).max(15, { message: 'Phone number seems too long.' }).optional().or(z.literal('')),
    // Address is string in form, allow empty
    address: z.string().min(5, { message: 'Address must be at least 5 characters.' }).optional().or(z.literal('')),
    password: z
      .string()
      .min(6, { message: 'Password must be at least 6 characters.' }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'], // path of error
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;


// Schema for the login form UI
export const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(1, { message: 'Password cannot be empty.' }),
  // remember: z.boolean().optional(), // Add if 'Remember Me' is implemented
});

export type LoginFormValues = z.infer<typeof loginSchema>;

// --- API Payload and Response Types ---

// Payload expected by the /api/auth/local/register endpoint
// Based on user's provided service code
export interface RegisterPayload {
    username: string;
    email: string;
    password: string;
    full_name?: string; // Optional: include if API accepts directly
    phone?: number | string; // Allow string initially, convert in service if needed
    address?: string;     // Optional: include if API accepts directly
    key?: string; // User specific key
}

// Structure of the response from the /api/auth/local/register endpoint
// Based on user's provided service code
export interface RegisterResponse {
    jwt: string;
    user: User; // Use the User interface
    message?: string; // Optional success message from API
    status?: number;
}


// Structure of the response from the /api/auth/local (login) endpoint
// Based on user's provided service code and typical Strapi responses
export interface LoginResponse {
    jwt: string;
    user: User; // Use the User interface
    message?: string; // Optional success message from API
    data?: { // Keep data structure for consistency with TanStack hook usage in components
        accessToken: string;
        accessTokenExpiry: string;
        user?: User; // Use the User interface
    };
    status?: number;
}


// Payload for the /api/auth/forgot-password endpoint
export interface ForgotPasswordPayload {
  email: string;
}

// Payload for the /api/auth/reset-password endpoint
// Based on user's provided service code
export interface ResetPasswordPayload {
  code: string; // The reset token/code from the email link
  password: string;
  passwordConfirmation: string;
}

// Generic response type for simple API messages (e.g., forgot password success)
export interface GenericResponse {
    message: string;
    status?: number;
    // other potential fields
}

// Optional: Define a more specific User type if needed across the app
export interface User {
    id: number;
    username: string;
    email: string;
    provider?: string;
    confirmed?: boolean;
    blocked?: boolean;
    createdAt?: string;
    updatedAt?: string;
    publishedAt?: string | null;
    full_name?: string;
    phone?: string | number; // Use string if displaying, number if processing
    address?: string;
    tenent_id?: string; // Add the key field
    // Add other relevant user fields (e.g., role)
}

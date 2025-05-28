import type { Role } from './common'; // Import Role
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

// Schema for the profile update form UI
export const profileSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters.').optional().or(z.literal('')),
  email: z.string().email('Invalid email address.').optional(), // Email might not be updatable
  phone: z.string().min(10, 'Phone number seems too short.').max(15, 'Phone number seems too long.').optional().or(z.literal('')),
  address: z.string().min(5, 'Address must be at least 5 characters.').optional().or(z.literal('')),
});
export type ProfileFormValues = z.infer<typeof profileSchema>;


// Schema for the change password form UI
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, { message: "Current password is required." }),
  password: z.string().min(6, { message: "New password must be at least 6 characters." }),
  passwordConfirmation: z.string().min(6, { message: "Password confirmation must be at least 6 characters." }),
}).refine(data => data.password === data.passwordConfirmation, {
  message: "New passwords don't match",
  path: ["passwordConfirmation"],
});
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;


// --- API Payload and Response Types ---

// Payload expected by the /api/auth/local/register endpoint
export interface RegisterPayload {
    username: string;
    email: string;
    password: string;
    full_name?: string;
    phone?: number | string; // Service layer handles conversion to number if needed by API
    address?: string;
    tenent_id?: string;
}

// Structure of the response from the /api/auth/local/register endpoint
export interface RegisterResponse {
    jwt: string;
    user: User;
    message?: string;
    status?: number;
}


// Structure of the response from the /api/auth/local (login) endpoint
export interface LoginResponse {
    jwt: string;
    user: User;
    message?: string;
    data?: { // This structure might be specific to older Strapi or custom setups
        accessToken: string;
        accessTokenExpiry: string;
        user?: User;
    };
    status?: number;
}


// Payload for the /api/auth/forgot-password endpoint
export interface ForgotPasswordPayload {
  email: string;
}

// Payload for the /api/auth/reset-password endpoint
export interface ResetPasswordPayload {
  code: string; // The reset token/code from the email link
  password: string;
  passwordConfirmation: string;
}

// Payload for the /api/auth/change-password endpoint
export interface ChangePasswordPayload {
    currentPassword: string;
    password: string;
    passwordConfirmation: string;
}


// Generic response type for simple API messages (e.g., forgot password success)
export interface GenericResponse {
    message?: string; // Make message optional as some Strapi responses might not have it directly
    status?: number;
    // Strapi sometimes returns errors in a nested structure
    error?: {
        status: number;
        name: string;
        message: string;
        details?: any;
    };
}

// Updated User type based on user's provided interface and app needs
export interface User {
    id?: number; // Strapi User ID is numeric
    username: string;
    email: string;
    provider?: string;
    confirmed?: boolean;
    blocked?: boolean;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    role?: Role | null | number; // Role can be object or ID
    tenent_id?: string; // Custom field for multi-tenancy
    full_name?: string | null; // Custom field for full name
    phone?: string | number | null; // Custom field for phone
    address?: string | null; // Custom field for address
}

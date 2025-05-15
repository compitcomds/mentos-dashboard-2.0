
'use server'; // Keep this for server actions if used, but note global var access implies client-side potential too

import { getAccessToken, setAccessToken } from "@/lib/actions/auth"; // Use server actions for cookies/preview simulation
import axiosInstance from "@/lib/axios";
import type {
    LoginFormValues,
    RegisterFormValues,
    RegisterPayload,
    LoginResponse,
    RegisterResponse,
    ForgotPasswordPayload,
    ResetPasswordPayload,
    GenericResponse, // Assuming a generic response type for simple messages
} from "@/types/auth";

// Access global variable for preview debugging
declare global {
    var tempJwt: string | undefined;
}


// Helper function to update user details after registration (internal use)
// This function assumes the user is now authenticated with the token set by registerUser
async function updateUserDeatils(id: number, data: Partial<RegisterPayload>): Promise<void> {
    // Remove fields not updatable or not relevant for update
    const { email, password, username, ...updateData } = data;
    // Ensure phone is a number if present
    if (updateData.phone && typeof updateData.phone === 'string') {
      updateData.phone = parseInt(updateData.phone, 10);
      if (isNaN(updateData.phone)) delete updateData.phone; // Remove if parsing failed
    } else if (updateData.phone === undefined || updateData.phone === null) {
       delete updateData.phone; // Remove if null/undefined
    }

    // Add authorization header with the token obtained during registration/login
    let token = await getAccessToken(); // Use let to allow reassignment
    if (!token) {
        // Fallback for preview environments: Check global variable if cookie fails
        // This part might be less relevant now with hardcoded token in getAccessToken
        /*
        if (typeof window !== 'undefined' && window.tempJwt) {
             console.warn("updateUserDetails: Cookie token not found, using global tempJwt (for preview).");
             token = window.tempJwt; // Reassign token if found in global var
        } else {
            throw new Error("No access token found (cookie or global) for updating user details.");
        }
        */
       throw new Error("No access token found (getAccessToken returned nothing) for updating user details.");
    }

    try {
        console.log("Attempting to update user details with token:", token ? 'Token exists' : 'No token');
        await axiosInstance.put(`/users/${id}`, updateData, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        console.log("User details updated successfully for ID:", id);
    } catch (error: any) {
        console.error("Failed to update user details:", error.response?.data || error.message);
        // Decide if this error should prevent the registration from succeeding overall
        // For now, we log it but let the registration proceed
        // throw new Error("Failed to update user details after registration."); // Uncomment to make update failure critical
    }
}


export async function registerUser(data: RegisterFormValues): Promise<RegisterResponse> {
    const { confirmPassword, phone, ...formData } = data;

    // Payload for the initial registration endpoint
    const registerPayload: RegisterPayload = {
        email: formData.email,
        password: formData.password,
        username: formData.email, // Using email as username
    };

    console.log("Attempting registration with payload:", registerPayload);
    const response = await axiosInstance.post<RegisterResponse>("/auth/local/register", registerPayload);
    console.log("Registration API response:", response.data);

    // Assuming registration response includes JWT and user ID
    const jwt = response.data.jwt;
    const userId = response.data.user?.id;

    if (!jwt || !userId) {
        throw new Error("Registration response did not include JWT or user ID.");
    }

    // Set the access token cookie via Server Action (COMMENTED OUT FOR PREVIEW)
    /*
    try {
        // Use a default expiry or logic based on your API/requirements for registration token
        // Setting a short expiry might be suitable if email verification is needed
        await setAccessToken(jwt); // Let server action handle expiry logic (default to session or short duration)
        console.log("Access token cookie setting initiated via server action.");
        // Set global variable as well for preview debugging
        if (typeof window !== 'undefined') {
            window.tempJwt = jwt;
            console.log("JWT stored in global var (tempJwt) after registration.");
        }
    } catch (cookieError) {
        console.error("Failed to set access token cookie via server action:", cookieError);
        // Store in global for preview if cookie fails
         if (typeof window !== 'undefined') {
            window.tempJwt = jwt;
            console.warn("Stored JWT in global tempJwt due to cookie setting error (for preview).");
        }
    }
    */
   // Simulate setting token for preview (using the preview-specific setAccessToken)
   await setAccessToken(jwt);

    // Prepare data for the user details update
    const userDetailsPayload: Partial<RegisterPayload> = {
        full_name: formData.full_name,
        address: formData.address,
        phone: phone // Keep as string initially, updateUserDeatils handles conversion
    };

    console.log("Attempting to update user details for ID:", userId, "with data:", userDetailsPayload);
    // Update user details with the remaining fields using the obtained JWT
    // This relies on the token being available (either cookie or global fallback or hardcoded)
    await updateUserDeatils(userId, userDetailsPayload); // Call internal helper

    // Return the original API registration response data
    return response.data;
}


export async function loginUser(data: LoginFormValues): Promise<LoginResponse> {
    // The API expects 'identifier' (which is the email) and 'password'
    const loginPayload = {
        identifier: data.email,
        password: data.password,
    };

    const response = await axiosInstance.post<LoginResponse>("/auth/local", loginPayload);
    console.log("Login API Response Data:", response.data); // Log the raw response

    // Extract token and user from response data
    const { jwt, user } = response.data;

    if (jwt) {
         // Use a default expiry (e.g., 7 days)
         const expiryDurationSeconds = 3600 * 24 * 7;
         // --- COMMENTED OUT FOR PREVIEW ---
         /*
        try {
             await setAccessToken(jwt, expiryDurationSeconds); // Store token with expiry via server action
             console.log("Access token cookie setting initiated via server action.");
              // Set global variable as well for preview debugging
            if (typeof window !== 'undefined') {
                window.tempJwt = jwt;
                console.log("JWT stored in global var (tempJwt) after login.");
            }
        } catch (cookieError) {
            console.error("Failed to set access token cookie via server action:", cookieError);
             // Optionally store in global for preview if cookie fails
             if (typeof window !== 'undefined') {
                window.tempJwt = jwt;
                console.warn("Stored JWT in global tempJwt due to cookie setting error (for preview).");
            }
        }
        */
        // Simulate setting token for preview (using the preview-specific setAccessToken)
        await setAccessToken(jwt, expiryDurationSeconds);

    } else {
        console.error("Login response did not include JWT.");
        throw new Error("Login response did not include JWT.");
    }

    // IMPORTANT: Return the *original* response data from the API directly.
    // The calling component (`LoginPage`) now expects the raw `jwt` field.
    // We no longer need to adapt it to the previous `data: { accessToken, ... }` structure.
    return response.data;
}

// Corresponds to user's provided code
export async function forgotPassword(data: ForgotPasswordPayload): Promise<GenericResponse> {
    const response = await axiosInstance.post<GenericResponse>(`/auth/forgot-password`, data);
    return response.data; // Assuming API returns { message: string } or similar
}

// Corresponds to user's provided code
export async function resetPassword(data: ResetPasswordPayload): Promise<LoginResponse> { // Assuming reset also returns JWT like login
    const response = await axiosInstance.post<LoginResponse>(`/auth/reset-password`, data);
    console.log("Reset Password API Response Data:", response.data); // Log the raw response

    // Assuming the response contains a new JWT after successful reset
    const { jwt, user } = response.data;

    if (jwt) {
         // Use a default expiry for reset password token
        const expiryDurationSeconds = 3600; // 1 hour default
        // --- COMMENTED OUT FOR PREVIEW ---
        /*
        try {
            await setAccessToken(jwt, expiryDurationSeconds);
            console.log("Access token cookie setting initiated via server action after reset.");
             // Set global variable as well for preview debugging
            if (typeof window !== 'undefined') {
                window.tempJwt = jwt;
                console.log("JWT stored in global var (tempJwt) after password reset.");
            }
        } catch (cookieError) {
            console.error("Failed to set access token cookie via server action after reset:", cookieError);
             // Optionally store in global for preview if cookie fails
             if (typeof window !== 'undefined') {
                window.tempJwt = jwt;
                console.warn("Stored JWT in global tempJwt due to cookie setting error after reset (for preview).");
            }
        }
        */
       // Simulate setting token for preview (using the preview-specific setAccessToken)
       await setAccessToken(jwt, expiryDurationSeconds);

    } else {
         console.error("Reset password response did not include JWT.");
         throw new Error("Reset password response did not include JWT.");
    }

    // Return the original API response data.
    return response.data;
}

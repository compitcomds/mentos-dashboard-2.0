
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
    ChangePasswordPayload, // Added
    GenericResponse,
} from "@/types/auth";

// Access global variable for preview debugging
declare global {
    var tempJwt: string | undefined;
}


// Helper function to update user details after registration (internal use)
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

    let token = await getAccessToken();
    if (!token) {
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

    const registerPayload: RegisterPayload = {
        email: formData.email,
        password: formData.password,
        username: formData.email,
    };

    console.log("Attempting registration with payload:", registerPayload);
    const response = await axiosInstance.post<RegisterResponse>("/auth/local/register", registerPayload);
    console.log("Registration API response:", response.data);

    const jwt = response.data.jwt;
    const userId = response.data.user?.id;

    if (!jwt || !userId) {
        throw new Error("Registration response did not include JWT or user ID.");
    }

   await setAccessToken(jwt);

    const userDetailsPayload: Partial<RegisterPayload> = {
        full_name: formData.full_name,
        address: formData.address,
        phone: phone
    };

    console.log("Attempting to update user details for ID:", userId, "with data:", userDetailsPayload);
    await updateUserDeatils(userId, userDetailsPayload);

    return response.data;
}


export async function loginUser(data: LoginFormValues): Promise<LoginResponse> {
    const loginPayload = {
        identifier: data.email,
        password: data.password,
    };

    const response = await axiosInstance.post<LoginResponse>("/auth/local", loginPayload);
    console.log("Login API Response Data:", response.data);

    const { jwt } = response.data;

    if (jwt) {
         const expiryDurationSeconds = 3600 * 24 * 7;
        await setAccessToken(jwt, expiryDurationSeconds);
    } else {
        console.error("Login response did not include JWT.");
        throw new Error("Login response did not include JWT.");
    }
    return response.data;
}

export async function forgotPassword(data: ForgotPasswordPayload): Promise<GenericResponse> {
    const response = await axiosInstance.post<GenericResponse>(`/auth/forgot-password`, data);
    return response.data;
}

export async function resetPassword(data: ResetPasswordPayload): Promise<LoginResponse> {
    const response = await axiosInstance.post<LoginResponse>(`/auth/reset-password`, data);
    console.log("Reset Password API Response Data:", response.data);

    const { jwt } = response.data;

    if (jwt) {
        const expiryDurationSeconds = 3600;
       await setAccessToken(jwt, expiryDurationSeconds);
    } else {
         console.error("Reset password response did not include JWT.");
         throw new Error("Reset password response did not include JWT.");
    }
    return response.data;
}

export async function changePassword(payload: ChangePasswordPayload): Promise<GenericResponse> {
    console.log('[Service changePassword]: Attempting to change password...');
    const headers = await getAccessToken().then(token => {
        if (!token) throw new Error("Authentication token not found for changing password.");
        return { Authorization: `Bearer ${token}` };
    });

    // Strapi expects the payload directly, not wrapped in a "data" object for this endpoint.
    const response = await axiosInstance.post<GenericResponse>('/auth/change-password', payload, { headers });
    console.log('[Service changePassword]: Password change response:', response.data);
    return response.data;
}

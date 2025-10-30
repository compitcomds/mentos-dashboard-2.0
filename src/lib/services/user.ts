"use server";

import axiosInstance from "@/lib/axios";
import { getAccessToken, removeAccessToken } from "@/lib/actions/auth";
import type { User, ProfileFormValues } from "@/types/auth"; // Import the User type

export async function fetchCurrentUser(): Promise<User> {
  console.log(
    "[Service fetchCurrentUser]: Attempting to fetch current user..."
  );
  let token = await getAccessToken();

  if (!token) {
    console.error(
      "[Service fetchCurrentUser]: No access token found (getAccessToken returned nothing). Cannot fetch user."
    );
    throw new Error("Authentication token not found. Please log in.");
  }

  console.log(
    `[Service fetchCurrentUser]: Found token (source: ${
      process.env.NODE_ENV !== "production" ? "hardcoded/preview" : "cookie"
    }). Making request to /users/me.`
  );

  try {
    const response = await axiosInstance.get<User>("/users/me?populate=role", {
      // Added populate=role
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log(
      "[Service fetchCurrentUser]: User data fetched successfully:",
      response.data
    );

    if (
      typeof response.data.tenent_id !== "string" ||
      !response.data.tenent_id
    ) {
      console.warn(
        '[Service fetchCurrentUser]: User data fetched, but "tenent_id" field is missing or not a string.'
      );
    }

    return response.data;
  } catch (error: any) {
    console.error(
      "[Service fetchCurrentUser]: Failed to fetch user data:",
      error.response?.data || error.message
    );
    removeAccessToken();
    if (error.response?.status === 401) {
      throw new Error("Unauthorized: Invalid or expired token.");
    } else if (error.response?.status === 403) {
      throw new Error(
        "Forbidden: You do not have permission to access this resource."
      );
    } else {
      throw new Error(`Failed to fetch user data: ${error.message}`);
    }
  }
}

export async function updateUserProfile(
  id: number,
  payload: Partial<ProfileFormValues>
): Promise<User> {
  console.log(
    `[Service updateUserProfile]: Attempting to update user ID ${id}...`
  );
  const token = await getAccessToken();
  if (!token) {
    throw new Error(
      "Authentication token not found for updating user profile."
    );
  }

  // Prepare payload: remove email (usually not updatable here)
  // and ensure 'phone' is converted to number if string and valid.
  const { email, phone, ...updateData } = payload;
  const dataToSend: any = { ...updateData };

  if (phone !== undefined && phone !== null && phone !== "") {
    const numericPhone = parseInt(String(phone), 10);
    if (!isNaN(numericPhone)) {
      dataToSend.phone = numericPhone;
    } else {
      console.warn(
        `[Service updateUserProfile]: Invalid phone number "${phone}" provided, omitting from update.`
      );
    }
  } else if (phone === "" || phone === null) {
    dataToSend.phone = null; // Allow clearing the phone number by sending null
  }

  console.log(
    `[Service updateUserProfile]: Updating user ID ${id} with payload:`,
    dataToSend
  );

  try {
    // Strapi expects the payload directly, not wrapped in "data" for user updates.
    const response = await axiosInstance.put<User>(`/users/${id}`, dataToSend, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log(
      `[Service updateUserProfile]: User ID ${id} updated successfully:`,
      response.data
    );
    return response.data;
  } catch (error: any) {
    const errorMessage =
      error.response?.data?.error?.message ||
      error.message ||
      `Failed to update user profile for ID ${id}.`;
    console.error(
      `[Service updateUserProfile]: Failed to update user ID ${id}:`,
      errorMessage,
      error.response?.data
    );
    throw new Error(errorMessage);
  }
}

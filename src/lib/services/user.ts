
'use server';

import axiosInstance from '@/lib/axios';
import { getAccessToken } from '@/lib/actions/auth';
import type { User } from '@/types/auth'; // Import the User type

/**
 * Fetches the details of the currently authenticated user, including their unique key.
 * Retrieves the access token (from cookie or hardcoded preview token) and sends it in the Authorization header.
 * @returns {Promise<User>} A promise that resolves with the user data (including the 'key').
 * @throws {Error} If no access token is found or if the API request fails.
 */
export async function fetchCurrentUser(): Promise<User> {
  console.log('[Service fetchCurrentUser]: Attempting to fetch current user...');
  let token = await getAccessToken(); // Will return hardcoded token in preview

  if (!token) {
     console.error("[Service fetchCurrentUser]: No access token found (getAccessToken returned nothing). Cannot fetch user.");
     throw new Error("Authentication token not found. Please log in.");
  }

  console.log(`[Service fetchCurrentUser]: Found token (source: ${process.env.NODE_ENV !== 'production' ? 'hardcoded/preview' : 'cookie'}). Making request to /users/me.`);

  try {
    // Add populate parameters if 'key' or other needed fields are in relations
    // Example: ?populate=role,keyRelationField (Adjust based on your Strapi structure)
    const response = await axiosInstance.get<User>('/users/me', {
        // params: { // Uncomment and adjust if population is needed
        //     populate: '*' // Or specify fields like 'keyRelationField'
        // },
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    console.log('[Service fetchCurrentUser]: User data fetched successfully:', response.data);

    // Verify that the key field is present in the response
    if (typeof response.data.tenent_id !== 'string' || !response.data.tenent_id) {
        console.warn('[Service fetchCurrentUser]: User data fetched, but "key" field is missing or not a string.');
        // Depending on requirements, you might throw an error here or proceed with caution
        // throw new Error('User key is missing from the fetched user data.');
    }

    return response.data;
  } catch (error: any) {
    console.error('[Service fetchCurrentUser]: Failed to fetch user data:', error.response?.data || error.message);
    // Rethrow a more specific error or handle based on status code
    if (error.response?.status === 401) {
        throw new Error("Unauthorized: Invalid or expired token.");
    } else if (error.response?.status === 403) {
        throw new Error("Forbidden: You do not have permission to access this resource.");
    } else {
        throw new Error(`Failed to fetch user data: ${error.message}`);
    }
  }
}

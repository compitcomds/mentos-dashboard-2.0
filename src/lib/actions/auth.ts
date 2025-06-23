'use server';

import { cookies } from 'next/headers';
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'; // Use type if needed, but explicit object works

// Read environment variables
const PREVIEW_TOKEN = process.env.NEXT_PUBLIC_JWT_PREVIEW_TOKEN;
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || 'production'; // Default to production if not set
const USE_PREVIEW_TOKEN = ENVIRONMENT === 'development'; // Use preview token only in development

// Access global variable for preview debugging
declare global {
    var tempJwt: string | undefined;
}

// --- Cookie setting logic (Conditionally active based on environment) ---
export async function setAccessToken(accessToken: string, expirySeconds?: string | number) {
  if (USE_PREVIEW_TOKEN) {
    // Simulate setting token for preview (using the global var)
    console.log('[Server Action setAccessToken - PREVIEW MODE]: Simulating token set. Using global var if available.');
     if (typeof window !== 'undefined') {
        (window as any).tempJwt = accessToken;
        console.log('[Server Action setAccessToken - PREVIEW MODE]: JWT stored in global var (tempJwt).');
    } else {
        console.warn('[Server Action setAccessToken - PREVIEW MODE]: window object not available, cannot set global var.');
    }
  } else {
    // --- Actual cookie setting logic for Production ---
    console.log('[Server Action setAccessToken - PRODUCTION]: Setting access token cookie...');
    const options: ResponseCookie = {
      name: 'accessToken', // Add the name of the cookie
      value: accessToken, // Add the value of the cookie
      secure: true, // Always secure in production
      httpOnly: true,
      sameSite: 'strict',
      path: '/',
    };

    if (expirySeconds) {
      const maxAge = typeof expirySeconds === 'string' ? parseInt(expirySeconds, 10) : expirySeconds;
      if (!isNaN(maxAge)) {
        options.maxAge = maxAge;
        options.expires = new Date(Date.now() + maxAge * 1000);
        console.log(`[Server Action setAccessToken - PRODUCTION]: Cookie set with maxAge: ${maxAge} seconds`);
      } else {
        console.warn(`[Server Action setAccessToken - PRODUCTION]: Invalid expirySeconds provided: ${expirySeconds}. Cookie will be session-based.`);
      }
    } else {
      console.log('[Server Action setAccessToken - PRODUCTION]: No expiry provided. Cookie will be session-based.');
    }

    try {
      const cookieStore = cookies();
      (await cookieStore).set('accessToken', accessToken, options);
      console.log('[Server Action setAccessToken - PRODUCTION]: Cookie successfully set.');
    } catch (error) {
      console.error('[Server Action setAccessToken - PRODUCTION]: Error setting cookie:', error);
      throw error;
    }
  }
}

// --- Modified getAccessToken ---
export async function getAccessToken(): Promise<string | undefined> {
  if (USE_PREVIEW_TOKEN && PREVIEW_TOKEN) {
    console.log('[Server Action getAccessToken - PREVIEW]: Returning preview token from ENV var.');
    return PREVIEW_TOKEN;
  }

  // --- Original cookie retrieval logic (for production) ---
  console.log('[Server Action getAccessToken - PRODUCTION]: Attempting to retrieve access token cookie...');
  try {
      const cookieStore = cookies();
      const tokenCookie = (await cookieStore).get('accessToken');
      const token = tokenCookie?.value;
      console.log(`[Server Action getAccessToken - PRODUCTION]: Cookie retrieved. Found: ${token ? 'Yes' : 'No'}.`);
      return token;
  } catch (error) {
      console.error('[Server Action getAccessToken - PRODUCTION]: Error retrieving cookie:', error);
      return undefined;
  }
}

// --- Cookie removal logic (Conditionally active) ---
export async function removeAccessToken() {
  if (USE_PREVIEW_TOKEN) {
    // Simulate removing token for preview (clearing the global var)
    console.log('[Server Action removeAccessToken - PREVIEW MODE]: Simulating token removal. Clearing global var if available.');
      if (typeof window !== 'undefined') {
        (window as any).tempJwt = undefined;
        console.log('[Server Action removeAccessToken - PREVIEW MODE]: Global tempJwt cleared.');
    } else {
         console.warn('[Server Action removeAccessToken - PREVIEW MODE]: window object not available, cannot clear global var.');
    }
  } else {
    // --- Actual cookie removal logic for Production ---
    console.log('[Server Action removeAccessToken - PRODUCTION]: Removing access token cookie...');
    try {
      const cookieStore = cookies();
      (await cookieStore).delete('accessToken');
      console.log('[Server Action removeAccessToken - PRODUCTION]: Cookie deleted successfully.');
    } catch (error) {
      console.error('[Server Action removeAccessToken - PRODUCTION]: Error deleting cookie:', error);
      throw error;
    }
  }
}

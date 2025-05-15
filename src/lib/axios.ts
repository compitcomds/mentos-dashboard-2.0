
import axios from 'axios';

// Use NEXT_PUBLIC_ prefix for client-side accessible env vars
const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
console.log(`[Axios Instance] Initializing with baseURL: ${baseURL}`);

const axiosInstance = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important: Ensure cookies are sent with requests (if using cookies in production)
});

// The request interceptor that added the token from localStorage is removed.
// The browser will automatically handle sending the httpOnly cookie (in production).
// For preview, the token is added manually in service functions.

// Optional: Add a response interceptor for global error handling or token refresh logic if needed
axiosInstance.interceptors.response.use(
  (response) => {
    // Any status code that lie within the range of 2xx cause this function to trigger
    // console.log('[Axios Response Interceptor] Successful Response:', response.config.method?.toUpperCase(), response.config.url, response.status);
    return response;
  },
  (error) => {
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    console.error("[Axios Error Interceptor] Error received:");

    // Log more detailed error information if available
    if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error("API Error Response Status:", error.response.status);
        console.error("API Error Response Headers:", error.response.headers);
        console.error("API Error Response Data:", error.response.data);
        console.error("Request Config:", error.config); // Log request config
      } else if (error.request) {
        // The request was made but no response was received (Network error, CORS, etc.)
        console.error("API Error Request:", error.request);
        console.error("Request Config:", error.config); // Log request config
        if (error.message === 'Network Error') {
            console.error("Network Error: Could not connect to the server. Is the API running and accessible from the browser?");
        }
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('API Error Message:', error.message);
      }

     // Example: Handle 401 Unauthorized globally
     if (error.response && error.response.status === 401) {
         // Potentially redirect to login or trigger a global state update
         console.error("Unauthorized request (401) - potentially redirecting...");
         // Avoid direct window.location changes here if possible,
         // let middleware or page components handle redirects based on state.
         // if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
         //   // Consider a more robust redirect mechanism or state update
         //   // window.location.href = '/login?reason=unauthorized';
         // }
     }

    return Promise.reject(error); // Reject the promise so downstream .catch() can handle it
  }
);

// Add request interceptor for logging
axiosInstance.interceptors.request.use(
    (config) => {
        console.log(`[Axios Request Interceptor] Making request: ${config.method?.toUpperCase()} ${config.url}`);
        if (config.params) {
            console.log('[Axios Request Interceptor] Request Params:', config.params);
        }
         if (config.headers?.Authorization) {
             console.log('[Axios Request Interceptor] Authorization header present.');
         } else {
             console.log('[Axios Request Interceptor] Authorization header NOT present.');
         }
        return config;
    },
    (error) => {
        console.error("[Axios Request Interceptor] Error setting up request:", error);
        return Promise.reject(error);
    }
);


export default axiosInstance;

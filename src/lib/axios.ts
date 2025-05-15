import axios from 'axios';

// Replace with your actual Strapi API URL or any other backend URL
const API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337/api';

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// You can add interceptors for request or response handling
// For example, to add an authorization token:
// axiosInstance.interceptors.request.use(
//   (config) => {
//     const token = localStorage.getItem('token'); // Or get it from your auth context
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
//   },
//   (error) => {
//     return Promise.reject(error);
//   }
// );

// Example of a response interceptor for error handling:
// axiosInstance.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     // Handle errors globally
//     console.error('API Error:', error.response?.data || error.message);
//     // You could trigger a toast notification here
//     return Promise.reject(error);
//   }
// );

export default axiosInstance;

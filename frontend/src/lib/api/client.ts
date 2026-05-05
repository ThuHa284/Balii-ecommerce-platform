import axios from "axios";
import { API_BASE_URL } from "../constants";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Request interceptor: attach access token
apiClient.interceptors.request.use(
  (config) => {
    // Get token from memory (zustand store)
    // We access this via a global reference to avoid circular imports
    if (typeof window !== "undefined") {
      const token = window.__BALII_ACCESS_TOKEN__;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried, attempt refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Refresh token is in httpOnly cookie, so this just works
        const { data } = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = data.data.accessToken;

        // Update global token reference
        if (typeof window !== "undefined") {
          window.__BALII_ACCESS_TOKEN__ = newAccessToken;
        }

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear auth state
        if (typeof window !== "undefined") {
          window.__BALII_ACCESS_TOKEN__ = undefined;
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;

// Global type declaration for access token
declare global {
  interface Window {
    __BALII_ACCESS_TOKEN__?: string;
  }
}

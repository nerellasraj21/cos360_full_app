import axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { errorHandler } from '../../services/errorHandler';
import { getValidAccessToken, refreshAccessToken } from '../../services/authUtils';
import type { AuthTokens } from '../../services/authUtils';
import { getClientSchema } from '../../services/authUtils';
import { ParentStudent } from './students';

// Module-level variable to store selected student for interceptor
let selectedStudentForInterceptor: ParentStudent | null = null;

// Shared refresh lock — prevents multiple concurrent 401s from each triggering their own refresh
let refreshPromise: Promise<AuthTokens | null> | null = null;

// Session-expired callback — registered by AuthProvider; called when refresh fails so the app
// can dispatch LOGOUT and navigate to the login screen instead of showing silent errors
let onSessionExpired: (() => void) | null = null;

export const setSessionExpiredCallback = (cb: () => void): void => {
  onSessionExpired = cb;
};

// Function to update selected student for interceptor
export const setSelectedStudentForInterceptor = (student: ParentStudent | null) => {
  selectedStudentForInterceptor = student;
};

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Request interceptor for authentication
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
    if (__DEV__) {
      console.log('API Request:', config.method?.toUpperCase(), config.url);
    }

    // Note: Permission checks are handled at the component level using MobilePermissionGuard
    // This ensures unauthorized API calls are prevented by UI-level permission enforcement

    // Skip token handling for login and refresh endpoints
    const isAuthEndpoint = config.url?.includes('/auth/login') || config.url?.includes('/auth/refresh');

    if (!isAuthEndpoint) {
      // Only try to get token for non-auth endpoints, and don't allow refresh during request
      const token = await getValidAccessToken(false); // Don't allow refresh in request interceptor
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else if (__DEV__) {
        console.warn('API Request: No token available for', config.url);
      }
    }

    const clientSchema = await getClientSchema();
    if (clientSchema) {
      config.headers.cschema = clientSchema;
    } else if (__DEV__) {
      console.warn('API Request: No client schema available');
    }

    // Add student context headers for parent users — guard each value to avoid "undefined" strings
    if (selectedStudentForInterceptor) {
      if (selectedStudentForInterceptor.id) {
        config.headers['X-Student-ID'] = selectedStudentForInterceptor.id;
      }
      if (selectedStudentForInterceptor.academic_year_id) {
        config.headers['X-Academic-Year-ID'] = selectedStudentForInterceptor.academic_year_id;
      }
      if (selectedStudentForInterceptor.class_id) {
        config.headers['X-Class-ID'] = selectedStudentForInterceptor.class_id;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling and token refresh
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config;
    if (__DEV__) {
      console.error('API Error:', error.response?.status, originalRequest?.method?.toUpperCase(), originalRequest?.url, error.message);
    }

    // Skip token refresh for auth endpoints
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/login') || originalRequest?.url?.includes('/auth/refresh');

    // Handle token refresh for 401 errors (but not for auth endpoints)
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      if (__DEV__) console.log('Attempting token refresh due to 401 error...');

      try {
        // Use shared promise so concurrent 401s share one refresh call, not N parallel refreshes
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null; });
        }
        const newTokens = await refreshPromise;
        if (newTokens) {
          if (__DEV__) console.log('Token refresh successful, retrying original request');
          originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`;
          return apiClient(originalRequest);
        } else {
          if (__DEV__) console.log('Token refresh failed, no new tokens received — forcing logout');
          onSessionExpired?.();
        }
      } catch (refreshError) {
        console.error('Token refresh failed with error:', refreshError);
        errorHandler.handleError(refreshError as Error, {
          screen: 'API',
          action: 'token_refresh',
          showAlert: false,
        });
        // Refresh threw — session is unrecoverable, force logout
        onSessionExpired?.();
      }
    }

    // Use global error handler for API errors
    const { message } = errorHandler.handleApiError(error, {
      endpoint: originalRequest?.url,
      method: originalRequest?.method,
      retryable: !error.response || error.response.status >= 500,
    });

    return Promise.reject(error);
  }
);

export default apiClient;
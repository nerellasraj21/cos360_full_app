import axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { errorHandler } from '../../services/errorHandler';
import { offlineStorage } from '../../services/offlineStorage';
import { getValidAccessToken, refreshAccessToken } from '../../services/authUtils';
import { getClientSchema } from '../../services/authUtils';
import { ParentStudent } from './students';

// Module-level variable to store selected student for interceptor
let selectedStudentForInterceptor: ParentStudent | null = null;

// Function to update selected student for interceptor
export const setSelectedStudentForInterceptor = (student: ParentStudent | null) => {
  selectedStudentForInterceptor = student;
};

const apiClient = axios.create({
  // baseURL: 'http://localhost:8000/api/v1',
  baseURL: 'http://192.168.0.110:8000/api/v1',
  timeout: 10000,

});

// Request interceptor for authentication
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
    console.log('API Request:', config.method?.toUpperCase(), config.url, config.data);

    // Note: Permission checks are handled at the component level using MobilePermissionGuard
    // This ensures unauthorized API calls are prevented by UI-level permission enforcement

    // Skip token handling for login and refresh endpoints
    const isAuthEndpoint = config.url?.includes('/auth/login') || config.url?.includes('/auth/refresh');

    if (!isAuthEndpoint) {
      // Only try to get token for non-auth endpoints, and don't allow refresh during request
      const token = await getValidAccessToken(false); // Don't allow refresh in request interceptor
      console.log('Token available:', !!token);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        console.warn('API Request: No token available for', config.url);
      }
    }

    const clientSchema = await getClientSchema();
    if (clientSchema) {
      config.headers.cschema = clientSchema;
    } else {
      console.warn('API Request: No client schema available');
    }

    // Add student context headers for parent users
    if (selectedStudentForInterceptor) {
      config.headers['X-Student-ID'] = selectedStudentForInterceptor.id;
      config.headers['X-Academic-Year-ID'] = selectedStudentForInterceptor.academic_year_id;
      config.headers['X-Class-ID'] = selectedStudentForInterceptor.class_id;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling and token refresh
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log('API Response:', response.status, response.config.method?.toUpperCase(), response.config.url);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    console.error('API Error:', error.response?.status, originalRequest?.method?.toUpperCase(), originalRequest?.url, error.message);

    // Skip token refresh for auth endpoints
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/login') || originalRequest?.url?.includes('/auth/refresh');

    // Handle token refresh for 401 errors (but not for auth endpoints)
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      console.log('Attempting token refresh due to 401 error...');

      try {
        const newTokens = await refreshAccessToken();
        if (newTokens) {
          console.log('Token refresh successful, retrying original request');
          originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`;
          return apiClient(originalRequest);
        } else {
          console.log('Token refresh failed, no new tokens received');
        }
      } catch (refreshError) {
        console.error('Token refresh failed with error:', refreshError);
        // Token refresh failed, handle authentication error
        errorHandler.handleError(refreshError as Error, {
          screen: 'API',
          action: 'token_refresh',
          showAlert: false, // Don't show alert for failed refresh during normal operation
        });
      }
    }

    // Handle network errors with offline support
    if (!error.response && error.code === 'NETWORK_ERROR') {
      console.error('API Network Error: Server unreachable');
      // Network is down, queue for later sync
      if (originalRequest.method && ['post', 'put', 'delete'].includes(originalRequest.method.toLowerCase())) {
        await offlineStorage.addToSyncQueue({
          type: originalRequest.method.toLowerCase() as 'create' | 'update' | 'delete',
          endpoint: originalRequest.url || '',
          data: originalRequest.data,
        });
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
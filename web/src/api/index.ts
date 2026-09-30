import axios from 'axios';
import { useAuthStore } from '../lib/authStore';
import { config, getTenantFromHostname, logger } from '../lib/config';

const CAxios = axios.create({
  baseURL: config.api.baseURL,
  timeout: config.api.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token, tenant, and student context
CAxios.interceptors.request.use((axiosConfig) => {
  const { accessToken, selectedStudent } = useAuthStore.getState();

  // Add authorization header if token exists
  if (accessToken) {
    axiosConfig.headers.Authorization = `Bearer ${accessToken}`;
  }

  // Add tenant header
  if (typeof window !== 'undefined') {
    const tenant = getTenantFromHostname(window.location.hostname);
    axiosConfig.headers[config.tenant.headerName] = tenant;
    logger.debug('Setting tenant header', { tenant, header: config.tenant.headerName });
  }

  // Add student context headers for parent users
  if (selectedStudent) {
    axiosConfig.headers['X-Student-ID'] = selectedStudent.id;
    axiosConfig.headers['X-Academic-Year-ID'] = selectedStudent.academic_year_id;
    axiosConfig.headers['X-Class-ID'] = selectedStudent.class_id;
    logger.debug('Setting student context headers', { 
      studentId: selectedStudent.id,
      academicYearId: selectedStudent.academic_year_id,
      classId: selectedStudent.class_id
    });
  }

  return axiosConfig;
});

// Response interceptor to handle token refresh
CAxios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { refreshToken } = useAuthStore.getState();
        if (refreshToken) {
          // Attempt to refresh token
          const refreshResponse = await axios.post(`${config.api.baseURL}/auth/login/refresh`, {
            refresh_token: refreshToken,
          }, {
            headers: {
              'Content-Type': 'application/json',
              [config.tenant.headerName]: config.tenant.defaultTenant, // Use default tenant for refresh
            },
          });

          const { access_token, refresh_token } = refreshResponse.data;
          useAuthStore.getState().refreshTokens(access_token, refresh_token);

          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return CAxios(originalRequest);
        }
      } catch (refreshError) {
        // If refresh fails, logout
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }

    // Extract backend detail message from FastAPI error responses
    if (error.response?.data) {
      const data = error.response.data;
      const detail = data.detail;
      if (detail) {
        let message: string;
        if (Array.isArray(detail)) {
          message = detail.map((d: any) => d.msg || JSON.stringify(d)).join('; ');
        } else if (typeof detail === 'object') {
          // Object-shaped detail (e.g. nested FastAPI errors) — String(obj)
          // collapses to "[object Object]", so stringify it properly instead.
          message = typeof detail.message === 'string' ? detail.message : JSON.stringify(detail);
        } else {
          message = String(detail);
        }
        error.message = message;
      }
    }

    return Promise.reject(error);
  }
);

export default CAxios;
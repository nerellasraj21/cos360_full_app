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

const TOKENLESS_AUTH_PATHS = ['/auth/login', '/auth/academic-years', '/auth/refresh', '/auth/staff/set-password'];

// Request interceptor to add auth token, tenant, and student context
CAxios.interceptors.request.use((axiosConfig) => {
  const { accessToken, selectedStudent } = useAuthStore.getState();

  const url = typeof axiosConfig.url === 'string' ? axiosConfig.url : '';
  const isTokenlessAuthRequest = TOKENLESS_AUTH_PATHS.some((path) => url.includes(path));

  // These requests name the tenant with the header, so a leftover token must not override it
  if (isTokenlessAuthRequest) {
    delete axiosConfig.headers.Authorization;
  } else if (accessToken) {
    axiosConfig.headers.Authorization = `Bearer ${accessToken}`;
  }

  // The tenant comes from the token on authenticated requests; the header is only for requests without one
  if (typeof window !== 'undefined' && (isTokenlessAuthRequest || !axiosConfig.headers.Authorization)) {
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

// One refresh shared by every request that gets a 401 while it is in flight
let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = async (refreshToken: string): Promise<string> => {
  const tenant = typeof window !== 'undefined'
    ? getTenantFromHostname(window.location.hostname)
    : config.tenant.defaultTenant;
  const { data } = await axios.post(`${config.api.baseURL}/auth/refresh`, {
    refresh_token: refreshToken,
  }, {
    headers: {
      'Content-Type': 'application/json',
      [config.tenant.headerName]: tenant,
    },
  });
  useAuthStore.getState().refreshTokens(data.access_token, data.refresh_token);
  return data.access_token;
};

// Response interceptor to handle token refresh
CAxios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isLoginRequest = typeof originalRequest?.url === 'string' && originalRequest.url.includes('/auth/login');

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isLoginRequest) {
      const { accessToken: currentToken, refreshToken } = useAuthStore.getState();
      const sentToken = String(originalRequest.headers?.Authorization ?? '').replace('Bearer ', '');

      // Another request already refreshed after this one was sent: retry with the newer token
      if (currentToken && sentToken && sentToken !== currentToken && !refreshPromise) {
        originalRequest._retry = true;
        originalRequest.headers.Authorization = `Bearer ${currentToken}`;
        return CAxios(originalRequest);
      }

      if (refreshToken) {
        originalRequest._retry = true;
        try {
          refreshPromise = refreshPromise ?? refreshAccessToken(refreshToken).finally(() => {
            refreshPromise = null;
          });
          const accessToken = await refreshPromise;

          // Retry the original request with the new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return CAxios(originalRequest);
        } catch {
          useAuthStore.getState().logout();
          window.location.href = '/login';
        }
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
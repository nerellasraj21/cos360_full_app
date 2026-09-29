// Enhanced API client with automatic student context headers
import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { useAuthStore } from './authStore';

// Create base axios instance
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor to add auth token and student context
  client.interceptors.request.use(
    (config) => {
      const { accessToken, selectedStudent } = useAuthStore.getState();

      // Add authorization header
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }

      // Add tenant header (assuming client_name is used as tenant)
      config.headers['cshema'] = 'test_tenant';

      // Add student context headers for parent users
      if (selectedStudent) {
        config.headers['X-Student-ID'] = selectedStudent.id;
        config.headers['X-Academic-Year-ID'] = selectedStudent.academic_year_id;
        config.headers['X-Class-ID'] = selectedStudent.class_id;
      }

      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor to handle token refresh
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      return response;
    },
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        const { refreshToken, refreshTokens, logout } = useAuthStore.getState();

        if (refreshToken) {
          try {
            const response = await axios.post('/auth/refresh', {
              refresh_token: refreshToken,
            });

            const { access_token, refresh_token } = response.data;
            refreshTokens(access_token, refresh_token);

            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
            return client(originalRequest);
          } catch (refreshError) {
            // Refresh failed, logout user
            logout();
            window.location.href = '/login';
          }
        } else {
          // No refresh token, logout user
          logout();
          window.location.href = '/login';
        }
      }

      return Promise.reject(error);
    }
  );

  return client;
};

// Export singleton instance
export const apiClient = createApiClient();

// Base API service class with student context support
export class BaseApiService<T, CreateT = Partial<T>, UpdateT = Partial<T>> {
  protected client: AxiosInstance;
  protected basePath: string;

  constructor(basePath: string) {
    this.client = apiClient;
    this.basePath = basePath;
  }

  // Standard CRUD operations
  async getAll(params?: Record<string, any>): Promise<{ items: T[]; total: number }> {
    const response = await this.client.get(this.basePath, { params });
    return response.data;
  }

  async getById(id: string): Promise<T> {
    const response = await this.client.get(`${this.basePath}/${id}`);
    return response.data;
  }

  async create(data: CreateT): Promise<T> {
    const response = await this.client.post(this.basePath, data);
    return response.data;
  }

  async update(id: string, data: UpdateT): Promise<T> {
    const response = await this.client.put(`${this.basePath}/${id}`, data);
    return response.data;
  }

  async delete(id: string): Promise<void> {
    await this.client.delete(`${this.basePath}/${id}`);
  }

  // Student-specific operations (automatically use student context from headers)
  async getByStudent(params?: Record<string, any>): Promise<{ items: T[]; total: number }> {
    const response = await this.client.get(`${this.basePath}/student`, { params });
    return response.data;
  }

  async createForStudent(data: CreateT): Promise<T> {
    const response = await this.client.post(`${this.basePath}/student`, data);
    return response.data;
  }
}

export default apiClient;
import apiClient from './client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RouteType {
  id: string;
  type_name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RouteTypeCreate {
  type_name: string;
  description?: string;
  is_active?: boolean;
}

export interface RouteTypeDropdown {
  id: string;
  type_name: string;
}

export interface TripType {
  id: string;
  type_name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TripTypeCreate {
  type_name: string;
  description?: string;
  is_active?: boolean;
}

export interface TripTypeDropdown {
  id: string;
  type_name: string;
}

// ─── Route Types API ──────────────────────────────────────────────────────────

const ROUTE_TYPES_BASE = '/masters/route-types';

export const routeTypesApi = {
  getAll: async (): Promise<RouteType[]> => {
    const response = await apiClient.get(ROUTE_TYPES_BASE);
    return response.data.items || response.data;
  },

  getDropdown: async (): Promise<RouteTypeDropdown[]> => {
    const response = await apiClient.get(`${ROUTE_TYPES_BASE}/dropdown`);
    return response.data;
  },

  getById: async (id: string): Promise<RouteType> => {
    const response = await apiClient.get(`${ROUTE_TYPES_BASE}/${id}`);
    return response.data;
  },

  create: async (data: RouteTypeCreate): Promise<RouteType> => {
    const response = await apiClient.post(ROUTE_TYPES_BASE, data);
    return response.data;
  },

  update: async (id: string, data: Partial<RouteTypeCreate>): Promise<RouteType> => {
    const response = await apiClient.put(`${ROUTE_TYPES_BASE}/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`${ROUTE_TYPES_BASE}/${id}`);
    return response.data;
  },
};

// ─── Trip Types API ───────────────────────────────────────────────────────────

const TRIP_TYPES_BASE = '/masters/trip-types';

export const tripTypesApi = {
  getAll: async (): Promise<TripType[]> => {
    const response = await apiClient.get(TRIP_TYPES_BASE);
    return response.data.items || response.data;
  },

  getDropdown: async (): Promise<TripTypeDropdown[]> => {
    const response = await apiClient.get(`${TRIP_TYPES_BASE}/dropdown`);
    return response.data;
  },

  getById: async (id: string): Promise<TripType> => {
    const response = await apiClient.get(`${TRIP_TYPES_BASE}/${id}`);
    return response.data;
  },

  create: async (data: TripTypeCreate): Promise<TripType> => {
    const response = await apiClient.post(TRIP_TYPES_BASE, data);
    return response.data;
  },

  update: async (id: string, data: Partial<TripTypeCreate>): Promise<TripType> => {
    const response = await apiClient.put(`${TRIP_TYPES_BASE}/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`${TRIP_TYPES_BASE}/${id}`);
    return response.data;
  },
};

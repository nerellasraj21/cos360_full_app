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
  getDropdown: async (): Promise<RouteTypeDropdown[]> => {
    const response = await apiClient.get(`${ROUTE_TYPES_BASE}/dropdown`);
    return response.data;
  },

  create: async (data: RouteTypeCreate): Promise<RouteType> => {
    const response = await apiClient.post(ROUTE_TYPES_BASE, data);
    return response.data;
  },
};

// ─── Trip Types API ───────────────────────────────────────────────────────────

const TRIP_TYPES_BASE = '/masters/trip-types';

export const tripTypesApi = {
  getDropdown: async (): Promise<TripTypeDropdown[]> => {
    const response = await apiClient.get(`${TRIP_TYPES_BASE}/dropdown`);
    return response.data;
  },

  create: async (data: TripTypeCreate): Promise<TripType> => {
    const response = await apiClient.post(TRIP_TYPES_BASE, data);
    return response.data;
  },
};

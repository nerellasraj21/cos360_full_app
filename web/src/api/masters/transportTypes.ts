import CAxios from '../index';
import type {
  RouteType,
  RouteTypeCreate,
  RouteTypeUpdate,
  RouteTypeDropdown,
  TripType,
  TripTypeCreate,
  TripTypeUpdate,
  TripTypeDropdown,
} from '@/types/masters/transportTypes';

// Helper function to handle API errors
const handleApiError = (error: any): Error => {
  console.error('API Error:', error);

  if (error.response?.data) {
    const errorData = error.response.data;
    console.error('Error Response Data:', errorData);

    // Handle FastAPI validation errors (422)
    if (Array.isArray(errorData.detail)) {
      const messages = errorData.detail.map((err: any) =>
        `${err.loc?.join('.') || 'field'}: ${err.msg}`
      ).join(', ');
      return new Error(`Validation Error: ${messages}`);
    }

    // Handle string detail
    if (typeof errorData.detail === 'string') {
      return new Error(errorData.detail);
    }

    // Handle generic error message
    if (errorData.message) {
      return new Error(errorData.message);
    }
  }

  return new Error(error.message || 'Network error');
};

// ============================================================================
// ROUTE TYPES API
// ============================================================================

const ROUTE_TYPES_BASE = '/masters/route-types';

export const routeTypesApi = {
  // Get all route types
  getAll: async (): Promise<RouteType[]> => {
    try {
      const response = await CAxios.get(ROUTE_TYPES_BASE);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get route types dropdown (id + name only)
  getDropdown: async (): Promise<RouteTypeDropdown[]> => {
    try {
      const response = await CAxios.get(`${ROUTE_TYPES_BASE}/dropdown`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get single route type by ID
  getById: async (id: string): Promise<RouteType> => {
    try {
      const response = await CAxios.get(`${ROUTE_TYPES_BASE}/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Create new route type
  create: async (data: RouteTypeCreate): Promise<RouteType> => {
    try {
      console.log('Creating route type with payload:', data);
      const response = await CAxios.post(ROUTE_TYPES_BASE, data);
      console.log('Route type created successfully:', response.data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Update route type
  update: async (id: string, data: RouteTypeUpdate): Promise<RouteType> => {
    try {
      const response = await CAxios.put(`${ROUTE_TYPES_BASE}/${id}`, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Delete route type
  delete: async (id: string): Promise<{ message: string }> => {
    try {
      const response = await CAxios.delete(`${ROUTE_TYPES_BASE}/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};

// ============================================================================
// TRIP TYPES API
// ============================================================================

const TRIP_TYPES_BASE = '/masters/trip-types';

export const tripTypesApi = {
  // Get all trip types
  getAll: async (): Promise<TripType[]> => {
    try {
      const response = await CAxios.get(TRIP_TYPES_BASE);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get trip types dropdown (id + name only)
  getDropdown: async (): Promise<TripTypeDropdown[]> => {
    try {
      const response = await CAxios.get(`${TRIP_TYPES_BASE}/dropdown`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get single trip type by ID
  getById: async (id: string): Promise<TripType> => {
    try {
      const response = await CAxios.get(`${TRIP_TYPES_BASE}/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Create new trip type
  create: async (data: TripTypeCreate): Promise<TripType> => {
    try {
      console.log('Creating trip type with payload:', data);
      const response = await CAxios.post(TRIP_TYPES_BASE, data);
      console.log('Trip type created successfully:', response.data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Update trip type
  update: async (id: string, data: TripTypeUpdate): Promise<TripType> => {
    try {
      const response = await CAxios.put(`${TRIP_TYPES_BASE}/${id}`, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Delete trip type
  delete: async (id: string): Promise<{ message: string }> => {
    try {
      const response = await CAxios.delete(`${TRIP_TYPES_BASE}/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};

// Named exports for convenience
export const {
  getAll: getAllRouteTypes,
  getDropdown: getRouteTypesDropdown,
  getById: getRouteTypeById,
  create: createRouteType,
  update: updateRouteType,
  delete: deleteRouteType,
} = routeTypesApi;

export const {
  getAll: getAllTripTypes,
  getDropdown: getTripTypesDropdown,
  getById: getTripTypeById,
  create: createTripType,
  update: updateTripType,
  delete: deleteTripType,
} = tripTypesApi;

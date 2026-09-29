import CAxios from '../index';
import type {
  Route,
  RouteInput,
  RouteUpdate,
  RouteDropdown
} from '@/types/masters/route';

const ROUTES_API_BASE = '/masters/routes/';

// Helper function to handle API errors
const handleApiError = (error: any): Error => {
  if (error.response?.data) {
    const apiError = error.response.data;
    return new Error(apiError.detail || 'An error occurred');
  }
  return new Error(error.message || 'Network error');
};

// Create Route
export const createRoute = async (route: RouteInput): Promise<Route> => {
  try {
    console.log('Creating route with payload:', route);
    console.log('route_type:', route.route_type);
    console.log('trip_type:', route.trip_type);
    const { data } = await CAxios.post(ROUTES_API_BASE, route);
    console.log('Route created successfully:', data);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// List All Routes
export const fetchRoutes = async (activeOnly = true): Promise<Route[]> => {
  try {
    const { data } = await CAxios.get(`${ROUTES_API_BASE}all_routes`, {
      params: { active_only: activeOnly }
    });
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Get Route by ID
export const fetchRouteById = async (id: string): Promise<Route> => {
  try {
    const { data } = await CAxios.get(`${ROUTES_API_BASE}routeid/${id}`);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Update Route (Full)
export const updateRoute = async (id: string, route: RouteInput): Promise<Route> => {
  try {
    const { data } = await CAxios.put(`${ROUTES_API_BASE}${id}`, route);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Update Route (Partial)
export const updateRoutePartial = async (id: string, route: RouteUpdate): Promise<Route> => {
  try {
    const { data } = await CAxios.patch(`${ROUTES_API_BASE}${id}`, route);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Delete Route
export const deleteRoute = async (id: string): Promise<void> => {
  try {
    await CAxios.delete(`${ROUTES_API_BASE}${id}`);
  } catch (error) {
    throw handleApiError(error);
  }
};

// Get Routes Dropdown
export const fetchRoutesDropdown = async (activeOnly = true): Promise<RouteDropdown[]> => {
  try {
    const { data } = await CAxios.get(`${ROUTES_API_BASE}dropdown`, {
      params: { active_only: activeOnly }
    });
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Get Stops by Route Name
export const fetchStopsByRouteName = async (routeName: string): Promise<any[]> => {
  try {
    const { data } = await CAxios.get(`${ROUTES_API_BASE}stops-by-route`, {
      params: { route_name: routeName }
    });
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Paginated Routes (for compatibility)
export const fetchRoutesPaginated = async (
  page = 0,
  pageSize = 10,
  activeOnly = true
): Promise<{ data: Route[]; total: number; hasMore: boolean }> => {
  try {
    const skip = page * pageSize;
    const { data } = await CAxios.get(`${ROUTES_API_BASE}all_routes`, {
      params: {
        skip,
        limit: pageSize,
        active_only: activeOnly
      }
    });

    // Handle different response formats
    const items = data.items || data || [];
    const total = data.total || data.count || items.length;

    return {
      data: items,
      total: total,
      hasMore: items.length === pageSize
    };
  } catch (error) {
    throw handleApiError(error);
  }
};

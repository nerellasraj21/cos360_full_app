import CAxios from '../index';
import type {
  RouteStop,
  RouteStopInput,
  RouteStopUpdate
} from '@/types/masters/routeStop';

const ROUTE_STOPS_API_BASE = '/masters/route-stops/';

// Helper function to handle API errors
const handleApiError = (error: any): Error => {
  if (error.response?.data) {
    const apiError = error.response.data;
    return new Error(apiError.detail || 'An error occurred');
  }
  return new Error(error.message || 'Network error');
};

// Create Route Stop
export const createRouteStop = async (routeStop: RouteStopInput): Promise<RouteStop> => {
  try {
    const { data } = await CAxios.post(ROUTE_STOPS_API_BASE, routeStop);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// List All Route Stops
export const fetchRouteStops = async (activeOnly = true): Promise<RouteStop[]> => {
  try {
    const { data } = await CAxios.get(ROUTE_STOPS_API_BASE, {
      params: { active_only: activeOnly }
    });
    console.log('[RouteStops] raw API response:', data);
    // Handle both plain array and paginated { items: [...] } responses
    const result = Array.isArray(data) ? data : (data.items || data.results || []);
    console.log('[RouteStops] parsed stops count:', result.length, result);
    return result;
  } catch (error) {
    throw handleApiError(error);
  }
};

// List Route Stops by Route ID
export const fetchRouteStopsByRouteId = async (routeId: string): Promise<RouteStop[]> => {
  try {
    const { data } = await CAxios.get(ROUTE_STOPS_API_BASE, {
      params: { route_id: routeId, active_only: false }
    });
    return Array.isArray(data) ? data : (data.items || data.results || []);
  } catch (error) {
    throw handleApiError(error);
  }
};

// Get Route Stop by ID
export const fetchRouteStopById = async (stopId: string): Promise<RouteStop> => {
  try {
    const { data } = await CAxios.get(`${ROUTE_STOPS_API_BASE}${stopId}`);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Update Route Stop (Full)
export const updateRouteStop = async (stopId: string, routeStop: RouteStopInput): Promise<RouteStop> => {
  try {
    const { data } = await CAxios.put(`${ROUTE_STOPS_API_BASE}${stopId}`, routeStop);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Update Route Stop (Partial)
export const updateRouteStopPartial = async (stopId: string, routeStop: RouteStopUpdate): Promise<RouteStop> => {
  try {
    const { data } = await CAxios.patch(`${ROUTE_STOPS_API_BASE}${stopId}`, routeStop);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Delete Route Stop
export const deleteRouteStop = async (stopId: string): Promise<void> => {
  try {
    await CAxios.delete(`${ROUTE_STOPS_API_BASE}${stopId}`);
  } catch (error) {
    throw handleApiError(error);
  }
};

// Paginated Route Stops (for compatibility)
export const fetchRouteStopsPaginated = async (
  page = 0,
  pageSize = 10,
  activeOnly = true
): Promise<{ data: RouteStop[]; total: number; hasMore: boolean }> => {
  try {
    const skip = page * pageSize;
    const { data } = await CAxios.get(ROUTE_STOPS_API_BASE, {
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

/*import CAxios from '../index';
// TODO: Create @/types/masters/routeStop if not present
import type { RouteStop, RouteStopInput, RouteStopPatch } from '@/types/masters/routeStop';

const ROUTE_STOPS_API_BASE = '/api/v1/route-stops/';

export const fetchRouteStops = async (): Promise<RouteStop[]> => {
  const { data } = await CAxios.get(ROUTE_STOPS_API_BASE);
  return data;
};

export const fetchRouteStopById = async (stop_id: number): Promise<RouteStop> => {
  const { data } = await CAxios.get(`${ROUTE_STOPS_API_BASE}${stop_id}`);
  return data;
};

export const createRouteStop = async (routeStop: RouteStopInput): Promise<RouteStop> => {
  const { data } = await CAxios.post(ROUTE_STOPS_API_BASE, routeStop);
  return data;
};

export const updateRouteStop = async (stop_id: number, routeStop: RouteStopInput): Promise<RouteStop> => {
  const { data } = await CAxios.put(`${ROUTE_STOPS_API_BASE}${stop_id}`, routeStop);
  return data;
};

export const patchRouteStop = async (stop_id: number, routeStop: RouteStopPatch): Promise<RouteStop> => {
  const { data } = await CAxios.patch(`${ROUTE_STOPS_API_BASE}${stop_id}`, routeStop);
  return data;
};

export const deleteRouteStop = async (stop_id: number): Promise<void> => {
  await CAxios.delete(`${ROUTE_STOPS_API_BASE}${stop_id}`);
}; */
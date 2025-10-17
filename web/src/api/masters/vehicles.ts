import CAxios from '../index';
import type {
  Vehicle,
  VehicleInput,
  VehicleUpdate,
  VehicleDropdown,
  VehicleRoute,
  VehicleRouteStop
} from '@/types/masters/vehicle';

const VEHICLES_API_BASE = '/masters/vehicles/';

// Helper function to handle API errors
const handleApiError = (error: any): Error => {
  if (error.response?.data) {
    const apiError = error.response.data;
    return new Error(apiError.detail || 'An error occurred');
  }
  return new Error(error.message || 'Network error');
};

// Create Vehicle
export const createVehicle = async (vehicle: VehicleInput): Promise<Vehicle> => {
  try {
    const { data } = await CAxios.post(VEHICLES_API_BASE, vehicle);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// List All Vehicles
export const fetchVehicles = async (activeOnly = true): Promise<Vehicle[]> => {
  try {
    const { data } = await CAxios.get(VEHICLES_API_BASE, {
      params: { active_only: activeOnly }
    });
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Get Vehicle by ID
export const fetchVehicleById = async (id: string): Promise<Vehicle> => {
  try {
    const { data } = await CAxios.get(`${VEHICLES_API_BASE}${id}`);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Update Vehicle (Full)
export const updateVehicle = async (id: string, vehicle: VehicleInput): Promise<Vehicle> => {
  try {
    const { data } = await CAxios.put(`${VEHICLES_API_BASE}${id}`, vehicle);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Update Vehicle (Partial)
export const updateVehiclePartial = async (id: string, vehicle: VehicleUpdate): Promise<Vehicle> => {
  try {
    const { data } = await CAxios.patch(`${VEHICLES_API_BASE}${id}`, vehicle);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Delete Vehicle (Soft Delete)
export const deleteVehicle = async (id: string): Promise<void> => {
  try {
    await CAxios.delete(`${VEHICLES_API_BASE}${id}`);
  } catch (error) {
    throw handleApiError(error);
  }
};

// Get Vehicles Dropdown
export const fetchVehiclesDropdown = async (activeOnly = true): Promise<VehicleDropdown[]> => {
  try {
    const { data } = await CAxios.get(`${VEHICLES_API_BASE}dropdown`, {
      params: { active_only: activeOnly }
    });
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Get Vehicle Routes
export const fetchVehicleRoutes = async (vehicleId: string): Promise<VehicleRoute[]> => {
  try {
    const { data } = await CAxios.get(`${VEHICLES_API_BASE}${vehicleId}/routes`);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Get Vehicle Route Stops
export const fetchVehicleRouteStops = async (vehicleId: string, routeId: string): Promise<VehicleRouteStop[]> => {
  try {
    const { data } = await CAxios.get(`${VEHICLES_API_BASE}${vehicleId}/routes/${routeId}/stops`);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Paginated Vehicles (for compatibility)
export const fetchVehiclesPaginated = async (
  page = 0,
  pageSize = 10,
  activeOnly = true
): Promise<{ data: Vehicle[]; total: number; hasMore: boolean }> => {
  try {
    const skip = page * pageSize;
    const { data } = await CAxios.get(VEHICLES_API_BASE, {
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


/*
import type { Vehicle, VehicleInput } from '@/types/masters';
import CAxios from '../index';
import { VEHICLES_API_BASE } from '@/constants';

export const fetchVehicles = async (): Promise<Vehicle[]> => {
  const { data } = await CAxios.get(VEHICLES_API_BASE);
  return data;
};

export const fetchVehicleById = async (id: number): Promise<Vehicle> => {
  const { data } = await CAxios.get(`${VEHICLES_API_BASE}${id}`);
  return data;
};

export const createVehicle = async (vehicle: VehicleInput): Promise<Vehicle> => {
  const { data } = await CAxios.post(VEHICLES_API_BASE, vehicle);
  return data;
};

export const updateVehicle = async ({ id, vehicle }: { id: number; vehicle: VehicleInput }): Promise<Vehicle> => {
  const { data } = await CAxios.put(`${VEHICLES_API_BASE}${id}`, vehicle);
  return data;
};

export const deleteVehicle = async (id: number): Promise<void> => {
  await CAxios.delete(`${VEHICLES_API_BASE}${id}`);
};

export const fetchPaginatedVehicles = async (offset = 0, limit = 10): Promise<{ data: Vehicle[]; hasMore: boolean }> => {
  const { data } = await CAxios.get(VEHICLES_API_BASE, { params: { offset, limit } });
  return data;
};

export const fetchVehiclesPaginated = async (page = 0, pageSize = 10): Promise<{ data: Vehicle[]; total: number; hasMore: boolean }> => {
  const offset = page * pageSize;
  const { data } = await CAxios.get(VEHICLES_API_BASE, { params: { offset, limit: pageSize } });
  return data;
}; */
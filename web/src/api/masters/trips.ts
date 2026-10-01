import CAxios from '../index';
import type {
  TripCreate,
  TripUpdate,
  TripOut,
  TripListResponse,
  Driver,
  DriverListResponse
} from '@/types/masters/trip';

const TRIPS_API_BASE = '/masters/trips/';

// Helper function to handle API errors
const handleApiError = (error: any): Error => {
  if (error.response?.data?.detail) {
    return new Error(error.response.data.detail);
  }
  return new Error(error.message || 'Network error');
};

export const tripsApi = {
  // Create trip
  createTrip: async (tripData: TripCreate): Promise<TripOut> => {

    try {
      const response = await CAxios.post(TRIPS_API_BASE, tripData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get all trips
  getAllTrips: async (): Promise<TripOut[] | TripListResponse> => {

    try {
      const response = await CAxios.get(TRIPS_API_BASE, { params: { limit: 1000 } });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get trips by vehicle ID
  getTripsByVehicle: async (vehicleId: string): Promise<TripOut[]> => {
    try {
      const response = await CAxios.get(`/masters/vehicles/${vehicleId}/trips`, {
        params: { limit: 100 },
      });
      const data = response.data;
      return Array.isArray(data) ? data : (data.items || data.results || []);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get trip by ID
  getTripById: async (tripId: string): Promise<TripOut> => {

    try {
      const response = await CAxios.get(`${TRIPS_API_BASE}${tripId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Update trip (full)
  updateTrip: async (tripId: string, tripData: TripCreate): Promise<TripOut> => {

    try {
      const response = await CAxios.put(`${TRIPS_API_BASE}${tripId}`, tripData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Update trip (partial)
  updateTripPartial: async (tripId: string, tripData: TripUpdate): Promise<TripOut> => {

    try {
      const response = await CAxios.patch(`${TRIPS_API_BASE}${tripId}`, tripData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Delete trip
  deleteTrip: async (tripId: string): Promise<{ message: string }> => {

    try {
      const response = await CAxios.delete(`${TRIPS_API_BASE}${tripId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};

export const driversApi = {
  // Get all drivers
  getAllDrivers: async (): Promise<DriverListResponse> => {

    try {
      const response = await CAxios.get('/staff/drivers');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};

export const {
  createTrip,
  getAllTrips,
  getTripById,
  getTripsByVehicle,
  updateTrip,
  updateTripPartial,
  deleteTrip,
} = tripsApi;

export const {
  getAllDrivers,
} = driversApi;
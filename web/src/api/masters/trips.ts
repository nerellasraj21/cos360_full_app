import CAxios from '../index';
import type {
  TripCreate,
  TripUpdate,
  TripOut,
  TripListResponse,
  Driver,
  DriverListResponse
} from '@/types/masters/trip';

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
    console.log('[DEBUG] tripsApi.createTrip called with data:', tripData);

    try {
      const response = await CAxios.post('/masters/trips/', tripData);
      console.log('[DEBUG] tripsApi.createTrip success:', response.data);
      return response.data;
    } catch (error) {
      console.error('[DEBUG] tripsApi.createTrip failed:', error);
      throw handleApiError(error);
    }
  },

  // Get all trips
  getAllTrips: async (): Promise<TripOut[]> => {
    console.log('[DEBUG] tripsApi.getAllTrips called');

    try {
      const response = await CAxios.get('/masters/trips/');
      console.log('[DEBUG] tripsApi.getAllTrips success:', response.data);
      return response.data;
    } catch (error) {
      console.error('[DEBUG] tripsApi.getAllTrips failed:', error);
      throw handleApiError(error);
    }
  },

  // Get trip by ID
  getTripById: async (tripId: string): Promise<TripOut> => {
    console.log('[DEBUG] tripsApi.getTripById called with tripId:', tripId);

    try {
      const response = await CAxios.get(`/masters/trips/${tripId}`);
      console.log('[DEBUG] tripsApi.getTripById success:', response.data);
      return response.data;
    } catch (error) {
      console.error('[DEBUG] tripsApi.getTripById failed:', error);
      throw handleApiError(error);
    }
  },

  // Update trip (full)
  updateTrip: async (tripId: string, tripData: TripCreate): Promise<TripOut> => {
    console.log('[DEBUG] tripsApi.updateTrip called with tripId:', tripId, 'data:', tripData);

    try {
      const response = await CAxios.put(`/masters/trips/${tripId}`, tripData);
      console.log('[DEBUG] tripsApi.updateTrip success:', response.data);
      return response.data;
    } catch (error) {
      console.error('[DEBUG] tripsApi.updateTrip failed:', error);
      throw handleApiError(error);
    }
  },

  // Update trip (partial)
  updateTripPartial: async (tripId: string, tripData: TripUpdate): Promise<TripOut> => {
    console.log('[DEBUG] tripsApi.updateTripPartial called with tripId:', tripId, 'data:', tripData);

    try {
      const response = await CAxios.patch(`/masters/trips/${tripId}`, tripData);
      console.log('[DEBUG] tripsApi.updateTripPartial success:', response.data);
      return response.data;
    } catch (error) {
      console.error('[DEBUG] tripsApi.updateTripPartial failed:', error);
      throw handleApiError(error);
    }
  },

  // Delete trip
  deleteTrip: async (tripId: string): Promise<{ message: string }> => {
    console.log('[DEBUG] tripsApi.deleteTrip called with tripId:', tripId);

    try {
      const response = await CAxios.delete(`/masters/trips/${tripId}`);
      console.log('[DEBUG] tripsApi.deleteTrip success:', response.data);
      return response.data;
    } catch (error) {
      console.error('[DEBUG] tripsApi.deleteTrip failed:', error);
      throw handleApiError(error);
    }
  },
};

export const driversApi = {
  // Get all drivers
  getAllDrivers: async (): Promise<DriverListResponse> => {
    console.log('[DEBUG] driversApi.getAllDrivers called');

    try {
      const response = await CAxios.get('/staff/drivers');
      console.log('[DEBUG] driversApi.getAllDrivers success:', response.data);
      return response.data;
    } catch (error) {
      console.error('[DEBUG] driversApi.getAllDrivers failed:', error);
      throw handleApiError(error);
    }
  },
};

export const {
  createTrip,
  getAllTrips,
  getTripById,
  updateTrip,
  updateTripPartial,
  deleteTrip,
} = tripsApi;

export const {
  getAllDrivers,
} = driversApi;
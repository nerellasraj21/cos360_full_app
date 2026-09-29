import apiClient from './client';

// Re-export transport-related APIs from masters
export {
  routesApi,
  vehiclesApi,
  routeStopsApi,
  tripsApi,
  studentTripsApi,
} from './masters';

// studentTransportApi comes from students.ts — it uses the current schema (trip_id, pricing_id)
// masters.ts has an old definition with the legacy schema (route_id, fare_amount) — do NOT use it
export { studentTransportApi } from './students';

// Transport-specific API functions
export const transportApi = {
  // Routes
  getRoutes: async (): Promise<any[]> => {
    const response = await apiClient.get('/masters/routes/all_routes');
    return response.data.items || response.data;
  },

  // Vehicles
  getVehicles: async (): Promise<any[]> => {
    const response = await apiClient.get('/masters/vehicles/');
    return response.data.items || response.data;
  },

  // Route Stops
  getRouteStops: async (): Promise<any[]> => {
    const response = await apiClient.get('/masters/route-stops/');
    return response.data.items || response.data;
  },

  // Trips
  getTrips: async (): Promise<any[]> => {
    const response = await apiClient.get('/masters/trips/');
    return response.data.items || response.data;
  },
};
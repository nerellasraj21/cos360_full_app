import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  usePermissionProtectedListQuery,
  usePermissionProtectedReadQuery,
  usePermissionProtectedCreateMutation,
  usePermissionProtectedUpdateMutation,
  usePermissionProtectedDeleteMutation
} from './use-permission-protected-api';
import { routesApi, vehiclesApi, tripsApi, studentTransportApi, routeStopsApi, studentTripsApi } from '../src/api/transport';
import { PERMISSION_RESOURCES } from '../src/types/permissions';
import type {
  Route,
  RouteCreate,
  RouteUpdate,
  Vehicle,
  VehicleCreate,
  VehicleUpdate,
  Trip,
  TripCreate,
  TripUpdate,
  StudentTrip,
  StudentTripCreate,
  StudentTripUpdate,
  StudentTransport,
  StudentTransportCreate,
  StudentTransportUpdate,
  RouteStopCreate,
  RouteStopUpdate
} from '../src/types/transport';

// Routes hooks with permission protection
export const useRoutes = (params?: {
  skip?: number;
  limit?: number;
  is_active?: boolean;
}) => {
  return usePermissionProtectedListQuery(
    PERMISSION_RESOURCES.TRANSPORT_ROUTES,
    ['routes', params],
    () => routesApi.getRoutes(params)
  );
};

export const useRoutesDropdown = () => {
  return usePermissionProtectedListQuery(
    PERMISSION_RESOURCES.TRANSPORT_ROUTES,
    ['routes-dropdown'],
    () => routesApi.getRoutesDropdown()
  );
};

export const useRoute = (id: string) => {
  return usePermissionProtectedReadQuery(
    PERMISSION_RESOURCES.TRANSPORT_ROUTES,
    ['route', id],
    () => routesApi.getRoute(id),
    { enabled: !!id }
  );
};

export const useCreateRoute = () => {
  return usePermissionProtectedCreateMutation(
    PERMISSION_RESOURCES.TRANSPORT_ROUTES,
    (data: RouteCreate) => routesApi.createRoute(data)
  );
};

export const useUpdateRoute = () => {
  return usePermissionProtectedUpdateMutation(
    PERMISSION_RESOURCES.TRANSPORT_ROUTES,
    ({ id, data }: { id: string; data: RouteUpdate }) => routesApi.updateRoute(id, data)
  );
};

export const useDeleteRoute = () => {
  return usePermissionProtectedDeleteMutation(
    PERMISSION_RESOURCES.TRANSPORT_ROUTES,
    (id: string) => routesApi.deleteRoute(id)
  );
};

// Vehicles hooks with permission protection
export const useVehicles = (params?: {
  skip?: number;
  limit?: number;
  is_active?: boolean;
}) => {
  return usePermissionProtectedListQuery(
    PERMISSION_RESOURCES.TRANSPORT_VEHICLES,
    ['vehicles', params],
    () => vehiclesApi.getVehicles(params)
  );
};

export const useVehiclesDropdown = () => {
  return usePermissionProtectedListQuery(
    PERMISSION_RESOURCES.TRANSPORT_VEHICLES,
    ['vehicles-dropdown'],
    () => vehiclesApi.getVehiclesDropdown()
  );
};

export const useVehicle = (id: string) => {
  return usePermissionProtectedReadQuery(
    PERMISSION_RESOURCES.TRANSPORT_VEHICLES,
    ['vehicle', id],
    () => vehiclesApi.getVehicle(id),
    { enabled: !!id }
  );
};

export const useCreateVehicle = () => {
  return usePermissionProtectedCreateMutation(
    PERMISSION_RESOURCES.TRANSPORT_VEHICLES,
    (data: VehicleCreate) => vehiclesApi.createVehicle(data)
  );
};

export const useUpdateVehicle = () => {
  return usePermissionProtectedUpdateMutation(
    PERMISSION_RESOURCES.TRANSPORT_VEHICLES,
    ({ id, data }: { id: string; data: VehicleUpdate }) => vehiclesApi.updateVehicle(id, data)
  );
};

export const useDeleteVehicle = () => {
  return usePermissionProtectedDeleteMutation(
    PERMISSION_RESOURCES.TRANSPORT_VEHICLES,
    (id: string) => vehiclesApi.deleteVehicle(id)
  );
};

// Trips hooks with permission protection
export const useTrips = (params?: {
  skip?: number;
  limit?: number;
  vehicle_id?: string;
  route_id?: string;
  driver_id?: string;
}) => {
  return usePermissionProtectedListQuery(
    PERMISSION_RESOURCES.TRANSPORT_TRIPS,
    ['trips', params],
    () => tripsApi.getTrips(params)
  );
};

export const useTrip = (id: string) => {
  return usePermissionProtectedReadQuery(
    PERMISSION_RESOURCES.TRANSPORT_TRIPS,
    ['trip', id],
    () => tripsApi.getTrip(id),
    { enabled: !!id }
  );
};

export const useCreateTrip = () => {
  return usePermissionProtectedCreateMutation(
    PERMISSION_RESOURCES.TRANSPORT_TRIPS,
    (data: TripCreate) => tripsApi.createTrip(data)
  );
};

export const useUpdateTrip = () => {
  return usePermissionProtectedUpdateMutation(
    PERMISSION_RESOURCES.TRANSPORT_TRIPS,
    ({ id, data }: { id: string; data: TripUpdate }) => tripsApi.updateTrip(id, data)
  );
};

export const useDeleteTrip = () => {
  return usePermissionProtectedDeleteMutation(
    PERMISSION_RESOURCES.TRANSPORT_TRIPS,
    (id: string) => tripsApi.deleteTrip(id)
  );
};

// Route Stops hooks with permission protection
export const useRouteStops = (params?: {
  route_id?: string;
  skip?: number;
  limit?: number;
}) => {
  return usePermissionProtectedListQuery(
    PERMISSION_RESOURCES.TRANSPORT_ROUTE_STOPS,
    ['route-stops', params],
    () => routeStopsApi.getRouteStops(params)
  );
};

export const useRouteStop = (id: string) => {
  return usePermissionProtectedReadQuery(
    PERMISSION_RESOURCES.TRANSPORT_ROUTE_STOPS,
    ['route-stop', id],
    () => routeStopsApi.getRouteStop(id),
    { enabled: !!id }
  );
};

export const useCreateRouteStop = () => {
  return usePermissionProtectedCreateMutation(
    PERMISSION_RESOURCES.TRANSPORT_ROUTE_STOPS,
    (data: RouteStopCreate) => routeStopsApi.createRouteStop(data)
  );
};

export const useUpdateRouteStop = () => {
  return usePermissionProtectedUpdateMutation(
    PERMISSION_RESOURCES.TRANSPORT_ROUTE_STOPS,
    ({ id, data }: { id: string; data: RouteStopUpdate }) => routeStopsApi.updateRouteStop(id, data)
  );
};

export const useDeleteRouteStop = () => {
  return usePermissionProtectedDeleteMutation(
    PERMISSION_RESOURCES.TRANSPORT_ROUTE_STOPS,
    (id: string) => routeStopsApi.deleteRouteStop(id)
  );
};

// Student Transport hooks with permission protection
export const useStudentTransports = (params?: {
  student_id?: string;
  route_id?: string;
  academic_year_id?: string;
  skip?: number;
  limit?: number;
}) => {
  return usePermissionProtectedListQuery(
    PERMISSION_RESOURCES.STUDENT_TRANSPORT,
    ['student-transport', params],
    () => studentTransportApi.getStudentTransports(params)
  );
};

export const useStudentTransport = (id: string) => {
  return usePermissionProtectedReadQuery(
    PERMISSION_RESOURCES.STUDENT_TRANSPORT,
    ['student-transport', id],
    () => studentTransportApi.getStudentTransport(id),
    { enabled: !!id }
  );
};

export const useCreateStudentTransport = () => {
  return usePermissionProtectedCreateMutation(
    PERMISSION_RESOURCES.STUDENT_TRANSPORT,
    (data: StudentTransportCreate) => studentTransportApi.createStudentTransport(data)
  );
};

export const useUpdateStudentTransport = () => {
  return usePermissionProtectedUpdateMutation(
    PERMISSION_RESOURCES.STUDENT_TRANSPORT,
    ({ id, data }: { id: string; data: StudentTransportUpdate }) => studentTransportApi.updateStudentTransport(id, data)
  );
};

export const useDeleteStudentTransport = () => {
  return usePermissionProtectedDeleteMutation(
    PERMISSION_RESOURCES.STUDENT_TRANSPORT,
    (id: string) => studentTransportApi.deleteStudentTransport(id)
  );
};

// Drivers hook (from staff API) - keeping existing implementation for now
export const useDrivers = () => {
  return useQuery({
    queryKey: ['drivers'],
    queryFn: async (): Promise<Array<{ id: string, name: string }>> => {
      // This would need to be implemented with staff API
      // For now, return empty array
      return [];
    },
  });
};

// Students hook (from admissions API) - keeping existing implementation for now
export const useStudents = () => {
  return useQuery({
    queryKey: ['students-dropdown'],
    queryFn: async () => {
      const { studentAdmissionsApi } = await import('../src/api/students');
      return studentAdmissionsApi.studentsDropdown(true); // Only active students
    },
  });
};

// Student Trips hooks with permission protection
export const useStudentTrips = (params?: {
  skip?: number;
  limit?: number;
}) => {
  return usePermissionProtectedListQuery(
    PERMISSION_RESOURCES.TRANSPORT_TRIPS,
    ['student-trips', params],
    () => studentTripsApi.getStudentTrips(params)
  );
};

export const useStudentTrip = (id: string) => {
  return usePermissionProtectedReadQuery(
    PERMISSION_RESOURCES.TRANSPORT_TRIPS,
    ['student-trip', id],
    () => studentTripsApi.getStudentTrip(id),
    { enabled: !!id }
  );
};

export const useCreateStudentTrip = () => {
  return usePermissionProtectedCreateMutation(
    PERMISSION_RESOURCES.TRANSPORT_TRIPS,
    (data: StudentTripCreate) => studentTripsApi.createStudentTrip(data)
  );
};

export const useUpdateStudentTrip = () => {
  return usePermissionProtectedUpdateMutation(
    PERMISSION_RESOURCES.TRANSPORT_TRIPS,
    ({ id, data }: { id: string; data: StudentTripUpdate }) => studentTripsApi.patchStudentTrip(id, data)
  );
};

export const useDeleteStudentTrip = () => {
  return usePermissionProtectedDeleteMutation(
    PERMISSION_RESOURCES.TRANSPORT_TRIPS,
    (id: string) => studentTripsApi.deleteStudentTrip(id)
  );
};

// Fee terms hook - keeping existing implementation for now
export const useFeeTerms = () => {
  return useQuery({
    queryKey: ['fee-terms'],
    queryFn: async () => {
      const { feeTermsApi } = await import('../src/api/fees');
      // Fetch all fee terms (same as fee/terms page)
      return feeTermsApi.getFeeTerms();
    },
  });
};
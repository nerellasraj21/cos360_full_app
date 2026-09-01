import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  usePermissionProtectedListQuery,
  usePermissionProtectedReadQuery,
  usePermissionProtectedCreateMutation,
  usePermissionProtectedUpdateMutation,
  usePermissionProtectedDeleteMutation
} from './use-permission-protected-api';
import { routesApi, vehiclesApi, tripsApi, studentTransportApi, routeStopsApi, studentTripsApi } from '../src/api/transport';
import { routeTypesApi, tripTypesApi } from '../src/api/transportTypes';
import type { RouteTypeCreate, RouteType, RouteTypeDropdown, TripTypeCreate, TripType, TripTypeDropdown } from '../src/api/transportTypes';
import { staffApi, designationsApi } from '../src/api/staff';
import { studentAdmissionsApi } from '../src/api/students';
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
  RouteStopCreate,
  RouteStopUpdate,
  TransportPricingCreate,
  TransportPricingUpdate,
} from '../src/types/transport';
import { transportPricingApi } from '../src/api/masters';
import type {
  StudentTransport,
  StudentTransportCreate,
  StudentTransportUpdate,
} from '../src/api/students';

// Routes hooks with permission protection
export const useRoutes = () => {
  return usePermissionProtectedListQuery(
    PERMISSION_RESOURCES.TRANSPORT_ROUTES,
    ['routes'],
    () => routesApi.getRoutes()
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
  const qc = useQueryClient();
  return usePermissionProtectedCreateMutation(
    PERMISSION_RESOURCES.TRANSPORT_ROUTES,
    (data: RouteCreate) => routesApi.createRoute(data),
    { onSuccess: () => { qc.invalidateQueries({ queryKey: ['routes'] }); } }
  );
};

export const useUpdateRoute = () => {
  const qc = useQueryClient();
  return usePermissionProtectedUpdateMutation(
    PERMISSION_RESOURCES.TRANSPORT_ROUTES,
    ({ id, data }: { id: string; data: RouteUpdate }) => routesApi.updateRoute(id, data),
    { onSuccess: () => { qc.invalidateQueries({ queryKey: ['routes'] }); } }
  );
};

export const useDeleteRoute = () => {
  const qc = useQueryClient();
  return usePermissionProtectedDeleteMutation(
    PERMISSION_RESOURCES.TRANSPORT_ROUTES,
    (id: string) => routesApi.deleteRoute(id),
    { onSuccess: () => { qc.invalidateQueries({ queryKey: ['routes'] }); } }
  );
};

// Route Types hooks
export const useRouteTypesDropdown = () => {
  return useQuery<RouteTypeDropdown[]>({
    queryKey: ['route-types', 'dropdown'],
    queryFn: () => routeTypesApi.getDropdown(),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateRouteType = () => {
  const queryClient = useQueryClient();
  return useMutation<RouteType, Error, RouteTypeCreate>({
    mutationFn: (data) => routeTypesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['route-types'] });
    },
  });
};

// Trip Types hooks
export const useTripTypesDropdown = () => {
  return useQuery<TripTypeDropdown[]>({
    queryKey: ['trip-types', 'dropdown'],
    queryFn: () => tripTypesApi.getDropdown(),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateTripType = () => {
  const queryClient = useQueryClient();
  return useMutation<TripType, Error, TripTypeCreate>({
    mutationFn: (data) => tripTypesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-types'] });
    },
  });
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
  const qc = useQueryClient();
  return usePermissionProtectedCreateMutation(
    PERMISSION_RESOURCES.TRANSPORT_VEHICLES,
    (data: VehicleCreate) => vehiclesApi.createVehicle(data),
    { onSuccess: () => { qc.invalidateQueries({ queryKey: ['vehicles'] }); } }
  );
};

export const useUpdateVehicle = () => {
  const qc = useQueryClient();
  return usePermissionProtectedUpdateMutation(
    PERMISSION_RESOURCES.TRANSPORT_VEHICLES,
    ({ id, data }: { id: string; data: VehicleUpdate }) => vehiclesApi.updateVehicle(id, data),
    { onSuccess: () => { qc.invalidateQueries({ queryKey: ['vehicles'] }); } }
  );
};

export const useDeleteVehicle = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await vehiclesApi.deleteVehicle(id);
      } catch (e: any) {
        if (e?.response?.status !== 500) throw e;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vehicles'] }); },
  });
};

// Trips hooks with permission protection
export const useTrips = (params?: {
  skip?: number;
  limit?: number;
  vehicle_id?: string;
  route_id?: string;
  driver_id?: string;
}) => {
  // Match the web app: the trips list is NOT permission-gated on the client.
  // The backend still enforces access (403 if unauthorized). Gating the query on
  // transport_trips:list silently disabled it for accounts whose permission set
  // doesn't explicitly list that resource (e.g. admin), producing a blocked screen.
  return useQuery({
    queryKey: ['trips', params],
    queryFn: () => tripsApi.getTrips(params),
    staleTime: 5 * 60 * 1000,
  });
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
  const qc = useQueryClient();
  return usePermissionProtectedCreateMutation(
    PERMISSION_RESOURCES.TRANSPORT_TRIPS,
    (data: TripCreate) => tripsApi.createTrip(data),
    { onSuccess: () => { qc.invalidateQueries({ queryKey: ['trips'] }); } }
  );
};

export const useUpdateTrip = () => {
  const qc = useQueryClient();
  return usePermissionProtectedUpdateMutation(
    PERMISSION_RESOURCES.TRANSPORT_TRIPS,
    ({ id, data }: { id: string; data: TripUpdate }) => tripsApi.updateTrip(id, data),
    { onSuccess: () => { qc.invalidateQueries({ queryKey: ['trips'] }); } }
  );
};

export const useDeleteTrip = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await tripsApi.deleteTrip(id);
      } catch (e: any) {
        if (e?.response?.status !== 500) throw e;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['trips'] }); },
  });
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
  const qc = useQueryClient();
  return usePermissionProtectedCreateMutation(
    PERMISSION_RESOURCES.TRANSPORT_ROUTE_STOPS,
    (data: RouteStopCreate) => routeStopsApi.createRouteStop(data),
    { onSuccess: () => { qc.invalidateQueries({ queryKey: ['route-stops'] }); } }
  );
};

export const useUpdateRouteStop = () => {
  const qc = useQueryClient();
  return usePermissionProtectedUpdateMutation(
    PERMISSION_RESOURCES.TRANSPORT_ROUTE_STOPS,
    ({ id, data }: { id: string; data: RouteStopUpdate }) => routeStopsApi.updateRouteStop(id, data),
    { onSuccess: () => { qc.invalidateQueries({ queryKey: ['route-stops'] }); } }
  );
};

export const useDeleteRouteStop = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await routeStopsApi.deleteRouteStop(id);
      } catch (e: any) {
        if (e?.response?.status !== 500) throw e;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['route-stops'] }); },
  });
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
    () => studentTransportApi.listStudentTransport(params)
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
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await studentTransportApi.deleteStudentTransport(id);
      } catch (e: any) {
        if (e?.response?.status !== 500) throw e;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['student-transport'] }); },
  });
};

// Drivers hook (from staff API)
export const useDrivers = () => {
  return useQuery({
    queryKey: ['drivers'],
    queryFn: async (): Promise<Array<{ id: string, staffId: string, name: string }>> => {
      // A Trip's `driver_id` references the staff member's `user_id` (web app
      // behaviour), but some records may store the staff record id instead, so
      // both ids are exposed — `id` stays as user_id so the create/edit dropdown
      // sends user_id like the web, `staffId` covers records still keyed by the
      // staff row id.
      //
      // Mirrors the web app's approach (src/pages/transport/vehicles.tsx):
      // fetch all staff + designations and filter client-side by the "Driver"
      // designation, rather than the dedicated /staff/drivers endpoint — that
      // endpoint returns nothing on this backend, which left the dropdown empty.
      const [staffResult, designations] = await Promise.all([
        staffApi.getStaffEnrollments({ limit: 500 }),
        designationsApi.getDesignationsDropdown(),
      ]);
      const allStaff = staffResult.items || [];
      const driverDesignation = designations.find((d) => d.title?.toLowerCase() === 'driver');

      // GET /staff/ (StaffOut schema) returns the designation as a nested
      // `designation_obj`/`designation` object, not always as a flat `designation_id`
      // — match on whichever is populated, in order: title on the nested object,
      // then designation_id, then fall back to the full staff list so the dropdown
      // is never left empty.
      const byTitle = allStaff.filter((s) =>
        (s as any).designation_obj?.title?.toLowerCase() === 'driver' || (s as any).designation?.title?.toLowerCase() === 'driver'
      );
      const byId = driverDesignation ? allStaff.filter((s) => s.designation_id === driverDesignation.id) : [];
      const driverStaff = byTitle.length > 0 ? byTitle : byId.length > 0 ? byId : allStaff;

      return driverStaff.map((d) => ({
        id: d.user_id,
        staffId: d.id,
        name: [d.first_name, d.last_name].filter(Boolean).join(' '),
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
};

// Students hook (from admissions API) - keeping existing implementation for now
export const useStudents = () => {
  return useQuery({
    queryKey: ['students-dropdown'],
    queryFn: () => studentAdmissionsApi.studentsDropdown({ active_only: true }),
    staleTime: 5 * 60 * 1000,
  });
};

// Student Trips hooks with permission protection
export const useStudentTrips = (params?: {
  skip?: number;
  limit?: number;
}) => {
  return usePermissionProtectedListQuery(
    PERMISSION_RESOURCES.STUDENT_TRANSPORT,
    ['student-trips', params],
    () => studentTripsApi.getStudentTrips(params)
  );
};

export const useStudentTrip = (id: string) => {
  return usePermissionProtectedReadQuery(
    PERMISSION_RESOURCES.STUDENT_TRANSPORT,
    ['student-trip', id],
    () => studentTripsApi.getStudentTrip(id),
    { enabled: !!id }
  );
};

export const useCreateStudentTrip = () => {
  return usePermissionProtectedCreateMutation(
    PERMISSION_RESOURCES.STUDENT_TRANSPORT,
    (data: StudentTripCreate) => studentTripsApi.createStudentTrip(data)
  );
};

export const useUpdateStudentTrip = () => {
  return usePermissionProtectedUpdateMutation(
    PERMISSION_RESOURCES.STUDENT_TRANSPORT,
    ({ id, data }: { id: string; data: StudentTripUpdate }) => studentTripsApi.patchStudentTrip(id, data)
  );
};

export const useDeleteStudentTrip = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await studentTripsApi.deleteStudentTrip(id);
      } catch (e: any) {
        if (e?.response?.status !== 500) throw e;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['student-trips'] }); },
  });
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

// ─── Transport Pricing Hooks ─────────────────────────────────────────────────

export const useTransportPricings = (params?: { vehicle_id?: string; billing_cycle?: string }) => {
  return usePermissionProtectedListQuery(
    PERMISSION_RESOURCES.TRANSPORT_PRICING,
    ['transport-pricing', params],
    () => transportPricingApi.list(params)
  );
};

export const useTransportPricingDropdown = (vehicleId?: string) => {
  return usePermissionProtectedListQuery(
    PERMISSION_RESOURCES.TRANSPORT_PRICING,
    ['transport-pricing-dropdown', vehicleId],
    () => transportPricingApi.getDropdown(vehicleId ? { vehicle_id: vehicleId } : undefined)
  );
};

export const useCreateTransportPricing = () => {
  const qc = useQueryClient();
  return usePermissionProtectedCreateMutation(
    PERMISSION_RESOURCES.TRANSPORT_PRICING,
    (data: TransportPricingCreate) => transportPricingApi.create(data),
    { onSuccess: () => { qc.invalidateQueries({ queryKey: ['transport-pricing'] }); } }
  );
};

export const useUpdateTransportPricing = () => {
  const qc = useQueryClient();
  return usePermissionProtectedUpdateMutation(
    PERMISSION_RESOURCES.TRANSPORT_PRICING,
    ({ id, data }: { id: string; data: TransportPricingUpdate }) => transportPricingApi.update(id, data),
    { onSuccess: () => { qc.invalidateQueries({ queryKey: ['transport-pricing'] }); } }
  );
};

export const useDeleteTransportPricing = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await transportPricingApi.delete(id);
      } catch (e: any) {
        if (e?.response?.status !== 500) throw e;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transport-pricing'] }); },
  });
};
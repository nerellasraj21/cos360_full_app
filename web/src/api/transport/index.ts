import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import CAxios from '../index';
import type { Route, RouteInput } from '@/types/masters/route';
import type { Vehicle, VehicleInput } from '@/types/masters/vehicle';
import type { Trip, TripInput } from '@/types/masters/trip';
import type { StudentTransport, StudentTransportInput, StudentTransportUpdateInput } from '@/types/masters/studentTransport';
import type { RouteStop, RouteStopInput } from '@/types/masters/routeStop';
import {
  ROUTES,
  ROUTES_ALL,
  ROUTES_DROPDOWN,
  ROUTES_STOPS_BY_ROUTE,
  VEHICLES,
  VEHICLES_DROPDOWN,
  TRIPS,
  STUDENT_TRANSPORT_BASE,
  ROUTE_STOPS
} from '@/constants/api/transport';

// Route Management
export async function fetchRoutes(params?: {
  skip?: number;
  limit?: number;
  is_active?: boolean;
}): Promise<Route[]> {
  const queryParams = new URLSearchParams();
  if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
  if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
  if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());

  const { data } = await CAxios.get<Route[]>(`${ROUTES}?${queryParams.toString()}`);
  return data;
}

export async function fetchAllRoutes(): Promise<Route[]> {
  const { data } = await CAxios.get<Route[]>(ROUTES_ALL);
  return data;
}

export async function fetchRouteById(id: string): Promise<Route> {
  const { data } = await CAxios.get<Route>(`${ROUTES}${id}`);
  return data;
}

export async function createRoute(routeData: RouteInput): Promise<Route> {
  const { data } = await CAxios.post<Route>(ROUTES, routeData);
  return data;
}

export async function updateRoute(id: string, routeData: Partial<RouteInput>): Promise<Route> {
  const { data } = await CAxios.put<Route>(`${ROUTES}${id}`, routeData);
  return data;
}

export async function deleteRoute(id: string): Promise<void> {
  await CAxios.delete(`${ROUTES}${id}`);
}

export async function fetchRoutesDropdown(): Promise<Route[]> {
  const { data } = await CAxios.get<Route[]>(ROUTES_DROPDOWN);
  return data;
}

export async function fetchRouteStopsByRoute(routeId: string): Promise<any[]> {
  const { data } = await CAxios.get<any[]>(`${ROUTES_STOPS_BY_ROUTE}?route_id=${routeId}`);
  return data;
}

// Route Stop Management
export async function fetchRouteStops(params?: {
  skip?: number;
  limit?: number;
  route_id?: number;
  is_active?: boolean;
}): Promise<RouteStop[]> {
  const queryParams = new URLSearchParams();
  if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
  if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
  if (params?.route_id !== undefined) queryParams.append('route_id', params.route_id.toString());
  if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());

  const { data } = await CAxios.get<RouteStop[]>(`${ROUTE_STOPS}?${queryParams.toString()}`);
  return data;
}

export async function fetchRouteStopById(id: number): Promise<RouteStop> {
  const { data } = await CAxios.get<RouteStop>(`${ROUTE_STOPS}${id}`);
  return data;
}

export async function createRouteStop(routeStopData: RouteStopInput): Promise<RouteStop> {
  const { data } = await CAxios.post<RouteStop>(ROUTE_STOPS, routeStopData);
  return data;
}

export async function updateRouteStop(id: number, routeStopData: Partial<RouteStopInput>): Promise<RouteStop> {
  const { data } = await CAxios.put<RouteStop>(`${ROUTE_STOPS}${id}`, routeStopData);
  return data;
}

export async function deleteRouteStop(id: number): Promise<void> {
  await CAxios.delete(`${ROUTE_STOPS}${id}`);
}

// Vehicle Management
export async function fetchVehicles(params?: {
  skip?: number;
  limit?: number;
  is_active?: boolean;
}): Promise<Vehicle[]> {
  const queryParams = new URLSearchParams();
  if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
  if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
  if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());

  const { data } = await CAxios.get<Vehicle[]>(`${VEHICLES}?${queryParams.toString()}`);
  return data;
}

export async function fetchVehicleById(id: number): Promise<Vehicle> {
  const { data } = await CAxios.get<Vehicle>(`${VEHICLES}${id}`);
  return data;
}

export async function createVehicle(vehicleData: VehicleInput): Promise<Vehicle> {
  const { data } = await CAxios.post<Vehicle>(VEHICLES, vehicleData);
  return data;
}

export async function updateVehicle(id: number, vehicleData: Partial<VehicleInput>): Promise<Vehicle> {
  const { data } = await CAxios.put<Vehicle>(`${VEHICLES}${id}`, vehicleData);
  return data;
}

export async function deleteVehicle(id: number): Promise<void> {
  await CAxios.delete(`${VEHICLES}${id}`);
}

export async function fetchVehiclesDropdown(): Promise<Vehicle[]> {
  const { data } = await CAxios.get<Vehicle[]>(VEHICLES_DROPDOWN);
  return data;
}

// Trip Management
export async function fetchTrips(params?: {
  skip?: number;
  limit?: number;
  vehicle_id?: number;
  route_id?: number;
  driver_id?: number;
}): Promise<Trip[]> {
  const queryParams = new URLSearchParams();
  if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
  if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
  if (params?.vehicle_id !== undefined) queryParams.append('vehicle_id', params.vehicle_id.toString());
  if (params?.route_id !== undefined) queryParams.append('route_id', params.route_id.toString());
  if (params?.driver_id !== undefined) queryParams.append('driver_id', params.driver_id.toString());

  const { data } = await CAxios.get<Trip[]>(`${TRIPS}?${queryParams.toString()}`);
  return data;
}

export async function fetchTripById(id: number): Promise<Trip> {
  const { data } = await CAxios.get<Trip>(`${TRIPS}${id}`);
  return data;
}

export async function createTrip(tripData: TripInput): Promise<Trip> {
  const { data } = await CAxios.post<Trip>(TRIPS, tripData);
  return data;
}

export async function updateTrip(id: number, tripData: Partial<TripInput>): Promise<Trip> {
  const { data } = await CAxios.put<Trip>(`${TRIPS}${id}`, tripData);
  return data;
}

export async function deleteTrip(id: number): Promise<void> {
  await CAxios.delete(`${TRIPS}${id}`);
}

// Student Transport Management
export async function fetchStudentTransports(params?: {
  skip?: number;
  limit?: number;
  student_id?: string;
  route_id?: string;
  is_active?: boolean;
}): Promise<StudentTransport[]> {
  const queryParams = new URLSearchParams();
  if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
  if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
  if (params?.student_id) queryParams.append('student_id', params.student_id);
  if (params?.route_id) queryParams.append('route_id', params.route_id);
  if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());

  const { data } = await CAxios.get<StudentTransport[]>(`${STUDENT_TRANSPORT_BASE}?${queryParams.toString()}`);
  return data;
}

export async function fetchStudentTransportById(id: string): Promise<StudentTransport> {
  const { data } = await CAxios.get<StudentTransport>(`${STUDENT_TRANSPORT_BASE}/${id}`);
  return data;
}

export async function createStudentTransport(transportData: StudentTransportInput): Promise<StudentTransport> {
  const { data } = await CAxios.post<StudentTransport>(STUDENT_TRANSPORT_BASE, transportData);
  return data;
}

export async function updateStudentTransport(id: string, transportData: StudentTransportUpdateInput): Promise<StudentTransport> {
  const { data } = await CAxios.put<StudentTransport>(`${STUDENT_TRANSPORT_BASE}/${id}`, transportData);
  return data;
}

export async function deleteStudentTransport(id: string): Promise<void> {
  await CAxios.delete(`${STUDENT_TRANSPORT_BASE}/${id}`);
}

// React Query hooks for Routes
export function useRoutes(params?: { skip?: number; limit?: number; is_active?: boolean }) {
  return useQuery({
    queryKey: ['routes', params],
    queryFn: () => fetchRoutes(params),
  });
}

export function useAllRoutes() {
  return useQuery({
    queryKey: ['routes-all'],
    queryFn: fetchAllRoutes,
  });
}

export function useRoute(id: string) {
  return useQuery({
    queryKey: ['route', id],
    queryFn: () => fetchRouteById(id),
    enabled: !!id,
  });
}

export function useCreateRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createRoute,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
    },
  });
}

export function useUpdateRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<RouteInput> }) => updateRoute(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
    },
  });
}

export function useDeleteRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteRoute,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
    },
  });
}

export function useRoutesDropdown() {
  return useQuery({
    queryKey: ['routes-dropdown'],
    queryFn: fetchRoutesDropdown,
  });
}

export function useRouteStopsByRoute(routeId: string) {
  return useQuery({
    queryKey: ['route-stops', routeId],
    queryFn: () => fetchRouteStopsByRoute(routeId),
    enabled: !!routeId,
  });
}

// React Query hooks for Vehicles
export function useVehicles(params?: { skip?: number; limit?: number; is_active?: boolean }) {
  return useQuery({
    queryKey: ['vehicles', params],
    queryFn: () => fetchVehicles(params),
  });
}

export function useVehicle(id: number) {
  return useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => fetchVehicleById(id),
    enabled: !!id,
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<VehicleInput> }) => updateVehicle(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

export function useVehiclesDropdown() {
  return useQuery({
    queryKey: ['vehicles-dropdown'],
    queryFn: fetchVehiclesDropdown,
  });
}

// React Query hooks for Trips
export function useTrips(params?: { skip?: number; limit?: number; vehicle_id?: number; route_id?: number; driver_id?: number }) {
  return useQuery({
    queryKey: ['trips', params],
    queryFn: () => fetchTrips(params),
  });
}

export function useTrip(id: number) {
  return useQuery({
    queryKey: ['trip', id],
    queryFn: () => fetchTripById(id),
    enabled: !!id,
  });
}

export function useCreateTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTrip,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}

export function useUpdateTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<TripInput> }) => updateTrip(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}

export function useDeleteTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTrip,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}

// React Query hooks for Student Transport
export function useStudentTransports(params?: { skip?: number; limit?: number; student_id?: string; route_id?: string; is_active?: boolean }) {
  return useQuery({
    queryKey: ['student-transports', params],
    queryFn: () => fetchStudentTransports(params),
  });
}

export function useStudentTransport(id: string) {
  return useQuery({
    queryKey: ['student-transport', id],
    queryFn: () => fetchStudentTransportById(id),
    enabled: !!id,
  });
}

export function useCreateStudentTransport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createStudentTransport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-transports'] });
    },
  });
}

export function useUpdateStudentTransport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: StudentTransportUpdateInput }) => updateStudentTransport(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-transports'] });
    },
  });
}

export function useDeleteStudentTransport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteStudentTransport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-transports'] });
    },
  });
}

// React Query hooks for Route Stops
export function useRouteStops(params?: { skip?: number; limit?: number; route_id?: number; is_active?: boolean }) {
  return useQuery({
    queryKey: ['route-stops', params],
    queryFn: () => fetchRouteStops(params),
  });
}

export function useRouteStop(id: number) {
  return useQuery({
    queryKey: ['route-stop', id],
    queryFn: () => fetchRouteStopById(id),
    enabled: !!id,
  });
}

export function useCreateRouteStop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createRouteStop,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['route-stops'] });
    },
  });
}

export function useUpdateRouteStop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<RouteStopInput> }) => updateRouteStop(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['route-stops'] });
    },
  });
}

export function useDeleteRouteStop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteRouteStop,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['route-stops'] });
    },
  });
}
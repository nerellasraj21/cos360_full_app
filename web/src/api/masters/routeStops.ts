// Dummy data for local development
import type { RouteStop, RouteStopInput, RouteStopPatch } from '@/types/masters/routeStop';

let dummyRouteStops: RouteStop[] = [
  {
    id: 1,
    route_id: 1,
    name: 'Stop 1',
    number: 1,
    reaching_time: '08:00:00Z',
    fees: 100,
    is_active: true,
  },
  {
    id: 2,
    route_id: 1,
    name: 'Stop 2',
    number: 2,
    reaching_time: '08:15:00Z',
    fees: 120,
    is_active: true,
  },
  {
    id: 3,
    route_id: 2,
    name: 'Stop A',
    number: 1,
    reaching_time: '09:00:00Z',
    fees: 90,
    is_active: false,
  },
];

export const fetchRouteStops = async (): Promise<RouteStop[]> => {
  return Promise.resolve([...dummyRouteStops]);
};

export const fetchRouteStopById = async (stop_id: number): Promise<RouteStop> => {
  const stop = dummyRouteStops.find((s) => s.id === stop_id);
  if (!stop) throw new Error('Route stop not found');
  return Promise.resolve({ ...stop });
};

export const createRouteStop = async (routeStop: RouteStopInput): Promise<RouteStop> => {
  const newStop: RouteStop = {
    ...routeStop,
    id: dummyRouteStops.length ? Math.max(...dummyRouteStops.map(s => s.id)) + 1 : 1,
    is_active: routeStop.is_active ?? true,
  };
  dummyRouteStops.push(newStop);
  return Promise.resolve({ ...newStop });
};

export const updateRouteStop = async (stop_id: number, routeStop: RouteStopInput): Promise<RouteStop> => {
  const idx = dummyRouteStops.findIndex((s) => s.id === stop_id);
  if (idx === -1) throw new Error('Route stop not found');
  dummyRouteStops[idx] = { ...dummyRouteStops[idx], ...routeStop, id: stop_id };
  return Promise.resolve({ ...dummyRouteStops[idx] });
};

export const patchRouteStop = async (stop_id: number, routeStop: RouteStopPatch): Promise<RouteStop> => {
  const idx = dummyRouteStops.findIndex((s) => s.id === stop_id);
  if (idx === -1) throw new Error('Route stop not found');
  dummyRouteStops[idx] = { ...dummyRouteStops[idx], ...routeStop, id: stop_id };
  return Promise.resolve({ ...dummyRouteStops[idx] });
};

export const deleteRouteStop = async (stop_id: number): Promise<void> => {
  dummyRouteStops = dummyRouteStops.filter((s) => s.id !== stop_id);
  return Promise.resolve();
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
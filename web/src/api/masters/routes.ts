import type { Route, RouteInput } from '@/types/masters/route';
// import CAxios from '../index';
// import type { Route, RouteInput } from '@/types/masters/route';

// const ROUTES_API_BASE = '/api/v1/routes/';

// export const fetchRoutes = async (): Promise<Route[]> => {
//     const { data } = await CAxios.get(ROUTES_API_BASE);
//     return data;
// };

// export const fetchRouteById = async (id: number): Promise<Route> => {
//     const { data } = await CAxios.get(`${ROUTES_API_BASE}${id}`);
//     return data;
// };

// export const createRoute = async (route: RouteInput): Promise<Route> => {
//     const { data } = await CAxios.post(ROUTES_API_BASE, route);
//     return data;
// };

// export const updateRoute = async (id: number, route: RouteInput): Promise<Route> => {
//     const { data } = await CAxios.put(`${ROUTES_API_BASE}${id}`, route);
//     return data;
// };

// export const deleteRoute = async (id: number): Promise<void> => {
//     await CAxios.delete(`${ROUTES_API_BASE}${id}`);
// }; 

// Dummy data for development
export const dummyRoutes: Route[] = [
    {
        id: 1,
        route_name: "Route 1",
        starting_stop: "Stop A",
        ending_stop: "Stop B",
        number_of_stops: 5,
        route_type: "Regular",
        trip_type: "Morning",
        start_time: "08:00:00",
        end_time: "09:00:00",
        is_active: true,
    },
    {
        id: 2,
        route_name: "Route 2",
        starting_stop: "Stop C",
        ending_stop: "Stop D",
        number_of_stops: 7,
        route_type: "Express",
        trip_type: "Evening",
        start_time: "17:00:00",
        end_time: "18:00:00",
        is_active: false,
    },
];

let routesData: Route[] = [...dummyRoutes];

export const fetchRoutes = async (): Promise<Route[]> => {
    return [...routesData];
};

export const fetchRouteById = async (id: number): Promise<Route> => {
    const route = routesData.find(r => r.id === id);
    if (!route) throw new Error('Route not found');
    return { ...route };
};



export const createRoute = async (route: RouteInput): Promise<Route> => {
    const newId = routesData.length ? Math.max(...routesData.map(r => r.id)) + 1 : 1;
    const newRoute: Route = { id: newId, ...route, is_active: route.is_active ?? true };
    routesData.push(newRoute);
    return { ...newRoute };
};

export const updateRoute = async (id: number, route: RouteInput): Promise<Route> => {
    const idx = routesData.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Route not found');
    routesData[idx] = { id, ...route, is_active: route.is_active ?? routesData[idx].is_active };
    return { ...routesData[idx] };
};

export const deleteRoute = async (id: number): Promise<void> => {
    const idx = routesData.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Route not found');
    routesData.splice(idx, 1);
};

import type { Trip, TripInput } from '@/types/masters/trip';

// Dummy data for local development
export const dummyTrips: Trip[] = [
    {
        id: 1,
        vehicle_id: 1,
        route_id: 1,
        driver_id: 1,
        trip_number: 1,
    },
    {
        id: 2,
        vehicle_id: 2,
        route_id: 2,
        driver_id: 2,
        trip_number: 2,
    },
];

let tripsData: Trip[] = [...dummyTrips];

export const fetchTrips = async (): Promise<Trip[]> => {
    return [...tripsData];
};

export const fetchTripById = async (id: number): Promise<Trip | undefined> => {
    return tripsData.find((t) => t.id === id);
};

export const createTrip = async (trip: TripInput): Promise<Trip> => {
    const newId = tripsData.length ? Math.max(...tripsData.map(t => t.id)) + 1 : 1;
    const newTrip: Trip = { id: newId, ...trip };
    tripsData.push(newTrip);
    return { ...newTrip };
};

export const updateTrip = async (id: number, trip: TripInput): Promise<Trip> => {
    const idx = tripsData.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error('Trip not found');
    tripsData[idx] = { id, ...trip };
    return { ...tripsData[idx] };
};

export const deleteTrip = async (id: number): Promise<void> => {
    const idx = tripsData.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error('Trip not found');
    tripsData.splice(idx, 1);
}; 
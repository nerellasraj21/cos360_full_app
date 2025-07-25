export interface Trip {
    id: number;
    vehicle_id: number;
    route_id: number;
    driver_id: number;
    trip_number: number;
}

export interface TripInput {
    vehicle_id: number;
    route_id: number;
    driver_id: number;
    trip_number: number;
} 
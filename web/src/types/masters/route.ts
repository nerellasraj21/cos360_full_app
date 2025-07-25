export interface Route {
    id: number;
    route_name: string;
    starting_stop: string;
    ending_stop: string;
    number_of_stops: number;
    route_type: string;
    trip_type: string;
    start_time: string; // ISO time string
    end_time: string;   // ISO time string
    is_active: boolean;
}

export interface RouteInput {
    route_name: string;
    starting_stop: string;
    ending_stop: string;
    number_of_stops: number;
    route_type: string;
    trip_type: string;
    start_time: string;
    end_time: string;
    is_active?: boolean;
} 
import type { StudentOut } from '../admission';
import type { TripOut } from './trip';
import type { RouteStop } from './routeStop';

// Updated to match backend schema (2026-02-09)
// Backend now uses StudentTrip-like schema for student-transport endpoint
export interface StudentTransportBase {
    trip_id: string;          // UUID - Trip reference (required)
    student_id: string;       // UUID - Student reference (required)
    stop_id: string;          // UUID - Stop reference (required)
    fee_term_id: string;      // UUID - Fee term reference (required)
    fee_per_term: number;     // Fee amount per term (required)
}

export interface StudentTransportCreate extends StudentTransportBase {}

export interface StudentTransportUpdate {
    trip_id?: string;
    student_id?: string;
    stop_id?: string;
    fee_term_id?: string;
    fee_per_term?: number;
    is_active?: boolean;
}

export interface StudentTransportOut extends StudentTransportBase {
    id: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    student?: StudentOut;
    trip?: TripOut;
    route_stop?: RouteStop;
}

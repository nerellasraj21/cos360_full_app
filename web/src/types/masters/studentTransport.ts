import type { StudentOut } from '../admission';
import type { TripOut } from './trip';
import type { RouteStop } from './routeStop';

export interface StudentTransportBase {
    student_id: string;
    route_id: string;
    stop_id: string;
    trip_type: string;
    academic_year_id: string;
    fare_amount: number;
}

export interface StudentTransportCreate extends StudentTransportBase {}

export interface StudentTransportUpdate {
    student_id?: string;
    route_id?: string;
    stop_id?: string;
    trip_type?: string;
    academic_year_id?: string;
    fare_amount?: number;
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
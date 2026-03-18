// Nested types in enriched transport response (March 2026)
export interface TransportRouteDetail {
  id: string;
  route_name: string;
  starting_stop: string;
  ending_stop: string;
  start_time: string;  // HH:MM:SS
  end_time: string;    // HH:MM:SS
}

export interface TransportVehicleDetail {
  id: string;
  name: string;
  registration_number: string;
  vehicle_type: string;
}

export interface TransportTripDetail {
  id: string;
  trip_number: number;
  route?: TransportRouteDetail;
  vehicle?: TransportVehicleDetail;
}

export interface TransportStopDetail {
  id: string;
  name: string;
  number: number;
  reaching_time: string | null;  // HH:MM:SS or null (deprecated)
  pickup_time?: string | null;   // HH:MM:SS or null
  drop_time?: string | null;     // HH:MM:SS or null
  fees: number;
}

export interface TransportPricingDetail {
  id: string;
  billing_cycle: string;
  cycle_name: string;
  amount: number;
}

export interface StudentTransportBase {
    trip_id: string;
    student_id: string;
    stop_id: string;
    fee_per_term: number;
    pricing_id?: string | null;
}

export interface StudentTransportCreate extends StudentTransportBase {}

export interface StudentTransportUpdate {
    trip_id?: string;
    stop_id?: string;
    fee_per_term?: number;
    pricing_id?: string | null;
}

export interface StudentInfo {
    id: string;
    first_name: string;
    last_name: string;
}

export interface StudentTransportOut extends StudentTransportBase {
    id: string;
    created_at: string;
    updated_at: string;
    trip?: TransportTripDetail;
    stop?: TransportStopDetail;
    student?: StudentInfo;
    pricing?: TransportPricingDetail;
}

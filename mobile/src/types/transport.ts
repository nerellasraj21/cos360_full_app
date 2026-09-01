// Transport Route Management Types

export interface Route {
  id: string;
  route_name: string;
  starting_stop: string;
  ending_stop: string;
  number_of_stops: number;
  route_type: string;  // Dynamic — fetched from /masters/route-types
  trip_type: string;   // Dynamic — fetched from /masters/trip-types
  start_time: string; // HH:MM:SS format
  end_time: string; // HH:MM:SS format
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RouteCreate {
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

export interface RouteUpdate {
  route_name?: string;
  starting_stop?: string;
  ending_stop?: string;
  number_of_stops?: number;
  route_type?: string;
  trip_type?: string;
  start_time?: string;
  end_time?: string;
  is_active?: boolean;
}

export interface RouteDropdown {
  id: string;
  route_name: string;
}

export interface RouteStop {
  id: string;
  route_id: string;
  name: string;
  number: number;
  reaching_time: string; // HH:MM:SS format
  pickup_time?: string;  // HH:MM:SS format
  drop_time?: string;    // HH:MM:SS format
  fees: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RouteStopCreate {
  route_id: string;
  name: string;
  number: number;
  reaching_time: string;
  pickup_time?: string;
  drop_time?: string;
  fees?: number;
  is_active?: boolean;
}

export interface RouteStopUpdate {
  route_id?: string;
  name?: string;
  number?: number;
  reaching_time?: string;
  pickup_time?: string;
  drop_time?: string;
  fees?: number;
  is_active?: boolean;
}

export interface Vehicle {
  id: string;
  name: string;
  registration_number: string;
  vehicle_type: 'Bus' | 'Van' | 'Auto';
  fees?: number;
  fee_category_id?: string | null;
  fee_type_id?: string | null;
  is_ac?: boolean | null;
  driver_name?: string | null;
  co_driver_name?: string | null;
  driving_licence_no?: string | null;
  driving_licence_exp_date?: string | null;
  bus_insurance_vendor?: string | null;
  insurance_expiry_date?: string | null;
  trip_count?: number;
  number_of_trips?: number | null;
  last_inspected_date: string; // Date in YYYY-MM-DD format
  pollution_renewal_date: string; // Date in YYYY-MM-DD format
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface VehicleCreate {
  name: string;
  registration_number: string;
  vehicle_type: 'Bus' | 'Van' | 'Auto';
  fees?: number;
  fee_category_id?: string | null;
  fee_type_id?: string | null;
  is_ac?: boolean | null;
  driver_name?: string | null;
  co_driver_name?: string | null;
  driving_licence_no?: string | null;
  driving_licence_exp_date?: string | null;
  bus_insurance_vendor?: string | null;
  insurance_expiry_date?: string | null;
  number_of_trips?: number | null;
  last_inspected_date: string;
  pollution_renewal_date: string;
  is_active?: boolean;
}

export interface VehicleUpdate {
  name?: string;
  registration_number?: string;
  vehicle_type?: 'Bus' | 'Van' | 'Auto';
  fees?: number;
  fee_category_id?: string | null;
  fee_type_id?: string | null;
  is_ac?: boolean | null;
  driver_name?: string | null;
  co_driver_name?: string | null;
  driving_licence_no?: string | null;
  driving_licence_exp_date?: string | null;
  bus_insurance_vendor?: string | null;
  insurance_expiry_date?: string | null;
  number_of_trips?: number | null;
  last_inspected_date?: string;
  pollution_renewal_date?: string;
  is_active?: boolean;
}

export interface VehicleDropdown {
  id: string;
  name: string;
}

export interface Trip {
  id: string;
  vehicle_id: string;
  route_id: string;
  driver_id: string;
  trip_number: number;
  created_at?: string;
  updated_at?: string;
}

export interface TripCreate {
  vehicle_id: string;
  route_id: string;
  driver_id: string;
  trip_number: number;
}

export interface TripUpdate {
  vehicle_id?: string;
  route_id?: string;
  driver_id?: string;
  trip_number?: number;
}

export interface StudentTransport {
  id: string;
  student_id: string;
  route_id: string;
  stop_id: string;
  trip_type: string;
  academic_year_id: string;
  fare_amount: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudentTransportCreate {
  student_id: string;
  route_id: string;
  stop_id: string;
  trip_type: string;
  academic_year_id: string;
  fare_amount: number;
}

export interface StudentTransportUpdate {
  student_id?: string;
  route_id?: string;
  stop_id?: string;
  trip_type?: string;
  academic_year_id?: string;
  fare_amount?: number;
  is_active?: boolean;
}

export interface StudentTrip {
  id: string;
  trip_id: string;
  student_id: string;
  stop_id: string;
  fee_per_term: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface StudentTripCreate {
  trip_id: string;
  student_id: string;
  stop_id: string;
  fee_per_term: number;
}

export interface StudentTripUpdate {
  trip_id?: string;
  student_id?: string;
  stop_id?: string;
  fee_per_term?: number;
  is_active?: boolean;
}

// Transport Pricing Types (aligned with backend schema)
export type BillingCycle = 'annual' | 'semester' | 'monthly' | 'custom';

export interface TransportPricing {
  id: string;
  vehicle_id: string;
  route_id: string | null;
  billing_cycle: BillingCycle;
  cycle_name: string;
  amount: number; // Decimal from backend — use Number() if returned as string
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  is_active: boolean;
  created_at: string;
  updated_at: string;
  vehicle_name: string;
  route_name: string | null;
}

export interface TransportPricingCreate {
  vehicle_id: string;
  route_id?: string | null;
  billing_cycle: BillingCycle;
  cycle_name: string;
  amount: number;
  start_date: string;
  end_date: string;
  is_active?: boolean;
}

export interface TransportPricingUpdate {
  vehicle_id?: string;
  route_id?: string | null;
  billing_cycle?: BillingCycle;
  cycle_name?: string;
  amount?: number;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
}

// Dropdown types
export interface RouteTypeOption {
  label: string;
  value: 'upward' | 'downward';
}

export interface TripTypeOption {
  label: string;
  value: 'first trip' | 'second trip';
}

export interface VehicleTypeOption {
  label: string;
  value: 'Bus' | 'Van' | 'Auto';
}

// API Response types
export interface TransportPaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}
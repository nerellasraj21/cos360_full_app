/**
 * Route Types
 *
 * Updated to use UUID references for route_type and trip_type
 * instead of string values.
 */

export interface Route {
  id: string; // UUID
  route_name: string;
  starting_stop: string;
  ending_stop: string;
  number_of_stops: number;
  route_type: string | null; // Type name as STRING (e.g., "Upward")
  trip_type: string | null; // Type name as STRING (e.g., "First Trip")
  start_time: string; // HH:MM:SS format
  end_time: string; // HH:MM:SS format
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RouteInput {
  route_name: string;
  starting_stop: string;
  ending_stop: string;
  number_of_stops: number;
  route_type: string; // Type name as STRING (e.g., "Upward")
  trip_type: string; // Type name as STRING (e.g., "First Trip")
  start_time: string; // HH:MM:SS format
  end_time: string; // HH:MM:SS format
  is_active?: boolean;
}

export interface RouteUpdate {
  route_name?: string;
  starting_stop?: string;
  ending_stop?: string;
  number_of_stops?: number;
  route_type?: string; // Type name as STRING (e.g., "Upward")
  trip_type?: string; // Type name as STRING (e.g., "First Trip")
  start_time?: string;
  end_time?: string;
  is_active?: boolean;
}

export interface RouteDropdown {
  id: string; // UUID
  route_name: string;
}
export interface TripBase {
  vehicle_id: string;
  route_id: string;
  driver_id: string;
  trip_number: number;
}

export interface TripCreate extends TripBase {}

export interface TripUpdate {
  vehicle_id?: string;
  route_id?: string;
  driver_id?: string;
  trip_number?: number;
}

export interface TripOut extends TripBase {
  id: string;
  created_at?: string;
  updated_at?: string;
}

export interface TripListResponse {
  items: TripOut[];
  total: number;
  skip?: number;
  limit?: number;
}

export interface Driver {
  full_name: string;
  user_id: string;
}

export interface DriverListResponse {
  items: Driver[];
  total: number;
  skip?: number;
  limit?: number;
}
export interface Route {
  id: string;
  route_name: string;
  starting_stop: string;
  ending_stop: string;
  number_of_stops: number;
  route_type: 'upward' | 'downward';
  trip_type: 'first trip' | 'second trip';
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
  route_type: 'upward' | 'downward';
  trip_type: 'first trip' | 'second trip';
  start_time: string; // HH:MM:SS format
  end_time: string; // HH:MM:SS format
  is_active?: boolean;
}

export interface RouteUpdate {
  route_name?: string;
  starting_stop?: string;
  ending_stop?: string;
  number_of_stops?: number;
  route_type?: 'upward' | 'downward';
  trip_type?: 'first trip' | 'second trip';
  start_time?: string;
  end_time?: string;
  is_active?: boolean;
}

export interface RouteDropdown {
  id: string;
  route_name: string;
}
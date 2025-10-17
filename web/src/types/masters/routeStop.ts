export interface RouteStop {
  id: string;
  route_id: string;
  name: string;
  number: number;
  reaching_time: string; // HH:MM:SS format
  fees: number; // Integer as per Backend
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RouteStopInput {
  route_id: string;
  name: string;
  number: number;
  reaching_time: string; // HH:MM:SS format
  fees: number;
  is_active?: boolean;
}

export interface RouteStopUpdate {
  route_id?: string;
  name?: string;
  number?: number;
  reaching_time?: string;
  fees?: number;
  is_active?: boolean;
}

export interface RouteStopDropdown {
  id: string;
  name: string;
  number: number;
  reaching_time?: string;
  fees?: number;
}
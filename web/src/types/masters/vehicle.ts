export interface Vehicle {
  id: string;
  name: string;
  registration_number: string;
  vehicle_type: 'Bus' | 'Van' | 'Auto';
  last_inspected_date: string; // Date in YYYY-MM-DD format
  pollution_renewal_date: string; // Date in YYYY-MM-DD format
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface VehicleInput {
  name: string;
  registration_number: string;
  vehicle_type: 'Bus' | 'Van' | 'Auto';
  last_inspected_date: string; // Date in YYYY-MM-DD format
  pollution_renewal_date: string; // Date in YYYY-MM-DD format
  is_active?: boolean;
}

export interface VehicleUpdate {
  name?: string;
  registration_number?: string;
  vehicle_type?: 'Bus' | 'Van' | 'Auto';
  last_inspected_date?: string;
  pollution_renewal_date?: string;
  is_active?: boolean;
}

export interface VehicleDropdown {
  id: string;
  name: string;
}

export interface VehicleRoute {
  id: string;
  name: string;
  route_number?: string;
}

export interface VehicleRouteStop {
  id: string;
  name: string;
  stop_order: number;
  latitude?: number;
  longitude?: number;
}
export interface Vehicle {
  id: string;
  name: string;
  registration_number: string;
  vehicle_type: 'Bus' | 'Van' | 'Auto';
  fees?: number;
  fee_category_id?: string | null;
  fee_type_id?: string | null;
  last_inspected_date: string;
  pollution_renewal_date: string;
  is_ac?: boolean | null;
  driver_name?: string | null;
  co_driver_name?: string | null;
  driving_licence_no?: string | null;
  driving_licence_exp_date?: string | null;
  bus_insurance_vendor?: string | null;
  insurance_expiry_date?: string | null;
  is_active: boolean;
  trip_count?: number;
  number_of_trips?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface VehicleInput {
  name: string;
  registration_number: string;
  vehicle_type: 'Bus' | 'Van' | 'Auto';
  fees?: number;
  fee_category_id?: string | null;
  fee_type_id?: string | null;
  last_inspected_date: string;
  pollution_renewal_date: string;
  is_ac?: boolean | null;
  driver_name?: string | null;
  co_driver_name?: string | null;
  driving_licence_no?: string | null;
  driving_licence_exp_date?: string | null;
  bus_insurance_vendor?: string | null;
  insurance_expiry_date?: string | null;
  number_of_trips?: number | null;
  is_active?: boolean;
}

export interface VehicleUpdate {
  name?: string;
  registration_number?: string;
  vehicle_type?: 'Bus' | 'Van' | 'Auto';
  fees?: number;
  fee_category_id?: string | null;
  fee_type_id?: string | null;
  last_inspected_date?: string;
  pollution_renewal_date?: string;
  is_ac?: boolean | null;
  driver_name?: string | null;
  co_driver_name?: string | null;
  driving_licence_no?: string | null;
  driving_licence_exp_date?: string | null;
  bus_insurance_vendor?: string | null;
  insurance_expiry_date?: string | null;
  number_of_trips?: number | null;
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

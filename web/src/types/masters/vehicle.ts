export interface Vehicle {
  id: number;
  name: string;
  registration_number: string;
  vehicle_type: string;
  last_inspected_date: string;
  pollution_renewal_date: string;
  is_active: boolean;
}

export interface VehicleInput {
  name: string;
  registration_number: string;
  vehicle_type: string;
  last_inspected_date: string;
  pollution_renewal_date: string;
  is_active: boolean;
} 
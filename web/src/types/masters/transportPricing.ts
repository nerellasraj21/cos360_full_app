export type BillingCycle = 'annual' | 'semester' | 'monthly' | 'custom';

export interface TransportPricing {
  id: string;
  vehicle_id: string;
  route_id: string | null;
  billing_cycle: BillingCycle;
  cycle_name: string;
  amount: number;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  is_active: boolean;
  created_at: string;
  updated_at: string;
  vehicle_name: string;
  route_name: string | null;
}

export interface TransportPricingInput {
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

export interface TransportPricingDropdown {
  id: string;
  cycle_name: string;
  billing_cycle: BillingCycle;
  amount: number;
}

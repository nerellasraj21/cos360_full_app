export interface RouteStop {
  id: number;
  route_id: number;
  name: string;
  number: number;
  reaching_time: string; // ISO time string
  fees: number;
  is_active: boolean;
}

export interface RouteStopInput {
  route_id: number;
  name: string;
  number: number;
  reaching_time: string;
  fees: number;
  is_active?: boolean;
}

export type RouteStopPatch = Partial<RouteStopInput>; 
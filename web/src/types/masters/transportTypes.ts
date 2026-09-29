/**
 * Transport Type Definitions
 *
 * Types for route types and trip types master data from backend.
 * These are now proper database entities with UUIDs.
 */

// Route Type (Upward, Downward, etc.)
export interface RouteType {
  id: string; // UUID
  type_name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RouteTypeCreate {
  type_name: string;
  description?: string;
  is_active?: boolean;
}

export interface RouteTypeUpdate {
  type_name?: string;
  description?: string;
  is_active?: boolean;
}

export interface RouteTypeDropdown {
  id: string; // UUID
  type_name: string;
}

// Trip Type (First Trip, Second Trip, etc.)
export interface TripType {
  id: string; // UUID
  type_name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TripTypeCreate {
  type_name: string;
  description?: string;
  is_active?: boolean;
}

export interface TripTypeUpdate {
  type_name?: string;
  description?: string;
  is_active?: boolean;
}

export interface TripTypeDropdown {
  id: string; // UUID
  type_name: string;
}

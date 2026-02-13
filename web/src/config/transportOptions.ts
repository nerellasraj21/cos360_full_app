/**
 * Transport Options Configuration
 *
 * This file contains configurable options for transport management.
 * Currently these are maintained in the frontend, but should eventually
 * be moved to backend master data endpoints:
 * - GET /masters/route-types
 * - GET /masters/trip-types
 *
 * @todo: Coordinate with backend to create proper master data tables
 */

export interface OptionItem {
  value: string;
  label: string;
}

/**
 * Route Type Options
 * Defines the direction of transport routes
 */
export const ROUTE_TYPE_OPTIONS: OptionItem[] = [
  { value: 'upward', label: 'Upward' },
  { value: 'downward', label: 'Downward' },
];

/**
 * Trip Type Options
 * Defines the timing/sequence of trips
 */
export const TRIP_TYPE_OPTIONS: OptionItem[] = [
  { value: 'first trip', label: 'First Trip' },
  { value: 'second trip', label: 'Second Trip' },
];

/**
 * Get route type options
 * Mimics API behavior for easy migration to backend endpoint
 */
export const getRouteTypeOptions = (): Promise<OptionItem[]> => {
  return Promise.resolve(ROUTE_TYPE_OPTIONS);
};

/**
 * Get trip type options
 * Mimics API behavior for easy migration to backend endpoint
 */
export const getTripTypeOptions = (): Promise<OptionItem[]> => {
  return Promise.resolve(TRIP_TYPE_OPTIONS);
};

// Type exports for TypeScript
export type RouteType = typeof ROUTE_TYPE_OPTIONS[number]['value'];
export type TripType = typeof TRIP_TYPE_OPTIONS[number]['value'];

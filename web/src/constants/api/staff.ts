// Staff Management API endpoints
export const STAFF_BASE = '/staff';

// Enrollment
export const STAFF_ENROLLMENT = `${STAFF_BASE}/enrollment`;

// Staff List
export const STAFF_LIST = `${STAFF_BASE}/`;

// Staff by ID
export const STAFF_BY_ID = `${STAFF_BASE}/enrollment/{staff_id}`;

// Staff by Designation
export const STAFF_BY_DESIGNATION = `${STAFF_BASE}/by-designation`;

// Drivers
export const STAFF_DRIVERS = `${STAFF_BASE}/drivers`;

// Attendance
export const STAFF_ATTENDANCE = `${STAFF_BASE}/attendance`;
export const STAFF_ATTENDANCE_FILTER = `${STAFF_BASE}/{staff_id}/attendance/filter`;

// Designations
export const STAFF_DESIGNATIONS = `${STAFF_BASE}/designations/`;
export const STAFF_DESIGNATIONS_DROPDOWN = `${STAFF_DESIGNATIONS}dropdown`;
export const STAFF_DESIGNATIONS_LEGACY = `${STAFF_BASE}/designations-legacy`;
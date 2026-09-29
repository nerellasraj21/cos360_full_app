// Authentication API endpoints
export const AUTH_BASE = '/auth';

// Login & Authentication
export const AUTH_LOGIN = `${AUTH_BASE}/login`;
export const AUTH_REFRESH = `${AUTH_BASE}/login/refresh`;
export const AUTH_LOGOUT = `${AUTH_BASE}/login/logout`;

// User Management
export const AUTH_USER_MENU = `${AUTH_BASE}/user-menu`;

// Menus
export const AUTH_MENUS = `${AUTH_BASE}/menus/`;

// Permissions
export const AUTH_PERMISSIONS = `${AUTH_BASE}/permissions/`;

// Resource Permissions
export const AUTH_RESOURCE_PERMISSIONS = `${AUTH_BASE}/resource-permissions/`;
export const AUTH_RESOURCE_PERMISSIONS_MATRIX = `${AUTH_RESOURCE_PERMISSIONS}matrix/all`;
export const AUTH_RESOURCE_PERMISSIONS_BULK = `${AUTH_RESOURCE_PERMISSIONS}bulk`;
export const AUTH_RESOURCE_PERMISSIONS_DROPDOWN_RESOURCES = `${AUTH_RESOURCE_PERMISSIONS}dropdown/resources`;
export const AUTH_RESOURCE_PERMISSIONS_DROPDOWN_ACTIONS = `${AUTH_RESOURCE_PERMISSIONS}dropdown/actions`;

// Roles
export const AUTH_ROLES = `${AUTH_BASE}/roles/`;
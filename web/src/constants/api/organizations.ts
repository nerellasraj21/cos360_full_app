// Organization/Tenant Management API endpoints
export const ORGANIZATIONS_BASE = '/organizations';

// Organization CRUD
export const ORGANIZATIONS = `${ORGANIZATIONS_BASE}/`;

// Organization Settings
export const ORGANIZATION_SETTINGS = `${ORGANIZATIONS_BASE}/settings`;

// Organization Users
export const ORGANIZATION_USERS = `${ORGANIZATIONS_BASE}/users`;

// Organization Plans
export const ORGANIZATION_PLANS = `${ORGANIZATIONS_BASE}/plans`;

// Super Admin endpoints
export const SUPER_ADMIN_BASE = '/super-admin';
export const SUPER_ADMIN_ORGANIZATIONS = `${SUPER_ADMIN_BASE}/organizations`;
export const SUPER_ADMIN_USERS = `${SUPER_ADMIN_BASE}/users`;
export const SUPER_ADMIN_SYSTEM_SETTINGS = `${SUPER_ADMIN_BASE}/system-settings`;
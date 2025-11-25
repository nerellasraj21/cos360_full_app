// Navigation protection components
export { ProtectedRoute } from './ProtectedRoute';
export { ModuleRoute } from './ModuleRoute';
export { ScreenProtection, withScreenProtection } from './ScreenProtection';
export { PermissionErrorHandler } from './PermissionErrorHandler';
export { default as AppDrawer } from './AppDrawer';

// Re-export types for convenience
export type { PermissionTuple } from '../../src/types/permissions';
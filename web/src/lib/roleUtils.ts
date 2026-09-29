/**
 * Centralized role-name helpers.
 *
 * The exam-management UI (ExamDashboard, ExamList, ExamDetail, and the
 * exam admin route guards) restricts create/edit/delete/permissions/audit
 * actions to an "admin-like" role rather than the resource/action
 * permission system used elsewhere in the app. This was previously
 * duplicated ad hoc in three separate files — centralized here so the
 * allowlist only has to be kept in sync with the mobile app's
 * `src/lib/roles.ts` (`ADMIN_ROLE_NAMES`) in one place.
 */
export const ADMIN_ROLE_NAMES = ['admin', 'superadmin', 'principal'] as const

export const isAdminRoleName = (roleName?: string | null): boolean =>
  ADMIN_ROLE_NAMES.includes((roleName ?? '').toLowerCase() as (typeof ADMIN_ROLE_NAMES)[number])

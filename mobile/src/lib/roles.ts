/**
 * Role helpers — mirrors the web app's exam-module `isAdmin` check so the mobile
 * app gates exam *management* the same way.
 *
 * Web source of truth (e.g. src/pages/exam/ExamList.tsx, ExamDashboard.tsx,
 * ExamDetail.tsx):
 *   const isAdmin = roleName === 'admin' || roleName === 'superadmin' || roleName === 'principal'
 *
 * Management actions (create / edit / delete / clone / activate / manage dates /
 * mark-permissions / notify / audit) are gated by `isAdmin` on the web — NOT by
 * raw resource permissions. Mark entry and result viewing stay permission-based
 * so teachers keep those.
 */

export const ADMIN_ROLE_NAMES = ['admin', 'superadmin', 'principal'] as const;

/** True for admin / superadmin / principal (case-insensitive), matching the web app. */
export const isAdminRole = (roleName?: string | null): boolean =>
  ADMIN_ROLE_NAMES.includes((roleName ?? '').toLowerCase() as (typeof ADMIN_ROLE_NAMES)[number]);

/**
 * Menu / role access helpers — mirrors the web app's `src/lib/menuUtils.ts` so
 * the mobile drawer shows exactly what the web sidebar shows for a given role.
 *
 * Web rules reproduced here (source of truth: web `filterMenuForRole()`):
 *   1. `HIDDEN_MENU_ITEMS` are stripped for **every** role — these screens are
 *      reached from their module hub, never from the menu.
 *   2. `teacher` must NOT see any Fee menu item, and fee routes are blocked.
 *   3. `student` never sees "My Fees" (needs fee_collection:read, which the
 *      Student role doesn't have) even if the backend still sends it.
 *   4. `student` and `parent` both get a stripped-down Fee menu (My Receipts /
 *      My Transactions) when the backend menu sent none — parent's "related"
 *      scope resolves server-side to every linked child's records.
 *   5. `teacher` / `student` must NOT see School Registration settings.
 *   6. `student` and `parent` (and parent-like aliases: guardian/father/mother)
 *      must NOT see Communication, Reports, Masters or Transport — these are
 *      not modules those roles have on web.
 */

/** Menu node shape shared by the backend menu payload and the drawer. */
export interface RoleMenuItem {
  id: string;
  name: string;
  path: string;
  display_order: number;
  children?: RoleMenuItem[] | null;
}

/** Menu entries hidden from every role (web parity: `HIDDEN_MENU_ITEMS`). */
const HIDDEN_MENU_ITEMS = new Set(['route stops', 'transport trips', 'student transport']);

/** School settings entry — hidden from teacher and student (web parity). */
const SCHOOL_SETTINGS_NAMES = new Set(['school registration', 'school settings']);

const nameOf = (item: { name?: string | null }): string => (item.name ?? '').toLowerCase();

const isHiddenItem = (item: { name?: string | null }): boolean =>
  HIDDEN_MENU_ITEMS.has(nameOf(item));

const isSchoolSettingsItem = (item: { name?: string | null; path?: string | null }): boolean =>
  SCHOOL_SETTINGS_NAMES.has(nameOf(item)) || (item.path ?? '').startsWith('/settings/school');

/** "My Fees" needs fee_collection:read, which Student doesn't have (web parity). */
const isMyFeesItem = (item: { name?: string | null }): boolean => nameOf(item) === 'my fees';

/**
 * Web parity: Communication, Reports, Masters and Transport are not modules
 * student or parent-type roles have on web (the backend menu never grants
 * them the underlying permissions), so strip these top-level nodes for those
 * roles even if the mobile menu payload still includes them.
 */
const SELF_SERVICE_HIDDEN_MODULE_NAMES = new Set(['communication', 'reports', 'masters', 'transport']);
const isSelfServiceHiddenModule = (item: { name?: string | null }): boolean =>
  SELF_SERVICE_HIDDEN_MODULE_NAMES.has(nameOf(item));

/** True when the given role must be blocked from the entire Fee module. */
export const roleBlocksFees = (roleName?: string | null): boolean =>
  (roleName ?? '').toLowerCase() === 'teacher';

/** Parent-like roles (mirrors the ad hoc list used across the app, e.g. `app/fees/receipts.tsx`). */
const PARENT_ROLE_NAMES = new Set(['parent', 'guardian', 'father', 'mother']);
const isParentRoleName = (roleName: string): boolean => PARENT_ROLE_NAMES.has(roleName);

/** True when the given role must not see school-registration settings. */
export const roleBlocksSchoolSettings = (roleName?: string | null): boolean =>
  ['teacher', 'student'].includes((roleName ?? '').toLowerCase());

/** Matches the web app's `isFeeItem` predicate (by path or menu name). */
const isFeeItem = (item: { name?: string | null; path?: string | null }): boolean => {
  const path = item.path ?? '';
  const name = nameOf(item);
  return path.startsWith('/fee') || name === 'fee management' || name === 'fees';
};

/**
 * Recursively strips Fee menu items for roles that are blocked from fees
 * (currently `teacher`). Non-blocked roles receive the menu unchanged.
 * Mirrors the web app's `filterMenuForRole()`.
 */
export const filterMenuForRole = <
  T extends { name?: string | null; path?: string | null; children?: T[] | null }
>(
  items: T[],
  roleName?: string | null,
): T[] => {
  if (!roleBlocksFees(roleName)) return items;
  return items
    .filter(item => !isFeeItem(item))
    .map(item => ({
      ...item,
      children: item.children ? filterMenuForRole(item.children, roleName) : item.children,
    }));
};

/** Recursively removes any node matching `predicate`, at every level. */
const stripRecursive = <
  T extends { name?: string | null; path?: string | null; children?: T[] | null }
>(
  items: T[],
  predicate: (item: T) => boolean,
): T[] =>
  items
    .filter(item => !predicate(item))
    .map(item => ({
      ...item,
      children: item.children ? stripRecursive(item.children, predicate) : item.children,
    }));

/**
 * The self-service Fee menu the web app injects when the backend sends none.
 * Same two entries for both roles: Student sees its own fee_receipts/
 * fee_transactions (read_own/list_own); Parent's "related" scope resolves
 * server-side to every linked child's records for the same two resources.
 */
const SELF_SERVICE_FEE_MENU: RoleMenuItem = {
  id: '__self_service_fee',
  name: 'Fee',
  path: '/fee',
  display_order: 900,
  children: [
    { id: '__self_service_my_receipts', name: 'My Receipts', path: '/fee/my-receipts', display_order: 1, children: null },
    { id: '__self_service_my_transactions', name: 'My Transactions', path: '/fee/my-transactions', display_order: 2, children: null },
  ],
};

/**
 * Canonical top-level menu order — mirrors the web app's `MENU_ORDER`
 * (`src/lib/menuUtils.ts`, MOM 13-6-2026).
 */
const MENU_ORDER: string[] = [
  'dashboard',
  'students',
  'student',
  'staff management',
  'staff',
  'exam management',
  'exams',
  'fee management',
  'fee',
  'fees',
  'expense',
  'expenses',
  'communication',
  'reports',
  'masters',
  'administration',
  'transport',
];

const menuOrderIndex = (item: { name?: string | null }): number => {
  const idx = MENU_ORDER.indexOf(nameOf(item));
  return idx === -1 ? MENU_ORDER.length : idx;
};

const hasChildPath = (item: RoleMenuItem, path: string): boolean =>
  (item.children ?? []).some(child => child.path === path);

/**
 * Ensures the Fee node carries both self-service children (My Receipts /
 * My Transactions) for student/parent — matches web's `ensureFeeMenu`.
 * Unlike a plain "inject if the backend sent nothing" check, this also MERGES
 * whichever child is missing into a Fee node the backend already sent (e.g.
 * one with only "My Receipts") — the case that was previously silently
 * dropping "My Transactions" for parent.
 */
const ensureSelfServiceFeeChildren = (items: RoleMenuItem[]): RoleMenuItem[] => {
  const feeIdx = items.findIndex(isFeeItem);

  if (feeIdx === -1) {
    return [...items, SELF_SERVICE_FEE_MENU];
  }

  const existing = items[feeIdx];
  const missing = (SELF_SERVICE_FEE_MENU.children ?? []).filter(
    child => !hasChildPath(existing, child.path),
  );
  if (missing.length === 0) return items;

  return items.map((item, i) =>
    i === feeIdx
      ? { ...item, children: [...(item.children ?? []), ...missing] }
      : item,
  );
};

/**
 * Applies every role-based menu rule in the order the web app applies them.
 * This is what the drawer should call — `filterMenuForRole` alone only covers
 * the teacher/fee rule.
 */
export const applyRoleMenuRules = (
  items: RoleMenuItem[],
  roleName?: string | null,
): RoleMenuItem[] => {
  const role = (roleName ?? '').toLowerCase();

  // 1. Always-hidden entries, regardless of role.
  let visible = stripRecursive<RoleMenuItem>(items, isHiddenItem);

  // 2. Teacher: no Fee module at all.
  visible = filterMenuForRole<RoleMenuItem>(visible, role);

  // 3. Teacher / student: no school registration settings.
  if (roleBlocksSchoolSettings(role)) {
    visible = stripRecursive<RoleMenuItem>(visible, isSchoolSettingsItem);
  }

  // 4. Student: never show "My Fees" even if the backend still sends it.
  if (role === 'student') {
    visible = stripRecursive<RoleMenuItem>(visible, isMyFeesItem);
  }

  // 4b. Student/parent: no Communication / Reports / Masters / Transport
  // modules (web parity — the backend menu never grants these roles the
  // underlying permissions).
  if (role === 'student' || isParentRoleName(role)) {
    visible = visible.filter(item => !isSelfServiceHiddenModule(item));
  }

  // 5. Student/parent: ensure My Receipts + My Transactions are both present,
  // merging into whatever Fee node the backend sent (or injecting one if it
  // sent none at all).
  if (role === 'student' || isParentRoleName(role)) {
    visible = ensureSelfServiceFeeChildren(visible);
  }

  return visible;
};

/**
 * Role-filtered top-level menu, ordered like the web sidebar.
 *
 * The module hubs render from this rather than from a hardcoded list, so —
 * exactly as on web — a role only ever sees the modules its backend menu
 * actually grants. Returns `[]` before the menu has loaded; callers fall back
 * to a permission-gated list for that cold-start case.
 */
export const roleTopLevelMenu = (
  items: RoleMenuItem[] | null | undefined,
  roleName?: string | null,
): RoleMenuItem[] =>
  [...applyRoleMenuRules(items ?? [], roleName)].sort(
    (a, b) => menuOrderIndex(a) - menuOrderIndex(b),
  );

/**
 * Children of one top-level module after the role rules have been applied —
 * the same source the web hubs render their section cards from (see the web
 * `students/index.tsx`, `masters/index.tsx`, `reports/index.tsx`).
 *
 * `names` lists the labels the backend may use for that module, e.g.
 * `['fee', 'fees', 'fee management']`.
 */
export const menuChildrenFor = (
  items: RoleMenuItem[] | null | undefined,
  roleName: string | null | undefined,
  names: string[],
): RoleMenuItem[] => {
  const wanted = new Set(names.map(n => n.toLowerCase()));
  const node = applyRoleMenuRules(items ?? [], roleName).find(item => wanted.has(nameOf(item)));
  return node?.children ?? [];
};

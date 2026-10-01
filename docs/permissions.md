# COS360 Permission System

How access is decided and shown across backend, web and mobile: plan layer, role layer, scopes, menus, user types, and how to add a permission.

_Last verified against code: 2026-09-29_

Decisions and system flows: [platform graph view](graph/views/platform.md) (source: docs/graph/graph.jsonl).

## 1. Model in one paragraph

A permission is a `(resource, action)` pair such as `("fee_receipts", "list")`. The **plan layer** in `public` says which resources a subscription plan includes. The **role layer** in each tenant schema says what each role may do. The intended rule is `access = plan ∩ role`. **In code, only the role layer is checked at runtime.** The plan layer is a catalog used when seeding or onboarding and in super-admin plan screens. Nothing enforces it later, and a tenant admin can grant resources outside the plan. Menus (sidebar entries) are a separate grant table and do not imply API access.

## 2. Tables

| Layer | Table | Shape | Written by |
|---|---|---|---|
| Plan | `public.plan_resource_access` | `plan_id, resource_name, actions TEXT[], is_active` (one row per plan+resource) | `super_admin/plan_endpoints.py`, `scripts/seed_*_permissions.py` |
| Plan menus | `public.plan_menu_access` + `public.menus` | plan → catalog menu ids | super admin; synced to tenant on plan assignment |
| Role | `<tenant>.roles` | `name` UNIQUE (case-sensitive), `is_system_role`, `is_custom_role` | seeds, `/admin/role-mgmt` |
| Role perms | `<tenant>.resource_permissions` | `role_id, resource (≤50), action (≤30), is_granted` (one row per action; UNIQUE `role_id, resource, action`, so an insert-only seed never flips an existing `is_granted=false` row) | seeds, `/admin/role-mgmt/roles/{id}/permissions*`, `/auth/resource-permissions/` |
| Menus | `<tenant>.menus` + `<tenant>.role_menu_permissions` | tree `L0–L3` via `parent_id`, `display_order`; grant `can_view` (`can_edit` unused at runtime) | seeds, `/auth/menus/`, `/auth/permissions/`, plan assignment |
| Unused | `<tenant>.role_inheritance`, `public.role_templates`, `public.permission_templates`, `public.menu_actions` | models exist | only `/auth/seed/permission-data`; **no runtime role inheritance** |

`role_inheritance.public_role_template_id` is an `Integer`, but `role_templates.id` is a UUID. The table is unusable as modelled.

## 3. User types

| Type | Where the account lives | Token | How access is decided |
|---|---|---|---|
| Super admin | `public.super_admin_users` | `user_type: "super_admin"` from `POST /super_admin/auth/login` | `Depends(get_current_super_admin)` on `/api/v1/super_admin/*` only; no resource checks. Cannot call tenant endpoints: the token has no `role` claim, so tenant checks deny it |
| Tenant admin | tenant `users` with role `Admin` | normal tenant token | Same checks as everyone else. Admin is just the role seeded with everything, including `role_management:*` and `user_management:*` |
| Staff / Teacher | role `Staff` / `Teacher`, linked `staff` row | tenant token | role grants (+ frontend caps, §6) |
| Student | role `Student`, linked `students` row | tenant token | `*_own` grants; `entity_id` = student id |
| Parent | role `Parent`, linked `parents` row via `student_parent_links` | tenant token | `*_related` grants; related ids = linked children |
| Custom roles | any name via `/admin/role-mgmt` | tenant token | role grants only (no first-login, no entity_id) |

- The canonical role names are **capitalized**: `Admin`, `Teacher`, `Staff`, `Student`, `Parent`. Backend code compares them exactly. That covers the first-login check, `entity_id` resolution, staff enrollment (`Role.name == "Staff"`), admission (`"Student"`, `"Parent"`) and the plan menu sync (`'Admin'`).
- The frontends lowercase the role name before comparing.
- `Teacher` gets `entity_id = null` on normal login but the staff id after set-password. Logins for Student and Parent resolve their entity; for Teacher they don't.

## 4. Backend enforcement

The token is validated by `get_current_user_token(request)` / `get_current_user` in `backend/app/tools/simple_permissions.py`. Those return the JWT claims, including `role`. Then, inside the endpoint body:

| Helper | Use for | Behaviour |
|---|---|---|
| `check_role_plan_permission_with_error(db, request, role, resource, action)` (`simple_permissions.py`) | **Standard check.** Used about 620 times | Looks up `roles.name == role`, then an `is_granted` row in `resource_permissions`. Raises 403 `"Permission not found in database: ..."`. Ignores the plan despite its name |
| `check_user_resource_access(db, request, resource, action, target_entity_id=None)` (`backend/app/tools/enhanced_permissions.py`) | Self-service/scoped endpoints (fee receipts/transactions/collection, exam results, admissions, attendance, certificates, profile) | Returns a `UserContext` with `access_scope` of `own`, `related`, `all` or `denied`. Resolved by `UserContextService` (`backend/app/service/auth/user_context_service.py`) |
| `RequireCreate/Read/Update/Delete/List(resource)` | FastAPI dependencies | same DB check; rarely used |
| `get_current_super_admin` / `require_super_admin`, `@super_admin_only` | super-admin routes | the decorator is a no-op; the dependency does the check |

Scope resolution in `_determine_access_scope`:
- If `action` already ends in `_own` or `_related`, that exact permission is checked.
- Otherwise the order is: `<action>_own`, then `<action>_related`, then `<action>`. The first match wins.
  - **Gotcha:** a role holding both `read_own` and `read` resolves to `own`, the more restrictive one. Never give admin-type roles `_own` or `_related` variants.
- `related` ids are computed only for parents: the linked children, for `students`, `student_admissions`, `fee_*`, `student_attendance`, `student_certificates`, `student_documents`, `exams` and `exam_marks`.
  - Teacher "related" access is not implemented, so a `_related` grant gives a teacher nothing.
- On a targeted id outside the user's scope the helper returns **404** (not 403), on purpose.
- `read` and `list` are independent. `read` is a single record by id; `list` is a list or search. Seed both. The same goes for `read_own`/`list_own` and `read_related`/`list_related`.

Other facts:
- Checks are live DB queries on every request. There is no cache and nothing is embedded in the JWT. **A grant change takes effect on the backend immediately.** The clients cache permissions and menus from the login response, so the **UI** changes only after a re-login.
- The action vocabulary is `create`, `read`, `update`, `delete` and `list`, plus special actions such as `approve`, `export`, `process`, `download`, `audit`, and the scoped variants `*_own` and `*_related`. Resource names are snake_case, usually plural, and must match the string used in the endpoint exactly.
- `backend/app/tools/endpoint_resource_mapping.py` maps URL to resource only for `/auth/validate-access` and `/auth/available-resources`. It is not consulted by normal endpoints.
- `MultiTenantPermissionService`, `PlanService` and `AccessValidationService` (under `app/service/auth/`) contain plan-aware checks that live endpoints do not use.

## 5. Menus

- At login, `MultiTenantAuthService.build_hierarchical_menu` returns the tree of tenant `menus` where the user's role has `can_view`. Each node has `{id, name, path, display_order, children?}`.
- A child whose parent is not granted is silently dropped.
- The default role→menu grants live in `POST /auth/seed/all-role-permissions`:
  - Admin, Staff and Teacher get all menus.
  - Student and Parent get a URL allowlist (`_STUDENT_PARENT_MENU_URLS`).
- Web does not render the backend menu as is. `web/src/lib/menuUtils.ts#useMenuData`:
  - filters per role
  - hides items
  - injects a self-service Fee menu for student/parent
  - injects the Fee submenu for admin-type roles
  - injects School Settings under Masters
  - reorders to `MENU_ORDER`
- Mobile hubs and tabs are hardcoded and then filtered by permissions and the backend menu. Only add a hub section if the backend menu actually seeds it.

## 6. Web UI enforcement (`web/src`)

- **Store:** `lib/authStore.ts` (Zustand, persisted as `auth-storage`) keeps `permissionsMap` (`{resource: actions[]}`, straight from login), `role`, `menuItems` and `entityId`.
- **`hasPermission(resource, action)`** is an exact-match check against `permissionsMap`. Two exceptions:
  - The **Teacher** role is capped by `lib/teacherPermissionMatrix.ts` and **Staff** by `lib/staffPermissionMatrix.ts`. For a resource listed there, the matrix replaces the backend grant, so it can only hide things. Unlisted resources fall through to the backend grant.
  - These matrices are **duplicated byte-for-byte** in `mobile/src/lib/`. Change both.
- **Hooks and components:**
  - `hooks/usePermission.ts` (`checkPermission`, `checkPermissionByConstant`, `hasAnyPermission`, `hasAllPermissions`)
  - `hooks/usePermissionProtectedMutation.ts` / `usePermissionProtectedQuery.ts`. When permission is missing these do **not** call the API and show nothing unless `onPermissionDenied` is set, so the button looks dead.
  - `constants/permissions.ts` (`PERMISSIONS.X.CREATE = 'x:create'`; keys are UPPERCASE)
- **Two different `PermissionGuard` components:**
  - `components/PermissionGuard.tsx` accepts `resource/action`, `resourceConstant/actionConstant`, `permissions=[[r,a]]`, `requireAll`, `disabled`.
  - `components/common/PermissionGuard.tsx` accepts **only** `resource` + `action`. Passing `permissions=` to it gives `undefined` and denies everyone.
- **Rule:** never put `enabled: hasPermission(...)` on read queries. A key mismatch silently disables the fetch. Let the backend answer 403.
- **Routes:** `_app.tsx` only checks `isAuthenticated`. There are no per-route permission guards, except exam admin routes, which use `lib/roleUtils.ts#isAdminRoleName` (`admin`, `superadmin`, `principal`, case-insensitive), a role-name gate rather than a permission. Typing a URL opens the page, and its API calls return 403.
  - `routes/_app/fee.tsx` `beforeLoad` redirects role `teacher` from every `/fee/*` URL to `/`. Its student allowlist (`STUDENT_FEE_PATHS`) contains `/fee`, which prefix-matches every sub-path, so it never redirects students.
- Permission checks `console.log` on every evaluation, including the whole permissions map.

## 7. Mobile UI enforcement (`mobile/`)

- **Source of truth:** `contexts/AuthContext.tsx` → `hasPermission`, exposed through `src/hooks/useMobilePermission.ts`. Permissions are normalised by `services/authUtils.ts#normalisePermissions` into `Permission[]` and stored in AsyncStorage.
- **`hasPermission`:** applies the same Teacher/Staff matrices as web, then `utils/permission-compatibility.ts#hasPermissionWithFallbacks`. That is **more permissive than web**:
  - `list` and `read` satisfy each other.
  - Any of `read_own`, `read_related`, `list_own`, `list_related` satisfies `read` or `list`.
  - Aliases apply: `classes`/`sections`/`classes_sections`, `academic_year`, `staffs`, `fee<name>`, and so on.

  This widens the UI gate only; the server still enforces scope.
- **Gating points:**
  - Tabs: `app/(tabs)/_layout.tsx` (`TAB_CONFIGS`: `moduleResources`, `alwaysShow`, `hideForRoles`)
  - Dashboard tiles: `app/(tabs)/index.tsx` (`MODULES`)
  - In-screen guards: `components/PermissionGuards.tsx` (`ReadOrListPermissionGuard`, `CreatePermissionGuard`, …) and `src/components/mobile/MobilePermissionGuard.tsx`
  - Exam management: `src/lib/roles.ts#isAdminRole`, which mirrors web
- **Dead code, don't wire up:**
  - `src/api/mobilePermissions.ts`. Its endpoints `/auth/mobile/permissions/sync` and `/auth/permissions/check` and `bulk-check` do not exist on the backend.
  - `src/stores/mobileAuthStore.ts` as a store (only helpers are used).
  - `src/navigation/ProtectedNavigator.tsx`, `src/components/mobile/AccessDeniedScreen.tsx` and `PermissionStatusIndicator.tsx`, which import a non-existent `useMobileAuthStore`.
  - `src/config/screenPermissions.ts` and `components/navigation/ScreenProtection.tsx`, which no screen uses.
- `mobile/src/constants/permissions.ts` is a superset of the web constants: it adds the exam, grade-scheme and expense-audit keys. Only the `resource:action` strings matter, and they must equal the backend names.

## 8. Adding a permission for a new resource (all three apps)

1. **Backend endpoint:** call `check_role_plan_permission_with_error(db, request, role, "<resource>", "<action>")`, or `check_user_resource_access(...)` if students or parents need `_own`/`_related` access. Use the same resource string everywhere.
2. **Plan layer:** add `(resource_name, actions[])` to `public.plan_resource_access` for every active plan. Copy the pattern in `backend/scripts/seed_communication_permissions.py`. It isn't checked at runtime, but it keeps the plan catalog and super-admin UI truthful.
3. **Role layer, per tenant schema:** insert `resource_permissions` rows for each role.
   - Admin gets every action.
   - Grant both `read` and `list`.
   - Student and Parent get `*_own` or `*_related`, including the `list_` variants.
   - Add the pairs to `ROLE_PERMISSIONS` in `app/service/tenant/permission_catalog.py`, add the resource to the plan's `plan_resource_access`, and run `POST /auth/seed/all-role-permissions` per tenant. It inserts only missing rows, so revoked permissions stay revoked.
4. **Defaults for future tenants:** add the rows to `_ROLE_PERMISSIONS` in `backend/app/api/v1/auth/seed_endpoints.py`.
5. **Menu (only if there is a new page):** add a row to tenant `menus` with the right `parent_id`, `level` and `display_order`, plus `role_menu_permissions` (`can_view`) for each role. Pattern: `scripts/seed_expense_menu_test_tenant.py`. If Student or Parent should see it, also add the URL to `_STUDENT_PARENT_MENU_URLS`.
6. **Web:**
   - Add the key to `web/src/constants/permissions.ts`.
   - Gate buttons and pages with `usePermission` / `PermissionGuard`.
   - If Teacher or Staff should be capped, update **both** `teacherPermissionMatrix.ts` and `staffPermissionMatrix.ts` in web **and** mobile.
7. **Mobile:** add the resource to **both** registries: `mobile/src/types/permissions.ts` (`PERMISSION_RESOURCES`, used by the guards and screens) and `mobile/src/constants/permissions.ts` (`PERMISSIONS` plus the `PermissionResource`/`PermissionAction` unions that type `useMobilePermission` and `usePermissionProtected*`). Gate the tab, tile or screen with the guards in §7.
8. **Verify:** log out and log back in, because permissions are cached at login. Then check that 403s turn into 200s for the intended roles only.

## 9. Gotchas and known weaknesses

- **The plan layer is not enforced.** It is not checked at runtime or when role permissions are granted (`/admin/role-mgmt/roles/{id}/permissions`, `/bulk`). Seeding only `plan_resource_access` changes nothing for existing tenants.
- **Case-sensitive role names:**
  - `roles.name` is unique but case-sensitive, and a tenant has had both `Staff` and a stray lowercase `staff` role.
  - Users on a non-canonical casing miss the seeded grants, the first-login flow and `entity_id`.
  - `POST /admin/role-mgmt/` rejects case-insensitive duplicates, but scripts and raw SQL do not.
- **Templates don't match real resources.** `GET /admin/role-mgmt/templates/` and `apply-template` use coarse names (`fee_management`, `student_management`) that no endpoint checks. Applying a template grants nothing useful.
- **The default seed is incomplete.** `ROLE_PERMISSIONS` in `app/service/tenant/permission_catalog.py` (applied by provisioning and `POST /auth/seed/all-role-permissions`) gives Admin no `student_admissions:list` and none of `fee_collection`, `fee_concessions`, `fee_old`, `transport_pricing`, `timetable_management`, `staff_attendance`, `school_settings`, `sections`, `communications`, `issuable_certificates`, `expense_reports` or any `*:send_sms`. That is why onboarding copies `resource_permissions` from `test_tenant_schema`; extend the seed when you add a resource.
- **Plan assignment is destructive.** `PUT /super_admin/system/tenants/{id}/plan` deletes all tenant `menus` and Admin's menu grants, then recreates them flat, which loses `parent_id`.
- **Missing checks:**
  - `GET /admin/role-mgmt/roles/` has its permission check commented out (any authenticated user).
  - `/admin/role-mgmt/test/` requires no authentication at all.
  - `/admin/role-mgmt/debug-roles/` has no permission check and prints the request headers, including `Authorization`, to stdout.
- **Tenant binding.** The JWT carries `tenant_id`, and the request tenant must match it (a mismatch is 403). The role is still taken by name from the token.
- **Unauthenticated privileged endpoints mounted in every environment:**
  - `/auth/seed/permission-data` and the other `/auth/seed/*` data seeders, and `POST /super_admin/setup/initialize`. `POST /auth/seed/all-role-permissions` now requires an Admin.

  Gate these behind `ENVIRONMENT` or remove them.
- **Tenant admins can escalate.** An Admin with `role_management:update` can grant any role, including their own, any `resource:action`.
- **No login throttling.** `rate_limit_login` exists but is not applied to `/auth/login`.

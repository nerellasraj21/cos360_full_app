# COS360 Permission System

How access is decided and shown across backend, web and mobile: plan layer, role layer, scopes, menus, user types, and how to add a permission.

_Last verified against code: 2026-10-07_

Decisions and system flows: [platform graph view](graph/views/platform.md) (source: docs/graph/graph.jsonl).

## 1. Model in one paragraph

A permission is a `(resource, action)` pair such as `("fee_receipts", "list")`. The **plan layer** (platform tables) says which resources and actions a subscription plan includes. The **role layer** (tenant tables, one set of rows per tenant under row-level security) says what each role may do. The intended rule is that access needs both the plan and the role to allow it. **In code, only the role layer is checked at runtime.** The plan layer limits what role seeding grants (provisioning, plan change, `POST /auth/seed/all-role-permissions`) and feeds the super-admin plan screens. Nothing enforces it later, and a tenant admin can grant resources outside the plan. Menus (sidebar entries) are a separate grant and do not imply API access.

## 2. Tables

| Layer | Table | Shape | Written by |
|---|---|---|---|
| Plan | `public.plan_resource_access` | `plan_id, resource_name, actions TEXT[], is_active` (one row per plan+resource) | `super_admin/plan_endpoints.py`, `CatalogService.ensure_full_plan` |
| Menu catalog | `public.menus` + `public.plan_menu_access` | one shared tree for all tenants, `L0`-`L3` via `parent_id`, `display_order`; plan to menu ids | `CatalogService.import_menus`, `POST /auth/menus/`, super admin |
| Role | `roles` (tenant) | `name` unique per tenant (case-sensitive, 50 chars), `description` (100 chars), `is_system_role`, `is_custom_role`; no `is_active` column | `RoleSeedService`, `/admin/role-mgmt` |
| Role perms | `resource_permissions` (tenant) | `role_id, resource (50), action (30), is_granted` (one row per action; unique per tenant on `role_id, resource, action`, so an insert-only seed never flips an existing `is_granted=false` row) | `RoleSeedService`, `/admin/role-mgmt/roles/{id}/permissions*`, `/auth/resource-permissions/`, super-admin tenant data |
| Role menus | `role_menu_permissions` (tenant) | `role_id, menu_id` (catalog id), `can_view`; `can_edit` unused at runtime | `RoleSeedService`, `/auth/permissions/` |
| Unused | `role_inheritance` (tenant), `public.role_templates`, `public.permission_templates`, `public.menu_actions` | models exist | only `/auth/seed/permission-data`; **no runtime role inheritance** |

`role_inheritance.public_role_template_id` is an `Integer`, but `role_templates.id` is a UUID. The table is unusable as modelled.

## 3. User types

| Type | Where the account lives | Token | How access is decided |
|---|---|---|---|
| Super admin | `public.super_admin_users` | `user_type: "super_admin"` from `POST /super_admin/auth/login` | `Depends(get_current_super_admin)` on `/api/v1/super_admin/*` only; no resource checks. Cannot call tenant endpoints: the token has no `role` claim, so tenant checks deny it |
| Tenant admin | tenant `users` with role `Admin` | normal tenant token | Same checks as everyone else. Admin is just the role seeded with every plan action plus `role_management:*` |
| Staff / Teacher | role `Staff` / `Teacher`, linked `staff` row | tenant token | role grants (+ frontend caps, section 6) |
| Student | role `Student`, linked `students` row | tenant token | `*_own` grants; `entity_id` = student id |
| Parent | role `Parent`, linked `parents` row via `student_parent_links` | tenant token | `*_related` grants; related ids = linked children |
| Custom roles | any name via `/admin/role-mgmt` | tenant token | role grants only (no first-login, no seeded menus) |

- The canonical role names are **capitalized**: `Admin`, `Teacher`, `Staff`, `Student`, `Parent`. Backend code compares them exactly. That covers the first-login check, `entity_id` resolution, staff enrollment (`Role.name == "Staff"`), admission (`"Student"`, `"Parent"`), role seeding and `ensure_student_access`.
- The frontends lowercase the role name before comparing.
- `entity_id` is the student id for `Student`, the parent id for `Parent`, and the staff id for every other role that has a `staff` row (Teacher, Staff, and an Admin or custom role with one), on both login and set-password. It is null when no such row exists.

## 4. Backend enforcement

The token is validated by `get_current_user_token(request)` / `get_current_user` in `backend/app/tools/simple_permissions.py`. Those return the JWT claims, including `role`. Then, inside the endpoint body:

| Helper | Use for | Behaviour |
|---|---|---|
| `check_role_plan_permission_with_error(db, request, role, resource, action)` (`simple_permissions.py`) | **Standard check.** Used about 550 times | Looks up `roles.name == role`, then an `is_granted` row in `resource_permissions`. Raises 403 `"Permission not found in database: ..."`. Ignores the plan despite its name |
| `check_user_resource_access(db, request, resource, action, target_entity_id=None)` (`backend/app/tools/enhanced_permissions.py`) | Self-service/scoped endpoints (fee receipts/transactions/collection, exam results, admissions, attendance, certificates, profile) | Returns a `UserContext` with `access_scope` of `own`, `related`, `all` or `denied`. Resolved by `UserContextService` (`backend/app/service/auth/user_context_service.py`) |
| `ensure_student_access(db, role, user_id, student_id)` (`backend/app/tools/ownership.py`) | Single-student endpoints in exam results, hall tickets, certificates and student documents, after the permission check | For role `Student` the student row must belong to the user; for `Parent` the student must be a linked child. Raises **403**. Other roles pass |
| `RequireCreate/Read/Update/Delete/List(resource)` | FastAPI dependencies | same DB check; rarely used |
| `get_current_super_admin` / `require_super_admin`, `@super_admin_only` | super-admin routes | the decorator is a no-op; the dependency does the check |

Scope resolution in `_determine_access_scope`:
- If `action` already ends in `_own` or `_related`, that exact permission is checked.
- Otherwise the order is: `<action>_own`, then `<action>_related`, then `<action>`. The first match wins.
  - **Gotcha:** a role holding both `read_own` and `read` resolves to `own`, the more restrictive one. Never give admin-type roles `_own` or `_related` variants.
- `related` ids are computed only for parents: the linked children, for `students`, `student_admissions`, `fee_transactions`, `fee_collection`, `fee_receipts`, `student_attendance`, `student_certificates`, `student_documents`, `exams` and `exam_marks`.
  - Teacher "related" access is not implemented, so a `_related` grant gives a teacher nothing.
- On a targeted id outside the user's scope `check_user_resource_access` returns **404** (not 403), on purpose. `ensure_student_access` returns 403, so denials are not uniform.
- `read` and `list` are independent. `read` is a single record by id; `list` is a list or search. Seed both. The same goes for `read_own`/`list_own` and `read_related`/`list_related`.

Other facts:
- Checks are live DB queries on every request. There is no cache and nothing is embedded in the JWT. **A grant change takes effect on the backend immediately.** The clients cache permissions and menus from the login response, so the **UI** changes only after a re-login.
- The action vocabulary is `create`, `read`, `update`, `delete` and `list`, plus special actions such as `approve`, `export`, `process`, `download`, `audit`, `send_sms`, and the scoped variants `*_own` and `*_related`. Resource names are snake_case, usually plural, and must match the string used in the endpoint exactly.
- `backend/app/tools/endpoint_resource_mapping.py` maps URL to resource only for `/auth/validate-access` and `/auth/available-resources`. It is not consulted by normal endpoints.
- `MultiTenantPermissionService`, `PlanService` and `AccessValidationService` (under `app/service/auth/`) contain plan-aware checks that live endpoints do not use.

## 5. Menus

- At login, `MultiTenantAuthService.build_hierarchical_menu` returns the tree of catalog `menus` where the user's role has a `role_menu_permissions` row with `can_view`. Each node has `{id, name, path, display_order, children?}`.
- A child whose parent is not granted is silently dropped.
- Role seeding (`RoleSeedService._seed_role_menus`) links each system role to the plan's menus (`plan_menu_access`):
  - Admin, Staff and Teacher get every plan menu.
  - Student and Parent get only the URLs in `STUDENT_PARENT_MENU_URLS` (`app/service/tenant/permission_catalog.py`).
  - Custom roles get no menus.
- Plan change (`sync_to_plan`) deletes role menu links whose menu the new plan does not include; the catalog itself is untouched.
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
  - These matrices are duplicated in `mobile/src/lib/` with identical logic (only the comments differ). Change both.
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
  - Whole screens: `components/ScreenAccessGate.tsx`
  - In-screen guards: `components/PermissionGuards.tsx` (`ReadOrListPermissionGuard`, `CreatePermissionGuard`, ...) and `src/components/mobile/MobilePermissionGuard.tsx`
  - Exam management: `src/lib/roles.ts#isAdminRole`, which mirrors web
- **Dead code, don't wire up:**
  - `src/api/mobilePermissions.ts`. Its endpoints `/auth/mobile/permissions/sync` and `/auth/permissions/check` and `bulk-check` do not exist on the backend.
  - `src/stores/mobileAuthStore.ts` as a store (only helpers are used).
  - `src/navigation/ProtectedNavigator.tsx`, `src/components/mobile/AccessDeniedScreen.tsx` and `PermissionStatusIndicator.tsx`, which import a non-existent `useMobileAuthStore`.
  - `src/config/screenPermissions.ts` and `components/navigation/ScreenProtection.tsx`, which no screen uses.
- `mobile/src/constants/permissions.ts` is a superset of the web constants: it adds the exam, grade-scheme and expense-audit keys. Only the `resource:action` strings matter, and they must equal the backend names.

## 8. Adding a permission for a new resource (all three apps)

1. **Backend endpoint:** call `check_role_plan_permission_with_error(db, request, role, "<resource>", "<action>")`, or `check_user_resource_access(...)` if students or parents need `_own`/`_related` access. Use the same resource string everywhere.
2. **Catalog:** add the pairs to `app/service/tenant/permission_catalog.py`: `ALL_ADMIN` for the Admin set (it also defines the `Full` plan that `CatalogService.ensure_full_plan` builds) and `ROLE_PERMISSIONS` for the other roles. Grant both `read` and `list`; Student and Parent get `*_own` or `*_related`, including the `list_` variants.
3. **Plan layer:** add `(resource_name, actions[])` to `public.plan_resource_access` for every plan that should include it, with the super-admin plan endpoints. Seeding grants a role only actions the plan lists, so this step is required, including the `_own`/`_related` actions.
4. **Existing tenants:** re-apply the plan (`PUT /super_admin/system/tenants/{id}/plan`) or call `POST /auth/seed/all-role-permissions` as the tenant's Admin. Both insert only missing rows, so revoked permissions stay revoked. New tenants get the rows at provisioning.
5. **Menu (only if there is a new page):** add the entry to the shared `public.menus` catalog (`CatalogService.import_menus`; the demo catalog is in `backend/scripts/seed_demo_catalog.py`) and to the plan's `plan_menu_access`. Re-seeding links it to the system roles. If Student or Parent should see it, also add the URL to `STUDENT_PARENT_MENU_URLS`.
6. **Web:**
   - Add the key to `web/src/constants/permissions.ts`.
   - Gate buttons and pages with `usePermission` / `PermissionGuard`.
   - If Teacher or Staff should be capped, update **both** `teacherPermissionMatrix.ts` and `staffPermissionMatrix.ts` in web **and** mobile.
7. **Mobile:** add the resource to **both** registries: `mobile/src/types/permissions.ts` (`PERMISSION_RESOURCES`, used by the guards and screens) and `mobile/src/constants/permissions.ts` (`PERMISSIONS` plus the `PermissionResource`/`PermissionAction` unions that type `useMobilePermission` and `usePermissionProtected*`). Gate the tab, tile or screen with the guards in section 7.
8. **Verify:** log out and log back in, because permissions are cached at login. Then check that 403s turn into 200s for the intended roles only.

The `backend/scripts/seed_*_permissions.py` and `seed_*_menu*.py` scripts target per-tenant schemas and do not apply to the shared database.

## 9. Gotchas and known weaknesses

- **The plan layer is not enforced at runtime.** It is not checked by endpoints or when role permissions are granted (`/admin/role-mgmt/roles/{id}/permissions`, `/bulk`, `/auth/resource-permissions/`, super-admin tenant data). Changing only `plan_resource_access` changes nothing for existing tenants until the plan is re-applied.
- **Plan change prunes.** `PUT /super_admin/system/tenants/{id}/plan` adds what the plan grants, then deletes every `resource_permissions` row (any role, custom ones and revoked rows included; `role_management` is kept) and every role menu link that the plan no longer allows. Users, roles and the menu catalog are untouched.
- **The default grants depend on the plan.** Admin gets exactly the plan's actions plus `role_management`. Other roles keep a catalog pair only if the plan lists that action. The catalog-built `Full` plan copies `ALL_ADMIN`, which has no `profile` resource, no `_own`/`_related` actions, no `exam_results` or `exam_hall_tickets`, no `*:send_sms`, and only `sections:create`. On such a tenant Student and Parent lose their self-service grants, nobody can use the profile endpoints, and Teacher and Staff lose `sections:read/list`. Extend the plan when a role needs these.
- **Catalog coverage by role:** `timetable_management` is granted only to Admin; Student and Parent get no `holiday_management`; Teacher and Staff get `holiday_management` read and list.
- **Case-sensitive role names:**
  - `roles.name` is unique but case-sensitive, and a tenant has had both `Staff` and a stray lowercase `staff` role.
  - Users on a non-canonical casing miss the seeded grants, the first-login flow and the role-based ownership checks.
  - `POST /admin/role-mgmt/` and role rename reject case-insensitive duplicates, but scripts and raw SQL do not.
- **Templates don't match real resources.** `GET /admin/role-mgmt/templates/` and `apply-template` use coarse names (`fee_management`, `student_management`) that no endpoint checks. Applying a template grants nothing useful.
- **Missing checks:**
  - `POST /auth/validate-access`, `/auth/validate-endpoint-access` and `/auth/validate-menu-access` check no permission, so any authenticated user can query access for any user of the tenant.
  - `POST /auth/menus/` writes the shared catalog, so `menu_management:create` reaches every tenant.
- **Over-long names fail late.** A resource over 50 or an action over 30 characters, and a role description over 100, fail in the database with 500 instead of a validation error.
- **Tenant binding.** The JWT carries `tenant_id`, and the request tenant must match it (a mismatch is 403). The role is still taken by name from the token, and `/auth/refresh` re-reads it.
- **Unauthenticated privileged endpoints mounted in every environment:**
  - `/auth/seed/permission-data`, `/auth/seed/verify-permission-data`, `/auth/seed/location-data`, and `POST /super_admin/setup/initialize`. `POST /auth/seed/all-role-permissions` and `/auth/seed/caste-data` require the `Admin` role.

  Gate these behind `ENVIRONMENT` or remove them.
- **Tenant admins can escalate.** An Admin with `role_management:update` can grant any role, including their own, any `resource:action`.
- **No login throttling.** `rate_limit_login` exists but is not applied to `/auth/login`.

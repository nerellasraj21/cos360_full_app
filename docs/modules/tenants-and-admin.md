# Tenants & Admin

Covers the public-schema tenant registry and plans, super-admin features, tenant onboarding, tenant-admin user and role management, menus, and the endpoints that are reachable without authentication.
_Last verified against code: 2026-10-01_
Flows, decisions, and feature map: [graph view](../graph/views/tenants-and-admin.md) (source: docs/graph/graph.jsonl).

How requests resolve to a tenant is in [../architecture.md](../architecture.md). The plan-then-role permission model is in [../permissions.md](../permissions.md). Tenant-user login is in [auth.md](auth.md).

## What it does

- **Tenant registry (`public` schema).**

  | Table | What it holds |
  |---|---|
  | `tenants` | `client_name` (unique; the login hint), `plan_id`, `is_active`; `schema_name` is legacy and null for new tenants |
  | `plans` | Plan definitions |
  | `plan_resource_access` | Layer 1 of permissions: `plan_id`, `resource_name`, `actions[]`, `is_active` |
  | `plan_menu_access` | Which master menus a plan includes |
  | `menus` | Master menus |
  | `menu_actions`, `role_templates`, `permission_templates` | Legacy, unused by the live flow |
  | `super_admin_users`, `super_admin_audit` | Super-admin accounts and their audit trail |
  | `token_blacklist` | Logged-out token hashes |
  | `organizations` | Legacy, unused |

- **One shared schema.** All tenants live in `public`, separated by `tenant_id` and row-level security. The `cos360_master` template, `cos360_masters` and `test_tenant_schema` belong to the previous per-schema deployment and do not exist in the shared design.
- **Super admin** is platform-wide and separate from tenant users. Its account lives in `public.super_admin_users`, and its JWT carries `user_type: "super_admin"`. It can:
  - log in; after 5 failed attempts the account is locked for 30 min;
  - view and edit its own profile, change its password, and register other super admins;
  - list, create and edit plans (there is no delete), and add or remove `resource:action` entries on a plan;
  - list, create and toggle tenants active or inactive, and assign a plan;
  - read any tenant's users, students, stats, reports and roles, and **write role permissions into a tenant** (`/super_admin/tenant-data/{schema}/roles/{role_id}/permissions/`);
  - see system health and usage stats.

  Every super-admin action is written to `super_admin_audit`.
- **Tenant admin** is a tenant user whose role grants `user_management:*` and `role_management:*`. Normally that is the `Admin` role. It can:
  - list, filter and search all tenant users together with their linked student, staff or parent entity;
  - edit a user's username, email and active flag;
  - change a user's role;
  - reset a user's password;
  - create, edit and delete custom roles and set their `resource_permissions`;
  - create and list tenant menus.
- **System roles are protected by name.** `Admin`, `Teacher`, `Staff`, `Student` and `Parent` cannot be renamed or deleted. A custom role cannot be deleted while users are assigned to it; `GET /admin/role-mgmt/{id}/delete-validation` previews the check.
- **Tenant users are never created from the admin screens.** Accounts come from staff enrolment and student admission. There is no create-user endpoint.

## Where the code lives

| Layer | Backend | Web | Mobile |
|---|---|---|---|
| Public models | `app/models/public/*` (tenant, plan, plan_menu, menu, super_admin, org, templates) | — | — |
| Super admin API | `app/api/v1/super_admin/{auth,plan,system,setup,tenant_data}_endpoints.py` (`/super_admin/*`); `enhanced_tenant_endpoints.py` exists but is **not mounted** | `src/pages/superadmin/SuperAdminDashboard.tsx` via `/_app/superorg`, `src/api/superadmin.ts`, `src/api/organizations.ts` (all paths mismatched; see gotcha 12) | none |
| Super admin services | `app/service/super_admin/*`; `app/service/schema/*` (template/clone services, only used by the unmounted endpoints) | — | — |
| Tenant resolution | `app/middleware/tenant_middleware.py`, `app/middleware/super_admin_middleware.py`, `app/db/tenant_session.py` (`TenantService` cache) | `src/lib/config.ts` (`getTenantFromHostname`), `src/api/index.ts` | `src/api/client.ts`, `services/authUtils.ts` (`@auth/client_schema`) |
| User management | `app/api/v1/admin/user_management_endpoints.py` (`/admin/users`), `app/service/admin/user_management_service.py`, `app/schemas/admin/user_management_schema.py` | `src/pages/admin/UsersPage.tsx`, `src/api/admin/users.ts`, `src/pages/admin/AdminProfile.tsx` | `app/admin/users.tsx`, `app/admin/profile.tsx`, `src/api/users.ts` |
| Role management | `app/api/v1/admin/permission_endpoints.py` (`/admin/role-mgmt`); resource-permission CRUD `app/api/v1/auth/resource_permission_endpoints.py` (`/auth/resource-permissions`) | `src/pages/auth/RolesPermissionsPage.tsx` at `/masters/rolespermissions`, `src/api/auth.ts` | `app/masters/rolespermissions.tsx` (`app/admin/{roles,permissions}.tsx` redirect there), `src/api/masters.ts` (`rolesApi`, `permissionsApi`) |
| Menus | `app/api/v1/auth/menu_endpoints.py` (`/auth/menus/`: POST and GET only) | none (admin dashboard cards come from `menuItems`) | `app/admin/menu.tsx`, `src/api/auth.ts` (`authApi`) |
| Legacy orgs | `app/api/v1/public/org_routes.py` (`/superadmin/organizations`), `app/service/public/org_service.py` | `src/components/superorg/*` | — |
| Tenant provisioning | `app/service/tenant/{provisioning_service,role_seed_service,catalog_service,permission_catalog}.py`; `POST /super_admin/system/tenants/` and `PUT .../tenants/{id}/plan` in `system_endpoints.py` | — | — |
| Legacy onboarding scripts | `scripts/create_little_bunny_tenant.py`, `fix_tenant_enum_types.py`, `seed_master_data_*.py`, `seed_resource_permissions_*.py`, `seed_*_academic_year.py`, `seed_*_admin.py`, `seed_*_permissions.py`, `seed_*_menu_*.py`; all assume per-tenant schemas | — | — |

## Rules & gotchas

1. **The tenant comes from the token, not the header.** After login the signed `tenant_id` claim picks the tenant, and a `cschema` header that disagrees is rejected with 403. The header only identifies the tenant for login, `/auth/academic-years`, refresh and set-password. Details are in [../architecture.md](../architecture.md).
2. **There is no default tenant.** An unknown or inactive `client_name` gets 404, and `TENANT_DEFAULT_NAME` only matters when `TENANT_ALLOW_DEFAULT_FALLBACK` is on and a tenant with that name exists.
3. **`client_name` matching is exact and case-sensitive** (`WHERE client_name = :client_name`), and names may contain spaces, such as `little bunny`. Mobile lowercases and trims what the user types before sending it.
4. **Foreign keys are real.** Tenant tables have FK constraints, and a foreign key to a natural key such as `admission_number` is composite with `tenant_id`. Services still check references before deleting, because many of the FKs have no `ON DELETE` rule.
5. **The tenant lookup cache lasts 60 seconds per process.** Deactivating a tenant with `PUT /super_admin/system/tenants/{id}/activate` clears the cache in the process that handled the request, and other workers pick it up within 60 s. A token for a deactivated tenant is then rejected with 401.
6. **Plan edits do not reach existing tenants until the plan is re-applied.**
   - Runtime checks read only the tenant's `resource_permissions`.
   - `POST/DELETE /super_admin/plans/{id}/resources` changes only `plan_resource_access`, even though the docstring says tenants gain access "immediately".
   - To propagate a plan edit, call `PUT /super_admin/system/tenants/{id}/plan` again with the same plan id. It adds what the plan now grants and removes what it no longer allows.
7. **`PUT /super_admin/system/tenants/{id}/plan` prunes permissions.** It adds the new plan's role permissions and menu links and deletes the ones the plan no longer allows, for every role including custom roles (`role_management` is kept). Users, roles and other data are not touched. It runs in one transaction.
8. **`POST /super_admin/system/tenants/` is the onboarding path.**
   - Query parameters `client_name` and `plan_id`, plus an optional JSON body `{username, email, password}` for the first Admin. The password is never a query parameter.
   - One transaction creates the tenant, the five system roles, their permissions limited to the plan, and the role menu links. A plan with no resources fails with 409 and nothing is created.
   - It does not create an academic year (nobody can log in without one), certificate templates, or the shared menu catalog and plan access, which must exist first.
9. **Role names are the join key throughout the system.** The first-login role list, `entity_id` resolution, the system-role protection list, the frontend Teacher/Staff allowlists and the seed scripts all match on the literal name. That is why system roles cannot be renamed. A custom role gets none of that behaviour.
10. **Role reassignment takes effect only at the user's next login.** Runtime checks use the `role` claim in the JWT, and `/auth/refresh` copies it (see [auth.md](auth.md)).
11. **Admin password reset has no safeguards.**
    - It does not set `is_first_login`, so the user is not forced to change the admin-chosen password.
    - It writes no audit row.
    - It does not stop an admin resetting another admin's password or deactivating their own account.
    - `update_user` uses `commit()` → `refresh()`, which breaks the repo's `flush → select → commit` rule.
12. **Client paths that do not match the backend.** The backend routes are `PUT` and `DELETE /admin/role-mgmt/{role_id}`, and there is no single-role `GET`.

    | Client | Call | Backend reality | Result |
    |---|---|---|---|
    | Web + mobile | `PUT`/`DELETE`/`GET /admin/role-mgmt/roles/{id}` (role edit/delete) | no such route | 404/405 |
    | Mobile | `updateRolePermission` sends a JSON body | backend wants query params | 422 |
    | Mobile | `applyTemplate` sends `{template_id}` | backend wants `?template_name=` | 422 |
    | Mobile | `PUT`/`DELETE /auth/menus/{id}`; both clients `GET /auth/user-menu` | do not exist | fails |
    | Web | `src/api/superadmin.ts` uses `/super-admin/...` | backend is `/super_admin/...` with different shapes | all 404 |
    | Web | `src/api/organizations.ts` uses `/organizations/...` | backend is `/superadmin/organizations` | 404 |
    | Web | `/superorg` page sends the tenant JWT | super-admin endpoints need a super-admin token | rejected; no super-admin login UI |

13. **Permission templates are stale.** The templates hardcoded in `permission_endpoints.py` use resource names that runtime checks never use, such as `fee_management`, `student_management` and `staff_management`. Applying one grants almost nothing useful. Use the seeded matrix or the resource-permission CRUD instead.
14. **Role-mgmt debug leftovers.**
    - `GET /admin/role-mgmt/roles/` has its permission check commented out, so any authenticated user can list roles.
    - `/admin/role-mgmt/test/` and `/debug-roles/` are mounted, and `debug-roles` prints all request headers, **including `Authorization`**, to stdout.
15. **`/superadmin/organizations` is legacy and non-functional.** It runs a tenant-role check against the public schema and types `org_id` as `int` while the model uses a UUID. The live registry is `tenants`.
16. **Endpoints reachable without authentication.**

    | Status | Endpoints |
    |---|---|
    | Intended | `/auth/academic-years`, `/auth/login`, `/auth/refresh`, `/auth/staff/set-password`, `/super_admin/auth/login`, `/health*` |
    | **Not intended; dangerous** | `/auth/test-setup/create-test-users` (upserts known-password users in the request tenant), `/super_admin/setup/initialize` (creates a super admin with a hardcoded password and returns it), `/auth/seed/{all-role-permissions,permission-data,verify-permission-data,location-data}`, `/auth/fix-permissions/*` |

17. **No tenant DDL remains on the registered path.** The old schema-creation SQL was removed from the system endpoints. `tenant_data_endpoints.py`, `fix_permissions_endpoints.py` and `service/schema/*` still contain per-schema SQL and are not converted.
## Web / mobile parity

| Capability | Web | Mobile |
|---|---|---|
| User list/search/filter, edit, reset password | Yes (`/admin/users`, guarded by `user_management:list`) | Yes (`app/admin/users.tsx`; also loads staff, admissions and parents lists) |
| Change a user's role (`PUT /admin/users/{id}/role`) | API only; no UI | API only; no UI |
| Roles & permissions screen | Yes (role create works; role edit/delete broken; gotcha 12) | Yes (same breakage plus the 422s) |
| Menu management | None | `app/admin/menu.tsx` (list/create work; update/delete call missing routes) |
| Super-admin console | `/superorg` page exists but is non-functional | None |
| Org/tenant choice at login | Subdomain (`getTenantFromHostname`) with the `VITE_DEFAULT_TENANT` fallback | Hardcoded `ORGANIZATIONS` list plus free text |

## Known gaps

- Serious unauthenticated endpoints need to be removed or guarded before any public deployment (gotcha 16).
- Per-schema code is not converted yet: `tenant_data_endpoints.py`, `fix_permissions_endpoints.py`, `test_setup_endpoints.py`, `setup_endpoints.py` and `service/schema/*` (gotcha 17), and the onboarding scripts under `scripts/`.
- Provisioning does not seed an academic year or certificate templates, and the shared menu catalog must be imported before a plan can grant menus.
- There is no super-admin UI and no super-admin token refresh.
- Plan resource edits reach tenants only when the plan is re-applied (gotcha 6).
- Role edit/delete is broken on both clients (gotcha 12), and the permission templates are stale (gotcha 13).
- Admin actions (user edits, password resets, role changes) have no tenant-side audit trail.

# Auth & Profile

Tenant-user login for every role, JWT issue/refresh/logout, forced first-login password change, password change/reset, and self-service profiles.
_Last verified against code: 2026-10-07_
Flows, decisions, and feature map: [graph view](../graph/views/auth.md) (source: docs/graph/graph.jsonl).

System-level tenancy and the permission model live in [../architecture.md](../architecture.md) and [../permissions.md](../permissions.md). Super-admin login and tenant-admin user management are in [tenants-and-admin.md](tenants-and-admin.md).

## What it does

- **One login endpoint for every tenant user type** (Admin, Teacher, Staff, Student, Parent and custom roles): `POST /auth/login`. Super admins log in separately at `/super_admin/auth/login`.
- **Identifier lookup order** (`MultiTenantAuthService.authenticate_user`): `users.username` → `users.email` → `staff.phone` (join). Inactive users and wrong passwords all return the same `401 Invalid Credentials`, which avoids leaking which accounts exist.
- **Usernames by role** are set when the account is created, not by the login screen:
  - Staff/Teacher: email, or phone if there is no email (`service/masters/staff_service.py`).
  - Student: admission number (`service/student/admission_service.py`).
  - Parent: email, or `{admission_no}.father` / `.mother` if there is no email.
  - Guardian: email.
  - Default temporary passwords are hardcoded in those services. See the code; do not copy them into docs.
- **The academic year is mandatory at login.** The client first calls the public `GET /auth/academic-years`, then sends `academic_year_id` (UUID). The chosen year's id and title go into the JWT and the response. A missing year or an empty string fails validation with 422; an unknown id returns 400 "Invalid academic year".
- **Forced first-login change** for users whose role is `Staff`, `Teacher`, `Student` or `Parent` and whose `users.is_first_login = TRUE`. Account creation sets this flag (staff enrolment, admission for student/father/mother/guardian). Admin accounts are never forced.
  - `POST /auth/staff/set-password` only accepts a change-password token while the user is active and `is_first_login` is still TRUE. A reused token, or one for a user who already set a password, gets 400; an inactive user, or a tenant that is no longer active, gets 401. The tenant comes from the token, not the header.
  - The change-password token is not a bearer token: used as one with a `cschema` header it gets 401 "Invalid token type" (without the header see known gaps).
- **Tokens:** HS256, signed with `JWT_SECRET_KEY` (`app/tools/jwt_utils.py`).

  | Token | Lifetime | `token_type` |
  |---|---|---|
  | Access | 24 h | `access` |
  | Refresh | 7 d | `refresh` |
  | Change-password | 15 min | `change_password` |

  - Claims: `sub` (user UUID), `username`, `role` (role **name**), `tenant_id`, `client_name`, `academic_year_id`, `academic_year_title`. `tenant_id` selects the tenant on every later request; tokens without it are rejected with 401, and a `cschema` header that disagrees gets 403.
  - Login, set-password and refresh responses include `expires_in` (access-token lifetime in seconds, 86400; `ACCESS_TOKEN_EXPIRES_IN` in `jwt_utils.py`).
  - A refresh token sent as a bearer token gets 401 "Invalid token type", and an access token sent to `/auth/refresh` gets the same.
- **Logout** (`POST /auth/logout`) blacklists the bearer access token and the `refresh_token` from the body. When the access token has already expired, the refresh token is still revoked; with neither valid it returns 401.
- **Password change**
  - Self-service: `POST /profile/change-password`. It needs `current_password` plus a new password (min 8) and a matching confirmation, and requires permission `profile:update_own`. Existing access and refresh tokens stay valid after the change.
  - Admin reset: `POST /admin/users/{id}/reset-password` (see [tenants-and-admin.md](tenants-and-admin.md)).
- **No self-service forgot/reset password exists on the backend** (email is not integrated yet). Both clients' "forgot password" screens tell the user to contact the school admin, who resets the password. Replace them with a real reset request once email is integrated.
- **Profiles:** `GET`/`PUT /profile/{student|staff|parent}/me`. Access is checked through `profile:read_own` / `profile:update_own`. The default catalog grants those two only to Student, and only when the tenant's plan lists them (see rule 19). Editable fields:

  | Role | Editable fields | Written to |
  |---|---|---|
  | Student | `email` | `users.email` |
  | Staff | `email`, `phone` | `staff` row |
  | Parent | `email`, `phone`, `occupation` | `parent` row |

  - All other profile fields are admin-managed.
  - There is no admin profile endpoint. The web Admin Profile page reads and edits the admin's own `users` row through `/admin/users/{id}`.
- **Profile audit:** every profile view, update and password change writes a `profile_audit_logs` row for the tenant (`ProfileAuditService`). Password changes are flagged sensitive. **No endpoint reads these logs.**

## Where the code lives

| Layer | Backend | Web | Mobile |
|---|---|---|---|
| Login / refresh / logout / set-password | `app/api/v1/auth/login_endpoints.py` (`/auth/*`), `app/service/auth/multi_tenant_auth_service.py` | `src/api/auth.ts`, `src/components/login-form.tsx`, `src/pages/auth/{LoginPage,SetPasswordPage,ForgotPasswordPage}.tsx`, `src/routes/_auth/*` | `app/login.tsx`, `app/set-password.tsx`, `app/forgot-password.tsx`, `services/authUtils.ts`, `contexts/AuthContext.tsx` |
| Tokens / blacklist | `app/tools/jwt_utils.py`, `app/service/auth/token_blacklist_service.py` (table `public.token_blacklist`) | `src/api/index.ts` (interceptors), `src/lib/authStore.ts` | `src/api/client.ts` (interceptors), `services/authUtils.ts` |
| Auth dependency | `app/tools/simple_permissions.py` (`get_current_user_token`, `get_current_user`), `app/db/tenant_session.py` (tenant from the token) | `src/components/providers/AuthProvider.tsx`, `src/routes/_app.tsx` / `_auth.tsx` guards | `contexts/AuthContext.tsx` |
| Schemas | `app/schemas/auth/login_schema.py`, `app/schemas/profile/*` | `src/types/auth.ts` | `services/authUtils.ts` (`AuthResponse`) |
| Profile | `app/api/v1/profile/*` (`/profile/*`), `app/service/profile/*`, `app/models/profile/profile_audit_log_model.py` | `src/routes/_app/profile.tsx` (role router), `src/pages/{students/StudentProfile,staff/StaffProfile,ParentProfile,admin/AdminProfile}.tsx`, `src/api/students/profile.ts`, `src/api/parent.ts`, `src/api/staff/staff.ts` | `app/profile.tsx`, `app/profile/change-password.tsx`, `app/admin/profile.tsx`, `src/api/profile.ts`, `src/api/users.ts` |
| User creation (sets username and first-login flag) | `app/service/masters/staff_service.py`, `app/service/student/admission_service.py` | — | — |
| Test users | `scripts/qa/setup_qa_tenant.py` (QA tenant and one user per role; local database only). `scripts/set_staff_password.py` is a legacy per-schema script | - | - |
| Tests | `tests/api/auth/` (API, against the QA tenant) | `src/__tests__/auth/` | `__tests__/auth/` |

## Rules & gotchas

1. **Use `current_user["sub"]` for the user id.** Real tokens have no `id` claim.
2. **Menus and permissions are a login-time snapshot on the client.** Permission edits, menu seeding and role reassignment only reach the UI after **logout + login**. `/auth/refresh` re-reads the user's current role name and `is_active`, so server-side checks (which use the JWT role) follow a role change at the next refresh, and an inactive user's refresh returns 401.
3. **`is_first_login` is still read and written with raw SQL inside try/except.** The column is a migrated `users` column (default false) and is on the `User` model. Staff enrolment and student admission set it with raw `UPDATE`s. A failed read is swallowed, so the user logs in without the forced change. Admin password reset does **not** set it.
4. **The refresh path is `POST /auth/refresh`** on both clients. It takes the tenant from the `cschema` header, which must match the refresh token's `tenant_id` (403 otherwise); with no header it gets 400.
   - Web (`src/api/index.ts`): on a 401 (except `/auth/login*`) it runs one shared refresh for every request that fails while it is in flight, sends the current tenant header, stores the new pair and retries each request once. A request that fails after another one already refreshed is retried with the newer token instead of refreshing again. If the refresh itself fails, the store is logged out and the page goes to `/login`.
   - Web sends its stored access token even when it has expired, and the backend answers that with 400 rather than 401 on most endpoints (see known gaps), so the web refresh path is not reached for an expired token.
5. **`client_name` in the login body cannot redirect the login.**
   - The request tenant comes from the `cschema` header. A body `client_name` for an unknown or inactive tenant gets 401 "Invalid connection"; one that resolves to a different tenant gets 400. The tokens always carry the tenant the user authenticated against.
   - Neither client sends `client_name` in the login body; the header is the only tenant hint.
   - The header is sanitised (lowercased, everything except `a-z0-9_-` removed) before lookup, so a tenant whose `client_name` contains a space or capitals cannot log in.
   - Legacy path: `auth_service.login_user`, which returns only an access token, runs only when neither header nor body names a tenant, and strict mode rejects such a request first. It is effectively dead.
6. **Logout revokes both tokens.** Both clients send `refresh_token` in the logout body. Logout needs no tenant. Mobile `logoutUser()` reads its tokens, clears SecureStore and the stored organisation, then fires `POST /auth/logout` without awaiting it, with the access token set explicitly and `_retry` set so a 401 does not start a refresh.
7. **Mobile token expiry** comes from `expires_in` (falling back to 3600 s). The request interceptor does not send an access token past that expiry (minus a buffer), so the call goes out with the `cschema` header, gets 401 and triggers the shared refresh. On a cold start with an expired access token, `isAuthenticated()` refreshes; the session is cleared only when that refresh fails.
8. **Set-password signs the user straight in on both clients.** The response has the same shape as login (including `expires_in`). Web calls `login(data)`. Mobile `authApi.setStaffPassword` returns it, and `completePasswordSetup` stores it with `storeAuthData` and then runs the same `completeLogin` steps as a normal login (parent students, interceptor headers, one `LOGIN_SUCCESS`).
9. **Mobile keeps the organization chosen at login until the session ends.** The login screen lowercases and trims the typed code, checks it with `GET /auth/academic-years` (404 means unknown organisation) and stores it only after that succeeds. `storeAuthData` then writes `@auth/client_schema` from `response.client_name`, which login and set-password responses include, else the stored organisation, and never defaults to a test tenant. Logout and a failed refresh both clear it (`clearAuthData`), so the user is asked for it again.
10. **Web admin login activates the selected academic year for the whole tenant.** `useLoginMutation` sends `PUT /masters/academic_years/{id} {is_active:true}`, and the backend deactivates all other years. An admin who picks a past year at login flips the tenant's active year. Other roles only scope their own session.
11. **`entity_id` in the login and set-password responses** comes from `MultiTenantAuthService._resolve_entity_id`: the student record id for `Student`, the parent record id for `Parent`, and the staff record id for every other role (Staff, Teacher, and an Admin or custom role that has a staff record). It is null when no record exists, for example an Admin without a staff row.
12. **Profile updates silently drop unknown fields.**
    - Both clients send `phone` and `address` for students; the backend accepts only `email`, because Pydantic ignores extra fields.
    - Staff and parent email edits change the `staff`/`parent` row, **not `users.email`**, so the login identifier does not change.
13. **Every profile GET is a DB write** (audit row plus commit). Audit errors are caught and logged, not raised.
14. **`/profile/change-password` maps role names to an audit `profile_type`.** Teacher and custom roles are recorded as `unknown`. The audit `org_id` is filled with the user id as a placeholder.
15. **Parent context has a race on both clients.** Student-scoped headers (`X-Student-ID`, `X-Academic-Year-ID`, `X-Class-ID`) must be in place before the first dashboard queries run.
    - Mobile fetches `/student-parent-links/my-children` and calls `setSelectedStudentForInterceptor` **before** dispatching `LOGIN_SUCCESS`. `LOGIN_SUCCESS` carries `selectedStudent` and `availableStudents` so auth and student context commit in one render. Otherwise navigation fires on `isAuthenticated` while `selectedStudent` is still null.
    - Web sets `isAuthenticated` first and fetches children afterwards. `AuthProvider` re-fetches `/my-children` and re-selects. Components should use `useParentChildren` / `useMyChildren` rather than trusting the persisted `availableStudents`.
16. **Never log request bodies**, because login and password payloads are plaintext. On mobile all auth `console.log` calls are behind `__DEV__`; `console.error` stays on for crash reporting.
17. **Password policy is only `min_length=8`** when a password is set (set-password, change-password, admin reset). Login itself has no length rule on the backend; the mobile login form requires 6 characters locally. There is no complexity rule, no lockout and no rate limit on tenant `/auth/login` (`rate_limit_login()` exists but is not applied). Super admins do have a lockout.
18. **Blacklist behaviour.** `public.token_blacklist` is a migrated platform table (`0003_token_blacklist_table`). `is_blacklisted` **fails open** on DB errors. `cleanup_expired()` exists but nothing schedules it.
19. **The default seed leaves profiles unreachable on catalog-built plans.** `permission_catalog.py` grants `profile:read_own`/`update_own` only to Student, and role seeding keeps a non-Admin pair only if the plan lists it. A `Full` plan built by `CatalogService.ensure_full_plan` copies the Admin catalog, which has no `profile` resource and no `_own`/`_related` actions. On such a tenant no role, Admin included, can call the profile endpoints or `POST /profile/change-password`, and Student and Parent lose their self-service grants until the plan and roles are given them explicitly.
20. **Web parent profile editing is broken.** `src/api/parent.ts` sends `PUT /profile/parent` (the backend route is `PUT /profile/parent/me`), and `ParentProfile.tsx` shows the button only for `parent_profile:update_own`, a resource that does not exist.

## Web / mobile parity

| Capability | Web | Mobile |
|---|---|---|
| Organization picker at login | No (tenant from subdomain; header only) | Yes (free-text code validated against the server; no hardcoded list) |
| Token refresh | On 401, one shared refresh (rule 4) | On 401 and before `expires_in`, and on cold start (rule 7) |
| First-login set-password | Logs straight in | Logs straight in (rule 8) |
| Forgot password | Tells the user to contact the school admin (no form) | Same |
| Self password change | Only on Admin Profile (`/admin/profile`) | `app/profile/change-password.tsx`, linked only from the Admin profile screen (`app/admin/profile.tsx`) |
| Profile view/edit | Student/Staff/Parent pages; any other role is routed to StaffProfile, which shows a basic "Account Information" card on 403 or 404 (an Admin without a `staff` row). Parent edit is broken (rule 20) | Same role routing; falls back to a basic view on error |
| Admin academic-year activation on login | Yes (rule 10) | No |
| Frontend role caps | Teacher/Staff allowlists in `src/lib/{teacher,staff}PermissionMatrix.ts` override backend grants (see [../permissions.md](../permissions.md)) | None |

## Known gaps

- There is no backend forgot/reset-password flow (email/OTP), and no endpoint to read `profile_audit_logs`.
- `/auth/refresh` does not rotate or revoke the old refresh token, so a leaked refresh token stays usable until it expires or is revoked at logout. A deactivated user's current access token stays valid until it expires, and neither admin password reset nor self-service password change revokes sessions.
- A bearer token that is not a valid access token (expired, tampered, or a change-password token) sent without a `cschema` header gets 400 "Tenant must be specified" instead of 401 on endpoints that open the tenant session before checking auth. This blocks the web 401-refresh path for expired tokens (rule 4).
- `/auth/validate-access` and its sibling access-validation endpoints check no permission, so any authenticated user can query another user of the tenant.
- Profiles are unreachable on tenants whose plan lacks the `profile` grants (rule 19).
- Mobile `src/api/auth.ts` holds a dead `refreshToken()` and dead token helpers that use AsyncStorage keys (`@auth/access_token`). The live path is `services/authUtils.ts`. The web `src/constants/api/auth.ts` is unused.

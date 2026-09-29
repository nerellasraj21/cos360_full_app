# Auth & Profile

Tenant-user login for every role, JWT issue/refresh/logout, forced first-login password change, password change/reset, and self-service profiles.
_Last verified against code: 2026-09-29_
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
- **The academic year is mandatory at login.** The client first calls the public `GET /auth/academic-years`, then sends `academic_year_id` (UUID). The chosen year's id and title go into the JWT and the response. A missing year returns 400, as does an unknown one, and an empty string fails with 422.
- **Forced first-login change** for users whose role is `Staff`, `Teacher`, `Student` or `Parent` and whose `users.is_first_login = TRUE`. Account creation sets this flag (staff enrolment, admission for student/father/mother/guardian). Admin accounts are never forced.
- **Tokens:** HS256, signed with `JWT_SECRET_KEY` (`app/tools/jwt_utils.py`).

  | Token | Lifetime | `token_type` |
  |---|---|---|
  | Access | 24 h | `access` |
  | Refresh | 7 d | `refresh` |
  | Change-password | 15 min | `change_password` |

  - Claims: `sub` (user UUID), `username`, `role` (role **name**), `client_name`, `academic_year_id`, `academic_year_title`.
- **Logout** (`POST /auth/logout`) blacklists the bearer access token. It also blacklists the refresh token when the body contains `refresh_token`.
- **Password change**
  - Self-service: `POST /profile/change-password`. It needs `current_password` plus a new password (min 8) and a matching confirmation, and requires permission `profile:update_own`.
  - Admin reset: `POST /admin/users/{id}/reset-password` (see [tenants-and-admin.md](tenants-and-admin.md)).
- **No self-service forgot/reset password exists on the backend.** Both clients' "forgot password" screens are stubs. Recovery means asking the school admin to reset the password.
- **Profiles:** `GET`/`PUT /profile/{student|staff|parent}/me`. Access is checked through `profile:read_own` / `profile:update_own`. Editable fields:

  | Role | Editable fields | Written to |
  |---|---|---|
  | Student | `email` | `users.email` |
  | Staff | `email`, `phone` | `staff` row |
  | Parent | `email`, `phone`, `occupation` | `parent` row |

  - All other profile fields are admin-managed.
  - There is no admin profile endpoint. The web Admin Profile page reads and edits the admin's own `users` row through `/admin/users/{id}`.
- **Profile audit:** every profile view, update and password change writes a `profile_audit_logs` row in the tenant schema (`ProfileAuditService`). Password changes are flagged sensitive. **No endpoint reads these logs.**

## Where the code lives

| Layer | Backend | Web | Mobile |
|---|---|---|---|
| Login / refresh / logout / set-password | `app/api/v1/auth/login_endpoints.py` (`/auth/*`), `app/service/auth/multi_tenant_auth_service.py` | `src/api/auth.ts`, `src/components/login-form.tsx`, `src/pages/auth/{LoginPage,SetPasswordPage,ForgotPasswordPage}.tsx`, `src/routes/_auth/*` | `app/login.tsx`, `app/set-password.tsx`, `app/forgot-password.tsx`, `services/authUtils.ts`, `contexts/AuthContext.tsx` |
| Tokens / blacklist | `app/tools/jwt_utils.py`, `app/service/auth/token_blacklist_service.py` (table `public.token_blacklist`) | `src/api/index.ts` (interceptors), `src/lib/authStore.ts` | `src/api/client.ts` (interceptors), `services/authUtils.ts` |
| Auth dependency | `app/tools/simple_permissions.py`, `app/tools/permission_decorators.py` (`get_current_user_token`) | `src/components/providers/AuthProvider.tsx`, `src/routes/_app.tsx` / `_auth.tsx` guards | `contexts/AuthContext.tsx` |
| Schemas | `app/schemas/auth/login_schema.py`, `app/schemas/profile/*` | `src/types/auth.ts` | `services/authUtils.ts` (`AuthResponse`) |
| Profile | `app/api/v1/profile/*` (`/profile/*`), `app/service/profile/*`, `app/models/profile/profile_audit_log_model.py` | `src/routes/_app/profile.tsx` (role router), `src/pages/{students/StudentProfile,staff/StaffProfile,ParentProfile,admin/AdminProfile}.tsx`, `src/api/students/profile.ts`, `src/api/parent.ts`, `src/api/staff/staff.ts` | `app/profile.tsx`, `app/profile/change-password.tsx`, `app/admin/profile.tsx`, `src/api/profile.ts`, `src/api/users.ts` |
| User creation (sets username and first-login flag) | `app/service/masters/staff_service.py`, `app/service/student/admission_service.py` | — | — |
| Dev scripts | `scripts/set_staff_password.py` (skips first-login), `scripts/create_*`, `scripts/seed_*` | — | — |

## Rules & gotchas

1. **Use `current_user["sub"]` for the user id.** Real tokens have no `id` claim. The `/auth/test-jwt/*` tokens use fixed fake UUIDs.
2. **Menus, permissions and role are a login-time snapshot.** Role or permission edits, menu seeding and role reassignment all need a **logout + login**. A refresh does not help because it copies the old `role` claim. Server-side checks use the role name from the JWT, so a demoted user keeps old rights for up to 7 days by refreshing.
3. **`is_first_login` is not in the SQLAlchemy `User` model.** It is read and written only with raw SQL inside try/except. If a tenant schema lacks the column, the first-login check silently passes and the user logs in normally. No Alembic revision creates the column (it was added by hand), so it exists only in schemas cloned from one that has it. Admin password reset does **not** set it.
4. **The refresh path is `/auth/refresh`.**
   - Web calls `/auth/login/refresh` (`src/api/index.ts`). That 404s, so the interceptor logs the user out and redirects to `/login` on the first 401 after the 24 h access token expires.
   - Web refresh is effectively broken.
   - `src/constants/api/auth.ts` and the root `CLAUDE.md` also give the wrong path.
   - Mobile uses the correct path.
5. **`client_name` in the login body does not choose the database schema.**
   - It is only used to validate that the tenant exists and to fill the JWT `client_name` claim.
   - The DB session always uses the request tenant resolved by `TenantMiddleware` (see [../architecture.md](../architecture.md)).
   - Web hardcodes `client_name: "test_tenant"` in `login-form.tsx`.
   - Legacy path: a request with no tenant anywhere falls into a login that returns only an access token (`auth_service.login_user`). It is effectively dead.
6. **Logout rarely revokes anything.**
   - Neither client sends `refresh_token` in the logout body, so the refresh token stays valid for 7 days after logout.
   - Mobile `logoutUser()` clears SecureStore *before* firing `POST /auth/logout`, and the request interceptor then finds no token. The call goes out without a Bearer header, gets a 401, and the access token is never blacklisted either.
7. **Mobile expiry is an assumption.**
   - The backend returns no `expires_in`, so mobile assumes 3600 s.
   - While the app runs, this only causes extra proactive refreshes.
   - On a cold start after roughly 55 minutes, `isAuthenticated()` treats the session as expired and **clears it instead of refreshing**, so the user must log in again even though the refresh token is valid for 7 days.
8. **Mobile set-password discards the returned session.**
   - `authApi.setStaffPassword` returns `void`.
   - `refreshAuth()` then finds no stored tokens, so the user ends up back on login and must sign in with the new password.
   - Web calls `login(data)` with the response and goes straight in.
9. **Mobile resets the stored organization after login.** `storeAuthData` writes `@auth/client_schema = response.client_name || 'test_tenant'`. The login response has no `client_name`, so after every login the stored org becomes `test_tenant` and the next launch pre-selects the wrong organization.
10. **Web admin login activates the selected academic year for the whole tenant.** `useLoginMutation` sends `PUT /masters/academic_years/{id} {is_active:true}`, and the backend deactivates all other years. An admin who picks a past year at login flips the tenant's active year. Other roles only scope their own session.
11. **Teacher `entity_id` is null on normal login.** The login code only resolves a staff entity for role name `Staff`. The set-password path resolves Teacher too. Clients must not rely on `entity_id` for teachers.
12. **Profile updates silently drop unknown fields.**
    - Both clients send `phone` and `address` for students; the backend accepts only `email`, because Pydantic ignores extra fields.
    - Staff and parent email edits change the `staff`/`parent` row, **not `users.email`**, so the login identifier does not change.
13. **Every profile GET is a DB write** (audit row plus commit). Audit errors are caught and logged, not raised.
14. **`/profile/change-password` maps role names to an audit `profile_type`.** Teacher and custom roles are recorded as `unknown`. The audit `org_id` is filled with the user id as a placeholder.
15. **Parent context has a race on both clients.** Student-scoped headers (`X-Student-ID`, `X-Academic-Year-ID`, `X-Class-ID`) must be in place before the first dashboard queries run.
    - Mobile fetches `/student-parent-links/my-children` and calls `setSelectedStudentForInterceptor` **before** dispatching `LOGIN_SUCCESS`. `LOGIN_SUCCESS` carries `selectedStudent` and `availableStudents` so auth and student context commit in one render. Otherwise navigation fires on `isAuthenticated` while `selectedStudent` is still null.
    - Web sets `isAuthenticated` first and fetches children afterwards. `AuthProvider` re-fetches `/my-children` and re-selects. Components should use `useParentChildren` / `useMyChildren` rather than trusting the persisted `availableStudents`.
16. **Never log request bodies**, because login and password payloads are plaintext. On mobile all auth `console.log` calls are behind `__DEV__`; `console.error` stays on for crash reporting.
17. **Password policy is only `min_length=8`.** There is no complexity rule, no lockout and no specific rate limit on tenant `/auth/login`, only the global limiter. Super admins do have a lockout.
18. **Blacklist behaviour.** `public.token_blacklist` is created lazily (`CREATE TABLE IF NOT EXISTS`) on first use. `is_blacklisted` **fails open** on DB errors. `cleanup_expired()` exists but nothing schedules it.

## Web / mobile parity

| Capability | Web | Mobile |
|---|---|---|
| Organization picker at login | No (tenant from subdomain; body `client_name` hardcoded) | Yes (hardcoded org list + free text, normalized to lowercase) |
| Token refresh | Broken path (rule 4) | Works, with a proactive 1 h assumption (rule 7) |
| First-login set-password | Logs straight in | Forces re-login (rule 8) |
| Forgot password | Fake "reset link sent" after a `setTimeout`; misleading | Stub that tells the user to contact the school admin |
| Self password change | Only on Admin Profile (`/admin/profile`) | All roles (`app/profile/change-password.tsx`) |
| Profile view/edit | Student/Staff/Parent pages; any other role is routed to StaffProfile, which 404s when the user has no `staff` row (typical for Admin) | Same role routing; falls back to a basic view on error |
| Admin academic-year activation on login | Yes (rule 10) | No |
| Frontend role caps | Teacher/Staff allowlists in `src/lib/{teacher,staff}PermissionMatrix.ts` override backend grants (see [../permissions.md](../permissions.md)) | None |

## Known gaps

- There is no backend forgot/reset-password flow (email/OTP), and no endpoint to read `profile_audit_logs`.
- Web refresh path is wrong; see Rules & gotchas #4.
- Logout does not revoke the refresh token on either client, and mobile does not revoke the access token either; see Rules & gotchas #6.
- Mobile clears still-refreshable sessions on cold start (Rules & gotchas #7) and discards the set-password session (Rules & gotchas #8).
- `/auth/refresh` does not rotate or revoke the old refresh token and does not re-check `users.is_active`, so a deactivated user keeps refreshing for up to 7 days.
- `/auth/staff/set-password` does not check that the user is still in first-login state. Any valid unexpired change-password token can reset the password.
- Teacher `entity_id` is missing on normal login; see Rules & gotchas #11.
- Mobile `src/api/auth.ts` holds a dead `refreshToken()` and dead token helpers that use AsyncStorage keys (`@auth/access_token`). The live path is `services/authUtils.ts`. The web equivalents `src/lib/apiClient.ts` and `src/constants/api/auth.ts` are also unused or stale.
- The web forgot-password page tells users a reset link was sent when nothing was sent.

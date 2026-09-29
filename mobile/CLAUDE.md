# COS360 Mobile — Coding Conventions

Expo SDK 54, React Native 0.81 (new arch), React 19.1, expo-router v6 (`typedRoutes`, `reactCompiler` on in `app.json`), TanStack Query v5, axios, expo-secure-store + AsyncStorage, `react-native-element-dropdown`, `@react-native-community/datetimepicker`, Ionicons, Zod.
Cross-app contract: root `CLAUDE.md`. Architecture: `docs/architecture.md`. Permissions: `docs/permissions.md`. Module rules: `docs/modules/<module>.md`. Builds/releases: `docs/operations/mobile-release.md`.

## Code quality rule — MANDATORY (set by the user)

Before writing ANY new code: read every similar existing screen in full, read the exact types for every field, verify every import path and component name exists (`components/ui/`, `components/`), check hook signatures in the hook file, and copy the structure of a working screen. Then dry-run API → hook → render. **The web app is the reference**: grep `web/src` before adding a mobile feature and don't add features the web doesn't have. The user tests everything, so a crash means you skipped verification.

## Commands (from `mobile/`)

`npm install` · `npm start` (`npx expo start --clear` after changing `.env`; on Android also clear Expo Go app data) · `npx tsc --noEmit` · `npm run lint` (expo lint) · `npm test` (jest-expo).
Use npm (`package-lock.json`). No workspaces or hoisting.

## Folder layout

`@/` maps to the **mobile root** (not `src/`): `@/components/...`, `@/src/api/...`.

| Path | Role |
|---|---|
| `app/` | expo-router screens. `(tabs)/` holds the tab bar and module hubs; `app/<module>/*.tsx` are stack sub-screens; `login`, `set-password`, `index` (auth redirect). Every file here is a route, so never put type/helper `.ts` files in `app/` (Expo Router warns "missing default export"). |
| `src/api/client.ts` | The HTTP client (canonical). |
| `src/api/<module>.ts` | API functions and many inline request/response types. |
| `src/api/hooks/<module>/` | React Query hooks for masters, fee, students, profile, users, parents. |
| `hooks/use-*.ts` (root) | Older hook files still in use: `use-transport`, `use-expense(-protected)`, `use-staff-api`, `use-fee-permissions`, permission hooks, `use-form-dirty-guard`. Grep both hook locations before adding one. |
| `src/hooks/` | `useMobilePermission`, `usePermissionProtectedQuery/Mutation`, `useScreenPermissions`. |
| `src/types/` | Shared types (e.g. `transport.ts`, `expense.ts`, `permissions.ts`). New shared types go here; don't redefine them in API files. |
| `src/lib/` | `menuUtils.ts` (role menu rules), `roles.ts`, teacher/staff permission matrices. |
| `components/` | Shared UI: `AppLayout`, `ScreenLayout`, `AppHeader`, `ConfirmModal`, `ToastProvider`, `PermissionGuard(s)`, `ScreenAccessGate`, `FormDirtyGuard`; `components/ui/` (dropdown, date/time pickers, `StatusBadge`); `components/navigation/` (drawer, `menuMap.ts`). |
| `contexts/` | `AuthContext` (auth + permissions, the single source), `ThemeContext` (`useTheme()`), `AcademicYearContext`. |
| `services/` | `authUtils.ts` (token/storage/login/refresh), `errorHandler.ts`. |
| `constants/theme.ts` | Colour tokens (light/dark). |

Dead code (don't import or wire up; excluded from `tsconfig` or unreferenced): `src/lib/axios.ts` (a web-style client with the wrong refresh path), `src/api/mobilePermissions.ts`, `src/components/mobile/*` (the `useMobileAuthStore` consumers; only `buildPermissionMap` from `src/stores/mobileAuthStore.ts` is live), `src/navigation/ProtectedNavigator.tsx`, `services/offlineStorage.ts` (offline queue removed), the legacy AsyncStorage token helpers at the top of `src/api/auth.ts`, and `components/ui/ConfirmModal.tsx` (use `components/ConfirmModal.tsx`).

## API client (`src/api/client.ts`)

- Base URL: `EXPO_PUBLIC_API_URL` (includes `/api/v1`), falling back to `http://localhost:8000/api/v1`. A physical device needs a LAN IP or domain.
- `cschema`: the stored client schema (`getClientSchema()`, AsyncStorage `@auth/client_schema`, set at login from the org field), else `EXPO_PUBLIC_DEFAULT_TENANT`, else `test_tenant`. It is **always** sent, including pre-login `/auth/academic-years`.
- `Authorization`: from `getValidAccessToken(false)`. Skipped for `/auth/login*`, `/auth/refresh`, `/auth/academic-years`.
- Parent context: `X-Student-ID`, `X-Academic-Year-ID`, `X-Class-ID` come from a module variable set by `setSelectedStudentForInterceptor()`. Each is sent only when defined, so no `"undefined"` strings.
- 401: one shared `refreshPromise` (concurrent 401s make a single `POST /auth/refresh`) → retry. On failure `onSessionExpired` (registered by `AuthProvider`) logs out. Refresh tokens rotate: always store the new `refresh_token`.
- Errors: `errorHandler.handleApiError` extracts FastAPI `detail` and writes it into `error.message`, so `onError: e => showError('Save Failed', e.message)` shows the backend reason.
- **Never log request bodies** (`config.data` contains passwords). Gate `console.log`/`warn` behind `__DEV__`. `console.error` stays ungated for crash reporting.
- `src/api/queryClient.ts`: 5 min `staleTime`, no retry on 4xx, exponential retry on 5xx/network. Mutations retry once on network or 5xx errors, so make create endpoints idempotent-safe or pass `retry: 0`.
- List responses are sometimes a plain array and sometimes `{ items, total }`. Use `res.data?.items ?? res.data` unless the backend model is certain. Decimal amounts arrive as strings (`Number(v)`). IDs in paths are UUIDs.
- Query strings: pass `apiClient.get(url, { params })` (axios drops `undefined`). `new URLSearchParams(obj)` sends the literal string `"undefined"`.

## Auth flow

- Tokens (`auth_access_token`, `auth_refresh_token`, `auth_token_expiry`, `auth_change_password_token`) live in **expo-secure-store** via `secureSet/secureGet/secureDelete` (`services/authUtils.ts`; keys must match `[A-Za-z0-9._-]`; web falls back to prefixed AsyncStorage). User, role, permissions, menu, schema and student context stay in AsyncStorage. Never put tokens in AsyncStorage.
- Login (`app/login.tsx`): org name → `setClientSchema` → academic year (public `GET /auth/academic-years`) → `POST /auth/login` with `username`, `password`, `client_name`, `academic_year_id`. Orgs come from the hardcoded `ORGANIZATIONS` list plus fuzzy matching in `login.tsx` (there's no public tenant endpoint), so add new tenants there.
- **First login:** the backend returns `{ requires_password_change: true, change_password_token }`. `loginUser` stores only that token. `app/set-password.tsx` posts `{ change_password_token, new_password, confirm_password }` to `POST /auth/staff/set-password` (all roles; **no `current_password` field**), clears the token, then `refreshAuth()`. Validate passwords on the `trim()`med length.
- **Parent login race:** in `AuthContext.login`, parent students are fetched, persisted and passed to `setSelectedStudentForInterceptor()` **before** a single `LOGIN_SUCCESS` dispatch that carries `selectedStudent` and `availableStudents`. Why: navigation fires on `isAuthenticated`, and dashboard queries sent before the student headers existed returned wrong or empty data. Keep that ordering and the atomic dispatch; don't reintroduce separate `SELECT_STUDENT` dispatches after login.
- `initializeAuth()` awaits `isAuthenticated()` **before** reading user data in parallel, because the check can clear storage. Restore state with `refreshAuth()` (it also restores student context and headers), never by dispatching `INITIALIZE_AUTH` by hand.
- `AuthProvider` uses a `stateRef` mirror so `selectStudent`/`setAvailableStudents` never see stale state. Logout: call `logout()` then `router.replace('/login')` explicitly.
- Permissions come only from the login response (`normalisePermissions()` converts `{resource: [actions]}` to an array). There is no permission-sync endpoint, so users must re-login to pick up new grants.

## Permissions on mobile

Model: `docs/permissions.md`. Single source: `useAuth().hasPermission(resource, action)` (`contexts/AuthContext.tsx`, also via `useMobilePermission`).
- Teacher and staff roles are capped by `src/lib/teacherPermissionMatrix.ts` / `staffPermissionMatrix.ts`. These are **identical copies of the web files**, so change both.
- Whole screen: wrap in `<ScreenAccessGate resources={[...]} permissions={[...]} blockRoles={['student']}>`. It grants on read OR list and shows an in-layout Access Denied panel.
- Buttons: `CreatePermissionGuard` / `UpdatePermissionGuard` / `DeletePermissionGuard` / `ReadOrListPermissionGuard` (`components/PermissionGuards.tsx`) with `resource={PERMISSION_RESOURCES.X}`. Inside action rows pass `fallback={null} loadingFallback={null}`: the default loading view is a `flex:1` spinner that breaks the row and eats touches. `PermissionGuard` checks `loadingFallback !== undefined`, so `null` is honoured.
- `usePermissionProtectedMutation` makes `mutate` a **silent no-op** (console.warn only) without permission. Hide the control or use plain `useMutation` for delete flows that must report failure.
- Tabs (`app/(tabs)/_layout.tsx` `TAB_CONFIGS`) and dashboard cards (`app/(tabs)/index.tsx` `MODULES`) mirror the web's role hide rules (`hideForRoles`, `roleBlocksFees`). Don't use `alwaysShow` for admin-only tiles.

## Navigation

- The backend menu uses **web paths**. `components/navigation/menuMap.ts` `WEB_TO_MOBILE` / `mapPath()` translate them for the drawer and hubs, so a new screen reachable from the menu needs an entry there.
- The Masters hub (and the student/parent sections of the Fees hub) render from the backend menu, with a permission-filtered fallback list for cold start. The Transport hub and admin Fee sections are hardcoded lists. Only show sections that the backend menu (and web dashboard) actually has.
- Tab screens and most sub-screens use `AppLayout title="..."` (header + bottom nav, `showFooter`). `ScreenLayout` (no bottom nav, `headerRight` slot for actions like "+ Add") is used by a few admin screens. `AppHeader` has no back button; sub-screens rely on the stack or system back.
- Typed routes: navigate with `router.push('/transport/routes')`. Hub-to-tab links use `'/(tabs)/masters'`.

## UI conventions

- Theme: `const { colors, theme } = useTheme()`. Use `colors.primary` (brand `#556ee6`), `colors.card`, `colors.border`, `colors['muted-foreground']`. **Never hardcode `Colors.light`**; pass theme colours into child modals. `ThemedText`/`ThemedView` for text and backgrounds.
- Brand logo `assets/images/cos360-logo.jpg` is used on login and in the drawer header. The `AppHeader` circle is the user-initial avatar.
- Lists: `FlatList` (or `ScrollView` + map for short lists) with **cards**, not tables. There is no DataTable on mobile, so broken lists are API/hook/permission problems. Card = left colour accent + title/badge row + Ionicons meta rows + footer actions; copy an existing screen such as `app/expense/categories.tsx`.
- Toasts: `const { showSuccess, showError } = useToastContext()` from `@/components/ToastProvider`, in hooks and screens. **Never `useToast()` from `FeedbackToast`**: that creates private state no one renders, so the toast is silently lost. No `Alert.alert` for mutation feedback. Toast in the hook **or** at the call site, not both.
- Confirmations: `const { confirm, modalProps } = useConfirmModal()` + `<ConfirmModal {...modalProps} />` from `@/components/ConfirmModal`. Pass `destructive: true` for deletes. Never `window.confirm`/`Alert.alert`.
- Unsaved-changes guard is available: `useFormDirtyGuard(isDirty)` / `withFormDirtyGuard` (`hooks/use-form-dirty-guard.ts`, `components/FormDirtyGuard.tsx`) with `useDirtyTracking`. No screen uses it yet (web guards ~40 dialogs via `guardDirty`), so add it to create/edit forms you touch.
- Status pills: `components/ui/StatusBadge.tsx`, `src/utils/statusColors.ts`. CSV export: `exportToCsv` (`src/utils/exportCsv.ts`, native share sheet).

## Critical patterns

**Empty-string text node.** `{str && <Text>…</Text>}` renders `""` when `str` is empty, and RN (esp. web) throws "Unexpected text node". Always `{!!str && …}` or a ternary.

**CustomDropdown search crash.** `CustomDropdown` / `CustomMultiSelect` (`components/ui/dropdown.tsx`, search on by default) call `.toLowerCase()` on every label, so an `undefined` label crashes on search. Always map `label: item.route_name || item.label || ''`. Dynamic lookups (route/trip types, admission types) come from their `/dropdown` endpoints; never hardcode enum options.

**Date/time pickers.**
- Preferred: the pure-JS, theme-aware `DatePickerModal` (`YYYY-MM-DD`, `presets`, min/max) and `TimePickerModal` (`HH:MM`, `withSeconds`) from `components/ui/`.
- When you need the native `@react-native-community/datetimepicker`, it **must not be nested inside another RN `Modal`** (it renders behind the overlay). Render it at the component root (wrap the return in `<>…</>`) and split by platform:

```tsx
{show && Platform.OS === 'android' && (
  <DateTimePicker value={d} mode="date" display="default" onChange={(_, v) => { setShow(false); if (v) set(v); }} />
)}
{Platform.OS === 'ios' && (
  <IOSDatePickerModal visible={show} value={d} onChange={set} onDismiss={() => setShow(false)} />
)}
```

Android auto-commits and dismisses. iOS (`components/ui/ios-date-picker-modal.tsx`) holds a pending value and commits on Done. Don't use `display="spinner"` on Android, because it renders nothing without an explicit height.

**Metro/Babel:** declare `type` aliases at module scope, never inside a function body.

**Taps swallowed in ScrollViews:** a `ScrollView` holding forms or action buttons (especially nested vertical + horizontal ones) needs `keyboardShouldPersistTaps="handled"`, or taps on Edit/Delete/Save do nothing.

**Authenticated downloads:** use `FileSystem.downloadAsync(url, localUri, { headers })` from `expo-file-system/legacy` with the `Authorization` and `cschema` headers (see `downloadAuthenticatedFile` in `app/exam/hall-tickets/[examId].tsx`). `Linking.openURL` can't send headers and returns 401 on protected endpoints. `app/exam/hall-ticket-download.tsx` still uses `Linking.openURL`, which is a known bug.

**Query keys:** use stable primitives (`['subjects', p?.academic_year_id, p?.active_only]`), not a whole params object built each render. Every mutation invalidates the affected list keys.

**`useCallback` with inline handlers:** if a memoized render function uses handlers recreated each render, drop the `useCallback` (React Compiler memoizes) to avoid stale closures.

## Backend endpoints and field traps

- **Don't call (not implemented in backend):** `GET /expense/departments`, `GET /expense/departments/dropdown` (the screen shows "Not Available"). There are also no mobile permission sync/check endpoints (`/auth/mobile/permissions/sync`, `/auth/permissions/check`, `/auth/permissions/bulk-check`).
- Field names the mobile code has got wrong before (verify against `backend/app/schemas/` whenever you touch these):
  - Exams: `exam_name` (not `title`); list filter `exam_status`; marks pagination `page_size`.
  - Results: `is_passed`, `total_marks_obtained`, `grade_label`.
  - Fee refund approval needs `{ refund_id, action: 'approve'|'reject', approval_remarks }`.
  - Staff: `designation_obj`, `bank_branch`, `ifsc_code`.
  - Student transport create: `{ student_id, trip_id, stop_id, fee_per_term?, pricing_id? }` (not `route_id`); stop name is `stop.name`.
  - Admission `admission_type` is `pre_primary` | `regular` (a separate `is_primary` field holds `primary` | `not_primary`).
  - Fee categories dropdown returns `{ id, category_name }` (no `name`/`label`).

  Module detail: `docs/modules/`.

## Debug components

`components/PermissionDebugger.tsx`, `AuthStateDebugger.tsx`, `QuickDiagnostic.tsx`, `app/permission-test.tsx` return `null` unless `__DEV__`. Keep that guard on any new debug UI. `SimplePermissionTest`, `QuickPermissionCheck`, `ui/PermissionFeedbackDemo`, `ui/dropdown-example` are unreferenced demos with no guard, so don't mount them.

## Testing

Jest with `jest-expo` preset (config in `package.json`). Tests live in `components/__tests__/` (`test-utils.tsx` provides `renderWithProviders`). `__mocks__/@react-navigation/native.js` is auto-applied to **every** test: it fakes `useNavigation`/`usePreventRemove` (helpers `__triggerBeforeRemove`, `__navigationDispatchMock`, `__resetFormDirtyGuardNavMock`) and passes everything else through. Keep it pass-through-safe when extending it.

## Environment and builds

`.env` (gitignored; template `.env.example`): `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_DEFAULT_TENANT`, `APP_ENV`. `EXPO_PUBLIC_*` values are baked into the bundle, so never put secrets there. `eas.json` profiles (development/preview/production) set only `APP_ENV`, so provide `EXPO_PUBLIC_API_URL` via EAS env for builds. App ids: `com.cos360.mobile`. Release steps: `docs/operations/mobile-release.md`.

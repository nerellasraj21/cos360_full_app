# COS360 Web — Coding Conventions

React 19 + TypeScript 5.8 + Vite 6, TanStack Router v1 (file routes) + TanStack Query v5, Zustand 5, Tailwind 4 + shadcn/ui (Radix), react-hook-form + Zod, axios, sonner, lucide-react.
Cross-app contract (base URL, `cschema`, auth, types): root `CLAUDE.md`. System design: `docs/architecture.md`. Module business rules: `docs/modules/<module>.md`. Permissions model: `docs/permissions.md`.

## Code quality rule — MANDATORY (set by the user)

Before writing ANY new code:
1. Read every similar existing implementation first (e.g. before a new transport page, read `pages/transport/routes.tsx` and `pricing.tsx` in full).
2. Read the exact TypeScript types in `src/types/` for every field you use.
3. Verify every import exists — check real file paths, never assume.
4. Check hook signatures in the existing hook file — never guess parameter names.
5. Copy the structure of a working screen; don't invent new patterns.
6. Dry-run the data flow: API → hook → component render.

The user tests everything. If it crashes or doesn't work, it's on us for not verifying first.

## Commands (run from `web/`)

`npm install` · `npm run dev` · `npm run build:check` (tsc -b + vite build — the real type check) · `npm run lint` · `npx shadcn@latest add <component>`.
There is no `test` script and no web CI. Vitest is installed; the only tests are under `src/components/dropdown-system/**/__tests__` (`npx vitest run`).
Use npm (`package-lock.json`); don't use yarn.

## Folder layout (`src/`)

| Path | What goes there |
|---|---|
| `api/index.ts` | `CAxios` — the only HTTP client. Import `CAxios from '@/api'` (or `'@/api/index'`). |
| `api/<module>/*.ts`, `api/<module>.ts` | Plain API functions (no React). |
| `api/hooks/<module>/` **and** `hooks/<module>/` | React Query hooks. Both folders are live: masters/staff/students/exam/communication/fee receipts+transactions live in `api/hooks/`; fee, expense, dropdown and some staff/masters hooks live in `hooks/`. Grep both before adding; add next to the module's existing hooks. |
| `hooks/` (root files) | `usePermission`, `usePermissionProtectedQuery/Mutation`, `useFormGuard`, `useStudentContext`. |
| `routes/` | TanStack file routes — thin wrappers that render a page from `pages/`. |
| `pages/<module>/` | Page components. `pages/masters/common/MasterPage.tsx` is the generic CRUD page. |
| `components/ui/` | shadcn primitives + app primitives (`PageHeader`, `StatusBadge`, `FilterBar`, `DatePicker`, `TimePicker`, custom `select`, `dialog`). |
| `components/common/` | `TableActions`, `ConfirmDialog`, `PermissionGuard` (simple), `table.tsx` (MasterPage table). |
| `components/dropdown-system/` | Pre-built entity dropdowns (`ClassesDropdown`, `SectionsByClassDropdown`, `SubjectsDropdown`, `AcademicYearsDropdown`, `FeeTypesDropdown`, `TransportRoutesDropdown`, `VehiclesDropdown`, ...). |
| `lib/` | Zustand stores, `config.ts`, `routeLabels.ts`, `menuUtils.ts`, `roleUtils.ts`, role permission matrices, `useSelectStyles.ts`. |
| `constants/` | `permissions.ts` (`PERMISSIONS`), `dropdown/endpoints.ts`, `api/`. |
| `types/` | Mirrors of backend Pydantic schemas. |

Gotchas:
- `@/api/expense`, `@/api/staff`, `@/api/parent` resolve to the **flat file** (`api/expense.ts` etc.), not the folder's `index.ts`. Import folder files explicitly (`@/api/staff/attendance`). `expenseApi` from `@/api/expense` is a flat `ExpenseService`: call `expenseApi.getCategories()`, not `expenseApi.categories.x()`.
- `src/lib/apiClient.ts` and `src/lib/expenseApiClient.ts` are unused legacy clients (the former hardcodes a misspelled tenant header). Never import them.
- `src/api/staff/index.ts` `staffAttendanceApi` calls `/masters/staff/attendance`, which the backend does not have. Use `src/api/staff/attendance.ts` (`/staff/attendance`).

## API layer

`CAxios` (`src/api/index.ts`) adds on every request: `Authorization: Bearer`, `cschema` (tenant from subdomain via `getTenantFromHostname`, else `VITE_DEFAULT_TENANT`), and for parents `X-Student-ID` / `X-Academic-Year-ID` / `X-Class-ID` from `authStore.selectedStudent`. On 401 it tries one refresh, then logs out to `/login`. It rewrites `error.message` from FastAPI `detail` (string, array of `{msg}`, or object), so `onError` can show `error.message` directly.

Rules:
- Components never call `CAxios` directly — always through a React Query hook.
- Don't copy server data into `useState`; read it from the query.
- Env: `VITE_API_BASE_URL` (includes `/api/v1`), `VITE_DEFAULT_TENANT`, `VITE_TENANT_HEADER`, `VITE_LOG_LEVEL` — see `.env.example`, read via `src/lib/config.ts`.
- Backend `Decimal` fields (amounts, salaries) arrive as **strings**: `Number(val)` for display/math, and before `form.reset()` (`z.number()` rejects strings).
- Some list endpoints return a plain array, others `{ items, total, ... }`. Check the backend response model; don't assume.
- Drop empty optional fields before POST/PATCH instead of sending `""`/`undefined`.

### Query hooks

One key factory per resource, exported from the hook file:

```ts
export const vehiclesKeys = {
  all: ['vehicles'] as const,
  lists: () => [...vehiclesKeys.all, 'list'] as const,
  list: (activeOnly?: boolean) => [...vehiclesKeys.lists(), { activeOnly }] as const,
  dropdown: (activeOnly?: boolean) => [...vehiclesKeys.all, 'dropdown', { activeOnly }] as const,
  details: () => [...vehiclesKeys.all, 'detail'] as const,
  detail: (id: string) => [...vehiclesKeys.details(), id] as const,
};   // src/api/hooks/masters/vehicles.ts
```

- Mutations invalidate in `onSuccess` and toast via `sonner`: `toast.success(...)` / `toast.error(error.message)`. Don't add a second `onError` toast at the call site.
- Invalidate every key the change affects. Dropdown keys (e.g. `vehiclesKeys.dropdown`) are **not** under `lists()`; invalidate `keys.all` if dropdowns show the entity.
- The global `QueryClient` (`src/main.tsx`) uses `staleTime` 5 min, `refetchOnMount: false`, `refetchOnWindowFocus: false`, `retry: 1`. **Missing invalidation = stale UI until reload.**
- Permission-gated queries (`enabled: hasPermission`) can get stuck: Zustand `persist` rehydrates after the first render, so the query registers as disabled and `refetchOnMount: false` stops it from firing when it flips to enabled. Add `refetchOnMount: true` to such list hooks (see `src/hooks/expense/index.ts`).
- `enabled: !!id` for detail queries.

## State

Server state = React Query only. Zustand stores in `src/lib/`:
- `authStore` (persisted as `auth-storage`): `user`, `role`, `permissionsMap`, `menuItems`, tokens, `entityId`, `academicYearId/Title`, `selectedStudent`/`availableStudents`, `hasPermission(resource, action)`, `login/logout/refreshTokens/selectStudent`.
- `academicYearStore`, `themeStore` (persisted as `theme-storage`, toggles `dark` on `<html>`), `examStore`, `expenseStore`.
- `academicYearStore` persists only `selectedAcademicYearId` (`academic-year-storage`). A page that reads `academicYears` must call `fetchAndSetAcademicYears()` when the list is empty.
Don't create parallel auth state. For a parent's children use `useParentChildren(entityId)` (`src/api/auth.ts`), not `availableStudents` from the store (timing issues).

## Forms

- New forms: react-hook-form + `zodResolver`. Don't use Zod `.default()` in form schemas — it splits input/output types and breaks `useForm<T>`; set defaults in `useForm({ defaultValues })`.
- Multi-step wizards: don't wrap in `<form>` (Enter/autofill triggers implicit submit). Use a `<div>` with a `type="button"` submit + `onClick` (see `components/students/MultiStepAdmissionForm.tsx`).
- Disable submit while `mutation.isPending`.

## Routing

- File routes under `src/routes/`; `@tanstack/router-plugin` (vite) regenerates `src/routeTree.gen.ts` on `dev`/`build`. Never hand-edit it; commit it when routes change.
- Layouts: `__root.tsx`, `_auth.tsx` (login, set-password, forgot-password), `_app.tsx` (auth guard in `beforeLoad`, sidebar, navbar, breadcrumb).
- Route files stay thin: `createFileRoute('/_app/x/y')({ component: Page })`, page in `src/pages/`.
- Role/permission redirects go in `beforeLoad` using `useAuthStore.getState()` (e.g. `routes/_app/exam/settings.tsx` with `isAdminRoleName`).
- Layout routes with children render `<Outlet />`, with the list page in `index.tsx` (e.g. `fee/collection.tsx` + `fee/collection/index.tsx`).
- Breadcrumb labels come from `src/lib/routeLabels.ts` — add new segments there. Pages don't render an extra `<h1>` that repeats the breadcrumb.
- Sidebar (`components/ui/sidebar.tsx`) derives top-level module URLs from the menu name (`MODULE_ROUTE_MAP`) and compares URLs with `normalizeUrl` (lowercase, no `-_ `). Backend menu IDs can repeat, so use composite React keys (`${id}-${index}`).
- lucide's `Route` icon clashes with TanStack's `Route` export: import it as `Route as RouteIcon`.
- Sidebar and hub icons come from `getIconForMenuItem(name)` in `sidebar.tsx`: an exact menu-name key, else `Folder`. Add a key when a seed adds a new menu name.

## UI standards

- Page header: `PageHeader` (`title`, `subtitle`, `icon`, `actions`). Status pills: `StatusBadge status={...}` (accepts a boolean for active/inactive and ~25 status strings). Filters: wrap controls in `FilterBar`.
- Loading: `Loader2` from lucide with `animate-spin` plus text ("Loading staff..."). Handle loading, error and empty states.
- Icons: `Edit` (never `Edit2`/`Pencil`), `Trash2`, `Eye`, `Plus`, `Download`.
- Toasts: `sonner` only. **No `window.confirm/alert`** — use `ConfirmDialog` (`components/common/ConfirmDialog.tsx`, `isPending`, `pendingLabel`; `isDestructive` defaults to `true`, so pass `false` for non-destructive confirms such as Enable).
- Module overview pages (`GradingDashboard.tsx`, `pages/expense/index.tsx`, fee `FeeNavigation.tsx`): `PageHeader` + live stat cards + nav cards styled `bg-chart-N/10 border-chart-N/20 hover:bg-chart-N/20`. Copy one.
- Card-based pages without a `PageHeader`: page title is `<CardTitle className="text-2xl font-bold">` on its own line at the top of `CardHeader`, controls below it; secondary labels (e.g. month/year) are a plain `<span>`, never a second `CardTitle`.
- Colours: use theme tokens (`text-foreground`, `text-muted-foreground`, `bg-muted`, `border-border`, `bg-card`), not `text-gray-*`, so dark mode works. Faint icons: `text-muted-foreground` or `opacity-75`, never `opacity-50` (invisible on dark).

### Tables

- Row actions: `EditButton`, `DeleteButton`, `ViewButton`, `DownloadButton`, `ActivateButton`, `DeactivateButton` inside `TableActionGroup` (`components/common/TableActions.tsx`). Inline equivalent: `<Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit">`; delete adds `text-destructive hover:text-destructive/80`. No `variant="outline"` on row actions.
- Every data table has: an `S.No.` first column (`className="w-12"`, pagination-aware `idx + 1 + page * pageSize`), sortable headers with `ChevronUp/ChevronDown/ChevronsUpDown`, a filter bar with search above, and `style={{ height: '48px' }}` rows. Expandable rows: include S.No. in `colSpan`.
- Simple master CRUD: use `MasterPage` (`pages/masters/common/MasterPage.tsx`) with `columns`, `formFields`, hooks and `permissions: { resource: 'SUBJECTS', create, update, ... }` — `resource` there is a **`PERMISSIONS` key (UPPERCASE)**, mapped internally to the backend resource.
  - Button/dialog text defaults to `Add ${title.slice(0, -1)}` (drops the last char to singularise), so any title that isn't a simple plural ("Route Management") needs `addButtonLabel`. For multi-selects or cascading fields, pass your own dialog as `addModal` (rendered in place of the built-in one, still behind the create guard) or use `renderCustomField`.

### Dialogs (`components/ui/dialog.tsx` — customised, not stock shadcn)

- `DialogContent` already has a sticky X, `max-h-[85vh]`, an inner scroll area and padding. Only pass width (`max-w-*`) and optionally a smaller `max-h`. **Don't add `overflow-*` or `flex flex-col`.**
- A `<DialogFooter>` that is a **direct child** of `DialogContent` is pinned below the scroll area. Use `customLayout` when the dialog manages its own header/scroll/footer.
- Outside-click close is off by default (`allowOutsideClose`); Escape is on. `showCloseButton={false}` hides the X; for full-page forms/panels use `components/ui/CloseButton.tsx`.
- Dirty-form guard: `<Dialog guardDirty={isDirty} onDirtyDiscard={reset}>` shows "Discard changes?" on close. Set dirty in `onChange`/`onValueChange`, reset dirty to `false` when opening and **before** closing after a successful save. Cancel = `<DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>`.

### react-select inside a Dialog

Portaled menus are blocked by the modal overlay unless you do all of these:

```tsx
const selectStyles = useSelectStyles();   // src/lib/useSelectStyles.ts
<Dialog open={open} onOpenChange={setOpen} modal={false}>
  ...
  <Select menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
          styles={selectStyles} menuPlacement="auto" ... />
```

`useSelectStyles()` supplies `zIndex: 9999`, `pointerEvents: 'auto'` on `menuPortal` and `menu`, and dark-mode colours. Without `modal={false}` the menu shows but can't be clicked. Reference: `components/fee/mappings/ClassMappingTable.tsx`.

### Custom `Select` (`components/ui/select.tsx`)

This is **not** Radix. It reads `SelectItem`s from `SelectContent`'s direct children:
- `value=""` is silently dropped. For "All"/"None" use a sentinel (`"__all__"`, `"__none__"`) and map it back to `null`/`undefined` in `onValueChange`.
- Don't wrap items in a fragment. Arrays from `.map()` are fine. Mixed text/expression labels work.
- Its menu is `absolute` (no portal), so it gets clipped inside overflow containers (dialog scroll area, table cells, `overflow-x-auto`). Use a native `<select>` there (see `pages/exam/BoardPatternSetup.tsx`, `components/exam/SubjectConfigAccordion.tsx`).

### Dropdown system

- `value` accepts `string | number | undefined`, never `null` (`val ?? undefined`). The clear prop is `clearable` (not `isClearable`).
- `SectionsByClassDropdown` takes `classId` and uses `useSectionsByClassId`. `DROPDOWN_ENDPOINTS.SECTIONS_BY_CLASS` is unused and broken; don't use it.

### Date and time

- Use `DatePicker` (`value`/`onChange` as `YYYY-MM-DD`, `min`/`max`) and `TimePicker` (`HH:MM` 24h) from `components/ui/`. Their icons use `dark:text-white text-gray-400`. Don't add raw `<input type="date">` without `color-scheme` handling.

## Permissions in the UI

Summary only (model: `docs/permissions.md`). The UI hides what the backend would reject; the backend is the source of truth.
- `useAuthStore(s => s.hasPermission)` / `usePermission().checkPermission(resource, action)` with **lowercase backend resource names** (`'fee_types'`, `'list'`).
- `<PermissionGuard resource="students" action="create">` (`components/PermissionGuard.tsx`, also `permissions={[[r,a],...]}` + `requireAll`, `resourceConstant="STUDENTS"`, `disabled`). `components/common/PermissionGuard` is the simple variant.
- `usePermissionProtectedMutation` throws `Permission denied` before calling the API. Hide or disable the control using its `hasPermission` rather than relying on the error.
- View-only users still get the page: gate each button on its action, render inputs `readOnly` when neither `create` nor `update` is granted, and drop the Actions column when no row action is allowed (e.g. `components/fee/terms/FeeTermsList.tsx`).
- Teacher and staff roles are capped by frontend allowlists in `src/lib/teacherPermissionMatrix.ts` and `staffPermissionMatrix.ts`, applied inside `hasPermission`. Mobile has identical copies, so change both. Don't special-case roles in pages.
- Module dashboards render cards from `authStore.menuItems` (backend-seeded menu). New permissions or menu entries need a re-login to show up.

## TypeScript gotchas

- Mutable refs in React 19: `useRef<string | undefined>(undefined)`, not `useRef<string>()`.
- `onClick={() => fn(arg)}`: don't pass a handler whose params aren't a MouseEvent.
- Generic `T extends Record<string, unknown>`: cast to `Record<string, unknown>` to assign props, then back to `T`.
- `{str && <X/>}` renders `""` when `str` is empty. Use `{!!str && <X/>}`.
- Avoid `any` in new code; mirror backend field names exactly.
- `tsconfig.app.json` is `strict`, but `noUnusedLocals` is off, so lint catches unused code.

## Logging

Don't add `console.log`. Use `logger` from `src/lib/config.ts` (`logger.debug` respects `VITE_LOG_LEVEL`). Existing `console.log`s in `authStore.hasPermission`, `usePermission` and `PermissionGuard` are noise and should be removed when touched.

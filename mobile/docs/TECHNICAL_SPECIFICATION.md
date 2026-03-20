# COS360 Mobile App — Technical Specification

**Version:** 1.0.0
**Date:** March 2026

---

## 1. Technology Stack

### 1.1 Frontend Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| React Native | 0.81.4 | Cross-platform mobile UI framework |
| Expo SDK | 54.0.13 | Build toolchain, native module access |
| React | 19.1.0 | UI component library |
| TypeScript | ~5.9.2 | Static type checking |
| Expo Router | ~6.0.12 | File-based navigation routing |

### 1.2 Navigation

| Technology | Version | Purpose |
|------------|---------|---------|
| @react-navigation/native | ^7.1.8 | Navigation container & utilities |
| @react-navigation/bottom-tabs | ^7.4.0 | Tab bar navigation |
| @react-navigation/elements | ^2.6.3 | Navigation UI primitives |
| react-native-screens | ~4.16.0 | Native screen containers |
| react-native-gesture-handler | ~2.28.0 | Touch gesture handling |
| react-native-reanimated | ~4.1.1 | Smooth UI animations |
| react-native-safe-area-context | ~5.6.0 | Safe area insets (notch/home bar) |

### 1.3 State Management

| Technology | Version | Purpose |
|------------|---------|---------|
| @tanstack/react-query | ^5.87.4 | Server state, caching, background sync |
| React Context API | (built-in) | Auth, Theme, AcademicYear global state |
| Zustand | (via mobileAuthStore) | Mobile auth state store |

### 1.4 HTTP & API

| Technology | Version | Purpose |
|------------|---------|---------|
| Axios | ^1.11.0 | HTTP client with interceptors |
| @react-native-async-storage/async-storage | ^2.2.0 | Persistent token & permission cache |

### 1.5 Forms & Validation

| Technology | Version | Purpose |
|------------|---------|---------|
| Zod | ^3.25.76 | Schema validation for forms & API responses |
| @react-native-community/datetimepicker | 8.4.4 | Native date/time picker |
| react-native-element-dropdown | ^2.12.4 | Searchable dropdown component |

### 1.6 File & Media

| Technology | Version | Purpose |
|------------|---------|---------|
| expo-document-picker | ~14.0.7 | File selection from device storage |
| react-native-document-picker | ^9.3.1 | Document picker (extended) |
| expo-image | ~3.0.8 | Optimized image rendering |
| expo-sharing | ^14.0.7 | Native share sheet |
| html-to-image | ^1.11.13 | Screenshot/PDF generation |

### 1.7 Expo Utilities

| Technology | Version | Purpose |
|------------|---------|---------|
| expo-constants | ~18.0.8 | App config, device info |
| expo-font | ~14.0.7 | Custom font loading |
| expo-haptics | ~15.0.7 | Tactile feedback |
| expo-linking | ~8.0.8 | Deep linking support |
| expo-splash-screen | ~31.0.10 | Splash screen management |
| expo-status-bar | ~3.0.8 | Status bar appearance |
| expo-symbols | ~1.0.7 | SF Symbols (iOS icons) |
| expo-system-ui | ~6.0.7 | System UI chrome |
| expo-web-browser | ~15.0.7 | In-app web browser |
| @expo/vector-icons | ^15.0.2 | Icon library (Ionicons, etc.) |

### 1.8 Web Support

| Technology | Version | Purpose |
|------------|---------|---------|
| react-native-web | ~0.21.0 | Web rendering of React Native components |
| react-dom | 19.1.0 | React DOM for web target |

### 1.9 Dev & Build Tools

| Technology | Version | Purpose |
|------------|---------|---------|
| TypeScript | ~5.9.2 | Type safety |
| ESLint | ^9.25.0 | Code quality linting |
| eslint-config-expo | ~10.0.0 | Expo-specific lint rules |
| @types/react | ~19.1.0 | TypeScript types for React |

---

## 2. App Configuration (app.json)

| Setting | Value |
|---------|-------|
| App Name | cos360 |
| Slug | cos360 |
| Version | 1.0.0 |
| Orientation | Portrait |
| Deep Link Scheme | cos360:// |
| userInterfaceStyle | automatic (system) |
| New Architecture | Enabled |
| React Compiler | Enabled (experimental) |
| iOS - Tablet Support | Yes |
| Android - Edge to Edge | Enabled |
| Android - Predictive Back | Disabled |
| Web Output | Static |

---

## 3. Architecture Decisions

### 3.1 File-Based Routing (Expo Router)

Expo Router v6 maps file paths in `app/` directly to routes. Benefits:
- Automatic deep linking from file paths
- TypeScript typed routes (typedRoutes experiment enabled)
- No manual route registration needed
- Layouts via `_layout.tsx` files at each level

### 3.2 Permission-Gated Tab Navigation

Tabs are dynamically shown or hidden based on the user's permissions. Implementation:

- On login, `/auth/mobile/permissions/sync` is called
- Permissions stored in memory and AsyncStorage cache
- `app/(tabs)/_layout.tsx` reads permissions and conditionally renders tabs
- Dashboard (`app/(tabs)/index.tsx`) filters module cards using `hasPermission(resource, 'read' | 'list')` — no `PermissionGuard` wrapper; visible to all authenticated users
- Module-level screens use `MobilePermissionGuard` where appropriate

### 3.3 React Query for Server State

TanStack Query v5 is used for all API data:
- Automatic background refetching
- Cache invalidation on mutations
- Loading/error/success states built-in
- Custom hooks per resource (e.g., `useStudents`, `useFeeCategories`)

### 3.4 Axios Interceptors

The Axios client (`src/api/client.ts`) has two interceptors:

**Request Interceptor:**
1. Reads access token from AsyncStorage
2. Adds `Authorization: Bearer {token}` header
3. Adds `cschema: {tenantSchema}` header

**Response Interceptor:**
1. On 401: attempts token refresh via `/auth/login/refresh`
2. If refresh succeeds: retries original request with new token
3. If refresh fails: clears tokens, redirects to login
4. On network error: queues request in offline sync queue

### 3.5 Multi-Tenant Design

Each school client has its own database schema. The `cschema` header on every API request identifies which schema to use. This is resolved at login and stored in auth context.

### 3.6 Offline Support

`services/offlineStorage.ts` maintains a sync queue:
- Failed network requests added to queue
- On connectivity restore, queue is flushed
- Permission cache serves stale data if server unreachable

---

## 4. Folder Structure Conventions

```
app/                    Expo Router screens (routes)
  (tabs)/               Tab group, auto-creates tab bar
  <module>/             Module screens (stacks)

src/
  api/
    client.ts           Axios instance and interceptors
    *.ts                API function definitions per module
    hooks/              React Query custom hooks
    queryClient.ts      Global QueryClient config

  components/mobile/    Permission UI components (guards, indicators)
  config/               Screen-level permission mapping
  constants/            Enum of all permissions
  hooks/                Module-level custom hooks
  stores/               Zustand stores
  types/                TypeScript interfaces & types
  utils/                Permission caching, analytics, debug helpers

components/             Shared presentation components
  navigation/           Route guards, drawers
  profile/              Profile form/view components
  ui/                   Generic UI components (dropdown, collapsible, etc.)

contexts/               React Context definitions
hooks/                  App-wide custom hooks
services/               Auth utils, error handling, offline storage
constants/              Theme colors, school constants
assets/                 Images and static files
```

---

## 5. TypeScript Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2020",
    "lib": ["ES2020"],
    "jsx": "react-jsx",
    "paths": { "@/*": ["./*"] }
  },
  "extends": "expo/tsconfig.base"
}
```

Key flags:
- `strict: true` — full type safety enabled
- `typedRoutes: true` — Expo Router typed navigation
- `reactCompiler: true` — auto-memoization via React Compiler

---

## 6. Backend Technology Stack

| Technology | Purpose |
|------------|---------|
| Python | Backend language |
| FastAPI | REST API framework |
| PostgreSQL | Relational database (multi-schema) |
| JWT | Token-based authentication |
| SQLAlchemy | ORM for database operations |
| Pydantic | Request/response validation |
| openpyxl/xlsxwriter | Excel file generation (mark templates) |
| WeasyPrint/ReportLab | PDF generation (hall tickets) |

---

## 7. Security

| Concern | Implementation |
|---------|---------------|
| Authentication | JWT Bearer tokens |
| Token Storage | AsyncStorage (encrypted where available) |
| Token Refresh | Automatic on 401 response |
| Authorization | Server-side role + plan validation on every endpoint |
| Tenant Isolation | Schema-based isolation, `cschema` header required |
| Input Validation | Zod schemas on frontend, Pydantic on backend |
| HTTPS | Required in production (dev uses HTTP on LAN) |

---

*COS360 School Management System — Technical Specification*
*March 2026*

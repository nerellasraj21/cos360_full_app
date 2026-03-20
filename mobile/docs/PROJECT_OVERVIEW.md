# COS360 Mobile App — Project Overview

**Project Name:** COS360 School Management System — Mobile Application
**Version:** 1.3.0
**Platform:** Android · iOS · Web
**Build Date:** March 2026

---

## 1. Project Purpose

COS360 is a comprehensive school management platform. The mobile application provides school administrators, teachers, staff, parents, and students with on-the-go access to all core school management functions including:

- Student admissions, attendance, and document management
- Fee collection and transaction tracking
- Exam scheduling, mark entry, and result publishing
- Transport route and trip management
- Staff enrollment and attendance
- Expense tracking and approvals
- Role-based access control (RBAC)

---

## 2. Platform & Framework

| Item | Value |
| ---- | ----- |
| Framework | React Native with Expo (SDK 54) |
| Language | TypeScript 5.9 |
| Min React Native | 0.81.4 |
| Min React Version | 19.1.0 |
| Target Platforms | Android, iOS, Web |
| App Orientation | Portrait |
| New Architecture | Enabled |
| React Compiler | Enabled (experimental) |

---

## 3. Application Architecture

```text
COS360 Mobile App
│
├── Presentation Layer (Expo Router / React Native)
│   ├── File-based routing (app/ directory)
│   ├── Tab navigation (permission-gated)
│   └── Stack navigation for module screens
│
├── State Management Layer
│   ├── React Context (Auth, Theme, AcademicYear)
│   ├── Zustand (mobile auth store)
│   └── TanStack Query v5 (server state)
│
├── API Layer
│   ├── Axios HTTP client with interceptors
│   ├── Automatic token refresh (401 handling)
│   ├── Offline sync queue
│   └── Custom React Query hooks per module
│
└── Backend (FastAPI / Python)
    ├── REST API at /api/v1/
    ├── JWT Authentication
    ├── Multi-tenant (schema-based)
    └── Role & plan permission validation
```

---

## 4. Module Summary

| Module | Description | Status |
| ------ | ----------- | ------ |
| Authentication | Login, token management, permission sync | Complete |
| Home/Dashboard | Permission-filtered module cards, greeting hero | Complete |
| Students | Admissions, profiles, attendance, documents, certificates | Complete |
| Fees | Categories, types, terms, transactions, refunds, mappings | Complete |
| Exam | List, create, mark entry, results, hall tickets | Complete |
| Masters | Academic years, classes, subjects, holidays, timetables, RBAC | Complete |
| Transport | Routes, vehicles, stops, trips, student transport | Complete |
| Staff | Enrollment, profiles, designations, attendance | Complete |
| Expense | Categories, transactions, approvals, audit, reports | Complete |
| Profile | Student/Parent/Staff profile view & edit | Complete |
| Settings | Theme, academic year selector, permission debug | Complete |

---

## 5. Key Technical Features

### Permission-Based Access Control

- Permissions synced from server on login
- Cached locally with AsyncStorage for offline use
- Dashboard cards filtered by `hasPermission(resource, 'read' | 'list')`
- Empty state shown when user has no module permissions
- Tab visibility and screen access gated by permissions

### Multi-Tenant Architecture

- Each school is a separate tenant
- `cschema` header identifies the tenant on every API request
- Data fully isolated at the database schema level

### Offline Support

- Axios interceptor queues failed requests when offline
- Permission cache serves as fallback if server unavailable
- Token stored persistently via AsyncStorage

### Authentication & Security

- JWT Bearer token authentication
- Login uses `username` + `cschema` header (tenant code)
- Automatic token refresh on 401 response
- Tokens cleared on logout
- Role & plan validation on all endpoints

### Theme Support

- Light and dark mode
- `userInterfaceStyle: "automatic"` follows system preference
- ThemeContext provides consistent colors throughout the app

---

## 6. Project Directory Structure

```text
cos360_mobile_app/
├── app/                    # Expo Router screens
│   ├── (tabs)/             # Tab navigation
│   ├── exam/               # Exam module screens
│   ├── expense/            # Expense module screens
│   ├── fees/               # Fees module screens
│   ├── masters/            # Masters config screens
│   ├── parents/            # Parent module screens
│   ├── staff/              # Staff module screens
│   ├── students/           # Students module screens
│   ├── transport/          # Transport module screens
│   ├── _layout.tsx         # Root app layout
│   ├── login.tsx           # Login screen
│   └── index.tsx           # Auth redirect / splash
│
├── src/                    # Core source code
│   ├── api/                # API clients, hooks, query config
│   ├── components/mobile/  # Mobile-specific UI components
│   ├── config/             # Screen permission config
│   ├── constants/          # Permission definitions
│   ├── hooks/              # Custom React hooks
│   ├── stores/             # Zustand stores
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Permission utilities
│
├── components/             # Shared UI components
│   ├── navigation/         # Navigation guards, drawer
│   ├── profile/            # Profile form/view components
│   └── ui/                 # Generic UI components
│
├── contexts/               # React Context providers
├── hooks/                  # App-level custom hooks
├── services/               # Auth utilities, error handling
├── constants/              # Theme, school constants
├── assets/                 # Images, icons
├── docs/                   # Project documentation (this folder)
├── package.json
├── app.json
└── tsconfig.json
```

---

## 7. Backend Integration

**API Base URL:** `https://www.cos360.app/api/v1` (set in `.env` as `EXPO_PUBLIC_API_URL`)

The mobile app integrates with a FastAPI Python backend that exposes REST endpoints for:

- Authentication & permissions
- Student management
- Fee management
- Exam management (marks, results, hall tickets)
- Staff management
- Transport management
- Expense management
- Masters data (academic years, classes, subjects, etc.)

See [API_INTEGRATION.md](./API_INTEGRATION.md) for full endpoint reference.

---

## 8. Build & Run

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on Web
npm run web
```

---

COS360 School Management System — Project Overview — March 2026

# Dashboard Module — Developer Fix Document

**Prepared for:** App Developer
**Module:** Home / Dashboard Tab
**File to edit:** `app/(tabs)/index.tsx`
**Secondary file to note:** `components/AppHeader.tsx`
**Status: ✅ ALL BUGS RESOLVED (March 2026)**

---

## Overview

This document recorded **4 bugs** in the dashboard screen plus 1 issue in `AppHeader`. All have been fixed. The corrected file is live at `app/(tabs)/index.tsx`.

---

## Bug List (All Resolved)

---

### Bug 1 — All module cards show for every user (no permission check) ✅ FIXED

**File:** `app/(tabs)/index.tsx`

**Problem:**
The `MODULES` array was a hardcoded list without any permission check. Every card was shown to every logged-in user regardless of role.

**Fix applied:**

- Added `resource` field to every entry in `MODULES`
- Pulls `hasPermission` from `useAuth()`
- Filters array using `hasPermission(mod.resource, 'read') || hasPermission(mod.resource, 'list')`
- Empty state shown (lock icon + message) when no modules are accessible

---

### Bug 2 — Exam module card was missing ✅ FIXED

**File:** `app/(tabs)/index.tsx`

**Problem:**
The Exam tab and all its screens were fully built but there was no Exam card on the dashboard.

**Fix applied:**
Added Exam entry to `MODULES`:
```tsx
{
  id: 'exam',
  title: 'Exam',
  icon: 'document-text' as const,
  color: '#EC4899',
  bg: '#FDF2F8',
  darkBg: '#EC489920',
  route: '/(tabs)/exam',
  resource: 'exams',
},
```

---

### Bug 3 — Entire dashboard wrapped in PermissionGuard ✅ FIXED

**File:** `app/(tabs)/index.tsx`

**Problem:**
The whole screen was wrapped in `<PermissionGuard resourceConstant="profile" actionConstant="read_own">`, gating the home screen behind a permission. Roles without `profile:read_own` saw a blank or access-denied screen after login.

**Fix applied:**

- Removed `import { PermissionGuard }` (was line 8)
- Removed `<PermissionGuard>` wrapper — dashboard now returns `<AppLayout>` directly
- Dashboard is visible to all authenticated users

---

### Bug 4 — Hero stats bar showed hardcoded numbers ✅ FIXED

**File:** `app/(tabs)/index.tsx`

**Problem:**
The stats bar inside the hero card showed `1,250`, `85`, and `₹2.5M` — hardcoded strings that did not reflect actual school data.

**Fix applied:**

- Removed entire `<View style={styles.heroStatsBar}>` block
- Removed all related style entries: `heroStatsBar`, `heroStatItem`, `heroStatNum`, `heroStatLabel`, `heroStatDivider`
- Hero card now shows only the greeting, username, and date

---

### Additional — Search button in AppHeader did nothing ✅ FIXED

**File:** `components/AppHeader.tsx`

**Problem:**
The search icon `TouchableOpacity` had no `onPress` handler but looked interactive.

**Fix applied:**
```tsx
<TouchableOpacity
  style={[styles.iconButton, { opacity: 0.4 }]}
  disabled={true}
  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
>
  <Ionicons name="search-outline" size={22} color="rgba(255,255,255,0.9)" />
</TouchableOpacity>
```

---

## Current State of app/(tabs)/index.tsx

The file now:

- Has 7 module cards: Students, Fees, Masters, Transport, Staff, Expense, Exam
- Each card has a `resource` field checked against `hasPermission()`
- `accessibleModules` filter applied before rendering grid
- Empty state (lock icon + "No modules available") shown when user has no module permissions
- Hero card shows greeting + username + date — no hardcoded stats
- No `PermissionGuard` wrapper — all authenticated users see the dashboard
- All module routes use `/(tabs)/...` prefix

---

## Changes Summary

| # | What changed | Why |
|---|---|---|
| 1 | Removed `import { PermissionGuard }` | No longer needed |
| 2 | Removed `<PermissionGuard>` wrapper | Dashboard must be visible to all authenticated users |
| 3 | Added `resource` field to every MODULES entry | Required for permission filtering |
| 4 | Added Exam module entry to MODULES | Exam tab exists but had no dashboard card |
| 5 | Added `hasPermission` from `useAuth()` | Used to filter modules |
| 6 | Added `accessibleModules` filter | Only shows cards the user has `read` or `list` permission for |
| 7 | Added empty state when no modules are accessible | Prevents blank grid for restricted roles |
| 8 | Removed hardcoded stats bar | Data was not real — misleads users |
| 9 | Removed `stat` field from all MODULES entries | No longer displayed |
| 10 | Removed unused style entries (`heroStatsBar`, `heroStatItem`, etc.) | Cleanup |
| 11 | Fixed module routes to use `/(tabs)/...` prefix | Correct Expo Router paths for tab screens |
| 12 | AppHeader search button: `disabled={true}`, `opacity: 0.4` | Not yet functional — must not appear interactive |

---

## Role Behavior (Expected Cards)

| Role | Expected cards |
|---|---|
| Admin | All 7 cards (Students, Fees, Masters, Transport, Staff, Expense, Exam) |
| Staff | Students, Fees, Staff, Expense, Exam (depends on permissions assigned) |
| Teacher | Students, Exam |
| Student | No module cards — greeting hero + empty state (lock icon) |
| Parent | No module cards — greeting hero + empty state (lock icon) |

---

Last updated: March 2026 — All issues resolved

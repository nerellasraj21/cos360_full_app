# Expense Module Cleanup - Pending Approvals & Audit Trail Removal

**Date:** April 8, 2026  
**Objective:** Remove "Pending Approvals" and "Audit Trail" cards from expense module overview

---

## Changes Made

### 1. src/pages/expense/index.tsx

**Removed:**
- "Pending Approvals" navigation card (lines 54-60)
- "Audit Trail" navigation card (lines 68-74)
- `usePendingExpenseApprovals` hook import
- "Pending Approvals" stat card from dashboard grid
- Unused icon imports: `CheckCircle2`, `History`

**Modified:**
- Summary stats grid changed from `lg:grid-cols-4` to `lg:grid-cols-3`
- Removed hook call: `const { data: pendingApprovals, isLoading: loadingPending } = usePendingExpenseApprovals()`
- Removed variable: `const pendingCount = pendingApprovals?.items?.length ?? 0`

**Before:**
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <StatCard label="Expense Categories" value={categoryCount} loading={loadingCategories} />
  <StatCard label="Expense Types" value={typeCount} loading={loadingTypes} />
  <StatCard label="Total Transactions" value={transactionCount} loading={loadingTransactions} />
  <StatCard label="Pending Approvals" value={pendingCount} loading={loadingPending} />
</div>
```

**After:**
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  <StatCard label="Expense Categories" value={categoryCount} loading={loadingCategories} />
  <StatCard label="Expense Types" value={typeCount} loading={loadingTypes} />
  <StatCard label="Total Transactions" value={transactionCount} loading={loadingTransactions} />
</div>
```

---

### 2. src/components/expense/ExpenseModule.tsx

**Removed:**
- "Pending Approvals" summary card (lines 67-78)

**Modified:**
- Summary cards grid changed from `md:grid-cols-4` to `md:grid-cols-3`

**Before:**
```tsx
<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
  {/* Total Expenses, Total Transactions, Pending Approvals, Active Categories */}
</div>
```

**After:**
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  {/* Total Expenses, Total Transactions, Active Categories */}
</div>
```

---

### 3. src/components/ui/sidebar.tsx

**Removed:**
- `"Pending Approvals": CheckCircle2,` (line 191)
- `"Audit Trail": History,` (line 193)

**Before:**
```typescript
// ── Expense submodules ─────────────────────────────────────────────────
Overview: LayoutDashboard,
Categories: Tag,
Types: Tags,
Departments: Building2,
Approvals: CheckCircle2,
"Pending Approvals": CheckCircle2,
Summary: LayoutList,
"Audit Trail": History,
Settings: Settings2,
"Expense Settings": Settings2,
"Audit Log": History,
```

**After:**
```typescript
// ── Expense submodules ─────────────────────────────────────────────────
Overview: LayoutDashboard,
Categories: Tag,
Types: Tags,
Departments: Building2,
Approvals: CheckCircle2,
Summary: LayoutList,
Settings: Settings2,
"Expense Settings": Settings2,
"Audit Log": History,
```

---

## Summary of Removals

| Component | Removal |
|-----------|---------|
| Expense Dashboard Overview | "Pending Approvals" and "Audit Trail" navigation cards |
| Summary Stats Section | "Pending Approvals" stat card |
| Sidebar Icon Mapping | Icon entries for "Pending Approvals" and "Audit Trail" |

---

## Remaining Expense Module Features

The expense module now displays:
- **Overview Dashboard** with 3 stat cards: Categories, Types, Transactions
- **Navigation Sections**: Categories, Types, Transactions, Summary
- **Sidebar**: Overview, Categories, Types, Departments, Approvals, Summary, Settings, Audit Log

---

## Notes

- The "Approvals" and "Audit Log" entries remain in sidebar (different from removed "Pending Approvals" and "Audit Trail")
- The routes `/expense/approvals` and `/expense/audit` still exist in the codebase but are no longer surfaced in the UI
- All changes are UI-only; backend API contracts remain unchanged

# Module Context – Expense

Version: 1.0
Generated On: 2025-12-26
Source: Codebase Analysis
Confidence Level: High

---

## Responsibility

[EVIDENCE-BASED]

The Expense module manages organizational expense tracking:

1. **Expense Transactions**: Record and manage expense transactions
2. **Categories**: Hierarchical expense categorization
3. **Types**: Expense type definitions
4. **Departments**: Department-based expense allocation
5. **Approvals**: Multi-level expense approval workflow
6. **Audit**: Expense audit trail
7. **Reports**: Expense analysis and reporting
8. **Settings**: Module configuration

---

## Key Components

[EVIDENCE-BASED]

### Routes

| File | Purpose |
|------|---------|
| `src/routes/_app/expense.tsx` | Expense section layout |
| `src/routes/_app/expense/index.tsx` | Expense dashboard |
| `src/routes/_app/expense/transactions.tsx` | Expense transactions |
| `src/routes/_app/expense/categories.tsx` | Expense categories |
| `src/routes/_app/expense/types.tsx` | Expense types |
| `src/routes/_app/expense/departments.tsx` | Departments |
| `src/routes/_app/expense/approvals.tsx` | Approval workflow |
| `src/routes/_app/expense/audit.tsx` | Audit trail |
| `src/routes/_app/expense/reports.tsx` | Expense reports |
| `src/routes/_app/expense/settings.tsx` | Module settings |

### State Management

| File | Purpose |
|------|---------|
| `src/lib/expenseStore.ts` | Zustand store for expense state |

### Hooks

| Directory | Purpose |
|-----------|---------|
| `src/hooks/expense/` | Expense-related hooks |

### Components

| Directory | Purpose |
|-----------|---------|
| `src/components/expense/` | Expense UI components |
| `src/components/expense/categories/` | Category components |
| `src/components/expense/dashboard/` | Dashboard widgets |

### Pages

| Directory | Purpose |
|-----------|---------|
| `src/pages/expense/` | Expense page components |

---

## Data Model Summary

[EVIDENCE-BASED]

### Type Definitions

| File | Contents |
|------|----------|
| `src/types/expense/index.ts` | Main expense types |
| `src/types/expense/attachment.ts` | Attachment types |
| `src/types/expense/audit.ts` | Audit trail types |
| `src/types/expense/report.ts` | Report types |
| `src/types/expense/settings.ts` | Settings types |

### Core Types (from expenseStore.ts)

```typescript
interface ExpenseTransactionRead {
  id: string;
  // Transaction details
}

interface ExpenseCategoryRead {
  id: string;
  name: string;
  // Category details
}

interface ExpenseTypeRead {
  id: string;
  name: string;
  // Type details
}

interface ExpenseTransactionFilters {
  skip: number;
  limit: number;
  // Additional filter fields
}

interface ExpenseTransactionListResponse {
  items: ExpenseTransactionRead[];
  skip: number;
  limit: number;
  total: number;
}

interface ExpenseCategoryListResponse {
  items: ExpenseCategoryRead[];
}

interface ExpenseTypeListResponse {
  items: ExpenseTypeRead[];
}
```

**Source**: `src/lib/expenseStore.ts:1-56`

---

## State Management

[EVIDENCE-BASED]

### Zustand Store Structure

```typescript
interface ExpenseState {
  // Transaction state
  transactions: {
    items: ExpenseTransactionRead[];
    loading: boolean;
    error: string | null;
    filters: ExpenseTransactionFilters;
    pagination: {
      skip: number;
      limit: number;
      total: number;
      hasNext: boolean;
    };
  };

  // Categories state
  categories: {
    items: ExpenseCategoryRead[];
    dropdown: ExpenseCategoryRead[];
    loading: boolean;
  };

  // Types state
  types: {
    items: ExpenseTypeRead[];
    dropdown: ExpenseTypeRead[];
    loading: boolean;
  };

  // Form state
  form: {
    creating: boolean;
    updating: boolean;
    approving: boolean;
    error: string | null;
  };

  // Pending approvals
  pendingApprovals: {
    items: ExpenseTransactionRead[];
    loading: boolean;
    error: string | null;
  };
}
```

### Store Actions

```typescript
// Transaction actions
setTransactions(response: ExpenseTransactionListResponse)
setTransactionLoading(loading: boolean)
setTransactionError(error: string | null)
updateTransactionFilters(filters: Partial<ExpenseTransactionFilters>)
addTransaction(transaction: ExpenseTransactionRead)
updateTransaction(transaction: ExpenseTransactionRead)
removeTransaction(id: string)

// Category actions
setCategories(response: ExpenseCategoryListResponse)
setCategoriesDropdown(categories: ExpenseCategoryRead[])
addCategory(category: ExpenseCategoryRead)
updateCategory(category: ExpenseCategoryRead)
removeCategory(id: string)

// Type actions
setTypes(response: ExpenseTypeListResponse)
setTypesDropdown(types: ExpenseTypeRead[])
addType(type: ExpenseTypeRead)
updateType(type: ExpenseTypeRead)
removeType(id: string)

// Form state actions
setFormCreating(creating: boolean)
setFormUpdating(updating: boolean)
setFormApproving(approving: boolean)
setFormError(error: string | null)

// Pending approvals
setPendingApprovals(transactions: ExpenseTransactionRead[])
updatePendingApproval(transaction: ExpenseTransactionRead)
removePendingApproval(id: string)

// Reset actions
resetTransactionState()
resetCategoryState()
resetTypeState()
resetFormState()
reset()
```

**Source**: `src/lib/expenseStore.ts`

### Selectors

```typescript
useExpenseTransactions()
useExpenseCategories()
useExpenseTypes()
useExpenseForm()
usePendingApprovals()
useExpenseActions()
```

---

## Invariants & Rules

[EVIDENCE-BASED]

### Pagination

- Default page size: 100
- Pagination state tracked in store
- `hasNext` calculated from total count

### Form State

- Form operations (create, update, approve) tracked separately
- Error state per form operation

### Approval Workflow

- Pending approvals tracked separately
- Approval state (`approving`) tracked in form state

---

## Public Interfaces

[EVIDENCE-BASED]

### Store Selectors

```typescript
import {
  useExpenseTransactions,
  useExpenseCategories,
  useExpenseTypes,
  useExpenseForm,
  usePendingApprovals,
  useExpenseActions
} from '@/lib/expenseStore';
```

---

## Dependencies

[EVIDENCE-BASED]

### Internal Dependencies

- **Core**: Types from `src/types/expense/`

### External Dependencies

- **zustand**: State management with devtools middleware
- **@tanstack/react-query**: Likely used for API calls (coexists with store)

---

## Known Risks

[INFERENCE]

### State Synchronization

1. **Store vs Query**: Uses Zustand store alongside React Query - potential sync issues
2. **Stale State**: Manual state updates may become stale

### Financial Data

1. **Transaction Integrity**: Expense amounts need validation
2. **Approval Conflicts**: Multiple approvers acting simultaneously
3. **Audit Trail**: Ensuring complete audit history

### Performance

1. **Large Lists**: Default limit of 100 may be insufficient
2. **Dropdown Data**: Separate dropdown arrays maintained in store

---

## Test Coverage

[UNCERTAIN]

No dedicated expense module tests found in codebase.

---

## Uncertainties

[UNCERTAIN]

1. **React Query Integration**: How store state syncs with API calls unclear
2. **Approval Levels**: Number and structure of approval levels unknown
3. **Budget Integration**: If expense tracking against budgets exists
4. **Receipt/Invoice Attachments**: How attachments are stored/retrieved
5. **Expense Policies**: If automatic policy enforcement exists
6. **Reimbursement Workflow**: How expense reimbursements work
7. **Currency Handling**: Multi-currency support unclear
8. **Recurring Expenses**: If scheduled/recurring expenses supported
9. **Department Budgets**: If department-level budgets enforced

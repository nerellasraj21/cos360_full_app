# Module Context – Fee

Version: 1.0
Generated On: 2025-12-26
Source: Codebase Analysis
Confidence Level: High

---

## Responsibility

[EVIDENCE-BASED]

The Fee module manages all fee-related functionality:

1. **Fee Categories**: Top-level fee organization (e.g., Tuition, Transport)
2. **Fee Types**: Specific fee items within categories
3. **Fee Terms**: Payment schedule periods (e.g., Term 1, Term 2)
4. **Fee Mappings**: Assignment of fees to classes/students
5. **Receipts**: Fee receipt generation and management
6. **Transactions**: Fee payment tracking
7. **Refunds**: Fee refund processing
8. **Reports**: Fee collection and outstanding reports

---

## Key Components

[EVIDENCE-BASED]

### Routes

| File | Purpose |
|------|---------|
| `src/routes/_app/fee.tsx` | Fee section layout |
| `src/routes/_app/fee/index.tsx` | Fee dashboard |
| `src/routes/_app/fee/categories.tsx` | Fee categories management |
| `src/routes/_app/fee/types.tsx` | Fee types management |
| `src/routes/_app/fee/terms.tsx` | Fee terms management |
| `src/routes/_app/fee/mappings.tsx` | Fee mappings configuration |
| `src/routes/_app/fee/receipts.tsx` | Fee receipts |
| `src/routes/_app/fee/transactions.tsx` | Fee transactions |
| `src/routes/_app/fee/refunds.tsx` | Fee refunds |
| `src/routes/_app/fee/reports.tsx` | Fee reports |

### Hooks

| File | Purpose |
|------|---------|
| `src/hooks/fee/index.ts` | Fee hooks barrel export |
| `src/hooks/fee/useFeeCategories.ts` | Category CRUD hooks |
| `src/hooks/fee/useFeeTypes.ts` | Type CRUD hooks |
| `src/hooks/fee/useFeeTerms.ts` | Term CRUD hooks |
| `src/hooks/fee/useFeeMappings.ts` | Mapping hooks |
| `src/hooks/fee/useBulkOperations.ts` | Bulk fee operations |

### Components

| Directory | Purpose |
|-----------|---------|
| `src/components/fee/` | Fee UI components |
| `src/components/fee/categories/` | Category components |
| `src/components/fee/types/` | Type components |
| `src/components/fee/terms/` | Term components |
| `src/components/fee/mappings/` | Mapping components |
| `src/components/fee/receipts/` | Receipt components |
| `src/components/fee/dashboard/` | Dashboard widgets |
| `src/components/fee/common/` | Shared fee components |

### Pages

| Directory | Purpose |
|-----------|---------|
| `src/pages/fee/` | Fee page components |

---

## Data Model Summary

[EVIDENCE-BASED]

### Type Definitions Location

| File | Contents |
|------|----------|
| `src/types/fee/index.ts` | Barrel export |
| `src/types/fee/category.ts` | Fee category types |
| `src/types/fee/type.ts` | Fee type definitions |
| `src/types/fee/term.ts` | Fee term types |
| `src/types/fee/mapping.ts` | Fee mapping types |
| `src/types/fee/receipt.ts` | Receipt types |
| `src/types/fee/transaction.ts` | Transaction types |
| `src/types/fee/refund.ts` | Refund types |
| `src/types/fee/dashboard.ts` | Dashboard data types |

### Hierarchical Structure

```
Fee Category (e.g., "Academic Fees")
    └── Fee Type (e.g., "Tuition Fee")
            └── Fee Term (e.g., "Term 1")
                    └── Fee Mapping (Class/Student level)
                            └── Transaction (Payment)
                                    └── Receipt (Generated)
```

---

## Invariants & Rules

[INFERENCE - Based on structure]

### Fee Structure Rules

1. **Categories** are the top-level organization
2. **Types** belong to Categories
3. **Terms** define payment periods
4. **Mappings** can be at class or student level

### Common Patterns

- Standard CRUD operations for each entity
- Bulk operations for fee assignments
- Active/inactive status for all entities

---

## Public Interfaces

[EVIDENCE-BASED]

### Hook Patterns

Based on file naming convention, the following hooks are expected:

```typescript
// Categories
useFeeCategories()
useCreateFeeCategory()
useUpdateFeeCategory()
useDeleteFeeCategory()

// Types
useFeeTypes()
useCreateFeeType()
useUpdateFeeType()
useDeleteFeeType()

// Terms
useFeeTerms()
useCreateFeeTerm()
useUpdateFeeTerm()
useDeleteFeeTerm()

// Mappings
useFeeMappings()
useCreateFeeMapping()
useBulkFeeOperations()
```

### Dropdown Components

```typescript
// From dropdown-system
FeeTypesDropdown
FeeTermsDropdown
```

---

## Dependencies

[EVIDENCE-BASED]

### Internal Dependencies

- **Students Module**: Student selection for fee assignments
- **Masters Module**: Classes for class-level mappings
- **Dropdown System**: Fee type and term dropdowns

### External Dependencies

- **@tanstack/react-query**: Data fetching and caching
- **xlsx**: Excel export for reports

---

## Known Risks

[INFERENCE]

### Financial Data

1. **Transaction Integrity**: Critical financial data requires careful handling
2. **Refund Validation**: Refunds should not exceed paid amounts
3. **Receipt Numbers**: Unique receipt number generation

### Performance

1. **Bulk Mappings**: Large class fee assignments may be slow
2. **Report Generation**: Complex reports with date ranges

### Concurrency

1. **Payment Conflicts**: Multiple simultaneous payments for same fee
2. **Receipt Generation**: Race conditions in receipt numbering

---

## Test Coverage

[UNCERTAIN]

No dedicated fee module tests found in codebase.

---

## Uncertainties

[UNCERTAIN]

1. **Payment Gateway Integration**: No evidence of online payment integration
2. **Partial Payments**: How partial payments are handled unclear
3. **Late Fee Calculation**: Automatic late fee computation unclear
4. **Discount Management**: Fee discount/scholarship handling unclear
5. **Academic Year Rollover**: How fees transition between academic years
6. **Receipt Printing**: Receipt format and printing mechanism unclear
7. **Outstanding Alerts**: How fee outstanding notifications work
8. **Installment Plans**: If structured installment plans are supported

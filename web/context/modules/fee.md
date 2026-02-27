# Module Context – Fee

Version: 1.1
Generated On: 2025-12-26
Last Updated: 2026-02-27
Source: Codebase Analysis + QA Audit
Confidence Level: High

---

## Responsibility

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
| `src/pages/fee/FeeTransactions.tsx` | Transaction management (has known issues — see below) |

---

## Data Model Summary

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
                    └── Fee Mapping (Class or Student level)
                            └── Transaction (Payment)
                                    └── Receipt (Generated)
```

### Class vs Student Level Mappings

```
Class Mappings:  GET/POST /fee/class-mappings/
Student Mappings: GET/POST /fee/student-mappings/
                  POST     /fee/student-mappings/bulk
```

**⚠ Warning**: Both `feeMappingsApi` and `feeClassMappingsApi` target `/fee/class-mappings/`. Similarly `feeMappingsApi.bulkCreateStudentMappings` and `feeStudentMappingsApi.bulkCreateMappings` target the same endpoint. Use the dedicated API file, not the generic mappings API.

---

## Invariants & Rules

### Fee Structure Rules

1. **Categories** are the top-level organization
2. **Types** belong to Categories
3. **Terms** define payment periods
4. **Mappings** can be at class or student level

### Academic Year Scoping

API functions internally access `useAcademicYearStore.getState().selectedAcademicYearId` to scope requests. If `selectedAcademicYearId` is undefined, the API call silently fails. Always ensure the academic year is selected before triggering fee queries.

---

## Public Interfaces

### Hook Patterns

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

### Key API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/fee/categories/` | GET/POST | Fee categories CRUD |
| `/fee/types/` | GET/POST | Fee types CRUD |
| `/fee/terms/` | GET/POST | Fee terms CRUD |
| `/fee/class-mappings/` | GET/POST | Class-level fee assignments |
| `/fee/student-mappings/` | GET/POST | Student-level fee assignments |
| `/fee/student-mappings/bulk` | POST | Bulk student assignments |
| `/fee/transactions/` | GET/POST | Fee payments |
| `/fee/receipts/` | GET/POST | Receipt management |
| `/fee/refunds/` | GET/POST | Refund processing |

---

## Dependencies

### Internal Dependencies

- **Students Module**: Student selection for fee assignments
- **Masters Module**: Classes for class-level mappings
- **Academic Year Store**: All queries scoped by selected academic year
- **Dropdown System**: Fee type and term dropdowns

### External Dependencies

- **@tanstack/react-query**: Data fetching and caching
- **xlsx**: Excel export for reports

---

## Known Issues (QA Audit — 2026-02-05)

A comprehensive QA audit found 82+ integration issues in the fee module. Key items:

### Critical

1. **FeeTransactions uses direct API calls** — `src/pages/fee/FeeTransactions.tsx` calls API functions directly inside `useQuery` instead of using dedicated React Query hooks. A `src/api/hooks/fee/transactions.ts` file is missing.

2. **27+ API functions lack error handling** — `src/api/fee/types.ts`, `terms.ts`, `receipts.ts`, `mappings.ts`, `classMappings.ts` have no try/catch. Raw axios errors propagate to components.

3. **Student mappings response shape is inconsistent** — `getAllMappings` returns `FeeStudentMapping[] | FeeStudentMappingListResponse`. Components must defensively check: `Array.isArray(response) ? response : (response.items || [])`.

4. **`total_fee` type mismatch** — `FeeStudentMapping.total_fee` is typed as `string` but `FeeStudentMappingCreate.total_fee` expects `number`. Source: `src/types/fee/mapping.ts`.

### High Priority

5. **Invalid cache invalidation** — `src/api/hooks/fee/useFeeTypes.ts` invalidates a query key structure that doesn't exist: `['fee-categories', 'detail', data.fee_category_id, 'types']`.

6. **28+ console.log statements** expose sensitive payment/student data in `transactions.ts`, `receipts.ts`, `refunds.ts`. Remove before production.

### Medium Priority

7. **15+ hardcoded API paths** — Some files use string literals instead of constants (e.g., `CAxios.get('/fee/types/')`), inconsistent with files that use constant variables.

**Full fix plan**: See `docs/FEE_MODULE_API_INTEGRATION_FIX_PLAN.md` (archived) if it exists.

---

## Known Risks

### Financial Data

1. **Transaction Integrity**: Critical financial data requires careful handling
2. **Refund Validation**: Refunds should not exceed paid amounts
3. **Receipt Numbers**: Unique receipt number generation

### Performance

1. **Bulk Mappings**: Large class fee assignments may be slow
2. **Report Generation**: Complex reports with date ranges

---

## Test Coverage

No dedicated fee module tests found in codebase.

---

## Uncertainties

1. **Payment Gateway Integration**: No evidence of online payment integration
2. **Partial Payments**: How partial payments are handled unclear
3. **Late Fee Calculation**: Automatic late fee computation unclear
4. **Discount Management**: Fee discount/scholarship handling unclear
5. **Academic Year Rollover**: How fees transition between academic years
6. **Receipt Printing**: Receipt format and printing mechanism unclear
7. **Outstanding Alerts**: How fee outstanding notifications work
8. **Installment Plans**: If structured installment plans are supported

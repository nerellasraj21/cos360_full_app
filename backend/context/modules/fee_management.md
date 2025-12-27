# Module Context - Fee Management

Version: 1.0
Generated On: 2025-12-26
Source: Codebase Analysis
Confidence Level: High

---

## Responsibility

[EVIDENCE-BASED]

The Fee Management module handles:
- Fee category and type configuration
- Fee term management
- Class-level fee mapping
- Student-level fee assignment
- Fee transactions (collection)
- Receipt generation
- Refund processing

Evidence: `app/api/v1/fee/`, `app/service/fee/`, `context_guide.json:386-402`

---

## Key Components

[EVIDENCE-BASED]

### Models
| Model | File | Purpose |
|-------|------|---------|
| FeeCategory | `fee_category_model.py` | Fee categories (Tuition, Transport, etc.) |
| FeeType | `fee_type_model.py` | Specific fee types under categories |
| FeeTerm | `fee_term_model.py` | Payment terms (Monthly, Quarterly, etc.) |
| FeeTermDates | `fee_term_dates_model.py` | Term date ranges |
| FeeClassMapping | `fee_class_mapping_model.py` | Fee structure per class |
| FeeClassMapTermAmount | `fee_class_map_term_amount_model.py` | Term-wise amounts |
| FeeStudentMapping | `fee_student_mapping_model.py` | Student fee assignments |
| FeeStudentMapTermAmount | `fee_student_map_term_amount_model.py` | Student term amounts |
| FeeTransaction | `fee_transaction_model.py` | Payment transactions |
| FeeTransactionItem | `fee_transaction_item_model.py` | Transaction line items |
| FeeReceipt | `fee_receipt_model.py` | Payment receipts |
| FeeRefund | `fee_refund_model.py` | Refund records |

### Services
| Service | File | Size | Purpose |
|---------|------|------|---------|
| FeeCategoryService | `fee_category_service.py` | 13.6KB | Category CRUD |
| FeeTypeService | `fee_type_service.py` | 18.5KB | Type management |
| FeeTermService | `fee_term_service.py` | 13.6KB | Term configuration |
| FeeClassMappingService | `fee_class_mapping_service.py` | 24.1KB | Class fee mapping |
| FeeClassMapTermAmountService | `fee_class_map_term_amount_service.py` | 13.4KB | Term amounts |
| FeeStudentMappingService | `fee_student_mapping_service.py` | 33.5KB | Student assignments |
| FeeTransactionService | `fee_transaction_service.py` | 47.4KB | Payment processing |
| FeeReceiptService | `fee_receipt_service.py` | 16.6KB | Receipt generation |
| FeeRefundService | `fee_refund_service.py` | 14.8KB | Refund processing |

### API Endpoints
| Endpoint File | Routes |
|--------------|--------|
| `fee_category_endpoints.py` | `/api/v1/fee/categories/` |
| `fee_type_endpoints.py` | `/api/v1/fee/types/` |
| `fee_term_endpoints.py` | `/api/v1/fee/terms/` |
| `fee_class_mapping_endpoints.py` | `/api/v1/fee/class-mappings/` |
| `fee_class_map_term_amount_endpoints.py` | `/api/v1/fee/class-term-amounts/` |
| `fee_student_mapping_endpoints.py` | `/api/v1/fee/student-mappings/` |
| `fee_transaction_endpoints.py` | `/api/v1/fee/transactions/` |
| `fee_receipt_endpoints.py` | `/api/v1/fee/receipts/` |
| `fee_refund_endpoints.py` | `/api/v1/fee/refunds/` |

---

## Data Model Summary

[EVIDENCE-BASED]

### Fee Hierarchy
```
FeeCategory (e.g., "Tuition Fees")
  └── FeeType (e.g., "Monthly Tuition")
        └── FeeClassMapping (Class-specific fee structure)
              └── FeeClassMapTermAmount (Term-wise amounts)
                    └── FeeStudentMapping (Student assignment)
                          └── FeeStudentMapTermAmount (Student term amounts)
```

### FeeCategory
- `id` (UUID): Primary key
- `name`: Category name
- `description`: Description
- `is_active`: Status

### FeeType
- `id` (UUID): Primary key
- `category_id` (UUID FK): Parent category
- `name`: Type name
- `amount`: Base amount
- `is_refundable`: Refund eligibility
- `is_active`: Status

### FeeTransaction
- `id` (UUID): Primary key
- `student_id` (UUID FK): Paying student
- `transaction_date`: Payment date
- `total_amount`: Transaction total
- `payment_mode`: Cash/Check/Online
- `status`: Pending/Completed/Failed
- `receipt_id` (UUID FK): Generated receipt

---

## Invariants & Rules

[EVIDENCE-BASED]

### Database Refresh Pattern
Fee module services use the `flush() -> select() -> commit()` pattern to prevent multi-tenant schema context issues.

**Fixed Services:**
- `fee_category_service.py` (create, update)
- `fee_type_service.py` (create, update)
- `fee_class_mapping_service.py` (create, update)

Evidence: `context_guide.json:686-695`

### Term Amount Distribution
- Fee amounts can be distributed across multiple terms
- Each term has specific due dates
- Overdue calculations based on term due dates

Evidence: `context_guide.json:209-221`

---

## Public Interfaces

[EVIDENCE-BASED]

### Fee Category Endpoints
```
GET    /api/v1/fee/categories/
POST   /api/v1/fee/categories/
GET    /api/v1/fee/categories/{id}
PUT    /api/v1/fee/categories/{id}
DELETE /api/v1/fee/categories/{id}
GET    /api/v1/fee/categories/dropdown
```

### Fee Type Endpoints
```
GET    /api/v1/fee/types/
POST   /api/v1/fee/types/
GET    /api/v1/fee/types/{id}
PUT    /api/v1/fee/types/{id}
DELETE /api/v1/fee/types/{id}
```

### Class Mapping Endpoints
```
GET    /api/v1/fee/class-mappings/
POST   /api/v1/fee/class-mappings/
  - Input includes: class_id, fee_type_id, term amounts
```

### Student Mapping Endpoints
```
GET    /api/v1/fee/student-mappings/
POST   /api/v1/fee/student-mappings/
  - Assigns fee structure to individual student
```

### Transaction Endpoints
```
POST   /api/v1/fee/transactions/
  - Process fee payment

GET    /api/v1/fee/transactions/
  - List transactions

GET    /api/v1/fee/transactions/student/{student_id}
  - Student's payment history
```

### Receipt Endpoints
```
GET    /api/v1/fee/receipts/{id}
GET    /api/v1/fee/receipts/{id}/download
  - Download receipt PDF
```

### Refund Endpoints
```
POST   /api/v1/fee/refunds/
  - Process refund

GET    /api/v1/fee/refunds/
  - List refunds
```

---

## Dependencies

[EVIDENCE-BASED]

### Internal Dependencies
- Student Management Module (student records)
- Masters Module (classes, sections, academic years)
- Authentication Module (user permissions)

### External Dependencies
- PDF generation for receipts (`reportlab`)

---

## Known Risks

[INFERENCE]

### Financial Integrity
1. **Transaction Atomicity**: Complex transactions spanning multiple tables
2. **Refund Validation**: Need to ensure refund doesn't exceed paid amount
3. **Receipt Numbering**: Unique receipt number generation critical

### Performance
1. **Large Transaction Queries**: Fee reports may require significant data aggregation
2. **Concurrent Payments**: Multiple simultaneous payments need proper locking

### Unfixed Refresh Pattern Issues
[EVIDENCE-BASED]

Remaining services with unfixed refresh pattern:
- `fee_transaction_service.py` (1 instance)
- `fee_student_mapping_service.py` (1 instance)
- `fee_receipt_service.py` (2 instances)
- `fee_refund_service.py` (3 instances)
- `fee_class_map_term_amount_service.py` (2 instances)

Evidence: `context_guide.json:716-719`

---

## Test Coverage

[EVIDENCE-BASED]

- Fee student mapping system verified as PRODUCTION READY
- Test data created and validated
- Both local and production environments tested

Evidence: `context_guide.json:200-227`

---

## Uncertainties

[UNCERTAIN]

1. **Payment Gateway**: No external payment integration observed
2. **Late Fee Calculation**: Automatic late fee logic not documented
3. **Partial Payments**: Handling of partial term payments unclear
4. **Financial Year Closure**: Year-end processing not visible

---

## Test Data Reference

[EVIDENCE-BASED]

```
Test Student: TestStudent2024 FeeMapping (bbe95e7c-5e5b-4970-b26b-18385a7ca0a0)
Admission: ADM2024001
Class: Grade 10 (3e44d2d5-ad1f-4f3f-99a1-a2cf0529fd79)
Section: Section A (45e09162-e393-4e3b-8fd7-28b6d43cca5e)
Fee Type: Tuition Fee (3f986c59-b7f8-4daa-bc01-6209e3b8c162)
Academic Year: 2024-25 (35df3ce9-b1eb-41f6-b9e0-e139d903aca1)
```

Evidence: `context_guide.json:209-215`

---

## Compliance Statement

> This document complies with **AI_HALLUCINATION_SOP.md**.
> All statements are evidence-based or explicitly marked.

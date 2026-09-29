# Module Context - Fee Management

Version: 1.0
Last Updated: 2026-02-06
Source: Codebase Analysis + Fee Documentation Consolidation
Confidence Level: High

---

## Responsibility

[EVIDENCE-BASED]

The Fee Management module handles the complete lifecycle of school fees:

- Fee structure definition: categories, types, terms, term dates
- Fee assignment: class mappings, class mapping term amounts, student mappings, student term amounts
- Collection: transactions with line items and payment validation
- Receipts: PDF generation, verification, reprint tracking
- Refunds: request, approval, and processing workflow
- Reporting: fee collection, pending fees, and fee structure reports

Evidence: `app/api/v1/fee/`, `app/service/fee/`, `app/models/fee/`, `app/api/v1/reports/fee_reports.py`

---

## Key Components

[EVIDENCE-BASED]

### Models

| Model                     | File                                   | Purpose                                  |
| ------------------------- | -------------------------------------- | ---------------------------------------- |
| FeeCategory               | `fee_category_model.py`                | Fee categories per academic year         |
| FeeType                   | `fee_type_model.py`                    | Fee types linked to categories and terms |
| FeeTerm                   | `fee_term_model.py`                    | Payment schedules and installment count  |
| FeeTermDates              | `fee_term_dates_model.py`              | Installment due dates                    |
| FeeClassMapping           | `fee_class_mapping_model.py`           | Class-level fee templates                |
| FeeClassMappingTermAmount | `fee_class_map_term_amount_model.py`   | Term amounts per class mapping           |
| FeeStudentMapping         | `fee_student_mapping_model.py`         | Student-level fee assignments            |
| FeeStudentMapTermAmount   | `fee_student_map_term_amount_model.py` | Term amounts per student mapping         |
| FeeTransaction            | `fee_transaction_model.py`             | Payment transactions                     |
| FeeTransactionItem        | `fee_transaction_item_model.py`        | Transaction line items                   |
| FeeReceipt                | `fee_receipt_model.py`                 | Receipt records and hashes               |
| FeeRefund                 | `fee_refund_model.py`                  | Refund workflow records                  |

### Services

| Service                      | File                                        | Purpose                                  |
| ---------------------------- | ------------------------------------------- | ---------------------------------------- |
| FeeCategoryService           | `fee_category_service.py`                   | Category CRUD and validation             |
| FeeTypeService               | `fee_type_service.py`                       | Type CRUD and validation                 |
| FeeTermService               | `fee_term_service.py`                       | Term creation with dates                 |
| FeeClassMappingService       | `fee_class_mapping_service.py`              | Class mapping CRUD and bulk              |
| FeeClassMapTermAmountService | `fee_class_map_term_amount_service.py`      | Class term amount management             |
| FeeStudentMappingService     | `fee_student_mapping_service.py`            | Student mapping CRUD and bulk            |
| FeeTransactionService        | `fee_transaction_service.py`                | Transactions and outstanding calculation |
| FeeReceiptService            | `fee_receipt_service.py`                    | Receipt generation and verification      |
| FeeRefundService             | `fee_refund_service.py`                     | Refund workflow handling                 |
| FeeReportService             | `app/service/reports/fee_report_service.py` | Fee reports and exports                  |

### API Endpoints

| Endpoint File                            | Routes                                    |
| ---------------------------------------- | ----------------------------------------- |
| `fee_category_endpoints.py`              | `/api/v1/fee/categories/`                 |
| `fee_type_endpoints.py`                  | `/api/v1/fee/types/`                      |
| `fee_term_endpoints.py`                  | `/api/v1/fee/terms/`                      |
| `fee_class_mapping_endpoints.py`         | `/api/v1/fee/class-mappings/`             |
| `fee_class_map_term_amount_endpoints.py` | `/api/v1/fee/class-mapping-term-amounts/` |
| `fee_student_mapping_endpoints.py`       | `/api/v1/fee/student-mappings/`           |
| `fee_transaction_endpoints.py`           | `/api/v1/fee/transactions/`               |
| `fee_receipt_endpoints.py`               | `/api/v1/fee/receipts/`                   |
| `fee_refund_endpoints.py`                | `/api/v1/fee/refunds/`                    |
| `fee_reports.py`                         | `/api/v1/reports/fees/`                   |

Evidence: `app/api/v1/fee/`, `app/api/v1/reports/fee_reports.py`, `app/api/v1/main_router.py`

---

## Data Model Summary

[EVIDENCE-BASED]

### FeeCategory

- category_name, category_status
- academic_year_id

### FeeType

- type_name, fee_status
- fee_category_id, fee_term_id, academic_year_id

### FeeTerm

- term_name, term_status
- number_of_terms, academic_year_id

### FeeTermDates

- term_id
- fee_term_date

### FeeClassMapping

- class_id, fee_type_id, academic_year_id
- total_fee, all_by_default

### FeeClassMappingTermAmount

- fee_class_mapping_id
- term_id, term_amount

### FeeStudentMapping

- student_id, student_admission_num
- class_id, section_id
- fee_type_id, academic_year_id
- total_fee

### FeeStudentMapTermAmount

- fee_student_map_id
- term_id, term_amount

### FeeTransaction

- transaction_number
- student_id, student_admission_num, academic_year_id
- total_amount, payment_method, status
- payment method fields: upi_reference, cheque_number, bank_reference
- receipt_generated, receipt_hash

### FeeTransactionItem

- fee_transaction_id
- fee_type_id, fee_term_id
- amount_due, amount_paid, description

### FeeReceipt

- receipt_number
- fee_transaction_id
- student_name, student_admission_num, class_section, academic_year
- content_hash, pdf_file_path, reprint_count

### FeeRefund

- refund_number
- fee_transaction_id
- student_id, student_admission_num, academic_year_id
- refund_amount, refund_reason, status
- refund_method, refund_reference

Evidence: `app/models/fee/`, `app/schemas/fee/`

---

## Invariants and Rules

[EVIDENCE-BASED]

- Fee term dates count must equal number_of_terms and must be unique per term.
- Category name is unique per academic year.
- Type name is unique per fee category.
- Class mapping is unique per class, fee type, and academic year.
- Student mapping is unique per student, fee type, and academic year.
- Class and student term amounts are derived from total_fee and term count.
- Transaction total_amount must equal sum of transaction_items amount_paid.
- Transaction items cannot exceed amount_due for their fee type and term.
- Payment method fields are required for UPI, cheque, and bank transfer.
- Outstanding is computed from term amounts and completed payments only.
- Receipts are generated for completed transactions and include a content hash.
- Refunds follow status flow: pending, approved, rejected, processed.

Evidence: `app/schemas/fee/`, `app/service/fee/`

---

## Permissions

[EVIDENCE-BASED]

| Resource                       | Actions                              |
| ------------------------------ | ------------------------------------ |
| fee_categories                 | create, read, update, delete, list   |
| fee_types                      | create, read, update, delete, list   |
| fee_terms                      | create, read, update, delete, list   |
| fee_class_mappings             | create, read, update, delete, list   |
| fee_class_mapping_term_amounts | create, read, update, delete, list   |
| fee_student_mappings           | create, read, update, delete, list   |
| fee_transactions               | create, read, update, list           |
| fee_receipts                   | create, read, update, list           |
| fee_refunds                    | create, read, list, approve, process |
| fee_reports                    | read, export                         |

Evidence: `app/api/v1/fee/*`, `app/api/v1/reports/fee_reports.py`, `scripts/setup_fee_permissions.sh`

---

## Dependencies and Preconditions

[EVIDENCE-BASED]

- Academic years, classes, sections, and students must exist before fee assignment.
- Tenant context is required via the `cschema` header.
- Authenticated access uses JWT with plan and role permissions enforced.
- Fee reports require the `fee_reports` resource permission.

Evidence: `app/api/v1/fee/`, `app/api/v1/reports/fee_reports.py`, `context/context_guide.json`

---

## Related Documents

- `AI_GOVERNANCE/handovers/Fee_Management_Functional.md`
- `AI_GOVERNANCE/handovers/Fee_Management_Implementation.md`
- `docs/07-testing/FEE_MODULE_TESTING_PLAN.md`
- `context/PROJECT_CONTEXT.md`

---

**End of Context Document**

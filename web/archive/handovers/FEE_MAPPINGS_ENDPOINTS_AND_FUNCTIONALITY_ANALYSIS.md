# Fee Mappings Endpoints and Functionality Analysis

## Overview

This document provides a complete analysis of the Fee Mappings module, including all endpoints, button functionalities, and data flows for both Class Mappings and Student Mappings.

---

## Page Structure

**Route**: `/fee/mappings`
**Component**: `src/pages/fee/FeeMappings.tsx`

The page has two tabs:
1. **Student Mappings** - Manage fee assignments for individual students
2. **Class Mappings** - Manage fee assignments for entire classes

---

## 1. Student Mappings Tab

### Component
`src/components/fee/mappings/StudentMappingTable.tsx`

### Buttons & Functionality

#### 1.1 "Bulk Create" Button (Line 148-164)

**UI Location**: Top right, outlined button
**Icon**: Plus
**Opens**: Dialog with `BulkStudentMappingForm`

**Functionality:**
- Allows creating fee mappings for multiple students at once
- All students get the same fee type and total fee amount
- Users select class, section, fee type, total fee, then select multiple students

**API Endpoint:**
```
POST /api/v1/fee/student-mappings/bulk
```

**Request Body:**
```json
{
  "student_ids": ["uuid-1", "uuid-2", "uuid-3"],
  "class_id": "uuid",
  "section_id": "uuid",
  "fee_type_id": "uuid",
  "total_fee": 7770.00,
  "academic_year_id": "uuid"
}
```

**Response Expected:**
```json
{
  "success_count": 3,
  "total_count": 3,
  "message": "Successfully created 3 fee student mappings",
  "created_mappings": [...],
  "errors": []
}
```

**Current Status**: ❌ **FAILING** - Returns 500 error with `term_id` null constraint violation
**See**: `BACKEND_HANDOVER_STUDENT_MAPPINGS_BULK.md` for details

---

#### 1.2 "Create Mapping" Button (Line 166-184)

**UI Location**: Top right, primary button
**Icon**: Plus
**Opens**: Dialog with `StudentMappingForm`

**Functionality:**
- Creates fee mapping for a single student
- User selects student, admission number, class, section, fee type, and total fee

**API Endpoint:**
```
POST /api/v1/fee/student-mappings/
```

**Request Body:**
```json
{
  "student_id": "uuid",
  "student_admission_num": "P2026005",
  "class_id": "uuid",
  "section_id": "uuid",
  "fee_type_id": "uuid",
  "total_fee": 7770.00,
  "academic_year_id": "uuid"
}
```

**Response Expected:**
```json
{
  "id": "uuid",
  "student_id": "uuid",
  "academic_year_id": "uuid",
  "class_id": "uuid",
  "section_id": "uuid",
  "fee_type_id": "uuid",
  "total_fee": "7770.00",
  "student_admission_num": "P2026005",
  "student_fee_mapping_terms": [],
  "created_at": "2026-02-08T10:00:00Z",
  "updated_at": "2026-02-08T10:00:00Z"
}
```

**Current Status**: ✅ Should work (needs backend verification)

---

#### 1.3 Edit Button (Per Row, Line 308-314)

**UI Location**: Actions column, ghost button
**Icon**: Edit (lucide-react)
**Opens**: Dialog with `StudentMappingForm` pre-filled

**Functionality:**
- Edits an existing student fee mapping
- Pre-populates form with current mapping data

**API Endpoint:**
```
PUT /api/v1/fee/student-mappings/{mapping_id}
```

**Request Body:**
```json
{
  "student_id": "uuid",
  "student_admission_num": "P2026005",
  "class_id": "uuid",
  "section_id": "uuid",
  "fee_type_id": "uuid",
  "total_fee": 8000.00,
  "academic_year_id": "uuid"
}
```

**Current Status**: ✅ Should work

---

#### 1.4 Delete Button (Per Row, Line 315-343)

**UI Location**: Actions column, ghost button
**Icon**: Trash2 (lucide-react)
**Opens**: Alert dialog for confirmation

**Functionality:**
- Deletes a student fee mapping
- Shows confirmation dialog before deletion

**API Endpoint:**
```
DELETE /api/v1/fee/student-mappings/{mapping_id}
```

**Response Expected:**
```json
{
  "message": "Fee student mapping deleted successfully"
}
```

**Current Status**: ✅ Should work

---

### Student Mappings - Data Loading

#### 1.5 Load Mappings

**Triggered**: On component mount, when filters change
**API Endpoint:**
```
GET /api/v1/fee/student-mappings/?{query_params}
```

**Query Parameters:**
- `academic_year_id` (required)
- `class_id` (optional filter)
- `section_id` (optional filter)
- `fee_type_id` (optional filter)

**Response Expected:**
```json
{
  "items": [
    {
      "id": "uuid",
      "student_id": "uuid",
      "academic_year_id": "uuid",
      "class_id": "uuid",
      "section_id": "uuid",
      "fee_type_id": "uuid",
      "total_fee": "7770.00",
      "student_admission_num": "P2026005",
      "student_fee_mapping_terms": [],
      "created_at": "2026-02-08T10:00:00Z",
      "updated_at": "2026-02-08T10:00:00Z"
    }
  ],
  "total": 1,
  "skip": 0,
  "limit": 100
}
```

**Alternative Response** (backend may return array directly):
```json
[
  {
    "id": "uuid",
    "student_id": "uuid",
    ...
  }
]
```

**Current Status**: ✅ Works (handles both response formats)

---

## 2. Class Mappings Tab

### Component
`src/components/fee/mappings/ClassMappingTable.tsx`

### Buttons & Functionality

#### 2.1 "Add Mapping" Button (Line 274-277)

**UI Location**: Top right, primary button
**Icon**: Plus
**Opens**: Dialog with class mapping form

**Functionality:**
- Creates a fee mapping for an entire class
- User selects fee type, class, total fee, and assignment type (default vs custom)

**API Endpoint:**
```
POST /api/v1/fee/class-mappings/
```

**Request Body:**
```json
{
  "class_id": "uuid",
  "fee_type_id": "uuid",
  "total_fee": 50000.00,
  "academic_year_id": "uuid",
  "all_by_default": true
}
```

**Response Expected:**
```json
{
  "id": "uuid",
  "class_id": "uuid",
  "fee_type_id": "uuid",
  "total_fee": 50000.00,
  "academic_year_id": "uuid",
  "all_by_default": true,
  "class_fee_mapping_terms": [],
  "created_at": "2026-02-08T10:00:00Z",
  "updated_at": "2026-02-08T10:00:00Z"
}
```

**Current Status**: ❌ **MAY BE FAILING** - See `BACKEND_HANDOVER_FEE_CLASS_MAPPINGS.md`

---

#### 2.2 "Manage Term Amounts" Button (Per Row, Line 356-364)

**UI Location**: Actions column, ghost button
**Icon**: Calculator (lucide-react)
**Opens**: `TermAmountModal` dialog

**Functionality:**
- Allows distributing the total fee across multiple payment terms
- Shows existing term amounts if any
- Can create, update, or delete term amounts

**Related Endpoints:**

##### Create Term Amounts
```
POST /api/v1/fee/class-mapping-term-amounts/
```

**Request Body:**
```json
{
  "fee_class_mapping_id": "uuid",
  "term_amounts": [
    {
      "term_date_id": "term-uuid-1",
      "term_amount": 25000.00
    },
    {
      "term_date_id": "term-uuid-2",
      "term_amount": 25000.00
    }
  ]
}
```

**Response Expected:**
```json
{
  "fee_class_mapping_id": "uuid",
  "term_amounts": [
    {
      "id": "uuid",
      "fee_class_mapping_id": "uuid",
      "term_date_id": "term-uuid-1",
      "term_amount": 25000.00,
      "created_at": "2026-02-08T10:00:00Z",
      "updated_at": "2026-02-08T10:00:00Z"
    },
    ...
  ]
}
```

**Current Status**: ❌ **FAILING** - Returns 500 error
**See**: `BACKEND_HANDOVER_FEE_TERM_AMOUNTS.md`

##### Update Term Amounts
```
PUT /api/v1/fee/class-mapping-term-amounts/
```

**Request Body:**
```json
{
  "fee_class_mapping_id": "uuid",
  "term_amounts": [
    {
      "id": "term-amount-uuid-1",
      "term_id": "term-uuid-1",
      "term_amount": 30000.00
    },
    {
      "id": "term-amount-uuid-2",
      "term_id": "term-uuid-2",
      "term_amount": 20000.00
    }
  ]
}
```

##### Delete Term Amounts
```
DELETE /api/v1/fee/class-mapping-term-amounts/
```

**Request Body:**
```json
{
  "fee_class_mapping_id": "uuid",
  "term_amounts": [
    {
      "id": "term-amount-uuid-1"
    }
  ]
}
```

---

#### 2.3 Edit Button (Per Row, Line 365-373)

**UI Location**: Actions column, ghost button
**Icon**: Edit (lucide-react)
**Opens**: Dialog with pre-filled form

**Functionality:**
- Edits an existing class fee mapping
- Only allows editing `total_fee` and `all_by_default` (not class_id, fee_type_id, academic_year_id)

**API Endpoint:**
```
PUT /api/v1/fee/class-mappings/{mapping_id}
```

**Request Body:**
```json
{
  "total_fee": 55000.00,
  "all_by_default": false
}
```

**Current Status**: ✅ Should work

---

#### 2.4 Delete Button (Per Row, Line 374-382)

**UI Location**: Actions column, ghost button (destructive color)
**Icon**: Trash2 (lucide-react)
**Opens**: Confirmation dialog

**Functionality:**
- Deletes a class fee mapping
- Shows confirmation with class and fee type names

**API Endpoint:**
```
DELETE /api/v1/fee/class-mappings/{mapping_id}
```

**Current Status**: ✅ Should work

---

### Class Mappings - Data Loading

#### 2.5 Load Mappings

**Triggered**: On component mount, when academic year changes
**API Endpoint:**
```
GET /api/v1/fee/class-mappings/?{query_params}
```

**Query Parameters:**
- `academic_year_id` (required)
- `class_id` (optional filter)
- `fee_type_id` (optional filter)
- `all_by_default` (optional filter)

**Response Expected:**
```json
{
  "items": [
    {
      "id": "uuid",
      "class_id": "uuid",
      "fee_type_id": "uuid",
      "total_fee": 50000.00,
      "academic_year_id": "uuid",
      "all_by_default": true,
      "class_name": "Class 1 IIT",
      "fee_type_name": "Tuition Fee",
      "academic_year_name": "2025-2026",
      "class_fee_mapping_terms": [
        {
          "id": "uuid",
          "fee_class_mapping_id": "uuid",
          "term_date_id": "uuid",
          "term_amount": 25000.00,
          "term_name": "Term 1",
          "term_date": "2025-06-01",
          "created_at": "2026-02-08T10:00:00Z",
          "updated_at": "2026-02-08T10:00:00Z"
        }
      ],
      "created_at": "2026-02-08T10:00:00Z",
      "updated_at": "2026-02-08T10:00:00Z"
    }
  ],
  "total": 1,
  "skip": 0,
  "limit": 100
}
```

**Current Status**: ❌ **FAILING** - Returns 500 error
**See**: `BACKEND_HANDOVER_FEE_CLASS_MAPPINGS.md`

---

## 3. Complete API Endpoints Reference

### Student Mappings Endpoints

| Method | Endpoint | Purpose | Status |
|--------|----------|---------|--------|
| GET | `/fee/student-mappings/` | List all student mappings with filters | ✅ Works |
| GET | `/fee/student-mappings/{id}` | Get single student mapping by ID | ✅ Should work |
| POST | `/fee/student-mappings/` | Create single student mapping | ✅ Should work |
| POST | `/fee/student-mappings/bulk` | Bulk create student mappings | ❌ **FAILING** |
| PUT | `/fee/student-mappings/{id}` | Update student mapping | ✅ Should work |
| DELETE | `/fee/student-mappings/{id}` | Delete student mapping | ✅ Should work |

### Class Mappings Endpoints

| Method | Endpoint | Purpose | Status |
|--------|----------|---------|--------|
| GET | `/fee/class-mappings/` | List all class mappings with filters | ❌ **FAILING** |
| GET | `/fee/class-mappings/{id}` | Get single class mapping by ID | ❓ Unknown |
| POST | `/fee/class-mappings/` | Create single class mapping | ❓ Unknown |
| POST | `/fee/class-mappings/bulk` | Bulk create class mappings | ❓ Unknown |
| PUT | `/fee/class-mappings/{id}` | Update class mapping | ❓ Unknown |
| DELETE | `/fee/class-mappings/{id}` | Delete class mapping | ❓ Unknown |

### Class Mapping Term Amounts Endpoints

| Method | Endpoint | Purpose | Status |
|--------|----------|---------|--------|
| POST | `/fee/class-mapping-term-amounts/` | Create term amounts for a class mapping | ❌ **FAILING** |
| PUT | `/fee/class-mapping-term-amounts/` | Update term amounts | ❓ Unknown |
| DELETE | `/fee/class-mapping-term-amounts/` | Delete term amounts | ❓ Unknown |

---

## 4. Data Flow Summary

### Student Mapping Creation Flow (Single)

```
User clicks "Create Mapping"
  ↓
Opens StudentMappingForm dialog
  ↓
User fills: student, admission_num, class, section, fee_type, total_fee
  ↓
User clicks "Create Mapping" submit button
  ↓
POST /fee/student-mappings/
  ↓
Backend creates fee_student_mapping record
  ↓
Frontend shows success toast
  ↓
Table refreshes
```

### Student Mapping Creation Flow (Bulk)

```
User clicks "Bulk Create"
  ↓
Opens BulkStudentMappingForm dialog
  ↓
User selects: class → section → fee_type → total_fee
  ↓
Students dropdown populates (filtered by class & section)
  ↓
User selects multiple students
  ↓
User clicks "Create Mappings"
  ↓
POST /fee/student-mappings/bulk
  ↓
Backend TRIES to create:
  - fee_student_mapping records (per student)
  - fee_student_map_term_amounts records ❌ FAILS HERE
  ↓
Error: term_id is NULL
```

**Issue**: Backend is trying to automatically create term amounts but doesn't have `term_id` values.

### Class Mapping Creation Flow

```
User clicks "Add Mapping"
  ↓
Opens class mapping form dialog
  ↓
User selects: fee_type, class, enters total_fee, sets all_by_default checkbox
  ↓
User clicks "Save"
  ↓
POST /fee/class-mappings/
  ↓
Backend creates fee_class_mapping record
  ↓
Frontend shows success toast
  ↓
Table refreshes
```

### Term Amount Management Flow

```
User clicks Calculator icon on a class mapping row
  ↓
Opens TermAmountModal
  ↓
Modal fetches fee terms for the selected fee type
  ↓
User distributes total fee across terms
  ↓
User clicks "Save Term Amounts"
  ↓
POST /fee/class-mapping-term-amounts/
  ↓
Backend TRIES to create class_fee_mapping_terms records
  ↓
Error: term_id is NULL or endpoint doesn't exist
```

---

## 5. Frontend Files Reference

### Pages
- **Main Page**: `src/pages/fee/FeeMappings.tsx`
- **Route**: `src/routes/_app/fee/mappings.tsx`

### Components
- **Class Mappings**: `src/components/fee/mappings/ClassMappingTable.tsx`
- **Student Mappings**: `src/components/fee/mappings/StudentMappingTable.tsx`
- **Student Form**: `src/components/fee/mappings/StudentMappingForm.tsx`
- **Bulk Student Form**: `src/components/fee/mappings/BulkStudentMappingForm.tsx`
- **Term Amount Modal**: `src/components/fee/mappings/TermAmountModal.tsx`

### API Helpers
- **Class Mappings API**: `src/api/fee/classMappings.ts`
- **Student Mappings API**: `src/api/fee/studentMappings.ts`
- **General Mappings API**: `src/api/fee/mappings.ts`
- **Index**: `src/api/fee/index.ts`

### Hooks
- **Class Mappings Hooks**: `src/hooks/fee/useFeeMappings.ts`
- **Fee Types Hook**: `src/hooks/fee/useFeeTypes.ts`

### Types
- **Mapping Types**: `src/types/fee/mapping.ts`
- **Fee Types**: `src/types/fee/index.ts`

### Constants
- **API Endpoints**: `src/constants/api/fee.ts`

---

## 6. Known Issues Summary

### Issue 1: Student Bulk Creation Failing
**Status**: ❌ **CRITICAL**
**Endpoint**: `POST /fee/student-mappings/bulk`
**Error**: `null value in column "term_id" of relation "fee_student_map_term_amounts" violates not-null constraint`
**Handover**: `BACKEND_HANDOVER_STUDENT_MAPPINGS_BULK.md`

### Issue 2: Class Mapping Term Amounts Failing
**Status**: ❌ **HIGH**
**Endpoint**: `POST /fee/class-mapping-term-amounts/`
**Error**: 500 Internal Server Error
**Handover**: `BACKEND_HANDOVER_FEE_TERM_AMOUNTS.md`

### Issue 3: Class Mappings List Failing
**Status**: ❌ **HIGH**
**Endpoint**: `GET /fee/class-mappings/`
**Error**: 500 Internal Server Error (based on error handling UI)
**Handover**: `BACKEND_HANDOVER_FEE_CLASS_MAPPINGS.md`

---

## 7. Testing Checklist

### Student Mappings

- [ ] **Load student mappings list** - GET /fee/student-mappings/
- [ ] **Filter by class** - GET /fee/student-mappings/?class_id={id}
- [ ] **Filter by section** - GET /fee/student-mappings/?section_id={id}
- [ ] **Filter by fee type** - GET /fee/student-mappings/?fee_type_id={id}
- [ ] **Search by student name** - Client-side filtering
- [ ] **Create single student mapping** - POST /fee/student-mappings/
- [ ] **Bulk create student mappings** - POST /fee/student-mappings/bulk (❌ FAILING)
- [ ] **Edit student mapping** - PUT /fee/student-mappings/{id}
- [ ] **Delete student mapping** - DELETE /fee/student-mappings/{id}

### Class Mappings

- [ ] **Load class mappings list** - GET /fee/class-mappings/ (❌ FAILING)
- [ ] **Create class mapping** - POST /fee/class-mappings/
- [ ] **Edit class mapping** - PUT /fee/class-mappings/{id}
- [ ] **Delete class mapping** - DELETE /fee/class-mappings/{id}
- [ ] **Create term amounts** - POST /fee/class-mapping-term-amounts/ (❌ FAILING)
- [ ] **Update term amounts** - PUT /fee/class-mapping-term-amounts/
- [ ] **Delete term amounts** - DELETE /fee/class-mapping-term-amounts/
- [ ] **Term distribution validation** - Frontend calculates mismatch between total fee and term amounts sum

---

## 8. Recommendations

### Immediate Fixes Needed

1. **Fix Student Bulk Creation** (Priority 1)
   - Backend should NOT create term amounts in bulk create
   - Or backend should accept term amounts in the request

2. **Fix Class Mapping Term Amounts Endpoint** (Priority 2)
   - Implement POST /fee/class-mapping-term-amounts/ endpoint
   - Ensure it accepts term_date_id (not term_id)

3. **Fix Class Mappings List Endpoint** (Priority 3)
   - Implement GET /fee/class-mappings/ endpoint
   - Return properly structured response with class_fee_mapping_terms

### Long-term Improvements

1. **Add Student Mapping Term Amounts Management**
   - Similar to class mappings, allow term distribution for individual students

2. **Validate Term Distribution**
   - Backend should validate that term amounts sum equals total fee

3. **Handle Edge Cases**
   - What happens when fee type has no terms defined?
   - What happens when academic year changes mid-year?

4. **Performance Optimization**
   - Consider pagination for large student/class lists
   - Cache fee types, classes, sections data

---

## 9. Backend Requirements Summary

Based on the frontend implementation, the backend must support:

### Student Mappings
- Full CRUD operations for fee_student_mappings
- Bulk creation WITHOUT automatic term amounts creation
- Filtering by academic_year_id, class_id, section_id, fee_type_id
- Return both array and paginated response formats (frontend handles both)

### Class Mappings
- Full CRUD operations for fee_class_mappings
- Support for class_fee_mapping_terms relationship (eager loading)
- Return mappings with term amounts populated
- Support `all_by_default` flag

### Term Amounts
- Create, update, delete class_fee_mapping_terms
- Accept `term_date_id` (not `term_id`)
- Validate foreign keys (fee_class_mapping_id, term_date_id)
- Handle bulk operations (multiple term amounts at once)

---

## 10. Contact & Next Steps

For backend implementation questions:
- Check the three handover documents in the repository root
- Review the API files in `src/api/fee/`
- Check TypeScript types in `src/types/fee/mapping.ts`

For frontend issues:
- Check component files in `src/components/fee/mappings/`
- Review hooks in `src/hooks/fee/`
- Check API integration in `src/api/fee/`

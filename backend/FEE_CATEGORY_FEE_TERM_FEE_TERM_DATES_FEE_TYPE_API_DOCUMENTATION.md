# Fee Category Flow:

Fee Categories is a basic CRUD operations template.
Show all the categories in data tables with actions in the last column and add new button at the top of the table.

# Fee terms and term dates flow:

Fee terms and term dates must be sent together.
When adding new fee terms, include the number of terms as well. For example, quarterly has 4 terms and half-yearly has 2 terms. At the end of each fee terms table, provide an option to add term dates. When users click on term dates, display new input boxes matching the number of terms. Users must select dates in these input boxes and submit, allowing fee terms and term dates to be submitted simultaneously.

# Fee Types Flow:

The fee type also follows basic CRUD operations. The only change is that while adding the fee type, make sure fee categories and fee terms are displayed in the drop-down. 

# Free Class Mapping Flow:



# Complete Fee Modules API Documentation

## Overview

This document provides comprehensive API documentation for all fee management modules in the system:

- Fee Categories
- Fee Terms & Fee Term Dates
- Fee Types
- Fee Class Mappings

These modules work together to manage the complete fee structure for educational institutions.

## Authentication

_Note: Authentication module is not implemented yet_

---

# 1. Fee Categories API

## Overview

Fee Categories represent the main classification of fees (e.g., Academic Fee, Transport Fee, Library Fee). Each category is tied to an academic year and can contain multiple fee types.

## Base URL

```
/fee/categories
```

## Data Model

### Fee Category Entity

| Field            | Type      | Description                   | Required       | Constraints                             |
| ---------------- | --------- | ----------------------------- | -------------- | --------------------------------------- |
| id               | UUID      | Unique identifier             | Auto-generated | Primary key                             |
| category_name    | String    | Name of the fee category      | Yes            | Max 100 chars, unique per academic year |
| category_status  | String    | Status of category            | No             | Default: "active"                       |
| academic_year_id | Integer   | Foreign key to academic_years | Yes            | Must exist in academic_years table      |
| created_at       | Timestamp | Record creation time          | Auto-generated | Server default                          |
| updated_at       | Timestamp | Record last update time       | Auto-generated | Server default, auto-update             |

### Unique Constraints

- Combination of `category_name` and `academic_year_id` must be unique

## API Endpoints

### 1.1 Create Fee Category

**POST** `/fee/categories/`

#### Request Body

```json
{
  "category_name": "Academic Fee",
  "category_status": "active",
  "academic_year_id": 1
}
```

#### Success Response (201 Created)

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174001",
  "category_name": "Academic Fee",
  "category_status": "active",
  "academic_year_id": 1,
  "academic_year_title": "2024-2025"
}
```

#### Error Responses

- **400 Bad Request**: Category name already exists for academic year
- **404 Not Found**: Academic year not found

### 1.2 Get All Fee Categories

**GET** `/fee/categories/`

#### Success Response (200 OK)

```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174001",
    "category_name": "Academic Fee",
    "category_status": "active",
    "academic_year_id": 1,
    "academic_year_title": "2024-2025"
  }
]
```

### 1.3 Get Fee Categories Dropdown

**GET** `/fee/categories/dropdown?academic_year_id=1`

#### Query Parameters

| Parameter        | Type    | Required | Description                |
| ---------------- | ------- | -------- | -------------------------- |
| academic_year_id | integer | No       | Filter by academic year ID |

#### Success Response (200 OK)

```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174001",
    "category_name": "Academic Fee"
  }
]
```

### 1.4 Get Fee Category by ID

**GET** `/fee/categories/{fee_category_id}`

#### Success Response (200 OK)

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174001",
  "category_name": "Academic Fee",
  "category_status": "active",
  "academic_year_id": 1,
  "academic_year_title": "2024-2025"
}
```

### 1.5 Update Fee Category

**PUT** `/fee/categories/{fee_category_id}`

#### Request Body (all fields optional)

```json
{
  "category_name": "Updated Academic Fee",
  "category_status": "inactive"
}
```

### 1.6 Delete Fee Category

**DELETE** `/fee/categories/{fee_category_id}`

#### Success Response (200 OK)

```json
{
  "message": "Fee category deleted successfully"
}
```

---

# 2. Fee Terms & Fee Term Dates API

## Overview

Fee Terms define payment schedules (e.g., Quarterly, Monthly) and their associated payment dates. Terms are managed together with their dates as a single entity.

## Base URL

```
/fee/terms
```

## Data Models

### Fee Term Entity

| Field            | Type    | Description                   | Required       | Constraints                        |
| ---------------- | ------- | ----------------------------- | -------------- | ---------------------------------- |
| id               | UUID    | Unique identifier             | Auto-generated | Primary key                        |
| term_name        | String  | Name of the term              | Yes            | Max 50 chars                       |
| term_status      | String  | Status of term                | No             | Default: "active"                  |
| number_of_terms  | Integer | Number of payment terms       | Yes            | Must match fee_term_dates count    |
| academic_year_id | Integer | Foreign key to academic_years | Yes            | Must exist in academic_years table |

### Fee Term Dates Entity

| Field         | Type | Description              | Required       | Constraints                    |
| ------------- | ---- | ------------------------ | -------------- | ------------------------------ |
| id            | UUID | Unique identifier        | Auto-generated | Primary key                    |
| term_id       | UUID | Foreign key to fee_terms | Yes            | Must exist in fee_terms table  |
| fee_term_date | Date | Payment due date         | Yes            | No duplicates within same term |

## API Endpoints

### 2.1 Create Fee Term with Dates

**POST** `/fee/terms/`

#### Request Body

```json
{
  "term_name": "Quarterly",
  "term_status": "active",
  "number_of_terms": 4,
  "academic_year_id": 1,
  "fee_term_dates": [
    { "fee_term_date": "2024-06-01" },
    { "fee_term_date": "2024-09-01" },
    { "fee_term_date": "2024-12-01" },
    { "fee_term_date": "2025-03-01" }
  ]
}
```

#### Success Response (201 Created)

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174002",
  "term_name": "Quarterly",
  "term_status": "active",
  "number_of_terms": 4,
  "academic_year_id": 1,
  "fee_term_dates": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174003",
      "term_id": "123e4567-e89b-12d3-a456-426614174002",
      "fee_term_date": "2024-06-01"
    }
  ]
}
```

#### Validation Rules

- `number_of_terms` must equal the count of `fee_term_dates`
- No duplicate dates within the same term
- All dates must be valid

### 2.2 Get All Fee Terms

**GET** `/fee/terms/`

#### Success Response (200 OK)

```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174002",
    "term_name": "Quarterly",
    "term_status": "active",
    "number_of_terms": 4,
    "academic_year_id": 1,
    "fee_term_dates": [...]
  }
]
```

### 2.3 Get Fee Term by ID

**GET** `/fee/terms/{fee_term_id}`

#### Success Response (200 OK)

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174002",
  "term_name": "Quarterly",
  "term_status": "active",
  "number_of_terms": 4,
  "academic_year_id": 1,
  "fee_term_dates": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174003",
      "term_id": "123e4567-e89b-12d3-a456-426614174002",
      "fee_term_date": "2024-06-01"
    }
  ]
}
```

### 2.4 Update Fee Term with Dates

**PUT** `/fee/terms/{fee_term_id}`

#### Request Body (all fields optional)

```json
{
  "term_name": "Updated Quarterly",
  "number_of_terms": 3,
  "fee_term_dates": [
    { "fee_term_date": "2024-08-01" },
    { "fee_term_date": "2024-12-01" },
    { "fee_term_date": "2025-04-01" }
  ]
}
```

### 2.5 Delete Fee Term

**DELETE** `/fee/terms/{fee_term_id}`

Deletes the term and all associated dates (cascade delete).

### 2.6 Delete Specific Fee Term Date

**DELETE** `/fee/terms/dates/{fee_term_date_id}`

Deletes only a specific fee term date.

---

# 3. Fee Types API

## Overview

Fee Types represent specific types of fees within categories (e.g., "Tuition Fee" within "Academic Fee" category). They connect categories, terms, and academic years.

## Base URL

```
/fee/types
```

## Data Model

### Fee Type Entity

| Field            | Type    | Description                   | Required       | Constraints                                    |
| ---------------- | ------- | ----------------------------- | -------------- | ---------------------------------------------- |
| id               | UUID    | Unique identifier             | Auto-generated | Primary key                                    |
| type_name        | String  | Name of the fee type          | Yes            | Max 100 chars, unique per category             |
| fee_category_id  | UUID    | Foreign key to fee_categories | Yes            | Must exist in fee_categories table             |
| fee_status       | String  | Status of fee type            | No             | Default: "active", values: "active"/"inactive" |
| fee_term_id      | UUID    | Foreign key to fee_terms      | Yes            | Must exist in fee_terms table                  |
| academic_year_id | Integer | Foreign key to academic_years | Yes            | Must exist in academic_years table             |

### Unique Constraints

- Combination of `type_name` and `fee_category_id` must be unique

## API Endpoints

### 3.1 Create Fee Type

**POST** `/fee/types/`

#### Request Body

```json
{
  "type_name": "Tuition Fee",
  "fee_category_id": "123e4567-e89b-12d3-a456-426614174001",
  "fee_status": "active",
  "fee_term_id": "123e4567-e89b-12d3-a456-426614174002",
  "academic_year_id": 1
}
```

#### Success Response (201 Created)

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174004",
  "type_name": "Tuition Fee",
  "fee_category_id": "123e4567-e89b-12d3-a456-426614174001",
  "fee_status": "active",
  "fee_term_id": "123e4567-e89b-12d3-a456-426614174002",
  "academic_year_id": 1,
  "fee_category_name": "Academic Fee",
  "fee_term_name": "Quarterly",
  "academic_year_name": "2024-2025",
  "fee_term_dates": [...]
}
```

### 3.2 Get All Fee Types

**GET** `/fee/types/`

#### Success Response (200 OK)

```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174004",
    "type_name": "Tuition Fee",
    "fee_category_id": "123e4567-e89b-12d3-a456-426614174001",
    "fee_status": "active",
    "fee_term_id": "123e4567-e89b-12d3-a456-426614174002",
    "academic_year_id": 1,
    "fee_category_name": "Academic Fee",
    "fee_term_name": "Quarterly",
    "academic_year_name": "2024-2025",
    "fee_term_dates": [...]
  }
]
```

### 3.3 Get Fee Types Dropdown

**GET** `/fee/types/dropdown?fee_category_id={category_id}`

#### Query Parameters

| Parameter       | Type          | Required | Description               |
| --------------- | ------------- | -------- | ------------------------- |
| fee_category_id | string (UUID) | No       | Filter by fee category ID |

#### Success Response (200 OK)

```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174004",
    "type_name": "Tuition Fee"
  }
]
```

### 3.4 Get Fee Type by ID

**GET** `/fee/types/{fee_type_id}`

#### Success Response (200 OK)

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174004",
  "type_name": "Tuition Fee",
  "fee_category_id": "123e4567-e89b-12d3-a456-426614174001",
  "fee_status": "active",
  "fee_term_id": "123e4567-e89b-12d3-a456-426614174002",
  "academic_year_id": 1,
  "fee_category_name": "Academic Fee",
  "fee_term_name": "Quarterly",
  "academic_year_name": "2024-2025",
  "fee_term_dates": [...]
}
```

### 3.5 Update Fee Type

**PUT** `/fee/types/{fee_type_id}`

#### Request Body (all fields optional)

```json
{
  "type_name": "Updated Tuition Fee",
  "fee_status": "inactive"
}
```

### 3.6 Delete Fee Type

**DELETE** `/fee/types/{fee_type_id}`

#### Success Response (200 OK)

```json
{
  "message": "Fee type deleted successfully"
}
```

---

# 4. Fee Class Mappings API

## Overview

Fee Class Mappings link classes to specific fee types with amounts. This defines how much each class pays for each fee type.

## Base URL

```
/fee/class-mappings
```

## Data Model

### Fee Class Mapping Entity

| Field            | Type    | Description                    | Required       | Constraints                        |
| ---------------- | ------- | ------------------------------ | -------------- | ---------------------------------- |
| id               | UUID    | Unique identifier              | Auto-generated | Primary key                        |
| class_id         | Integer | Foreign key to classes         | Yes            | Must exist in classes table        |
| fee_type_id      | UUID    | Foreign key to fee_types       | Yes            | Must exist in fee_types table      |
| total_fee        | Decimal | Fee amount for the class       | Yes            | Must be non-negative (≥ 0)         |
| academic_year_id | Integer | Foreign key to academic_years  | Yes            | Must exist in academic_years table |
| all_by_default   | Boolean | Apply to all students in class | No             | Default: false                     |

### Unique Constraints

- Combination of `class_id`, `fee_type_id`, and `academic_year_id` must be unique

## API Endpoints

### 4.1 Create Fee Class Mapping

**POST** `/fee/class-mappings/`

#### Request Body

```json
{
  "class_id": 1,
  "fee_type_id": "123e4567-e89b-12d3-a456-426614174004",
  "total_fee": "5000.00",
  "academic_year_id": 1,
  "all_by_default": true
}
```

#### Success Response (201 Created)

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174005",
  "class_id": 1,
  "fee_type_id": "123e4567-e89b-12d3-a456-426614174004",
  "total_fee": "5000.00",
  "academic_year_id": 1,
  "all_by_default": true,
  "class_name": "Grade 1",
  "fee_type_name": "Tuition Fee",
  "academic_year_name": "2024-2025"
}
```

### 4.2 Get All Fee Class Mappings

**GET** `/fee/class-mappings/`

#### Query Parameters

| Parameter      | Type          | Required | Description                   |
| -------------- | ------------- | -------- | ----------------------------- |
| class_id       | integer       | No       | Filter by class ID            |
| fee_type_id    | string (UUID) | No       | Filter by fee type ID         |
| all_by_default | boolean       | No       | Filter by all_by_default flag |

### 4.3 Get Fee Class Mapping by ID

**GET** `/fee/class-mappings/{mapping_id}`

### 4.4 Update Fee Class Mapping

**PUT** `/fee/class-mappings/{mapping_id}`

### 4.5 Delete Fee Class Mapping

**DELETE** `/fee/class-mappings/{mapping_id}`

---

# Common Error Handling

## HTTP Status Codes

| Status Code | Description                                                   |
| ----------- | ------------------------------------------------------------- |
| 200         | OK - Request successful                                       |
| 201         | Created - Resource created successfully                       |
| 400         | Bad Request - Invalid request data or business rule violation |
| 404         | Not Found - Resource not found                                |
| 422         | Unprocessable Entity - Validation error                       |
| 500         | Internal Server Error - Unexpected server error               |

## Common Error Response Formats

### Validation Error (422)

```json
{
  "detail": [
    {
      "loc": ["body", "fee_status"],
      "msg": "fee_status must be either 'active' or 'inactive'",
      "type": "value_error"
    }
  ]
}
```

### Business Rule Violation (400)

```json
{
  "detail": "Fee type name 'Tuition Fee' already exists for this fee category"
}
```

### Resource Not Found (404)

```json
{
  "detail": "Fee category with id 123e4567-e89b-12d3-a456-426614174001 not found"
}
```

### Invalid ID Format (400)

```json
{
  "detail": "Invalid fee category ID format"
}
```

---

# Data Flow and Relationships

## Hierarchical Structure

```
Academic Year
└── Fee Category (e.g., "Academic Fee")
    └── Fee Type (e.g., "Tuition Fee")
        └── Fee Class Mapping (e.g., "Grade 1 → $5000")

Academic Year
└── Fee Term (e.g., "Quarterly")
    └── Fee Term Dates (e.g., [June 1, Sept 1, Dec 1, March 1])
```

## Relationships

1. **Academic Year** → Multiple Categories, Terms, Types, Mappings
2. **Fee Category** → Multiple Fee Types
3. **Fee Term** → Multiple Fee Term Dates, Multiple Fee Types
4. **Fee Type** → Multiple Fee Class Mappings
5. **Class** → Multiple Fee Class Mappings

## Typical Workflow

1. Create **Academic Year**
2. Create **Fee Categories** for the academic year
3. Create **Fee Terms** with their payment dates
4. Create **Fee Types** linking categories and terms
5. Create **Fee Class Mappings** to assign fee amounts to classes

---

# Integration Examples

## Setting up a Complete Fee Structure

### Step 1: Create Fee Category

```bash
POST /fee/categories/
{
  "category_name": "Academic Fee",
  "academic_year_id": 1
}
```

### Step 2: Create Fee Term with Dates

```bash
POST /fee/terms/
{
  "term_name": "Quarterly",
  "number_of_terms": 4,
  "academic_year_id": 1,
  "fee_term_dates": [
    {"fee_term_date": "2024-06-01"},
    {"fee_term_date": "2024-09-01"},
    {"fee_term_date": "2024-12-01"},
    {"fee_term_date": "2025-03-01"}
  ]
}
```

### Step 3: Create Fee Type

```bash
POST /fee/types/
{
  "type_name": "Tuition Fee",
  "fee_category_id": "{category_id}",
  "fee_term_id": "{term_id}",
  "academic_year_id": 1
}
```

### Step 4: Create Class Mapping

```bash
POST /fee/class-mappings/
{
  "class_id": 1,
  "fee_type_id": "{fee_type_id}",
  "total_fee": "5000.00",
  "academic_year_id": 1,
  "all_by_default": true
}
```

## Getting Dropdown Data for UI

### Get Categories for Dropdown

```bash
GET /fee/categories/dropdown?academic_year_id=1
```

### Get Fee Types for a Specific Category

```bash
GET /fee/types/dropdown?fee_category_id={category_id}
```

---

# Business Rules Summary

## Fee Categories

- Category names must be unique within an academic year
- Cannot be deleted if referenced by fee types

## Fee Terms

- Number of term dates must match `number_of_terms`
- No duplicate dates within the same term
- Deleting a term cascades to all associated dates

## Fee Types

- Type names must be unique within a fee category
- Must reference valid category, term, and academic year
- Status values: "active" or "inactive"

## Fee Class Mappings

- Each class can have only one mapping per fee type per academic year
- Total fee must be non-negative
- Hard delete - only removes the mapping record

## Database Schema Relationships

```sql
-- Core relationships
academic_years (1) ← (many) fee_categories
academic_years (1) ← (many) fee_terms
fee_terms (1) ← (many) fee_term_dates
fee_categories (1) ← (many) fee_types
fee_terms (1) ← (many) fee_types
classes (1) ← (many) fee_class_mappings
fee_types (1) ← (many) fee_class_mappings
```

This comprehensive API documentation provides all the information needed for UI developers to integrate with the complete fee management system.

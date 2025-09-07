# Flow:

## Feature: Fee Class Mapping – Term Amounts
Similar to FEE_TERM and TERM_DATES, FEE_CLASS_MAPPING is also CRUD operations where the user can add FEE_CLASS_MAPPING and FEE_CLASS_MAPPING_TERM_AMOUNTs together. 

While adding fee class mapping, the user will have a dropdown of fee types and fee overall classes.
Once the face is mapped to a specific class. 
## User Story:

As a user, I want to enter or distribute the fee amount across multiple terms so that the total fee is correctly allocated according to the fee terms.

## Acceptance Criteria:

- Selecting the menu option displays the fee table with all fields.
- Each row includes Delete and Update actions.
- A column Fee Class Mapping Term Amounts is available with a button to enter term amounts.
- Clicking the button displays rows to enter amounts. The number of rows matches the number of terms defined in the fee terms.
  Example: 4 terms → display 4 rows.
- Users can choose between two options for allocation:
  Split equally: System automatically divides the total fee equally across all terms.
  Split unequally: Users manually enter amounts for each term.
- The sum of term amounts must equal the total fee amount.

---

# Fee Class Mapping API Documentation

## Overview

The Fee Class Mapping API allows you to create, read, update, and delete mappings between classes and fee types. This API manages the relationship between classes and their associated fees within specific academic years.

## Base URL

```
/fee/class-mappings
```

## Authentication

_Note: Authentication module is not implemented yet_

## Data Models

### Fee Class Mapping Entity

| Field            | Type      | Description                                  | Required       | Constraints                        |
| ---------------- | --------- | -------------------------------------------- | -------------- | ---------------------------------- |
| id               | UUID      | Unique identifier                            | Auto-generated | Primary key                        |
| class_id         | Integer   | Foreign key to classes table                 | Yes            | Must exist in classes table        |
| fee_type_id      | UUID      | Foreign key to fee_types table               | Yes            | Must exist in fee_types table      |
| total_fee        | Decimal   | Fee amount allocated to class                | Yes            | Must be non-negative (≥ 0)         |
| academic_year_id | Integer   | Foreign key to academic_years table          | Yes            | Must exist in academic_years table |
| all_by_default   | Boolean   | Whether fee applies to all students in class | No             | Default: false                     |
| created_at       | Timestamp | Record creation time                         | Auto-generated | Server default                     |
| updated_at       | Timestamp | Record last update time                      | Auto-generated | Server default, auto-update        |

### Unique Constraints

- Combination of `class_id`, `fee_type_id`, and `academic_year_id` must be unique

## API Endpoints

### 1. Create Fee Class Mapping

**POST** `/fee/class-mappings/`

Creates a new fee class mapping.

#### Request Body

```json
{
  "class_id": 1,
  "fee_type_id": "123e4567-e89b-12d3-a456-426614174001",
  "total_fee": "5000.00",
  "academic_year_id": 1,
  "all_by_default": true
}
```

#### Request Schema

| Field            | Type             | Required | Description                                     |
| ---------------- | ---------------- | -------- | ----------------------------------------------- |
| class_id         | integer          | Yes      | ID of the class                                 |
| fee_type_id      | string (UUID)    | Yes      | ID of the fee type                              |
| total_fee        | string (decimal) | Yes      | Fee amount (must be non-negative)               |
| academic_year_id | integer          | Yes      | ID of the academic year                         |
| all_by_default   | boolean          | No       | Apply to all students in class (default: false) |

#### Success Response

**Status Code:** `201 Created`

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "class_id": 1,
  "fee_type_id": "123e4567-e89b-12d3-a456-426614174001",
  "total_fee": "5000.00",
  "academic_year_id": 1,
  "all_by_default": true,
  "class_name": "Grade 1",
  "fee_type_name": "Tuition Fee",
  "academic_year_name": "2024-2025"
}
```

#### Error Responses

**Status Code:** `400 Bad Request`

```json
{
  "detail": "Fee class mapping already exists for this combination of class, fee type, and academic year"
}
```

**Status Code:** `404 Not Found`

```json
{
  "detail": "Class with id 1 not found"
}
```

**Status Code:** `422 Unprocessable Entity`

```json
{
  "detail": [
    {
      "loc": ["body", "total_fee"],
      "msg": "total_fee must be non-negative",
      "type": "value_error"
    }
  ]
}
```

---

### 2. Get All Fee Class Mappings

**GET** `/fee/class-mappings/`

Retrieves all fee class mappings with optional filtering.

#### Query Parameters

| Parameter      | Type          | Required | Description                   |
| -------------- | ------------- | -------- | ----------------------------- |
| class_id       | integer       | No       | Filter by class ID            |
| fee_type_id    | string (UUID) | No       | Filter by fee type ID         |
| all_by_default | boolean       | No       | Filter by all_by_default flag |

#### Request Examples

```
GET /fee/class-mappings/
GET /fee/class-mappings/?class_id=1
GET /fee/class-mappings/?fee_type_id=123e4567-e89b-12d3-a456-426614174001
GET /fee/class-mappings/?all_by_default=true
GET /fee/class-mappings/?class_id=1&all_by_default=false
```

#### Success Response

**Status Code:** `200 OK`

```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "class_id": 1,
    "class_name": "Grade 1",
    "fee_type_id": "123e4567-e89b-12d3-a456-426614174001",
    "fee_type_name": "Tuition Fee",
    "total_fee": "5000.00",
    "academic_year_id": 1,
    "academic_year_name": "2024-2025",
    "all_by_default": true
  },
  {
    "id": "123e4567-e89b-12d3-a456-426614174002",
    "class_id": 2,
    "class_name": "Grade 2",
    "fee_type_id": "123e4567-e89b-12d3-a456-426614174003",
    "fee_type_name": "Library Fee",
    "total_fee": "1500.00",
    "academic_year_id": 1,
    "academic_year_name": "2024-2025",
    "all_by_default": false
  }
]
```

#### Error Responses

**Status Code:** `400 Bad Request`

```json
{
  "detail": "Invalid fee type ID format"
}
```

---

### 3. Get Fee Class Mapping by ID

**GET** `/fee/class-mappings/{mapping_id}`

Retrieves a specific fee class mapping by its ID.

#### Path Parameters

| Parameter  | Type          | Required | Description                 |
| ---------- | ------------- | -------- | --------------------------- |
| mapping_id | string (UUID) | Yes      | ID of the fee class mapping |

#### Request Example

```
GET /fee/class-mappings/123e4567-e89b-12d3-a456-426614174000
```

#### Success Response

**Status Code:** `200 OK`

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "class_id": 1,
  "fee_type_id": "123e4567-e89b-12d3-a456-426614174001",
  "total_fee": "5000.00",
  "academic_year_id": 1,
  "all_by_default": true,
  "class_name": "Grade 1",
  "fee_type_name": "Tuition Fee",
  "academic_year_name": "2024-2025"
}
```

#### Error Responses

**Status Code:** `404 Not Found`

```json
{
  "detail": "Fee class mapping with id 123e4567-e89b-12d3-a456-426614174000 not found"
}
```

**Status Code:** `400 Bad Request`

```json
{
  "detail": "Invalid fee class mapping ID format"
}
```

---

### 4. Update Fee Class Mapping

**PUT** `/fee/class-mappings/{mapping_id}`

Updates an existing fee class mapping.

#### Path Parameters

| Parameter  | Type          | Required | Description                           |
| ---------- | ------------- | -------- | ------------------------------------- |
| mapping_id | string (UUID) | Yes      | ID of the fee class mapping to update |

#### Request Body

All fields are optional for updates:

```json
{
  "class_id": 2,
  "fee_type_id": "123e4567-e89b-12d3-a456-426614174002",
  "total_fee": "6000.00",
  "academic_year_id": 2,
  "all_by_default": false
}
```

#### Request Schema

| Field            | Type             | Required | Description                           |
| ---------------- | ---------------- | -------- | ------------------------------------- |
| class_id         | integer          | No       | New class ID                          |
| fee_type_id      | string (UUID)    | No       | New fee type ID                       |
| total_fee        | string (decimal) | No       | New fee amount (must be non-negative) |
| academic_year_id | integer          | No       | New academic year ID                  |
| all_by_default   | boolean          | No       | New all_by_default setting            |

#### Success Response

**Status Code:** `200 OK`

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "class_id": 2,
  "fee_type_id": "123e4567-e89b-12d3-a456-426614174002",
  "total_fee": "6000.00",
  "academic_year_id": 2,
  "all_by_default": false,
  "class_name": "Grade 2",
  "fee_type_name": "Library Fee",
  "academic_year_name": "2025-2026"
}
```

#### Error Responses

**Status Code:** `404 Not Found`

```json
{
  "detail": "Fee class mapping with id 123e4567-e89b-12d3-a456-426614174000 not found"
}
```

**Status Code:** `400 Bad Request`

```json
{
  "detail": "Fee class mapping already exists for this combination of class, fee type, and academic year"
}
```

---

### 5. Delete Fee Class Mapping

**DELETE** `/fee/class-mappings/{mapping_id}`

Deletes a fee class mapping. This is a hard delete operation.

#### Path Parameters

| Parameter  | Type          | Required | Description                           |
| ---------- | ------------- | -------- | ------------------------------------- |
| mapping_id | string (UUID) | Yes      | ID of the fee class mapping to delete |

#### Request Example

```
DELETE /fee/class-mappings/123e4567-e89b-12d3-a456-426614174000
```

#### Success Response

**Status Code:** `200 OK`

```json
{
  "message": "Fee class mapping deleted successfully"
}
```

#### Error Responses

**Status Code:** `404 Not Found`

```json
{
  "detail": "Fee class mapping with id 123e4567-e89b-12d3-a456-426614174000 not found"
}
```

**Status Code:** `400 Bad Request`

```json
{
  "detail": "Invalid fee class mapping ID format"
}
```

## Error Handling

### HTTP Status Codes

| Status Code | Description                                                   |
| ----------- | ------------------------------------------------------------- |
| 200         | OK - Request successful                                       |
| 201         | Created - Resource created successfully                       |
| 400         | Bad Request - Invalid request data or business rule violation |
| 404         | Not Found - Resource not found                                |
| 422         | Unprocessable Entity - Validation error                       |
| 500         | Internal Server Error - Unexpected server error               |

### Common Error Responses

#### Validation Errors (422)

```json
{
  "detail": [
    {
      "loc": ["body", "total_fee"],
      "msg": "total_fee must be non-negative",
      "type": "value_error"
    }
  ]
}
```

#### Business Rule Violations (400)

```json
{
  "detail": "Fee class mapping already exists for this combination of class, fee type, and academic year"
}
```

#### Resource Not Found (404)

```json
{
  "detail": "Class with id 1 not found"
}
```

## Business Rules

1. **Unique Mapping**: Each combination of class, fee type, and academic year can only have one mapping.

2. **Non-negative Fees**: Total fee amount must be zero or positive.

3. **Valid References**: All foreign key references (class_id, fee_type_id, academic_year_id) must exist in their respective tables.

4. **Hard Delete**: When a mapping is deleted, only the mapping record is removed. No dependent records are affected.

5. **All By Default**: When set to `true`, indicates that the fee should apply to all students in the class by default.

## Usage Examples

### Creating a Standard Tuition Fee Mapping

```bash
curl -X POST "/fee/class-mappings/" \
  -H "Content-Type: application/json" \
  -d '{
    "class_id": 1,
    "fee_type_id": "123e4567-e89b-12d3-a456-426614174001",
    "total_fee": "5000.00",
    "academic_year_id": 1,
    "all_by_default": true
  }'
```

### Filtering Mappings by Class

```bash
curl -X GET "/fee/class-mappings/?class_id=1"
```

### Updating Fee Amount

```bash
curl -X PUT "/fee/class-mappings/123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json" \
  -d '{
    "total_fee": "5500.00"
  }'
```

### Getting Mappings with Default Fee Assignment

```bash
curl -X GET "/fee/class-mappings/?all_by_default=true"
```

## Integration Notes for UI Developers

1. **Decimal Handling**: Total fee amounts are returned as strings to preserve decimal precision. Convert to appropriate numeric types in your frontend.

2. **UUID Format**: All UUIDs are returned as strings. Ensure your frontend can handle UUID string format.

3. **Optional Fields**: When creating mappings, `all_by_default` is optional and defaults to `false`.

4. **Filtering**: Multiple filters can be combined using query parameters with `&`.

5. **Related Data**: Response objects include related entity names (class_name, fee_type_name, academic_year_name) for display purposes.

6. **Error Handling**: Always check response status codes and handle error cases appropriately in your UI.

## Database Schema

```sql
CREATE TABLE fee_class_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id INTEGER NOT NULL REFERENCES classes(id),
    fee_type_id UUID NOT NULL REFERENCES fee_types(id),
    total_fee NUMERIC(10,2) NOT NULL CHECK (total_fee >= 0),
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id),
    all_by_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    org_id INTEGER,
    user_id INTEGER,

    CONSTRAINT uq_class_fee_type_academic_year
        UNIQUE (class_id, fee_type_id, academic_year_id)
);

CREATE INDEX ix_fee_class_mappings_id ON fee_class_mappings(id);
```

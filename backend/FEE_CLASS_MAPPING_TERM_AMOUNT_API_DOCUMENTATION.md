# Fee Class Mapping Term Amount API Documentation

## Overview
The Fee Class Mapping Term Amount API allows you to manage the distribution of fee class mapping amounts across different payment terms. This feature breaks down the total fee amount from fee class mappings into specific amounts for each payment term defined in the fee term structure.

## Base URL
```
/fee/class-mapping-term-amounts
```

## Authentication
*Note: Authentication module is not implemented yet*

## Data Models

### Fee Class Mapping Term Amount Entity
| Field | Type | Description | Required | Constraints |
|-------|------|-------------|----------|-------------|
| id | UUID | Unique identifier | Auto-generated | Primary key |
| fee_class_mapping_id | UUID | Foreign key to fee_class_mappings | Yes | Must exist in fee_class_mappings table |
| term_id | UUID | Foreign key to fee_terms | Yes | Must exist in fee_terms table |
| term_amount | Decimal | Fee amount for this specific term | Yes | Must be positive (> 0) |
| created_at | Timestamp | Record creation time | Auto-generated | Server default |
| updated_at | Timestamp | Record last update time | Auto-generated | Server default, auto-update |

### Unique Constraints
- Combination of `fee_class_mapping_id` and `term_id` must be unique

### Business Rules
1. **Term Count Validation**: The number of term amounts must match the `number_of_terms` in the associated fee term
2. **Total Amount Validation**: The sum of all term amounts must equal the `total_fee` in the fee class mapping
3. **Positive Amounts**: All term amounts must be positive values
4. **Cascade Delete**: When a fee class mapping is deleted, all its term amounts are automatically deleted

## API Endpoints

### 1. Create Fee Class Mapping Term Amounts (Bulk)

**POST** `/fee/class-mapping-term-amounts/`

Creates multiple fee class mapping term amounts for a specific fee class mapping.

#### Request Body
```json
{
  "fee_class_mapping_id": "123e4567-e89b-12d3-a456-426614174000",
  "term_amounts": [
    {
      "term_id": "123e4567-e89b-12d3-a456-426614174001",
      "term_amount": "1250.00"
    },
    {
      "term_id": "123e4567-e89b-12d3-a456-426614174002",
      "term_amount": "1250.00"
    },
    {
      "term_id": "123e4567-e89b-12d3-a456-426614174003",
      "term_amount": "1250.00"
    },
    {
      "term_id": "123e4567-e89b-12d3-a456-426614174004",
      "term_amount": "1250.00"
    }
  ]
}
```

#### Request Schema
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| fee_class_mapping_id | string (UUID) | Yes | ID of the fee class mapping |
| term_amounts | array | Yes | Array of term amount objects (cannot be empty) |
| term_amounts[].term_id | string (UUID) | Yes | ID of the fee term |
| term_amounts[].term_amount | string (decimal) | Yes | Amount for this term (must be positive) |

#### Success Response
**Status Code:** `201 Created`

```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174005",
    "fee_class_mapping_id": "123e4567-e89b-12d3-a456-426614174000",
    "term_id": "123e4567-e89b-12d3-a456-426614174001",
    "term_amount": "1250.00",
    "term_name": "First Term"
  },
  {
    "id": "123e4567-e89b-12d3-a456-426614174006",
    "fee_class_mapping_id": "123e4567-e89b-12d3-a456-426614174000",
    "term_id": "123e4567-e89b-12d3-a456-426614174002",
    "term_amount": "1250.00",
    "term_name": "Second Term"
  },
  {
    "id": "123e4567-e89b-12d3-a456-426614174007",
    "fee_class_mapping_id": "123e4567-e89b-12d3-a456-426614174000",
    "term_id": "123e4567-e89b-12d3-a456-426614174003",
    "term_amount": "1250.00",
    "term_name": "Third Term"
  },
  {
    "id": "123e4567-e89b-12d3-a456-426614174008",
    "fee_class_mapping_id": "123e4567-e89b-12d3-a456-426614174000",
    "term_id": "123e4567-e89b-12d3-a456-426614174004",
    "term_amount": "1250.00",
    "term_name": "Fourth Term"
  }
]
```

#### Error Responses

**Status Code:** `400 Bad Request`
```json
{
  "detail": "Number of term amounts (2) must match number_of_terms (4) in the associated fee term"
}
```

```json
{
  "detail": "Sum of term amounts (4000.00) must equal total fee (5000.00) in the fee class mapping"
}
```

```json
{
  "detail": "Duplicate term_id 123e4567-e89b-12d3-a456-426614174001 in request"
}
```

**Status Code:** `404 Not Found**
```json
{
  "detail": "Fee class mapping with id 123e4567-e89b-12d3-a456-426614174000 not found"
}
```

**Status Code:** `422 Unprocessable Entity`
```json
{
  "detail": [
    {
      "loc": ["body", "term_amounts", 0, "term_amount"],
      "msg": "term_amount must be positive",
      "type": "value_error"
    }
  ]
}
```

---

### 2. Update Fee Class Mapping Term Amounts (Bulk)

**PUT** `/fee/class-mapping-term-amounts/`

Updates existing fee class mapping term amounts or creates new ones. Supports partial updates.

#### Request Body
```json
{
  "fee_class_mapping_id": "123e4567-e89b-12d3-a456-426614174000",
  "term_amounts": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174005",
      "term_id": "123e4567-e89b-12d3-a456-426614174001",
      "term_amount": "1500.00"
    },
    {
      "id": "123e4567-e89b-12d3-a456-426614174006",
      "term_id": "123e4567-e89b-12d3-a456-426614174002",
      "term_amount": "1500.00"
    },
    {
      "term_id": "123e4567-e89b-12d3-a456-426614174003",
      "term_amount": "1000.00"
    },
    {
      "term_id": "123e4567-e89b-12d3-a456-426614174004",
      "term_amount": "1000.00"
    }
  ]
}
```

#### Request Schema
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| fee_class_mapping_id | string (UUID) | Yes | ID of the fee class mapping |
| term_amounts | array | Yes | Array of term amount objects (cannot be empty) |
| term_amounts[].id | string (UUID) | No | ID for updating existing record (omit for new records) |
| term_amounts[].term_id | string (UUID) | Yes | ID of the fee term |
| term_amounts[].term_amount | string (decimal) | Yes | Amount for this term (must be positive) |

#### Success Response
**Status Code:** `200 OK`

```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174005",
    "fee_class_mapping_id": "123e4567-e89b-12d3-a456-426614174000",
    "term_id": "123e4567-e89b-12d3-a456-426614174001",
    "term_amount": "1500.00",
    "term_name": "First Term"
  },
  {
    "id": "123e4567-e89b-12d3-a456-426614174006",
    "fee_class_mapping_id": "123e4567-e89b-12d3-a456-426614174000",
    "term_id": "123e4567-e89b-12d3-a456-426614174002",
    "term_amount": "1500.00",
    "term_name": "Second Term"
  },
  {
    "id": "123e4567-e89b-12d3-a456-426614174009",
    "fee_class_mapping_id": "123e4567-e89b-12d3-a456-426614174000",
    "term_id": "123e4567-e89b-12d3-a456-426614174003",
    "term_amount": "1000.00",
    "term_name": "Third Term"
  },
  {
    "id": "123e4567-e89b-12d3-a456-426614174010",
    "fee_class_mapping_id": "123e4567-e89b-12d3-a456-426614174000",
    "term_id": "123e4567-e89b-12d3-a456-426614174004",
    "term_amount": "1000.00",
    "term_name": "Fourth Term"
  }
]
```

#### Error Responses
Similar to Create endpoint, with additional:

**Status Code:** `404 Not Found`
```json
{
  "detail": "Term amount with id 123e4567-e89b-12d3-a456-426614174005 not found"
}
```

---

### 3. Delete Fee Class Mapping Term Amounts (Bulk)

**DELETE** `/fee/class-mapping-term-amounts/`

Deletes multiple fee class mapping term amounts by their IDs.

#### Request Body
```json
{
  "term_amount_ids": [
    "123e4567-e89b-12d3-a456-426614174005",
    "123e4567-e89b-12d3-a456-426614174006"
  ]
}
```

#### Request Schema
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| term_amount_ids | array of strings (UUID) | Yes | Array of term amount IDs to delete (cannot be empty) |

#### Success Response
**Status Code:** `200 OK`

```json
{
  "message": "Successfully deleted 2 term amount(s)"
}
```

#### Error Responses

**Status Code:** `400 Bad Request`
```json
{
  "detail": "Invalid term amount ID format: invalid-id"
}
```

**Note**: Non-existent IDs are silently ignored. The response message indicates how many records were actually deleted.

---

## Integration with Fee Class Mappings

The term amounts are automatically included when fetching fee class mappings:

### Enhanced Fee Class Mapping Response

**GET** `/fee/class-mappings/{mapping_id}`

**Response:**
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
  "academic_year_name": "2024-2025",
  "class_fee_mapping_terms": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174005",
      "term_id": "123e4567-e89b-12d3-a456-426614174001",
      "term_amount": "1250.00",
      "term_name": "First Term"
    },
    {
      "id": "123e4567-e89b-12d3-a456-426614174006",
      "term_id": "123e4567-e89b-12d3-a456-426614174002",
      "term_amount": "1250.00",
      "term_name": "Second Term"
    },
    {
      "id": "123e4567-e89b-12d3-a456-426614174007",
      "term_id": "123e4567-e89b-12d3-a456-426614174003",
      "term_amount": "1250.00",
      "term_name": "Third Term"
    },
    {
      "id": "123e4567-e89b-12d3-a456-426614174008",
      "term_id": "123e4567-e89b-12d3-a456-426614174004",
      "term_amount": "1250.00",
      "term_name": "Fourth Term"
    }
  ]
}
```

The `class_fee_mapping_terms` array is automatically included in:
- `GET /fee/class-mappings/{mapping_id}`
- `GET /fee/class-mappings/` (all mappings)

---

## Error Handling

### HTTP Status Codes
| Status Code | Description |
|-------------|-------------|
| 200 | OK - Request successful |
| 201 | Created - Term amounts created successfully |
| 400 | Bad Request - Business rule violation or invalid data |
| 404 | Not Found - Resource not found |
| 422 | Unprocessable Entity - Validation error |
| 500 | Internal Server Error - Unexpected server error |

### Common Error Scenarios

#### Business Rule Violations
```json
{
  "detail": "Number of term amounts (3) must match number_of_terms (4) in the associated fee term"
}
```

```json
{
  "detail": "Sum of term amounts (4500.00) must equal total fee (5000.00) in the fee class mapping"
}
```

#### Validation Errors
```json
{
  "detail": [
    {
      "loc": ["body", "term_amounts", 0, "term_amount"],
      "msg": "term_amount must be positive",
      "type": "value_error"
    }
  ]
}
```

#### Duplicate Data
```json
{
  "detail": "Term amount already exists for this fee class mapping and term combination"
}
```

---

## Usage Examples

### Complete Workflow Example

#### Step 1: Get Fee Term Information
```bash
GET /fee/terms/{fee_term_id}
```

This returns the term structure with dates to understand how many terms are required.

#### Step 2: Create Term Amounts
```bash
POST /fee/class-mapping-term-amounts/
Content-Type: application/json

{
  "fee_class_mapping_id": "123e4567-e89b-12d3-a456-426614174000",
  "term_amounts": [
    {
      "term_id": "term-1-id",
      "term_amount": "1250.00"
    },
    {
      "term_id": "term-2-id", 
      "term_amount": "1250.00"
    },
    {
      "term_id": "term-3-id",
      "term_amount": "1250.00"
    },
    {
      "term_id": "term-4-id",
      "term_amount": "1250.00"
    }
  ]
}
```

#### Step 3: Update Specific Term Amounts
```bash
PUT /fee/class-mapping-term-amounts/
Content-Type: application/json

{
  "fee_class_mapping_id": "123e4567-e89b-12d3-a456-426614174000",
  "term_amounts": [
    {
      "id": "existing-term-amount-id",
      "term_id": "term-1-id",
      "term_amount": "1500.00"
    },
    {
      "id": "existing-term-amount-id-2",
      "term_id": "term-2-id",
      "term_amount": "1500.00"
    },
    {
      "term_id": "term-3-id",
      "term_amount": "1000.00"
    },
    {
      "term_id": "term-4-id",
      "term_amount": "1000.00"
    }
  ]
}
```

#### Step 4: Delete Term Amounts
```bash
DELETE /fee/class-mapping-term-amounts/
Content-Type: application/json

{
  "term_amount_ids": [
    "term-amount-id-1",
    "term-amount-id-2"
  ]
}
```

### Practical Examples

#### Equal Distribution
For a $5000 total fee across 4 quarterly terms:
```json
{
  "fee_class_mapping_id": "mapping-id",
  "term_amounts": [
    {"term_id": "q1-id", "term_amount": "1250.00"},
    {"term_id": "q2-id", "term_amount": "1250.00"},
    {"term_id": "q3-id", "term_amount": "1250.00"},
    {"term_id": "q4-id", "term_amount": "1250.00"}
  ]
}
```

#### Unequal Distribution
For a $6000 total fee with higher amounts in first two terms:
```json
{
  "fee_class_mapping_id": "mapping-id",
  "term_amounts": [
    {"term_id": "q1-id", "term_amount": "2000.00"},
    {"term_id": "q2-id", "term_amount": "2000.00"},
    {"term_id": "q3-id", "term_amount": "1000.00"},
    {"term_id": "q4-id", "term_amount": "1000.00"}
  ]
}
```

---

## Integration Notes for UI Developers

1. **Business Validation**: Always ensure the sum of term amounts equals the total fee from the fee class mapping

2. **Term Count Validation**: The number of term amounts must match the `number_of_terms` from the associated fee term

3. **Decimal Handling**: Term amounts are returned as strings to preserve precision. Convert appropriately in your frontend

4. **Bulk Operations**: All operations (create, update, delete) work with arrays to support efficient bulk processing

5. **Partial Updates**: In update operations, include `id` for existing records, omit for new records

6. **Automatic Integration**: Term amounts are automatically included in fee class mapping responses as `class_fee_mapping_terms`

7. **Error Handling**: Pay special attention to business rule validation errors (400 status codes)

8. **Cascade Behavior**: Deleting a fee class mapping automatically deletes all its term amounts

---

## Database Schema

```sql
CREATE TABLE fee_class_map_term_amounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fee_class_mapping_id UUID NOT NULL REFERENCES fee_class_mappings(id) ON DELETE CASCADE,
    term_id UUID NOT NULL REFERENCES fee_terms(id),
    term_amount NUMERIC(10,2) NOT NULL CHECK (term_amount > 0),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    org_id INTEGER,
    user_id INTEGER,
    
    CONSTRAINT uq_fee_class_mapping_term 
        UNIQUE (fee_class_mapping_id, term_id)
);

CREATE INDEX ix_fee_class_map_term_amounts_id ON fee_class_map_term_amounts(id);
```

This comprehensive API documentation provides everything needed for UI developers to integrate with the Fee Class Mapping Term Amount feature, including all business rules, validation requirements, and practical usage examples.
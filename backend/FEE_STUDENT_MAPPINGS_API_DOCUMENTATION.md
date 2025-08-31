# Fee Student Mappings API Documentation

## Overview

The Fee Student Mappings API allows you to manage fee assignments to individual students. This API provides comprehensive CRUD operations for fee student mappings and automatically handles term amount distribution based on the associated fee type's term configuration.

## Base URL

```
/fee/student-mappings
```

## Authentication

All endpoints require proper authentication. Include the authorization token in the request headers:

```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### 1. Create Fee Student Mapping

Creates a new fee student mapping with automatic term amount distribution.

**Endpoint:** `POST /fee/student-mappings/`

**Request Body:**

```json
{
  "student_id": 1,
  "student_admission_num": "ADM001",
  "class_id": 1,
  "section_id": 1,
  "fee_type_id": "123e4567-e89b-12d3-a456-426614174000",
  "total_fee": "10000.00",
  "academic_year_id": 1
}
```

**Response:** `201 Created`

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174001",
  "student_id": 1,
  "student_admission_num": "ADM001",
  "class_id": 1,
  "section_id": 1,
  "fee_type_id": "123e4567-e89b-12d3-a456-426614174000",
  "total_fee": "10000.00",
  "academic_year_id": 1,
  "fee_type_name": "Tuition Fee",
  "academic_year_name": "2023-2024",
  "student_details": {
    "student_id": 1,
    "student_name": "John Doe",
    "student_admission_number": "ADM001",
    "student_class": {
      "id": 1,
      "name": "Class 10"
    },
    "student_section": {
      "id": 1,
      "name": "Section A"
    }
  },
  "student_fee_mapping_terms": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174002",
      "term_id": "123e4567-e89b-12d3-a456-426614174003",
      "term_amount": "2500.00",
      "term_name": "Term 1"
    },
    {
      "id": "123e4567-e89b-12d3-a456-426614174004",
      "term_id": "123e4567-e89b-12d3-a456-426614174003",
      "term_amount": "2500.00",
      "term_name": "Term 2"
    },
    {
      "id": "123e4567-e89b-12d3-a456-426614174005",
      "term_id": "123e4567-e89b-12d3-a456-426614174003",
      "term_amount": "2500.00",
      "term_name": "Term 3"
    },
    {
      "id": "123e4567-e89b-12d3-a456-426614174006",
      "term_id": "123e4567-e89b-12d3-a456-426614174003",
      "term_amount": "2500.00",
      "term_name": "Term 4"
    }
  ]
}
```

### 2. Get All Fee Student Mappings

Retrieves all fee student mappings with optional filtering.

**Endpoint:** `GET /fee/student-mappings/`

**Query Parameters:**

- `student_id` (optional): Filter by student ID
- `class_id` (optional): Filter by class ID  
- `section_id` (optional): Filter by section ID
- `fee_type_id` (optional): Filter by fee type ID (UUID format)
- `academic_year_id` (optional): Filter by academic year ID

**Example Request:**

```
GET /fee/student-mappings/?student_id=1&academic_year_id=1
```

**Response:** `200 OK`

```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174001",
    "student_id": 1,
    "student_admission_num": "ADM001",
    "class_id": 1,
    "section_id": 1,
    "fee_type_id": "123e4567-e89b-12d3-a456-426614174000",
    "fee_type_name": "Tuition Fee",
    "total_fee": "10000.00",
    "academic_year_id": 1,
    "academic_year_name": "2023-2024",
    "student_details": {
      "student_id": 1,
      "student_name": "John Doe",
      "student_admission_number": "ADM001",
      "student_class": {
        "id": 1,
        "name": "Class 10"
      },
      "student_section": {
        "id": 1,
        "name": "Section A"
      }
    },
    "student_fee_mapping_terms": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174002",
        "term_id": "123e4567-e89b-12d3-a456-426614174003",
        "term_amount": "2500.00",
        "term_name": "Term 1"
      }
    ]
  }
]
```

### 3. Get Fee Student Mapping by ID

Retrieves a specific fee student mapping with full details.

**Endpoint:** `GET /fee/student-mappings/{mapping_id}`

**Path Parameters:**

- `mapping_id`: UUID of the fee student mapping

**Example Request:**

```
GET /fee/student-mappings/123e4567-e89b-12d3-a456-426614174001
```

**Response:** `200 OK`

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174001",
  "student_id": 1,
  "student_admission_num": "ADM001",
  "class_id": 1,
  "section_id": 1,
  "fee_type_id": "123e4567-e89b-12d3-a456-426614174000",
  "total_fee": "10000.00",
  "academic_year_id": 1,
  "fee_type_name": "Tuition Fee",
  "academic_year_name": "2023-2024",
  "student_details": {
    "student_id": 1,
    "student_name": "John Doe",
    "student_admission_number": "ADM001",
    "student_class": {
      "id": 1,
      "name": "Class 10"
    },
    "student_section": {
      "id": 1,
      "name": "Section A"
    }
  },
  "student_fee_mapping_terms": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174002",
      "term_id": "123e4567-e89b-12d3-a456-426614174003",
      "term_amount": "2500.00",
      "term_name": "Term 1"
    }
  ]
}
```

### 4. Update Fee Student Mapping

Updates an existing fee student mapping. When `total_fee` is updated, term amounts are automatically recalculated.

**Endpoint:** `PUT /fee/student-mappings/{mapping_id}`

**Path Parameters:**

- `mapping_id`: UUID of the fee student mapping

**Request Body (all fields optional):**

```json
{
  "student_id": 2,
  "student_admission_num": "ADM002",
  "class_id": 2,
  "section_id": 2,
  "fee_type_id": "123e4567-e89b-12d3-a456-426614174004",
  "total_fee": "15000.00",
  "academic_year_id": 2
}
```

**Response:** `200 OK`

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174001",
  "student_id": 2,
  "student_admission_num": "ADM002",
  "class_id": 2,
  "section_id": 2,
  "fee_type_id": "123e4567-e89b-12d3-a456-426614174004",
  "total_fee": "15000.00",
  "academic_year_id": 2,
  "fee_type_name": "Updated Fee Type",
  "academic_year_name": "2024-2025",
  "student_details": {
    "student_id": 2,
    "student_name": "Jane Smith",
    "student_admission_number": "ADM002",
    "student_class": {
      "id": 2,
      "name": "Class 11"
    },
    "student_section": {
      "id": 2,
      "name": "Section B"
    }
  },
  "student_fee_mapping_terms": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174007",
      "term_id": "123e4567-e89b-12d3-a456-426614174008",
      "term_amount": "3750.00",
      "term_name": "Term 1"
    }
  ]
}
```

### 5. Delete Fee Student Mapping

Deletes a fee student mapping and all associated term amounts.

**Endpoint:** `DELETE /fee/student-mappings/{mapping_id}`

**Path Parameters:**

- `mapping_id`: UUID of the fee student mapping

**Example Request:**

```
DELETE /fee/student-mappings/123e4567-e89b-12d3-a456-426614174001
```

**Response:** `200 OK`

```json
{
  "message": "Fee student mapping deleted successfully"
}
```

## Data Models

### FeeStudentMappingCreate

```json
{
  "student_id": "integer (required)",
  "student_admission_num": "string (required)",
  "class_id": "integer (required)",
  "section_id": "integer (required)",
  "fee_type_id": "string (required, UUID format)",
  "total_fee": "decimal (required, >= 0)",
  "academic_year_id": "integer (required)"
}
```

### FeeStudentMappingUpdate

```json
{
  "student_id": "integer (optional)",
  "student_admission_num": "string (optional)",
  "class_id": "integer (optional)",
  "section_id": "integer (optional)",
  "fee_type_id": "string (optional, UUID format)",
  "total_fee": "decimal (optional, >= 0)",
  "academic_year_id": "integer (optional)"
}
```

### StudentDetails

```json
{
  "student_id": "integer",
  "student_name": "string",
  "student_admission_number": "string",
  "student_class": {
    "id": "integer",
    "name": "string"
  },
  "student_section": {
    "id": "integer",
    "name": "string"
  }
}
```

### FeeStudentMapTermAmount

```json
{
  "id": "string (UUID)",
  "term_id": "string (UUID)",
  "term_amount": "decimal",
  "term_name": "string"
}
```

## Error Responses

### 400 Bad Request

```json
{
  "detail": "Fee student mapping already exists for this combination of student, fee type, and academic year"
}
```

```json
{
  "detail": "Invalid fee type ID format"
}
```

### 404 Not Found

```json
{
  "detail": "Student with id 1 not found"
}
```

```json
{
  "detail": "Fee student mapping with id 123e4567-e89b-12d3-a456-426614174001 not found"
}
```

### 422 Unprocessable Entity

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

### 500 Internal Server Error

```json
{
  "detail": "An error occurred while creating fee student mapping"
}
```

## Business Logic

### Term Amount Distribution

When a fee student mapping is created:

1. The system retrieves the fee type and its associated fee term
2. The `total_fee` is divided equally by the `number_of_terms` from the fee term
3. Individual term amounts are automatically created for each term
4. If the total fee doesn't divide evenly, rounding follows standard decimal rules

**Example:**
- Total Fee: ₹10,000
- Number of Terms: 4
- Amount per Term: ₹2,500

### Validation Rules

1. **Uniqueness**: Only one mapping per student, fee type, and academic year combination
2. **Referential Integrity**: All foreign key references must exist:
   - Student must exist
   - Admission number must exist  
   - Class must exist
   - Section must exist
   - Fee type must exist
   - Academic year must exist
3. **Business Rules**:
   - Total fee must be non-negative
   - Section must belong to the specified class
   - Student must be associated with the admission number

### Academic Year Context

- Defaults to current academic year if not specified
- Filters and operations are academic year-aware
- Historical data is preserved across academic years

## Usage Examples

### Create a Student Fee Mapping

```javascript
const response = await fetch('/fee/student-mappings/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    student_id: 1,
    student_admission_num: "ADM001",
    class_id: 1,
    section_id: 1,
    fee_type_id: "123e4567-e89b-12d3-a456-426614174000",
    total_fee: "10000.00",
    academic_year_id: 1
  })
});

const mapping = await response.json();
console.log('Created mapping:', mapping);
```

### Get Student Fee Mappings

```javascript
const response = await fetch('/fee/student-mappings/?student_id=1', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
});

const mappings = await response.json();
console.log('Student mappings:', mappings);
```

### Update Fee Amount

```javascript
const response = await fetch('/fee/student-mappings/123e4567-e89b-12d3-a456-426614174001', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    total_fee: "15000.00"
  })
});

const updatedMapping = await response.json();
console.log('Updated mapping:', updatedMapping);
```

## Integration Notes for UI Developers

### Form Validation

- Implement client-side validation for non-negative fees
- Validate UUID format for fee_type_id
- Check for required fields before submission

### Data Display

- Use the `student_details` object to show comprehensive student information
- Display term amounts in a table or list format
- Show total fee alongside individual term breakdowns

### Error Handling

- Handle validation errors by highlighting specific form fields
- Display user-friendly error messages for common scenarios
- Implement retry logic for network errors

### Performance Considerations

- Use filters when fetching large lists of mappings
- Consider pagination for large result sets
- Cache frequently accessed data like academic years and fee types

## Rate Limiting

API requests are subject to rate limiting:
- 100 requests per minute per user
- 1000 requests per hour per organization

## Support

For technical support or questions about this API, contact the development team or refer to the main API documentation.
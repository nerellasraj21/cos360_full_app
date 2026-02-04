# Student Admission Form - API Payload Structure

**For**: Frontend Developers
**Date**: 2026-02-04
**API Endpoint**: `POST /api/v1/students/admission/`
**Status**: ⚠️ Updated with Service Layer Validation Rules

---

## 🚨 Critical Findings - READ FIRST

### Schema vs Reality Discrepancy

The backend has **TWO validation layers**:
1. **Pydantic Schema** (what Swagger docs show)
2. **Service Layer Business Logic** (additional hidden rules)

### ⚠️ Most Important Discrepancies

| Field | Swagger/Schema Says | Backend Actually Requires |
|-------|---------------------|---------------------------|
| `father.email` | Optional | **REQUIRED** |
| `mother.email` | Optional | **REQUIRED** |
| Parent emails | (no validation) | Must be different from each other |
| `admission_date` | date | Cannot be in future |

**Bottom Line**: Always include father and mother emails in your form, and validate they are different.

---

## Complete Expected Payload Structure

```json
{
  "admission_date": "2024-01-15",
  "admission_type": "primary",
  "academic_year_id": "uuid-string",
  "admitted_academic_year_id": "uuid-string",
  "admitted_class_id": "uuid-string",
  "admitted_section_id": "uuid-string",
  "current_class_id": "uuid-string",
  "current_section_id": "uuid-string",
  "address_line1": "123 Main Street",
  "address_line2": "Apartment 4B",
  "city": "Hyderabad",
  "state": "Telangana",
  "is_previous_school": false,
  "previous_school_name": null,
  "previous_class": null,
  "previous_school_remark": null,
  "student": {
    "first_name": "John",
    "last_name": "Doe",
    "date_of_birth": "2010-05-15",
    "gender": "Male",
    "is_primary": "not_primary",
    "aadhar_number": "123456789012",
    "apaar_number": "123456789012",
    "caste": "General",
    "sub_caste": "General",
    "community": "Hindu",
    "nationality": "Indian",
    "mother_tongue": "Telugu",
    "identification_marks": "Mole on left cheek",
    "father": {
      "name": "John Doe Sr.",
      "email": "father@example.com",
      "phone": "9876543210",
      "occupation": "Engineer",
      "aadhar_number": "987654321098",
      "gender": "Male",
      "relation_to_student": "Father",
      "salary_range": "5l_10l"
    },
    "mother": {
      "name": "Jane Doe",
      "email": "mother@example.com",
      "phone": "9876543211",
      "occupation": "Teacher",
      "aadhar_number": "987654321099",
      "gender": "Female",
      "relation_to_student": "Mother",
      "salary_range": "3l_5l"
    }
  }
}
```

---

## Field Requirements

### Admission Level (Root Object)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `admission_date` | date (YYYY-MM-DD) | **Yes** | Date of admission |
| `admission_type` | "primary" \| "non_primary" | No | Type of admission |
| `academic_year_id` | UUID | **Yes** | Academic year ID (REQUIRED) |
| `admitted_academic_year_id` | UUID | No | Year admitted |
| `admitted_class_id` | UUID | **Yes** | Class admitted to (REQUIRED) |
| `admitted_section_id` | UUID | **Yes** | Section admitted to (REQUIRED) |
| `current_class_id` | UUID | No | Current class |
| `current_section_id` | UUID | No | Current section |
| `address_line1` | string | **Yes** | Primary address |
| `address_line2` | string | No | Secondary address |
| `city` | string | **Yes** | City name |
| `state` | string | **Yes** | State name |
| `is_previous_school` | boolean | No | Had previous school? |
| `previous_school_name` | string | No | Previous school name |
| `previous_class` | string | No | Previous class |
| `previous_school_remark` | string | No | Additional remarks |

### Student Object (Nested)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `first_name` | string | **Yes** | Student first name |
| `last_name` | string | **Yes** | Student last name |
| `date_of_birth` | date (YYYY-MM-DD) | **Yes** | Student DOB |
| `gender` | string | **Yes** | Student gender |
| `is_primary` | string | No | Primary admission flag |
| `aadhar_number` | string (12 digits) | No | Aadhar number |
| `apaar_number` | string (12 digits) | No | APAAR number |
| `caste` | string | No | Caste |
| `sub_caste` | string | No | Sub-caste |
| `community` | string | No | Community |
| `nationality` | string | No | Nationality (default: "Indian") |
| `mother_tongue` | string | No | Mother tongue (default: "Telugu") |
| `identification_marks` | string | No | Identification marks |
| `father` | ParentCreate | **Yes** | Father details |
| `mother` | ParentCreate | **Yes** | Mother details |

### Parent Object (Father & Mother)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **Yes** | Parent name |
| `email` | email | **Yes** | Parent email (enforced by service layer) |
| `phone` | string | No | Parent phone |
| `occupation` | string | No | Parent occupation |
| `aadhar_number` | string | No | Parent Aadhar |
| `gender` | string | No | Parent gender |
| `relation_to_student` | "Father" \| "Mother" \| "Guardian" | **Yes** | Relation |
| `salary_range` | "below_1l" \| "1l_3l" \| "3l_5l" \| "5l_10l" \| "above_10l" | No | Salary range |

**⚠️ IMPORTANT**: Although the Pydantic schema marks `email` as Optional, the service layer enforces that **both father and mother emails are REQUIRED**. The API will return a validation error if either email is missing or empty.

---

## Common Issues & Solutions

### Issue 1: "student.father.email: Field required" / "student.mother.email: Field required"

**Problem**: Schema marks emails as Optional, but service layer requires them

**Root Cause**: The backend has **two layers of validation**:
1. **Pydantic schema validation** (marks email as Optional)
2. **Service layer business logic** (enforces email as required in [admission_service.py:172-184](app/service/student/admission_service.py#L172-L184))

**Solution**: Always include father and mother email addresses
```json
{
  "student": {
    "father": {
      "name": "John Doe Sr.",
      "email": "father@example.com",  // REQUIRED
      "relation_to_student": "Father"
    },
    "mother": {
      "name": "Jane Doe",
      "email": "mother@example.com",  // REQUIRED
      "relation_to_student": "Mother"
    }
  }
}
```

**Additional Business Rules**:
- Father and mother **cannot have the same email** (enforced at line 186-191)
- Email must not already exist with a non-parent role (enforced at line 219-228)

---

### Issue 2: "address_line2: Field required"

**Problem**: Backend schema marks `address_line2` as Optional, but validation error occurs

**Root Cause**: This is likely a **frontend form validation** issue, not a backend issue. The backend schema correctly marks this as `Optional[str]` in [admission_schema.py:18](app/schemas/student/admission_schema.py#L18).

**Solutions**:
1. **Send null explicitly**: `"address_line2": null` instead of omitting the field
2. **Send empty string**: `"address_line2": ""`
3. **Check frontend form validation**: Remove any required validators on address_line2

**Example**:
```json
{
  "address_line1": "123 Main St",
  "address_line2": null,  // Backend accepts this
  "city": "Hyderabad",
  "state": "Telangana"
}
```

### Issue 3: "state: Field required"

**Problem**: State field is required in backend but missing from payload

**Solution**: Always include state field (defined as required in [admission_schema.py:20](app/schemas/student/admission_schema.py#L20))
```json
{
  "state": "Telangana"  // Must be provided
}
```

### Issue 4: "student: Field required"

**Problem**: Student nested object is missing or improperly structured

**Solution**: Ensure complete nested structure with all required fields
```json
{
  "student": {
    "first_name": "John",        // Required
    "last_name": "Doe",           // Required
    "date_of_birth": "2010-05-15",// Required
    "gender": "Male",             // Required
    "father": {                   // Required object
      "name": "John Sr.",
      "email": "father@example.com", // Required (service layer)
      "relation_to_student": "Father"
    },
    "mother": {                   // Required object
      "name": "Jane",
      "email": "mother@example.com", // Required (service layer)
      "relation_to_student": "Mother"
    }
  }
}
```

---

## ⚠️ Schema vs Service Layer Validation

The backend has **two layers of validation** that can cause confusion:

### 1. Pydantic Schema Validation (First Layer)
- Validates data types, format, and basic required fields
- Located in `app/schemas/student/admission_schema.py`, `student_schema.py`, and `parent_schema.py`
- This is what you see in the OpenAPI/Swagger docs

### 2. Service Layer Business Logic (Second Layer)
- Additional validation rules enforced in `app/service/student/admission_service.py`
- Can make "Optional" schema fields effectively **required**
- Can enforce business rules like "emails must be unique"

### Key Discrepancies

| Field | Schema Says | Service Layer Enforces | Actual Requirement |
|-------|-------------|------------------------|-------------------|
| `father.email` | Optional | **Required** | **REQUIRED** |
| `mother.email` | Optional | **Required** | **REQUIRED** |
| `address_line2` | Optional | (no check) | Optional |
| Father/Mother emails | - | Must be different | Must be unique |
| Parent emails | - | Cannot exist with non-Parent role | Must not conflict |

### Why This Matters

When you get a validation error like:
```json
{
  "detail": "Father email is required",
  "field": "student.father.email"
}
```

This is coming from the **service layer** (line 172-177 in admission_service.py), NOT the Pydantic schema. The Swagger docs won't show this as required, but it is.

### Recommendation for Frontend

**Trust the service layer validation errors** over the OpenAPI schema when there's a conflict. If the API returns an error saying a field is required, treat it as required in your form validation, even if the schema says `Optional`.

---

## Service Layer Business Rules

The following validation rules are enforced in [`admission_service.py`](app/service/student/admission_service.py) **in addition to** Pydantic schema validation:

### Admission Level Rules

1. **Admission Date** (Line 106-112)
   - Cannot be in the future
   - Error: `"Admission date cannot be in the future"`

### Student Level Rules

2. **First Name** (Line 139-144)
   - Required (even though schema says required)
   - Cannot be empty or only whitespace
   - Error: `"Student first name is required"`

3. **Last Name** (Line 146-151)
   - Required (even though schema says required)
   - Cannot be empty or only whitespace
   - Error: `"Student last name is required"`

4. **Date of Birth** (Line 153-158)
   - Required
   - Error: `"Student date of birth is required"`

### Parent Level Rules

5. **Both Parents Required** (Line 161-166)
   - Both father AND mother objects must be provided
   - Error: `"Both father and mother information are required"`

6. **Father Email** (Line 172-177)
   - **Required** (schema says Optional)
   - Cannot be empty or only whitespace
   - Error: `"Father email is required"`

7. **Mother Email** (Line 179-184)
   - **Required** (schema says Optional)
   - Cannot be empty or only whitespace
   - Error: `"Mother email is required"`

8. **Unique Parent Emails** (Line 186-191)
   - Father and mother **cannot have the same email**
   - Error: `"Father and mother cannot have the same email address"`

9. **Email Role Validation** (Line 219-228)
   - Parent emails cannot already exist with a **non-Parent role**
   - Example: If `father@example.com` exists as an Admin, it cannot be reused
   - Error: `"Email {email} is already registered to a {role}, not a parent"`
   - ✅ Reusing existing parent emails **is allowed** (for families with multiple children)

---

## Pydantic Schema Validation Rules

### Aadhar/APAAR Number Validation
- Must be exactly 12 digits
- Only numeric characters
- Backend validates: `/^\d{12}$/`

**Valid**: `"123456789012"`
**Invalid**: `"12345"`, `"abc123456789"`, `"1234 5678 9012"`

### Admission Type Values
- Must be one of: `"primary"` or `"non_primary"`
- Case-sensitive

### Relation to Student Values
- Must be one of: `"Father"`, `"Mother"`, or `"Guardian"`
- Case-sensitive (capitalize first letter)

### Salary Range Values
- Must be one of: `"below_1l"`, `"1l_3l"`, `"3l_5l"`, `"5l_10l"`, `"above_10l"`
- Case-sensitive (lowercase with underscores)

---

## Minimal Valid Payload

This is the absolute minimum required payload:

```json
{
  "admission_date": "2024-01-15",
  "academic_year_id": "uuid-of-academic-year",
  "admitted_class_id": "uuid-of-class",
  "admitted_section_id": "uuid-of-section",
  "address_line1": "123 Main Street",
  "city": "Hyderabad",
  "state": "Telangana",
  "student": {
    "first_name": "John",
    "last_name": "Doe",
    "date_of_birth": "2010-05-15",
    "gender": "Male",
    "father": {
      "name": "John Doe Sr.",
      "email": "father@example.com",
      "relation_to_student": "Father"
    },
    "mother": {
      "name": "Jane Doe",
      "email": "mother@example.com",
      "relation_to_student": "Mother"
    }
  }
}
```

**⚠️ IMPORTANT REQUIRED FIELDS**:
- **`academic_year_id`** - UUID of the academic year (get from `/api/v1/academic-years/dropdown`)
- **`admitted_class_id`** - UUID of the class (get from `/api/v1/classes/dropdown`)
- **`admitted_section_id`** - UUID of the section (get from `/api/v1/sections/dropdown`)
- **Father and mother emails** - Required by service layer even though schema marks them as optional

---

## TypeScript Interface

```typescript
interface ParentCreate {
  name: string;
  email: string; // REQUIRED by service layer (even though schema says optional)
  phone?: string | null;
  occupation?: string | null;
  aadhar_number?: string | null;
  gender?: string | null;
  relation_to_student: "Father" | "Mother" | "Guardian";
  salary_range?: "below_1l" | "1l_3l" | "3l_5l" | "5l_10l" | "above_10l" | null;
}

interface StudentCreate {
  first_name: string;
  last_name: string;
  date_of_birth: string; // YYYY-MM-DD format
  gender: string;
  is_primary?: string;
  aadhar_number?: string | null;
  apaar_number?: string | null;
  caste?: string | null;
  sub_caste?: string | null;
  community?: string | null;
  nationality?: string;
  mother_tongue?: string;
  identification_marks?: string | null;
  father: ParentCreate;
  mother: ParentCreate;
}

interface StudentAdmissionCreate {
  admission_date: string; // YYYY-MM-DD format
  admission_type?: "primary" | "non_primary" | null;
  academic_year_id?: string | null;
  admitted_academic_year_id?: string | null;
  admitted_class_id?: string | null;
  admitted_section_id?: string | null;
  current_class_id?: string | null;
  current_section_id?: string | null;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  is_previous_school?: boolean;
  previous_school_name?: string | null;
  previous_class?: string | null;
  previous_school_remark?: string | null;
  student: StudentCreate;
}
```

---

## Data Transformation Example

If your form has flat fields, transform them before submission:

```typescript
// Form data (flat structure)
const formData = {
  // Admission fields
  admission_date: "2024-01-15",
  address_line1: "123 Main St",
  city: "Hyderabad",
  state: "Telangana",

  // Student fields
  student_first_name: "John",
  student_last_name: "Doe",
  student_dob: "2010-05-15",
  student_gender: "Male",

  // Father fields
  father_name: "John Sr.",
  father_email: "father@example.com",
  father_phone: "9876543210",

  // Mother fields
  mother_name: "Jane",
  mother_email: "mother@example.com",
  mother_phone: "9876543211"
};

// Transform to API payload (nested structure)
const apiPayload: StudentAdmissionCreate = {
  admission_date: formData.admission_date,
  address_line1: formData.address_line1,
  address_line2: null, // Explicitly null if not provided
  city: formData.city,
  state: formData.state,
  student: {
    first_name: formData.student_first_name,
    last_name: formData.student_last_name,
    date_of_birth: formData.student_dob,
    gender: formData.student_gender,
    father: {
      name: formData.father_name,
      email: formData.father_email,
      phone: formData.father_phone,
      relation_to_student: "Father"
    },
    mother: {
      name: formData.mother_name,
      email: formData.mother_email,
      phone: formData.mother_phone,
      relation_to_student: "Mother"
    }
  }
};
```

---

## Testing the Payload

Use this curl command to test:

```bash
curl -X POST "http://localhost:8000/api/v1/students/admission/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "cschema: test_tenant" \
  -d '{
    "admission_date": "2024-01-15",
    "address_line1": "123 Main Street",
    "address_line2": null,
    "city": "Hyderabad",
    "state": "Telangana",
    "student": {
      "first_name": "John",
      "last_name": "Doe",
      "date_of_birth": "2010-05-15",
      "gender": "Male",
      "father": {
        "name": "John Doe Sr.",
        "relation_to_student": "Father"
      },
      "mother": {
        "name": "Jane Doe",
        "relation_to_student": "Mother"
      }
    }
  }'
```

---

## Success Response

```json
{
  "id": "uuid-string",
  "admission_number": "ADM2024001",
  "admission_date": "2024-01-15",
  "admission_type": "primary",
  "address_line1": "123 Main Street",
  "address_line2": null,
  "city": "Hyderabad",
  "state": "Telangana",
  "student": {
    "id": "uuid-string",
    "first_name": "John",
    "last_name": "Doe",
    "date_of_birth": "2010-05-15",
    "gender": "Male",
    "is_active": true,
    "father": {
      "id": "uuid-string",
      "name": "John Doe Sr.",
      "relation_to_student": "Father"
    },
    "mother": {
      "id": "uuid-string",
      "name": "Jane Doe",
      "relation_to_student": "Mother"
    }
  }
}
```

---

## Error Response Examples

### Validation Error
```json
{
  "detail": [
    {
      "type": "missing",
      "loc": ["body", "state"],
      "msg": "Field required"
    },
    {
      "type": "missing",
      "loc": ["body", "student", "first_name"],
      "msg": "Field required"
    }
  ]
}
```

### Authentication Error
```json
{
  "detail": "Not authenticated"
}
```

---

**Document Version**: 1.0
**Last Updated**: 2026-02-04
**Related Docs**: DROPDOWN_IMPLEMENTATION_HANDOVER.md

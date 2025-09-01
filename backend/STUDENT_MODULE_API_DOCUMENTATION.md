# Student Module API Documentation

## Overview

The Student Module provides comprehensive management of student-related operations throughout their academic journey. This module handles student admissions, attendance tracking, certificate management, document storage, and transport assignments.

## Base URL Structure

```
/students/admission/
/student/attendance/
/student/certificates/
/students/documents/
/students/student-transport/
```

## Authentication

All endpoints require proper authentication. Include the authorization token in the request headers:

```
Authorization: Bearer <your-jwt-token>
```

---

# Student Admission Management

## Overview
Manage student admissions with comprehensive profile creation including student details, parent information, and academic placement.

### Base URL
```
/students/admission
```

### Endpoints

#### 1. Create Student Admission

Creates a complete student profile with admission details and parent information.

**Endpoint:** `POST /students/admission/`

**Request Body:**
```json
{
  "admission_date": "2023-04-01",
  "academic_year_id": 1,
  "admitted_class_id": 1,
  "admitted_section_id": 1,
  "current_class_id": 1,
  "current_section_id": 1,
  "address_line1": "123 Main Street",
  "address_line2": "Apartment 4B",
  "city": "Mumbai",
  "state": "Maharashtra",
  "is_previous_school": false,
  "previous_school_name": null,
  "previous_class": null,
  "previous_school_remark": null,
  "student": {
    "first_name": "Arjun",
    "last_name": "Sharma",
    "date_of_birth": "2010-05-15",
    "gender": "M",
    "is_primary": "primary",
    "aadhar_number": "123456789012",
    "apaar_number": "987654321098",
    "caste": "General",
    "sub_caste": null,
    "community": "Hindu",
    "nationality": "Indian",
    "mother_tongue": "Hindi",
    "identification_marks": "Birthmark on left arm",
    "father": {
      "father_name": "Rajesh Sharma",
      "father_phone": "+91-9876543210",
      "father_email": "rajesh.sharma@email.com",
      "father_occupation": "Software Engineer"
    },
    "mother": {
      "mother_name": "Priya Sharma",
      "mother_phone": "+91-9876543211",
      "mother_email": "priya.sharma@email.com",
      "mother_occupation": "Teacher"
    }
  }
}
```

**Response:** `200 OK`
```json
{
  "id": 1,
  "admission_date": "2023-04-01",
  "academic_year_id": 1,
  "admitted_class_id": 1,
  "admitted_section_id": 1,
  "current_class_id": 1,
  "current_section_id": 1,
  "address_line1": "123 Main Street",
  "address_line2": "Apartment 4B",
  "city": "Mumbai",
  "state": "Maharashtra",
  "is_previous_school": false,
  "previous_school_name": null,
  "previous_class": null,
  "previous_school_remark": null,
  "student": {
    "id": 1,
    "first_name": "Arjun",
    "last_name": "Sharma",
    "date_of_birth": "2010-05-15",
    "gender": "M",
    "is_primary": "primary",
    "aadhar_number": "123456789012",
    "apaar_number": "987654321098",
    "caste": "General",
    "sub_caste": null,
    "community": "Hindu",
    "nationality": "Indian",
    "mother_tongue": "Hindi",
    "identification_marks": "Birthmark on left arm",
    "father": {
      "id": 1,
      "father_name": "Rajesh Sharma",
      "father_phone": "+91-9876543210",
      "father_email": "rajesh.sharma@email.com",
      "father_occupation": "Software Engineer"
    },
    "mother": {
      "id": 2,
      "mother_name": "Priya Sharma",
      "mother_phone": "+91-9876543211",
      "mother_email": "priya.sharma@email.com",
      "mother_occupation": "Teacher"
    }
  }
}
```

#### 2. Get Admission by Student ID

**Endpoint:** `GET /students/admission/id/{student_id}`

**Response:** `200 OK`
```json
{
  "id": 1,
  "admission_date": "2023-04-01",
  "academic_year_id": 1,
  "admitted_class_id": 1,
  "current_class_id": 1,
  "student": {
    "id": 1,
    "first_name": "Arjun",
    "last_name": "Sharma",
    "date_of_birth": "2010-05-15"
  }
}
```

#### 3. Update Student Admission

**Endpoint:** `PATCH /students/admission/{student_id}`

**Request Body:**
```json
{
  "first_name": "Arjun Kumar",
  "current_class_id": 2,
  "address_line1": "456 New Address Street",
  "city": "Delhi"
}
```

#### 4. Get Student by Admission ID

**Endpoint:** `GET /students/admission/by-admission/{admission_id}`

#### 5. Search Students

**Endpoint:** `GET /students/admission/search`

**Query Parameters:**
- `query` (required): Search text (minimum 1 character)

**Example Request:**
```
GET /students/admission/search?query=Arjun
```

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "first_name": "Arjun",
    "last_name": "Sharma",
    "date_of_birth": "2010-05-15",
    "gender": "M",
    "admission_id": 1
  }
]
```

---

# Student Attendance Management

## Overview
Track and manage student attendance with date-based records and status updates.

### Base URL
```
/student/attendance
```

### Endpoints

#### 1. Create Student Attendance

**Endpoint:** `POST /student/attendance/`

**Request Body:**
```json
{
  "student_id": 1,
  "date": "2023-10-01",
  "status": "Present",
  "remarks": "On time"
}
```

**Response:** `201 Created`
```json
{
  "id": 1,
  "student_id": 1,
  "date": "2023-10-01",
  "status": "Present",
  "remarks": "On time"
}
```

#### 2. Get All Attendance Records

**Endpoint:** `GET /student/attendance/`

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "student_id": 1,
    "date": "2023-10-01",
    "status": "Present",
    "remarks": "On time"
  },
  {
    "id": 2,
    "student_id": 1,
    "date": "2023-10-02",
    "status": "Absent",
    "remarks": "Sick leave"
  }
]
```

#### 3. Get Attendance by ID

**Endpoint:** `GET /student/attendance/{attendance_id}`

#### 4. Update Attendance

**Endpoint:** `PATCH /student/attendance/{attendance_id}`

**Request Body:**
```json
{
  "status": "Absent"
}
```

#### 5. Delete Attendance

**Endpoint:** `DELETE /student/attendance/{attendance_id}`

**Response:** `200 OK`
```json
{
  "message": "Attendance record deleted successfully"
}
```

---

# Student Certificate Management

## Overview
Manage student certificates with file upload/download capabilities and certificate type management.

### Base URL
```
/student/certificates
```

### Endpoints

#### 1. Create Certificate

**Endpoint:** `POST /student/certificates/`

**Content-Type:** `multipart/form-data`

**Request Body (Form Data):**
- `student_id` (integer): Student ID
- `certificate_type_id` (integer): Certificate type ID
- `issue_date` (date, optional): Certificate issue date
- `description` (string, optional): Certificate description
- `certificate_file` (file, optional): Certificate file upload

**Example Request:**
```javascript
const formData = new FormData();
formData.append('student_id', '1');
formData.append('certificate_type_id', '1');
formData.append('issue_date', '2023-10-01');
formData.append('description', 'Bonafide Certificate for Bank Account');
formData.append('certificate_file', fileInput.files[0]);

fetch('/student/certificates/', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token
  },
  body: formData
});
```

**Response:** `201 Created`
```json
{
  "id": 1,
  "student_id": 1,
  "certificate_type_id": 1,
  "issue_date": "2023-10-01",
  "description": "Bonafide Certificate for Bank Account",
  "certificate_file": "certificates/student_1_cert_20231001.pdf"
}
```

#### 2. Get All Certificates

**Endpoint:** `GET /student/certificates/`

#### 3. Get Certificate by ID

**Endpoint:** `GET /student/certificates/certificateid/{certificate_id}`

#### 4. Update Certificate

**Endpoint:** `PATCH /student/certificates/{certificate_id}`

**Content-Type:** `multipart/form-data`

#### 5. Delete Certificate

**Endpoint:** `DELETE /student/certificates/{certificate_id}`

#### 6. Download Certificate

**Endpoint:** `GET /student/student/certificates/certificates/{certificate_id}/download`

**Response:** File download (PDF/Image)

#### 7. List Certificates for Student

**Endpoint:** `GET /student/certificates/student/{student_id}`

**Response:** `200 OK`
```json
[
  {
    "certificate_type_id": 1,
    "issue_date": "2023-10-01",
    "file_path": "certificates/student_1_cert_20231001.pdf",
    "exists_on_disk": true
  }
]
```

#### 8. Get Certificate Types

**Endpoint:** `GET /student/certificates/certificate-types`

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "name": "Bonafide Certificate",
    "description": "Certificate confirming student enrollment"
  },
  {
    "id": 2,
    "name": "Transfer Certificate",
    "description": "Certificate for school transfer"
  },
  {
    "id": 3,
    "name": "Conduct Certificate",
    "description": "Certificate of student conduct"
  }
]
```

---

# Student Document Management

## Overview
Manage student documents with secure file upload, storage, and retrieval capabilities.

### Base URL
```
/students/documents
```

### Endpoints

#### 1. Upload Document

**Endpoint:** `POST /students/documents/`

**Content-Type:** `multipart/form-data`

**Request Body (Form Data):**
- `student_id` (integer): Student ID
- `document_type` (string): Type of document (e.g., "Birth Certificate", "Aadhar Card")
- `document_file` (file): Document file to upload

**Example Request:**
```javascript
const formData = new FormData();
formData.append('student_id', '1');
formData.append('document_type', 'Birth Certificate');
formData.append('document_file', fileInput.files[0]);

fetch('/students/documents/', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token
  },
  body: formData
});
```

**Response:** `201 Created`
```json
{
  "id": 1,
  "student_id": 1,
  "document_type": "Birth Certificate",
  "file_path": "documents/student_1_birth_cert.pdf",
  "upload_date": "2023-10-01T10:30:00Z"
}
```

#### 2. Get Documents by Student

**Endpoint:** `GET /students/documents/`

**Query Parameters:**
- `student_id` (required): Student ID

**Example Request:**
```
GET /students/documents/?student_id=1
```

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "student_id": 1,
    "document_type": "Birth Certificate",
    "file_path": "documents/student_1_birth_cert.pdf",
    "upload_date": "2023-10-01T10:30:00Z"
  },
  {
    "id": 2,
    "student_id": 1,
    "document_type": "Aadhar Card",
    "file_path": "documents/student_1_aadhar.pdf",
    "upload_date": "2023-10-02T14:15:00Z"
  }
]
```

#### 3. Get Document by ID

**Endpoint:** `GET /students/documents/{document_id}`

#### 4. Update Document

**Endpoint:** `PATCH /students/documents/{document_id}`

**Content-Type:** `multipart/form-data`

**Request Body (Form Data):**
- `document_type` (string): Updated document type
- `document_file` (file): New document file

#### 5. Delete Document

**Endpoint:** `DELETE /students/documents/{document_id}`

**Response:** `204 No Content`

---

# Student Transport Management

## Overview
Manage student transport assignments including trip allocations, stop assignments, and fee management.

### Base URL
```
/students/student-transport
```

### Endpoints

#### 1. Create Transport Assignment

**Endpoint:** `POST /students/student-transport/`

**Request Body:**
```json
{
  "student_id": 1,
  "trip_id": 1,
  "stop_id": 5,
  "fee_term_id": 1,
  "fee_per_term": 2500.00
}
```

**Response:** `201 Created`
```json
{
  "id": 1,
  "student_id": 1,
  "trip_id": 1,
  "stop_id": 5,
  "fee_term_id": 1,
  "fee_per_term": 2500.00,
  "created_at": "2023-10-01T08:00:00Z",
  "updated_at": "2023-10-01T08:00:00Z"
}
```

#### 2. Get All Transport Assignments

**Endpoint:** `GET /students/student-transport/`

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "student_id": 1,
    "trip_id": 1,
    "stop_id": 5,
    "fee_term_id": 1,
    "fee_per_term": 2500.00,
    "created_at": "2023-10-01T08:00:00Z",
    "updated_at": "2023-10-01T08:00:00Z"
  }
]
```

#### 3. Get Transport by Student

**Endpoint:** `GET /students/student-transport/student/{student_id}`

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "student_id": 1,
    "trip_id": 1,
    "stop_id": 5,
    "fee_term_id": 1,
    "fee_per_term": 2500.00,
    "created_at": "2023-10-01T08:00:00Z",
    "updated_at": "2023-10-01T08:00:00Z"
  }
]
```

#### 4. Update Transport Assignment

**Endpoint:** `PATCH /students/student-transport/{transport_id}`

**Request Body:**
```json
{
  "trip_id": 2,
  "stop_id": 8,
  "fee_per_term": 3000.00
}
```

#### 5. Delete Transport Assignment

**Endpoint:** `DELETE /students/student-transport/{transport_id}`

**Response:** `204 No Content`

---

# Common Error Responses

### 400 Bad Request
```json
{
  "detail": "Invalid request data"
}
```

### 404 Not Found
```json
{
  "detail": "Student not found"
}
```

### 422 Unprocessable Entity
```json
{
  "detail": [
    {
      "loc": ["body", "student_id"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

### 500 Internal Server Error
```json
{
  "detail": "Error creating attendance: Database connection failed"
}
```

---

# Data Models

## Student Admission
```json
{
  "id": "integer",
  "admission_date": "date (YYYY-MM-DD)",
  "academic_year_id": "integer (optional)",
  "admitted_class_id": "integer (optional)",
  "admitted_section_id": "integer (optional)",
  "current_class_id": "integer (optional)",
  "current_section_id": "integer (optional)",
  "address_line1": "string",
  "address_line2": "string (optional)",
  "city": "string",
  "state": "string",
  "is_previous_school": "boolean",
  "previous_school_name": "string (optional)",
  "previous_class": "string (optional)",
  "previous_school_remark": "string (optional)",
  "student": {
    "id": "integer",
    "first_name": "string",
    "last_name": "string",
    "date_of_birth": "date (YYYY-MM-DD)",
    "gender": "string",
    "is_primary": "string (primary/not_primary)",
    "aadhar_number": "string (12 digits, optional)",
    "apaar_number": "string (12 digits, optional)",
    "caste": "string (optional)",
    "sub_caste": "string (optional)",
    "community": "string (optional)",
    "nationality": "string (default: Indian)",
    "mother_tongue": "string (default: Telugu)",
    "identification_marks": "string (optional)",
    "father": "ParentObject",
    "mother": "ParentObject"
  }
}
```

## Student Attendance
```json
{
  "id": "integer",
  "student_id": "integer",
  "date": "date (YYYY-MM-DD)",
  "status": "string (Present/Absent)",
  "remarks": "string"
}
```

## Certificate
```json
{
  "id": "integer",
  "student_id": "integer",
  "certificate_type_id": "integer",
  "issue_date": "date (YYYY-MM-DD, optional)",
  "description": "string (max 255 chars, optional)",
  "certificate_file": "string (file path, optional)"
}
```

## Student Document
```json
{
  "id": "integer",
  "student_id": "integer",
  "document_type": "string (max 100 chars)",
  "file_path": "string",
  "upload_date": "datetime (ISO 8601)"
}
```

## Student Transport
```json
{
  "id": "integer",
  "student_id": "integer",
  "trip_id": "integer",
  "stop_id": "integer",
  "fee_term_id": "integer (optional)",
  "fee_per_term": "float (positive value)",
  "created_at": "datetime (ISO 8601)",
  "updated_at": "datetime (ISO 8601)"
}
```

---

# Usage Examples

## Complete Student Admission Process

```javascript
// Step 1: Create student admission with complete profile
const admissionData = {
  admission_date: "2023-04-01",
  academic_year_id: 1,
  admitted_class_id: 1,
  admitted_section_id: 1,
  current_class_id: 1,
  current_section_id: 1,
  address_line1: "123 Main Street",
  city: "Mumbai",
  state: "Maharashtra",
  is_previous_school: false,
  student: {
    first_name: "Arjun",
    last_name: "Sharma",
    date_of_birth: "2010-05-15",
    gender: "M",
    is_primary: "primary",
    aadhar_number: "123456789012",
    nationality: "Indian",
    mother_tongue: "Hindi",
    father: {
      father_name: "Rajesh Sharma",
      father_phone: "+91-9876543210",
      father_email: "rajesh.sharma@email.com",
      father_occupation: "Software Engineer"
    },
    mother: {
      mother_name: "Priya Sharma",
      mother_phone: "+91-9876543211",
      mother_email: "priya.sharma@email.com",
      mother_occupation: "Teacher"
    }
  }
};

const admissionResponse = await fetch('/students/admission/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify(admissionData)
});

const admission = await admissionResponse.json();
const studentId = admission.student.id;

// Step 2: Upload student documents
const uploadDocument = async (documentType, file) => {
  const formData = new FormData();
  formData.append('student_id', studentId);
  formData.append('document_type', documentType);
  formData.append('document_file', file);

  return fetch('/students/documents/', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token
    },
    body: formData
  });
};

// Upload birth certificate
await uploadDocument('Birth Certificate', birthCertFile);
await uploadDocument('Aadhar Card', aadharFile);

// Step 3: Assign transport (if applicable)
const transportData = {
  student_id: studentId,
  trip_id: 1,
  stop_id: 5,
  fee_term_id: 1,
  fee_per_term: 2500.00
};

await fetch('/students/student-transport/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify(transportData)
});
```

## Daily Attendance Management

```javascript
// Mark attendance for multiple students
const attendanceRecords = [
  {
    student_id: 1,
    date: "2023-10-01",
    status: "Present",
    remarks: "On time"
  },
  {
    student_id: 2,
    date: "2023-10-01",
    status: "Absent",
    remarks: "Sick leave"
  }
];

// Bulk create attendance
const attendancePromises = attendanceRecords.map(record => 
  fetch('/student/attendance/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify(record)
  })
);

await Promise.all(attendancePromises);

// Get attendance for specific date range
const getAttendanceForPeriod = async (studentId, startDate, endDate) => {
  const response = await fetch(`/student/attendance/?student_id=${studentId}`, {
    headers: {
      'Authorization': 'Bearer ' + token
    }
  });
  
  const allAttendance = await response.json();
  
  // Filter by date range (client-side filtering)
  return allAttendance.filter(record => {
    const recordDate = new Date(record.date);
    return recordDate >= new Date(startDate) && recordDate <= new Date(endDate);
  });
};
```

## Certificate Generation and Management

```javascript
// Generate and upload certificate
const generateCertificate = async (studentId, certificateTypeId, description) => {
  // Generate certificate file (PDF generation logic here)
  const certificateBlob = await generateCertificatePDF(studentId, certificateTypeId);
  
  const formData = new FormData();
  formData.append('student_id', studentId);
  formData.append('certificate_type_id', certificateTypeId);
  formData.append('issue_date', new Date().toISOString().split('T')[0]);
  formData.append('description', description);
  formData.append('certificate_file', certificateBlob, 'certificate.pdf');

  const response = await fetch('/student/certificates/', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token
    },
    body: formData
  });

  return response.json();
};

// Download certificate
const downloadCertificate = async (certificateId) => {
  const response = await fetch(`/student/certificates/certificates/${certificateId}/download`, {
    headers: {
      'Authorization': 'Bearer ' + token
    }
  });

  if (response.ok) {
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificate_${certificateId}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
};
```

---

# Integration Notes for UI Developers

## Form Validation

### Student Admission
- Validate Aadhar and APAAR numbers (12 digits)
- Ensure date of birth is reasonable for student age
- Validate email formats for parent contacts
- Check phone number formats
- Ensure required address fields are provided

### File Uploads
- Implement file type restrictions (PDF, JPG, PNG for documents)
- Set maximum file size limits (e.g., 5MB per file)
- Show upload progress indicators
- Validate file integrity before upload

### Attendance
- Prevent future date attendance entries
- Validate attendance status values
- Handle bulk attendance operations efficiently

## Data Relationships

### Student-Centric Design
- Student ID is central to most operations
- Admission creates both student and parent records
- All subsequent operations reference student ID

### Academic Context
- Academic year affects class/section assignments
- Transport assignments are term-based
- Certificates are tied to current enrollment status

## File Management

### Upload Handling
- Use FormData for file uploads
- Implement chunked uploads for large files
- Show upload progress and status
- Handle upload errors gracefully

### Download Management
- Implement secure download links
- Handle different file types appropriately
- Provide file preview capabilities where possible

## Performance Optimization

### Search and Filtering
- Implement debounced search for student lookup
- Use pagination for large student lists
- Cache frequently accessed student data

### Bulk Operations
- Batch attendance marking for class-wide operations
- Use bulk document uploads where applicable
- Implement progress tracking for long operations

## Error Handling

### Validation Errors
- Show field-specific error messages
- Highlight invalid form fields
- Provide clear instructions for correction

### File Upload Errors
- Handle file size/type restrictions
- Show specific error messages for upload failures
- Provide retry mechanisms

### Network Errors
- Implement retry logic for failed requests
- Show offline status indicators
- Queue operations for when connectivity returns

## Security Considerations

### File Security
- Validate file types on both client and server
- Implement virus scanning for uploads
- Use secure file storage locations
- Control download access permissions

### Data Privacy
- Protect sensitive student information
- Implement proper access controls
- Log access to sensitive documents
- Comply with student data privacy regulations

## Rate Limiting

API requests are subject to rate limiting:
- 100 requests per minute per user for regular operations
- 50 file uploads per hour per user
- 1000 requests per hour per organization

## Common Patterns

### Student Search
```javascript
const searchStudents = async (query) => {
  if (query.length < 1) return [];
  
  const response = await fetch(`/students/admission/search?query=${encodeURIComponent(query)}`, {
    headers: {
      'Authorization': 'Bearer ' + token
    }
  });
  
  return response.json();
};
```

### File Upload with Progress
```javascript
const uploadWithProgress = async (formData, onProgress) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentComplete = (e.loaded / e.total) * 100;
        onProgress(percentComplete);
      }
    });
    
    xhr.addEventListener('load', () => {
      if (xhr.status === 200 || xhr.status === 201) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    });
    
    xhr.open('POST', '/students/documents/');
    xhr.setRequestHeader('Authorization', 'Bearer ' + token);
    xhr.send(formData);
  });
};
```

---

# Support

For technical support or questions about the Student Module API, contact the development team or refer to the main API documentation.

**Note:** Student Homework endpoints are currently not implemented (commented out in the codebase) and will be available in a future release.
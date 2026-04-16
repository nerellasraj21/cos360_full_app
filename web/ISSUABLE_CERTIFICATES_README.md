# Issuable Certificates — Frontend Implementation

## ✅ Frontend Components Status

### Completed
- ✓ Type definitions (`src/types/certificates/issuable.ts`)
- ✓ React Query hooks (`src/api/hooks/students/useIssuableCertificates.ts`)
- ✓ Certificate generator component (`src/components/students/IssuableCertificateGenerator.tsx`)
- ✓ Template manager component (`src/components/students/TemplateManager.tsx`)
- ✓ Page integration (`src/pages/students/CertificateUploadPage.tsx`)

---

## 🎯 How to Use

### 1. Navigate to Certificates Page
```
URL: /students/certificates
```

### 2. Generate Issuable Certificate Flow

**Step 1: Select Student**
- Click on "Issue Certificate" tab
- Click "Generate Issuable" sub-tab
- Use dropdowns to select:
  1. Class
  2. Section (filtered by class)
  3. Student (filtered by section)

**Step 2: Select Template**
- Student details auto-populate (name, admission number, DOB, etc.)
- Choose a certificate template:
  - Bonafide Certificate (green) — for student enrollment confirmation
  - Transfer Certificate (blue) — for students changing schools
  - Conduct Certificate (red) — for character certification
- Preview loads with student data auto-filled in {{placeholders}}

**Step 3: Generate & Download**
- Optional: Edit the HTML content using the editor
- Click "Download PDF" to generate and download the certificate
- Certificate is saved with the student record

---

## 🔌 API Integration Points

### Frontend → Backend Communication

```typescript
// Get all templates
GET /api/v1/issuable-certificates/templates/
Headers: cschema: test_tenant

// Generate certificate
POST /api/v1/issuable-certificates/generate/
{
  student_id: UUID,
  template_id: UUID,
  edited_html?: string,
  remarks?: string
}

// Get issued certificates
GET /api/v1/issuable-certificates/issued/?student_id={id}

// Download/View certificate
GET /api/v1/issuable-certificates/issued/{id}/
```

---

## 🛠️ Component Architecture

### IssuableCertificateGenerator.tsx
- **Props:** `selectedStudent`, `selectedStudentId`
- **State:** Template selection, HTML editing, preview
- **Two-step flow:**
  1. Template selection with student info display
  2. Preview with optional HTML editor and download button
- **Auto-fill:** Student data → Template variables
- **Download:** Generates PDF from filled HTML

### TemplateManager.tsx (Admin Interface)
- CRUD operations for templates
- Rich HTML editor for template content
- Variable extraction and validation
- Theme color selection (green, blue, red, orange)

---

## 📦 Type Definitions

All types are in `src/types/certificates/issuable.ts`:

```typescript
export interface IssuableCertificateTemplate {
  id: string;
  name: string;
  html_template: string;
  color_theme: 'green' | 'blue' | 'red' | 'orange';
  variables_used?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface IssuedCertificate {
  id: string;
  student_id: string;
  template_id: string;
  html_content: string;
  pdf_content?: Blob;
  issued_date: string;
  issued_by: string;
  remarks?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}
```

---

## 🎨 Template Variables

Templates use {{variable}} syntax for substitution. Common variables:

```
Student Information:
  {{student_name}} — Full name
  {{admission_number}} — Admission ID
  {{class_name}} — Class/Grade
  {{section}} — Section/Division
  {{dob}} — Date of birth
  {{gender_he_she}} — He/She (auto-determined)
  {{gender_his_her}} — His/Her (auto-determined)

Parent Information:
  {{father_name}} — Father's name
  {{mother_name}} — Mother's name

School Information:
  {{school_name}} — School name
  {{academic_year}} — Current academic year
  {{issue_date}} — Certificate issue date
```

When a template is selected, the frontend fetches student data and fills in these variables automatically.

---

## 🔄 Data Flow

```
User Action
  ↓
Select Class → SectionsByClassDropdown
  ↓
Select Section → StudentsDropdown
  ↓
Select Student → Fetch student details
  ↓
Auto-fill StudentData (name, DOB, admission#, etc.)
  ↓
Select Template → Fetch template HTML
  ↓
Substitute {{variables}} with student data
  ↓
Display preview in iframe
  ↓
Optional: Edit HTML in editor
  ↓
Download PDF
  ↓
POST /generate with student_id, template_id, edited_html
  ↓
Backend creates GeneratedCertificate record
  ↓
Success notification + certificate saved
```

---

## 🚀 Deployment Checklist

Before going live, ensure:

1. **Backend Setup**
   - [ ] Database tables created (run `setup_issuable_certificates.py`)
   - [ ] Permissions configured (`issuable_certificates:read`, `create`, `update`, `delete`)
   - [ ] API endpoints registered in `main_router.py` ✓

2. **Frontend Setup**
   - [ ] All imports verified (CAxios, hooks, components)
   - [ ] Routes registered (`/_app/students/certificates`)
   - [ ] Dropdowns configured (ClassesDropdown, SectionsByClassDropdown, StudentsDropdown)
   - [ ] Authentication working (JWT tokens passed in headers)

3. **Testing**
   - [ ] Admin can create templates (if using TemplateManager)
   - [ ] User can select class → section → student
   - [ ] Student data auto-populates
   - [ ] Templates load and preview correctly
   - [ ] PDF generates and downloads
   - [ ] Certificate record saved in database

---

## 🐛 Common Issues & Solutions

### Dropdown Shows Empty
- Check that filter condition is correct (enabled={!!classId})
- Verify parent dropdown value is being passed
- Console log to see API response

### Student Data Not Filling
- Check that `StudentData` fields match template variable names
- Verify API returns correct field names
- Console log to see what data was fetched

### PDF Not Downloading
- Check browser console for errors
- Ensure `window.location.href` is being called
- Browser may block downloads if headers not correct

### Permission Denied (403)
- Verify user role (Admin, Staff, or Teacher)
- Check permission system has `issuable_certificates` resource
- Verify JWT token is valid and includes role

---

## 📝 Notes

- **Templates are managed by admin** — Users only select from pre-created templates
- **HTML is editable** — Users can customize the HTML before generation
- **Student data auto-fills** — {{variables}} are substituted with real student data
- **Certificates are saved** — Each generated certificate is stored in `generated_certificates` table
- **Role-based access** — Only authorized users can generate/manage certificates

---

## 📚 Related Files

- Backend implementation: `/c/Users/nerel/Documents/Workspace/PythonWorkspace/COS360/ISSUABLE_CERTIFICATES_IMPLEMENTATION.md`
- Full setup guide: Run `python scripts/setup_issuable_certificates.py` in backend repo

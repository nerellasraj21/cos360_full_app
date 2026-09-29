# Issuable Certificates Implementation — Complete Setup Guide

## ✅ Implementation Status

**Frontend:** COMPLETE  
**Backend:** COMPLETE  
**Database Setup Scripts:** COMPLETE

---

## 📋 What Has Been Completed

### Frontend (React/TypeScript)

1. **Type Definitions** (`src/types/certificates/issuable.ts`)
   - `IssuableCertificateTemplate` — Template structure
   - `GeneratedCertificate` — Issued certificate record
   - `GenerateCertificateRequest` — Generation payload
   - `StudentData` — Auto-filled student information

2. **React Query Hooks** (`src/api/hooks/students/useIssuableCertificates.ts`)
   - `useIssuableCertificateTemplates()` — List all active templates
   - `useIssuableCertificateTemplate(id)` — Get single template
   - `useCreateIssuableCertificateTemplate()` — Create new template
   - `useUpdateIssuableCertificateTemplate()` — Update template
   - `useDeleteIssuableCertificateTemplate()` — Delete template
   - `useGenerateIssuableCertificate()` — Generate certificate
   - Full cache invalidation and error handling with toast notifications

3. **UI Components**
   - `IssuableCertificateGenerator.tsx` — Main 2-step generation component
     * Step 1: Select template from dropdown with student info display
     * Step 2: Preview certificate with optional HTML editing and download
   - `TemplateManager.tsx` — Template CRUD interface (for admin)
   - Auto-fills student data into {{placeholder}} fields

4. **Page Integration** (`src/pages/students/CertificateUploadPage.tsx`)
   - Updated with sub-tabs in "Issue Certificate" tab
   - "Generate Issuable" is now a sub-tab alongside "Upload Certificate File"
   - Seamlessly integrated with existing certificate workflow

### Backend (FastAPI/Python)

1. **Database Models** (`app/models/student/issuable_certificate_model.py`)
   - `IssuableCertificateTemplate` — Stores certificate templates
     * Fields: id, name, html_template, color_theme, variables_used, is_active, timestamps
   - `GeneratedCertificate` — Stores issued certificates
     * Fields: id, student_id, template_id, html_content, pdf_content, issued_date, issued_by, remarks, is_active, timestamps

2. **Pydantic Schemas** (`app/schemas/student/issuable_certificate_schema.py`)
   - `IssuableCertificateTemplateCreate` — Create template request
   - `IssuableCertificateTemplateUpdate` — Update template request
   - `IssuableCertificateTemplateRead` — Template response
   - `GenerateCertificateRequest` — Generate certificate request (includes optional edited_html)
   - `GenerateCertificateResponse` — Certificate response
   - `GeneratedCertificateRead` — Issued certificate response
   - All include proper ORM model conversion

3. **Service Layer** (`app/service/student/issuable_certificate_service.py`)
   - `get_all_templates()` — Fetch all active templates
   - `get_template_by_id(template_id)` — Get single template
   - `create_template(data)` — Create new template
   - `update_template(template_id, data)` — Update template
   - `delete_template(template_id)` — Delete template
   - `generate_certificate(student_id, template_id, edited_html)` — Generate certificate
   - `get_issued_certificates_by_student(student_id)` — List issued certificates
   - `get_issued_certificate_by_id(cert_id)` — Get issued certificate
   - `delete_issued_certificate(cert_id)` — Delete issued certificate
   - `extract_variables(html)` — Extract {{placeholders}} from template

4. **API Endpoints** (`app/api/v1/student/issuable_certificate_endpoints.py`)
   - `GET /issuable-certificates/templates/` — List all templates
   - `GET /issuable-certificates/templates/{id}/` — Get template
   - `POST /issuable-certificates/templates/` — Create template
   - `PUT /issuable-certificates/templates/{id}/` — Update template
   - `DELETE /issuable-certificates/templates/{id}/` — Delete template
   - `POST /issuable-certificates/generate/` — Generate certificate
   - `GET /issuable-certificates/issued/` — List issued certificates
   - `DELETE /issuable-certificates/issued/{id}/` — Delete issued certificate
   - All with permission checks via `check_role_plan_permission_with_error()`

5. **Router Registration** (`app/api/v1/main_router.py`)
   - Issuable certificate router imported and registered
   - Endpoints available at `/issuable-certificates/*` path

---

## 🚀 Next Steps to Activate

### Step 1: Run Database Setup Script

This script creates tables and seeds three professional templates:

```bash
cd /c/Users/nerel/Documents/Workspace/PythonWorkspace/COS360

# For all active tenants:
python scripts/setup_issuable_certificates.py

# For specific tenant (e.g., test_tenant):
python scripts/setup_issuable_certificates.py test_tenant
```

**What it does:**
- Creates `issuable_certificate_templates` table in tenant schema
- Creates `generated_certificates` table in tenant schema
- Seeds three default templates: Bonafide, Transfer Certificate, Conduct Certificate

### Step 2: Verify Database Setup

Check that tables were created:

```sql
-- Connect to your COS360 database as the tenant owner
SET search_path TO your_tenant_schema;

-- Should show two tables
\dt issuable_certificate_templates
\dt generated_certificates

-- Should show 3 templates
SELECT id, name, color_theme FROM issuable_certificate_templates;
```

Expected output:
```
00000000-0000-0000-0000-000000000001 | Bonafide Certificate | green
00000000-0000-0000-0000-000000000002 | Transfer Certificate | blue
00000000-0000-0000-0000-000000000003 | Conduct Certificate  | red
```

### Step 3: Verify Backend API

Test the endpoints are working:

```bash
# Start the FastAPI backend (if not already running)
cd /c/Users/nerel/Documents/Workspace/PythonWorkspace/COS360
python -m uvicorn app.main:app --reload

# In another terminal, test the API
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "cschema: test_tenant" \
  http://localhost:8000/api/v1/issuable-certificates/templates/
```

Should return list of 3 templates (with full HTML content).

### Step 4: Test Frontend Integration

1. **Start the frontend development server**
   ```bash
   cd c:\Users\nerel\Documents\Workspace\React Workspace\COS360_Frontend\cos360_frontend
   npm run dev
   ```

2. **Navigate to Student Certificates page**
   - Go to: `/students/certificates`
   - Click on "Issue Certificate" tab
   - You should see sub-tabs: "Upload Certificate File" and "Generate Issuable"

3. **Test the flow**
   - Click "Generate Issuable" sub-tab
   - Select a class from dropdown
   - Select a section from dropdown
   - Select a student from dropdown
   - Student details should auto-fill
   - Click "Select Template"
   - Choose a template (Bonafide, Transfer, or Conduct)
   - Template should load with student data filled in
   - Optional: Edit the HTML in the editor
   - Click "Download PDF" to generate and download

---

## 📝 API Request/Response Examples

### Generate Certificate Request

```http
POST /api/v1/issuable-certificates/generate/
Content-Type: application/json
Authorization: Bearer {token}
cschema: test_tenant

{
  "student_id": "550e8400-e29b-41d4-a716-446655440001",
  "template_id": "00000000-0000-0000-0000-000000000001",
  "edited_html": "<html>...modified HTML...</html>",
  "remarks": "Issued for admission purposes"
}
```

### Generate Certificate Response

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440099",
  "student_id": "550e8400-e29b-41d4-a716-446655440001",
  "template_id": "00000000-0000-0000-0000-000000000001",
  "html_content": "<html>...final HTML...</html>",
  "pdf_content": null,
  "issued_date": "2025-04-07T12:00:00",
  "issued_by": "550e8400-e29b-41d4-a716-446655440002",
  "remarks": "Issued for admission purposes",
  "is_active": true,
  "created_at": "2025-04-07T12:00:00",
  "updated_at": "2025-04-07T12:00:00"
}
```

### List Templates Response

```json
[
  {
    "id": "00000000-0000-0000-0000-000000000001",
    "name": "Bonafide Certificate",
    "html_template": "<!DOCTYPE html>...",
    "color_theme": "green",
    "variables_used": "student_name,father_name,admission_number,...",
    "is_active": true,
    "created_at": "2025-03-10T10:00:00",
    "updated_at": "2025-03-10T10:00:00"
  },
  ...
]
```

---

## 🔐 Permissions

The following permission checks are in place:

| Action | Permission | Default Roles |
|--------|-----------|---|
| View templates | `issuable_certificates:read` | Admin, Staff, Teacher |
| Create template | `issuable_certificates:create` | Admin |
| Update template | `issuable_certificates:update` | Admin |
| Delete template | `issuable_certificates:delete` | Admin |
| Generate certificate | `issuable_certificates:create` | Admin, Staff, Teacher |

You may need to add these permissions to your permission system if not already present.

---

## 🎨 Default Templates Included

### 1. Bonafide Certificate (Green)
- Professional layout with school header
- Certifies student is bonafide and in good standing
- Variables: student_name, father_name, admission_number, class_name, section, dob, academic_year, issue_date, school_name, gender_he_she, gender_his_her

### 2. Transfer Certificate (Blue)
- Formal transfer document
- For students moving to other schools
- Variables: student_name, father_name, mother_name, admission_number, dob, class_name, academic_year, issue_date, school_name, gender_he_she

### 3. Conduct Certificate (Red)
- Character and conduct certification
- Lists achievements and qualities
- Variables: student_name, father_name, admission_number, class_name, academic_year, issue_date, school_name, gender_he_she, gender_his_her

All templates are fully editable in the HTML editor before generation.

---

## 📂 File Structure

```
Frontend:
  src/types/certificates/issuable.ts
  src/api/hooks/students/useIssuableCertificates.ts
  src/components/students/IssuableCertificateGenerator.tsx
  src/components/students/TemplateManager.tsx
  src/pages/students/CertificateUploadPage.tsx (updated)

Backend:
  app/models/student/issuable_certificate_model.py
  app/schemas/student/issuable_certificate_schema.py
  app/service/student/issuable_certificate_service.py
  app/api/v1/student/issuable_certificate_endpoints.py
  app/api/v1/main_router.py (updated)

Scripts:
  scripts/create_issuable_certificate_tables.py (table creation only)
  scripts/setup_issuable_certificates.py (tables + seed)
```

---

## 🧪 Troubleshooting

### Issue: "No module named 'app'"
**Solution:** Run scripts from the project root directory:
```bash
cd /c/Users/nerel/Documents/Workspace/PythonWorkspace/COS360
python scripts/setup_issuable_certificates.py
```

### Issue: "Table already exists" error
**Solution:** This is expected if you run the script multiple times. The script checks for existing records and skips them.

### Issue: API returns 403 Forbidden
**Solution:** Check that:
1. User has appropriate role (Admin, Staff, or Teacher)
2. Permission `issuable_certificates` is in your permission system
3. JWT token includes the correct role

### Issue: Templates not showing in frontend
**Solution:** 
1. Verify backend API returns templates: `curl http://localhost:8000/api/v1/issuable-certificates/templates/`
2. Check browser console for errors
3. Ensure tenant is correctly set (cschema header)

### Issue: PDF download not working
**Solution:** 
- PDF generation requires additional setup (wkhtmltopdf or similar)
- For now, the feature saves HTML; PDF generation can be added later
- Frontend will download the HTML-rendered PDF via browser print

---

## 📞 Next Phase Features (Optional)

These could be added in future iterations:

1. **PDF Generation**
   - Use wkhtmltopdf, Weasyprint, or Playwright for server-side PDF generation
   - Cache generated PDFs in `pdf_content` field

2. **Bulk Certificate Generation**
   - Generate certificates for multiple students at once
   - Download as ZIP file

3. **Certificate Templates Library**
   - Share templates across tenants
   - Import pre-designed templates

4. **Digital Signatures**
   - Add signature images to certificates
   - QR codes for verification

5. **Email Delivery**
   - Send generated certificates via email
   - Track delivery status

---

## ✨ Implementation Complete!

Your issuable certificate system is ready for deployment. Follow the setup steps above to activate it in your environment.

For questions or issues, refer to the code comments in:
- `app/service/student/issuable_certificate_service.py` — Business logic
- `app/api/v1/student/issuable_certificate_endpoints.py` — API endpoints
- `src/api/hooks/students/useIssuableCertificates.ts` — Frontend hooks

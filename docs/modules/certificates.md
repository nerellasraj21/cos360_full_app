# Certificates
Student certificate files (documents the school receives, and certificates it issues), certificate types, and HTML certificates generated from templates ("issuable certificates").
_Last verified against code: 2026-10-07_
Flows, decisions, and feature map: [graph view](../graph/views/certificates.md) (source: docs/graph/graph.jsonl).

Related: `docs/architecture.md` (5 local `media/` storage, 6 Celery beat), `docs/permissions.md`, `docs/modules/students.md` (the student documents list merges certificates).

## What it does
There are **two independent subsystems**. They share no tables.

**A. Uploaded certificate files.** Tables: `student_certificates` (model `CertificateIssue`), `certificate_types`, `stale_file_registry`, `file_audit_log`.
- `certificate_category` is `received | issued`:
  - **received**: a document the school collects from the family, e.g. a previous TC or birth certificate. It has no issue date.
  - **issued**: a certificate the school issues. `issue_date` is required.
- **Admin-only operations.** The code checks `role == "Admin"` by role name, **in addition to** the `student_certificates:*` permission. This covers:
  - uploading (`POST /certificates/received`, `POST /certificates/issued`)
  - the admin lists (`GET /certificates/received`, `/issued`, `/by-student/{id}`)
  - the cascade selector (`/certificates/selector/*`)
  Parents and students never upload.
- **Legacy routes without the role check:** `POST /certificates/` (stored as `received`, `issue_date` defaults to today, files under `certificates/`) and `GET /certificates/?student_id=&certificate_type_id=` need only `student_certificates:create`/`list`, so Staff can upload and Staff and Teacher can list through them.
- **Viewing:**
  - Student: `GET /certificates/my` (`student_certificates:list_own`; the student is resolved from the token).
  - Parent: `GET /certificates/my-child/{student_id}` and its `/received` and `/issued` variants. Access goes through `check_user_resource_access` plus an explicit parent-child link check (403 if the child isn't linked, or "Parent profile not found" if the user has no `parents` row).
  - A Student may call the `/my-child/{id}` variants for their own id only (403 otherwise). Admin, Staff and Teacher may call them for any student.
  - `GET /certificates/{id}` uses `read_own` for Students and `read_related` for Parents and then checks ownership (`app/tools/ownership.py`); Admin, Staff and Teacher read any certificate.
- **Files:**
  - `FileManager` (`app/service/student/file_manager.py`) writes to `media/{tenant_id}/{certificates|received_docs|issued_certs}/{student_id}/{uuid}.{ext}`. The tenant id comes from the request token.
  - Max 10 MB. Allowed extensions: `.pdf .jpg .jpeg .png .docx`. PDFs must start with `%PDF`. Filenames containing `..`, `/` or `\` are rejected.
  - A MIME type that doesn't match the extension is only logged. The original filename is discarded.
  - Uploaded certificate `remarks` is capped at 255 characters (the column size); longer text is 422. PATCH with an unknown `certificate_type_id` is 404.
- **Replace or delete:** the old file moves to `media/stale/<key>` and a `stale_file_registry` row gets `expires_at = now + 10 days` (`STALE_FILE_TTL_DAYS`). The DB row itself is hard-deleted. Celery beat `cleanup_stale_files` runs daily at 02:00 UTC and removes expired stale files for every active tenant.
- **Audit:** every upload, update, delete and download writes a `file_audit_log` row (`actor_id`, `actor_role`, `student_id`, `certificate_id`, `action`, `s3_key`, `tenant_schema`, which holds the tenant id). No endpoint reads it.
- **Download:** `GET /certificates/{id}/download` returns `{presigned_url, expires_in_seconds: 900, certificate_id, filename}` (`filename` is always null).
  - `presigned_url` is really the relative path `/media/<key>`. It never expires.
  - Who may download: Admin, Staff and Teacher any certificate; a Student only their own; a Parent only a linked child's (403 otherwise).
- **Certificate types** (`/certificates/types/`): the name is unique per tenant (400 on a duplicate); `description` is optional.
  - Delete is blocked with 400 while any certificate uses the type.
  - `GET /certificates/types/search?q=&limit<=100` needs `student_certificates:list`. The other type routes need `certificate_types:*` (by default writes are Admin only; reads include Student but not Parent).

**B. Issuable (template-generated) certificates.** Tables: `issuable_certificate_templates`, `generated_certificates`. Prefix `/issuable-certificates`; every route has a **trailing slash**.
- A template is HTML containing `{{placeholder}}` tokens. On create/update, `variables_used` is filled with the comma-separated names found by the regex `\{\{(\w+)\}\}`. `color_theme` is not validated.
- **Permissions:**
  - Template create/update/delete and `POST /generate/` are **Admin-only by role name**.
  - `GET /templates/` (active only), `GET /templates/{id}/` (inactive too), `GET /issued/?student_id=` and `GET /issued/{id}/` need `issuable_certificates:read`.
  - `DELETE /issued/{id}/` needs `issuable_certificates:delete`.
  - By default only Admin holds the read and delete grants.
- Both tables soft-delete with `is_active = "False"`. The column is a **string**.
- `POST /generate/ {student_id, template_id, edited_html, remarks?}` stores the HTML exactly as sent. **The backend does no placeholder filling and makes no PDF.** `pdf_content` is never written. It rejects an inactive template (400) and a `student_id` that is not in the tenant (404).
- Three default templates exist: Bonafide (green, confirms enrollment), Transfer (blue), and Conduct (red, character). They can be added two ways:
  - `scripts/setup_issuable_certificates.py [tenant]` (creates the tables and seeds the templates; per-schema, not converted to the shared schema).
  - The web "Load Default Templates" button, which posts `src/lib/defaultCertificateTemplates.ts`.

## Where the code lives
| Layer | Backend | Web | Mobile |
|---|---|---|---|
| Endpoints | `app/api/v1/student/{certificate,certificate_type,issuable_certificate}_endpoints.py` (prefixes `/certificates`, `/certificates/types`, `/issuable-certificates`) | - | - |
| Services | `app/service/student/{student_certificate,certificate_type,issuable_certificate}_service.py`, `file_manager.py`; ownership helpers `app/tools/ownership.py` | | |
| Models / schemas | `app/models/student/{student_certificate,certificate_type,issuable_certificate}_model.py`, `app/schemas/student/{certificate,certificate_type,issuable_certificate}_schema.py` | `src/types/certificates/{types,issuable}.ts` | types inline in `src/api/students.ts` |
| Jobs / scripts | `app/tasks/students/certificate_tasks.py` (beat schedule in `app/celery_app.py`); `scripts/setup_issuable_certificates.py`, `seed_issuable_cert_permissions.py`, `seed_cert_templates_direct.py` (all per-schema); tables are in migration `0001_baseline_shared_tenancy.py` | | |
| API / hooks | | `src/api/hooks/students/{certificates,useIssuableCertificates}.ts`, `src/api/certificateTypes.ts`, `src/constants/api/certificates.ts` | `src/api/students.ts` (`studentCertificatesApi`, `issuableCertificatesApi`), `src/api/hooks/students/certificates.ts`, `src/utils/certificateTemplate.ts` |
| UI | | `src/pages/students/CertificatePage.tsx` (role router, used by routes `certificates`, `certificatesupload`, `mycertificates`, `studentcertificates`), `CertificateUploadPage`, `MyCertificatesPage`, `ParentCertificatePage`, `StudentCertificatesPage` (Teacher), `CertificateTypesPage`, `CertificateTemplatesPage`; `src/components/students/{IssuableCertificateGenerator,TemplateManager,CertificateEditor,CertificateTypeManager}.tsx` | `app/students/{certificates,certificateupload,studentcertificates,mycertificates,certificatetypes,certificatetemplates}.tsx`, `app/parents/documents.tsx` |

Dead code: mobile `src/api/certificates.ts` (only re-exported by `src/api/index.ts`, never used, and it calls routes that don't exist) and web `src/api/certificates.ts`.

## Rules & gotchas
1. **Category is ignored when listing.** `list_certificates` has no category filter, so `GET /certificates/received`, `/issued`, `/my-child/{id}/received` and `/my-child/{id}/issued` all return **both** kinds. The list items also leave out `certificate_category` (it is `null` in lists and set only on create responses).
   - Clients can't tell the two kinds apart in lists. Add a category filter in the service before building separate tabs.
2. **Relative download URL.** The `presigned_url` is `/media/...`. Every web certificate page prefixes the API origin (`config.api.baseURL` without `/api/vN`); mobile passes the relative path to `Linking.openURL`, which fails. Always prefix.
3. **Media links need a tenant header.** In strict tenant mode `TenantMiddleware` answers a `/media/...` request that has no `cschema` header and no bearer token with 400, so a prefixed link opened as a plain browser navigation still fails. See `architecture.md`.
4. **Multipart file field is `file`.** The web create/update hooks and mobile `certificateupload.tsx` send `file`; `certificate_file` is 422.
5. **Admin-only is by role name.** A tenant `Staff` user who holds every `student_certificates` permission still gets 403 on upload, admin lists and the selector ("Only Admin can ..."). The web still routes Staff (and any non-student/parent/teacher role) to `CertificateUploadPage`. Mobile sends Teachers to the admin view as well.
6. **Trailing slash on types.** `GET /certificates/types` (no slash) matches `GET /certificates/{certificate_id}` first and fails with a UUID 422, because the `/certificates` router is mounted before `/certificates/types`. Always call `/certificates/types/`.
   - `/issuable-certificates/*` routes are declared with trailing slashes too; a slashless call gets a 307 redirect. Call them exactly as declared.
7. **Pagination keys differ.** Certificate lists return `{items,total,has_next}`, while `GET /certificates/types/` returns `{items,total_count,has_next}` (the shared `PaginatedResponse`). Certificate list `skip`/`limit` are not validated: a negative `skip` is 500 and `limit=0` returns an empty page.
8. **`is_active` is a string.**
   - Create writes `"True"` and delete writes `"False"`.
   - `PUT /issuable-certificates/templates/{id}/` with a boolean `is_active` assigns it to the string column and returns 500; neither client sends it.
   - Queries compare with `func.lower(is_active) == "true"`; the web `TemplateManager` badge and generator filter check `=== "True"`.
   - Keep comparisons case-insensitive until the column becomes Boolean.
9. **Template writes break the DB rule.** `create_template` and `update_template` use `commit()` -> `refresh()`, which the repo rules forbid. `generate_certificate` already uses `flush()` -> `select()` -> `commit()`; follow it when touching the template writes.
10. **Generated certificates are admin-only to see.** They are not in `/students/documents/all`, `/certificates/by-student`, `/certificates/my` or the parent views; only the admin generator reads `/issuable-certificates/issued/`.
11. **Signature columns are never written.** `issued_by_name` and `issuer_signature_path` exist on `student_certificates`, and `_upload_signature` (PNG/JPG, max 2 MB) exists, but no endpoint accepts them.
12. **New tenants get no certificate templates.** The tables exist in the baseline migration, but provisioning seeds no `issuable_certificate_templates` rows, and the old seed scripts (`seed_cert_templates_direct.py`, `seed_issuable_cert_permissions.py`) target per-tenant schemas.
13. **Certificate type input is barely validated.** An empty `name` is accepted, and a name over 100 or a description over 255 characters fails with 500 instead of 422.

## Web / mobile parity
| Area | Web | Mobile |
|---|---|---|
| Teacher view | read-only `StudentCertificatesPage` | falls through to the admin screen (Admin-only endpoints return 403) |
| Generate issuable | fills placeholders (school name typed by the admin, kept in localStorage), previews, prints | fills placeholders from the student's admission (`src/utils/certificateTemplate.ts`); `school_name`, class, section and leaving dates stay unfilled; no preview or print |
| Template CRUD | `TemplateManager` + "Load Default Templates" | `certificatetemplates.tsx` (CRUD, plain-text preview) |
| Download | every page prefixes the origin (still blocked by rule 3) | relative URL via `Linking.openURL` (broken) |
| Student search on upload page | cascade + client-side name/admission-number search | cascade only |

## Known gaps
- Category filtering is missing from all list endpoints (rule 1).
- Downloads cannot be opened as plain links (rule 3), and mobile does not prefix the origin (rule 2).
- `date_of_leaving*` placeholders are left blank on web (the data isn't stored).
- There is no server-side PDF, no signature/issuer support, and no QR verification. Generated certificates are invisible to students and parents.
- `media/` has no per-file auth check: anyone who sends a `cschema` header or any bearer token can fetch a certificate file by its URL (see `architecture.md`).
- `generated_certificates.student_id` and `issued_by` have no foreign keys (generate validates the student and an active template in the service), and `GET /issuable-certificates/issued/` is unpaginated.
- Updating a template's `is_active` through the API fails with 500 (rule 8).
- Endpoints read `UUID(current_user["sub"])` without a guard, so a malformed `sub` gives a 500, not a 401.
- The issuable setup script is unsafe to run casually:
  - `setup_issuable_certificates.py` puts the schema argument straight into `SET search_path` with no quoting.
  - It falls back to a placeholder localhost `DATABASE_URL`.
  - Run it only with trusted schema names and an explicit `DATABASE_URL`.

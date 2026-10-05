# Certificates
Student certificate files (documents the school receives, and certificates it issues), certificate types, and HTML certificates generated from templates ("issuable certificates").
_Last verified against code: 2026-09-29_
Flows, decisions, and feature map: [graph view](../graph/views/certificates.md) (source: docs/graph/graph.jsonl).

Related: `docs/architecture.md` (§5 local `media/` storage served without auth, §6 Celery beat), `docs/permissions.md`, `docs/modules/students.md` (the student documents list merges certificates).

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
- **Viewing:**
  - Student: `GET /certificates/my` (`student_certificates:list_own`; the student is resolved from the token).
  - Parent: `GET /certificates/my-child/{student_id}` and its `/received` and `/issued` variants. Access goes through `check_user_resource_access` plus an explicit parent–child link check (403 if the child isn't linked).
  - `/my-child/{id}/issued` also lets a Student read their own.
- **Files:**
  - `FileManager` (`app/service/student/file_manager.py`) writes to `media/{cschema}/{certificates|received_docs|issued_certs}/{student_id}/{uuid}.{ext}`.
  - Max 10 MB. Allowed extensions: `.pdf .jpg .jpeg .png .docx`. PDFs must start with `%PDF`. Filenames containing `..`, `/` or `\` are rejected.
  - A MIME type that doesn't match the extension is only logged. The original filename is discarded.
- **Replace or delete:** the old file moves to `media/stale/<key>` and a `stale_file_registry` row gets `expires_at = now + 10 days` (`STALE_FILE_TTL_DAYS`). The DB row itself is hard-deleted. Celery beat `cleanup_stale_files` runs daily at 02:00 UTC and removes expired stale files for every active tenant.
- **Audit:** every upload, update, delete and download writes a `file_audit_log` row (`actor_id`, `actor_role`, `student_id`, `certificate_id`, `action`, `s3_key`, `tenant_schema`, which now holds the tenant id). No endpoint reads it.
- **Download:** `GET /certificates/{id}/download` returns `{presigned_url, expires_in_seconds: 900, certificate_id}`.
  - `presigned_url` is really the relative path `/media/<key>`. It never expires and is publicly readable.
  - Who may download: Admin, Staff and Teacher can download any certificate. A Student can download only their own. A Parent should be limited to their children, but that check is broken (see gotcha 3).
- **Certificate types** (`/certificates/types/`): the name is unique; `description` is optional.
  - Delete is blocked with 400 while any certificate uses the type.
  - `GET /certificates/types/search?q=&limit≤100` needs `student_certificates:list`. The other type routes need `certificate_types:*`.

**B. Issuable (template-generated) certificates.** Tables: `issuable_certificate_templates`, `generated_certificates`. Prefix `/issuable-certificates`; every route has a **trailing slash**.
- A template is HTML containing `{{placeholder}}` tokens. On create/update, `variables_used` is filled with the comma-separated names found by the regex `\{\{(\w+)\}\}`.
- **Permissions:**
  - Template create/update/delete and `POST /generate/` are **Admin-only by role name**.
  - `GET /templates/`, `GET /issued/?student_id=` and `GET /issued/{id}/` need `issuable_certificates:read`.
  - `DELETE /issued/{id}/` needs `issuable_certificates:delete`.
- Both tables soft-delete with `is_active = "False"`. The column is a **string**.
- `POST /generate/ {student_id, template_id, edited_html, remarks?}` stores the HTML exactly as sent. **The backend does no placeholder filling and makes no PDF.** `pdf_content` is never written. It rejects an inactive template (400) and a `student_id` that is not in the tenant (404).
- Uploaded certificate `remarks` is capped at 255 characters (the column size); longer text is 422.
- Three default templates exist: Bonafide (green, confirms enrollment), Transfer (blue), and Conduct (red, character). They can be added two ways:
  - `scripts/setup_issuable_certificates.py [tenant]` (creates the tables and seeds the templates).
  - The web "Load Default Templates" button, which posts `src/lib/defaultCertificateTemplates.ts`.

## Where the code lives
| Layer | Backend | Web | Mobile |
|---|---|---|---|
| Endpoints | `app/api/v1/student/{certificate,certificate_type,issuable_certificate}_endpoints.py` (prefixes `/certificates`, `/certificates/types`, `/issuable-certificates`) | — | — |
| Services | `app/service/student/{student_certificate,certificate_type,issuable_certificate}_service.py`, `file_manager.py` | | |
| Models / schemas | `app/models/student/{student_certificate,certificate_type,issuable_certificate}_model.py`, `app/schemas/student/{certificate,certificate_type,issuable_certificate}_schema.py` | `src/types/certificates/{types,issuable}.ts` | types inline in `src/api/students.ts` |
| Jobs / scripts | `app/tasks/students/certificate_tasks.py` (beat schedule in `app/celery_app.py`); `scripts/setup_issuable_certificates.py`, `seed_issuable_cert_permissions.py`, `seed_cert_templates_direct.py`; migration `m1n2o3p4q5r6_add_issuable_certificate_tables.py` | | |
| API / hooks | | `src/api/hooks/students/{certificates,useIssuableCertificates}.ts`, `src/api/certificateTypes.ts`, `src/constants/api/certificates.ts` | `src/api/students.ts` (`studentCertificatesApi`, `issuableCertificatesApi`), `src/api/hooks/students/certificates.ts` |
| UI | | `src/pages/students/CertificatePage.tsx` (role router, used by routes `certificates`, `certificatesupload`, `mycertificates`, `studentcertificates`), `CertificateUploadPage`, `MyCertificatesPage`, `ParentCertificatePage`, `StudentCertificatesPage` (Teacher), `CertificateTypesPage`, `CertificateTemplatesPage`; `src/components/students/{IssuableCertificateGenerator,TemplateManager,CertificateEditor,CertificateTypeManager}.tsx` | `app/students/{certificates,certificateupload,studentcertificates,mycertificates,certificatetypes,certificatetemplates}.tsx` |

Dead code: mobile `src/api/certificates.ts` (it is not imported, and it calls routes that don't exist) and web `src/api/certificates.ts`.

## Rules & gotchas
1. **Category is ignored when listing.** `list_certificates` has no category filter, so `GET /certificates/received`, `/issued`, `/my-child/{id}/received` and `/my-child/{id}/issued` all return **both** kinds. The list items also leave out `certificate_category` (it is set only on create responses).
   - Clients can't tell the two kinds apart in lists. Add a category filter in the service before building separate tabs.
2. **Relative download URL.** The `presigned_url` is `/media/...`. Only the web admin page prefixes the API origin. The web Student, Parent and Teacher pages set `window.location.href` to the relative path, and mobile passes it to `Linking.openURL`, so all of them break unless the web app and API share an origin. Always prefix, as `CertificateUploadPage.handleDownload` does.
3. **Parent download always 403.** `download_certificate` compares `StudentParentLink.parent_id` with the **user** id, but it must resolve `parents.id` from `parents.user_id` first, as `/my-child/*` does.
4. **Multipart file field is `file`.** The web create/update hooks and mobile `certificateupload.tsx` now send `file` (they used `certificate_file` before).
5. **Admin-only is by role name.** A tenant `Staff` user who holds every `student_certificates` permission still gets 403 on upload, lists and the selector. The web still routes Staff (and any non-student/parent/teacher role) to `CertificateUploadPage`. Mobile sends Teachers to the admin view as well.
6. **Trailing slash on types.** `GET /certificates/types` (no slash) matches `GET /certificates/{certificate_id}` first and fails with a UUID 422, because the `/certificates` router is mounted before `/certificates/types`. Always call `/certificates/types/`.
   - `/issuable-certificates/*` routes are declared with trailing slashes too; call them exactly as declared.
7. **Pagination keys differ.** Certificate lists return `{items,total,has_next}`, while `GET /certificates/types/` returns `{items,total_count,has_next}` (the shared `PaginatedResponse`).
8. **Tenant fallback.** When the `cschema` header is missing, the certificate endpoints fall back to the hardcoded tenant folder `little_bunny` for file paths and audit rows. They also use the **header value** (client name), not the schema name, as the folder name.
9. **`is_active` is a string.**
   - Create writes `"True"`. Update with a boolean `is_active` stores `"true"` or `"false"`.
   - Queries compare with `func.lower(is_active) == "true"`.
   - The web `TemplateManager` badge checks `=== "True"`, so an updated template shows as inactive.
   - Keep comparisons case-insensitive until the column becomes Boolean.
10. **Generate breaks the DB rule.** `generate_certificate` uses `commit()` → `refresh()`, which the repo rules forbid because it breaks the tenant schema context. Fix to `flush()` → `select()` → `commit()` when touching it.
11. **Generated certificates are admin-only to see.** They are not in `/students/documents/all`, `/certificates/my` or the parent views; only the admin generator reads `/issuable-certificates/issued/`.
12. **Signature columns are never written.** `issued_by_name` and `issuer_signature_path` exist on `student_certificates`, and `_upload_signature` (PNG/JPG, max 2 MB) exists, but no endpoint accepts them.
13. **No ownership check on `GET /certificates/{id}`.** A Student passes with `read_own`, but ownership is never checked, so any certificate's metadata can be read by id. Staff and Teacher can read everything.
14. **New tenants get no certificate templates.** The tables exist in the baseline migration, but provisioning seeds no `issuable_certificate_templates` rows, and the old seed scripts (`seed_cert_templates_direct.py`, `seed_issuable_cert_permissions.py`) target per-tenant schemas.

## Web / mobile parity
| Area | Web | Mobile |
|---|---|---|
| Teacher view | read-only `StudentCertificatesPage` | falls through to the admin screen (Admin-only endpoints → 403) |
| Generate issuable | fills placeholders, previews, prints | sends the **raw template** as `edited_html`, so placeholders are stored unfilled; no preview or print |
| Template CRUD | `TemplateManager` + "Load Default Templates" | `certificatetemplates.tsx` (CRUD, plain-text preview) |
| Download | admin page prefixes the origin; other roles use a relative URL (broken) | relative URL via `Linking.openURL` (broken) |
| Student search on upload page | cascade + client-side name/admission-number search | cascade only |

## Known gaps
- Category filtering is missing from all list endpoints (rule 1).
- Parent download is broken (rule 3). Downloads for non-admin roles and on mobile are broken by the relative URL (rule 2).
- `school_name` is hardcoded to "Your School Name" in the web generator, and `date_of_leaving*` placeholders are left blank (the data isn't stored).
- There is no server-side PDF, no signature/issuer support, and no QR verification. Generated certificates are invisible to students and parents.
- `media/` is served without auth, so any certificate file is public to anyone holding its URL (see `architecture.md`).
- `generated_certificates.student_id` and `issued_by` have no foreign keys (generate validates the student and an active template in the service), and `GET /issuable-certificates/issued/` is unpaginated.
- Endpoints read `UUID(current_user["sub"])` without a guard, so a malformed `sub` gives a 500, not a 401.
- The issuable setup script is unsafe to run casually:
  - `setup_issuable_certificates.py` puts the schema argument straight into `SET search_path` with no quoting.
  - They fall back to a placeholder localhost `DATABASE_URL`.
  - Run them only with trusted schema names and an explicit `DATABASE_URL`.

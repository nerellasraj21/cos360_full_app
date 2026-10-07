# Printable documents: paper engine and report cards - implementation plan

Status: proposed, not started. Nothing in this plan is built. Written 2026-10-06 against the code as of branch `feat/shared-tenancy`.

Scope: one shared "paper engine" in the backend that produces every printable school document, then the documents on top of it, in this order: fee receipt, hall ticket, report card, certificate, then the smaller documents. The creative Reports work (question bar, Report Studio, briefs) is a separate plan that follows this one.

## 1. What exists today

| Document | Where | State |
|---|---|---|
| Fee receipt PDF | `app/service/fee/fee_receipt_service.py` (`generate_receipt_pdf`, ReportLab), endpoint `GET /fee/collection/receipts/{receipt_id}/pdf` | Works. Prints the placeholders "School Name" / "School Address" (`fee_receipt_service.py:182`, TODO). No logo, no QR, A4 only. Receipt rows already carry a SHA-256 integrity hash and a reprint counter. |
| Hall ticket PDF / ZIP | `app/tasks/exam/hall_ticket_pdf.py` (ReportLab) | Works. Own layout code, A4 only, no photo, no QR. |
| Certificates | `issuable_certificate_templates` (HTML with `{{placeholder}}`), `issuable_certificates.pdf_content` | The backend stores the HTML as sent and never fills placeholders or builds a PDF. Web sends the raw template. Students and parents cannot see them. |
| Report card | `student_exam_results`, `student_subject_results`, `student_marks`, grade schemes and bands, remark grades | Data exists. No report card document, no remarks, no co-scholastic. |
| Report exports (CSV, XLSX, PDF) | `app/service/reports/base_report_service.py` | Works for table-style reports. Out of scope here. |
| School identity | `school_settings`: `school_name`, `address`, `city`, `state`, `pin_code`, `contact_no`, `school_email`, `image_url`, `principal_signature_url`, `school_board` | Exists, one row per tenant, not used by any PDF. |
| Libraries | `reportlab==4.0.4`, `Pillow==10.4.0`, `Jinja2==3.1.6`, `pypdf==6.1.0` | Already installed. ReportLab ships a QR widget, so no new dependency for QR codes. |
| Media | `/media` served from local disk (`app/main.py`) | Logos and signatures are paths under `media/`. |

## 2. Decisions to confirm before building

1. **Rendering approach (recommended: ReportLab document kit).**
   - Option A, recommended: extend ReportLab with a small shared kit (letterhead, header block, key-value block, table, signature row, QR, watermark, footer). Already a dependency, no native libraries, works on the Windows dev machines and in the existing container. Each document is a short composer function.
   - Option B: Jinja2 HTML to PDF with WeasyPrint. Easier for school-editable certificates, but needs native GTK/Pango libraries (painful on Windows, new container packages).
   - Option C: headless Chromium. Highest fidelity, heaviest to run.
   - Plan: Option A for all structured documents. Certificates keep HTML templates for editing and preview; the server fills placeholders with a sandboxed Jinja2 environment and renders the result through ReportLab's paragraph markup (bold, italic, size, colour, line breaks, tables). A one-day spike in phase 0 proves this on the real Bonafide and Transfer Certificate templates. If the spike fails, certificates alone move to Option B.
2. **Indian scripts.** ReportLab's built-in fonts cannot print Telugu, Hindi or Tamil names. Embed Noto Sans plus Noto Sans Telugu and Noto Sans Devanagari (SIL Open Font License) under `backend/app/assets/fonts/`. Complex-script shaping is not done by ReportLab, so the spike must test real Telugu names; if shaping is wrong the fallback is to print the English name only, with the local-language name as an optional field.
3. **Verification.** Every issued document gets a QR code pointing to a public verify page. The link carries a signed token (HMAC with the app secret) holding tenant id, document id and content hash. The public endpoint needs no login and returns only: document type, issued date, school name, holder name, and valid or tampered. It must not return marks, amounts or contact details.
4. **Paper sizes.** A4 (default), A5 and 80 mm thermal (receipts only), plus CR80 card size for ID cards. Per-tenant default in print settings.
5. **Bulk output.** Whole-class report cards and hall tickets are built synchronously in a streaming loop and merged with `pypdf`, with a hard cap (default 300 students per request) until the Celery worker and Redis are deployed. Above the cap the API returns 409 with a message to split by section.

## 3. New data model (migration 0008, one Alembic revision)

All tables are tenant tables: `tenant_id` column, `enable_tenant_rls`, UUID primary keys, `created_at` / `updated_at`.

- `print_settings` (one row per tenant): `default_paper` (`A4`/`A5`), `receipt_paper` (`A4`/`A5`/`thermal80`), `accent_color`, `show_qr` (bool), `footer_text`, `show_logo` (bool), `watermark_text` (nullable), `signature_label` (default "Principal"). Letterhead content is not duplicated here; it is read from `school_settings`.
- `generated_documents` (audit and verify ledger): `doc_type` (`fee_receipt`, `hall_ticket`, `report_card`, `certificate`, `id_card`, `fee_statement`), `entity_id` (UUID of the receipt, ticket, result set or certificate), `student_id` (nullable), `serial` (text, sequential per tenant and type), `content_hash` (SHA-256 of the data snapshot), `generated_by`, `reprint_count`, `created_at`. Gives the audit trail reports lack today and the record the QR verifies against.
- `report_card_templates`: `name`, `academic_year_id`, `class_ids` (array), `layout` (`classic` / `compact` / `detailed`), `columns` (JSON list of `{label, exam_id, weight_percent}` so one card can combine Unit Test 1, Mid-term, Unit Test 2 and Annual), `show_rank`, `show_attendance`, `show_remarks`, `grading_scheme_id`, `is_active`.
- `report_card_remarks`: `exam_id` or `template_id`, `student_id`, `class_teacher_remark` (text, 300), `principal_remark` (text, 300), `conduct_grade` (nullable), `promoted_to` (text, nullable), `result_status` (`pass`/`fail`/`promoted`/`detained`/`pending`), `published` (bool), `published_at`, unique per (template, student).
- Co-scholastic grades (art, sports, discipline, values) are NOT in the first release. Reserve a `report_card_coscholastic` table in phase 3b only if the schools ask; the exam module doc lists it as not built.

No change to `school_settings` columns. If a school address is stored in several columns, the kit formats the letterhead in one helper.

## 4. The paper engine (phase 0)

Location: `backend/app/service/documents/`.

- `fonts.py`: registers the embedded fonts once, with a safe fallback to Helvetica.
- `theme.py`: accent colour, margins and type scale per paper size.
- `letterhead.py`: reads `school_settings` and `print_settings`; draws logo (from `image_url`, resized with Pillow, cached), school name, address line, contact line, board. Missing values are skipped, never printed as placeholders.
- `blocks.py`: `key_value_block`, `table_block`, `signature_row` (principal signature image from `principal_signature_url` when present), `qr_block`, `watermark`, `footer`.
- `registry.py`: `DOCUMENT_TYPES` mapping `doc_type` to a composer, a data loader, a required permission and a serial prefix.
- `render.py`: `render(doc_type, entity_id, paper, db) -> bytes`, writes the `generated_documents` row, builds the QR, enforces tenant context.
- `verify.py`: sign and check tokens.
- API: `app/api/v1/documents/` mounted at `/documents`:
  - `GET /documents/{doc_type}/{entity_id}.pdf?paper=A4` (download or inline)
  - `GET /documents/verify/{token}` (public, rate limited, listed with the public endpoints in `docs/modules/tenants-and-admin.md`)
  - `GET /documents/settings` and `PUT /documents/settings` (print settings)
  - `GET /documents/history?student_id=` (ledger, `documents:list`)
- Existing endpoints keep their URLs and call the engine, so web and mobile do not break (receipt PDF, hall ticket PDF/ZIP).
- Permissions: documents reuse the permission of the thing they print (`fee_receipts:read` for a receipt, `hall_tickets` for tickets) and add `report_cards: read, list, create, update, publish`. Student and parent get `report_cards:read_own` / `read_related`, only when `published`.

Acceptance for phase 0: a unit test renders a letterhead with and without logo and with a Telugu school name; the PDF opens, has the school name text, and contains no "School Name" placeholder.

## 5. Phases and deliverables

### Phase 1: Fee receipt on the engine
- Receipt composer: letterhead, receipt number, date, student, class and section, admission number, line items (fee type, term, amount), concession, total, payment method details (cheque number, UPI reference), balance after payment, cashier, QR, "Reprint" stamp with count when `reprint_count > 0`.
- Papers: A4, A5, thermal 80 mm (single column, no logo option).
- Fixes the TODO in `fee_receipt_service.py:182`.
- Tests: receipt PDF for each payment method, thermal width, reprint stamp, tenant isolation (receipt of another tenant returns 404), tampered verify token returns "invalid".

### Phase 2: Hall ticket on the engine
- Same data loader as today (`_load_hall_ticket_data`), new composer: letterhead, student photo (from `students.photo`, placeholder silhouette if missing), exam name and dates table with time and venue, eligibility line, instructions block (editable text in print settings), signature row, QR.
- ZIP per class kept; add a merged single PDF option.
- Tests: ZIP contains one file per eligible student; ineligible student returns 409; photo missing does not fail.

### Phase 3: Report card (largest piece)
1. Data: a `report_card_loader` that, for a student and a template, gathers per-column exam results (`student_subject_results`, component marks from `student_marks`), the grade scheme bands for letter grades, class rank (`student_exam_results.rank`), attendance summary from `student_attendance` for the academic year, and the remarks row.
2. Calculation: weighted total across columns using `report_card_templates.columns[].weight_percent`; subjects absent in an exam show "AB"; fail rule follows the exam module's pass marks. All calculation is in a pure function with unit tests, using the same rounding as `compute` in `result_endpoints.py`.
3. Layouts: `classic` (one table, one page), `compact` (small classes of subjects, A5), `detailed` (components per subject, second page for remarks and attendance).
4. Endpoints:
   - `GET /exams/report-card-templates` and CRUD (admin).
   - `PUT /exams/report-card-remarks/{template_id}/{student_id}` (class teacher for own class, admin).
   - `GET /report-cards/{template_id}/students/{student_id}.pdf`
   - `GET /report-cards/{template_id}/class/{class_id}/sections/{section_id}.pdf` (merged) and `.zip`
   - `POST /report-cards/{template_id}/publish` (sets `published` for a class and section; parents and students see only published cards)
   - `GET /report-cards/my` and `GET /report-cards/child/{student_id}` (read own / related).
5. Web: Report Cards page under Exam (template builder, remarks grid with keyboard entry like mark entry, preview, publish, class download). Mobile: view and download for parent and student; remarks entry for class teachers is web only in the first release.
6. Tests: weighted maths, absent handling, fail status, rank ties, publish gate (student gets 403 or 404 until published), teacher cannot read another class, 300-student cap returns 409, merged PDF page count equals students times pages.

### Phase 4: Certificates
- Backend fills placeholders with a sandboxed Jinja2 environment (also removes the template-injection risk noted in the communication doc for a different module; do not reuse that module's code). Variables: student, class, section, admission number, dates, parents, school name, address, academic year, issue date, serial, principal.
- Builds the PDF through the engine, stores it in `pdf_content`, writes a `generated_documents` row, QR verify.
- Fix the web generator so it sends filled HTML or only the template id plus remarks (server-side fill is the source of truth).
- Visibility: students and parents can see their issued certificates (`own` / `related`).
- Tests: placeholder fill, unknown placeholder returns 400 with its name, inactive template 400, injection attempt `{{ ''.__class__ }}` is blocked.

### Phase 5: Smaller documents (each is one composer plus a data loader)
- Fee statement per student for a year (ledger of mappings, payments, concessions, balance).
- Day book / collection report print for the accounts desk (totals by payment method, refunds).
- ID card: CR80 front and back, 10 per A4 sheet, photo, QR, validity, blood group, emergency contact.
- Attendance register print per class and month.
- Admission form print (blank and filled).
- Each one is optional and ordered by what the school asks for.

### Phase 6: Clients and design
- First: design all of these screens in the Vartul prototype (print centre, paper preview, report card builder, remarks grid), no app code.
- Web: a shared `PrintPreview` dialog (PDF in an iframe, paper selector, download, print) used by receipts, hall tickets, report cards and certificates; a Print Settings page under School Settings.
- Mobile: download and share (Expo sharing), and an in-app PDF view.
- Types mirrored in `web/src/types/` and `mobile/src/types/`.

## 6. Testing and quality gates

- Unit tests in `backend/tests/unit/`: fonts register, letterhead composition, weighted report card maths, token sign and verify, paper sizes.
- API tests in `backend/tests/api/documents/` and `tests/api/exam/`: content type is `application/pdf`, body starts with `%PDF`, page counts, permission matrix per role, tenant isolation, published gate, verify endpoint (valid, tampered, wrong tenant, expired not applicable).
- Text extraction check with `pypdf`: letterhead school name, student name, totals present; no placeholder text.
- Visual check: render the first page of each document to PNG in the QA project (`COS360_QA`) and keep the images for manual review. Add the new cases to the Excel catalog as `TC-DOC-*`.
- Manual print test on one A4 laser, one thermal 80 mm printer and one phone PDF viewer before release.
- Safety: all tests run on the local `cos360_unischema` database and `qa_` tenants only.

## 7. Risks

- **Complex-script shaping** (Telugu) in ReportLab. Mitigated by the phase 0 spike and the English-name fallback.
- **Memory and time for bulk PDFs.** Mitigated by the 300-student cap and per-student streaming; revisit when the Celery worker is deployed.
- **Logo and signature files on local disk.** `/media` is container-local; a multi-container deploy needs shared storage. Same limit already applies to the rest of the app.
- **Data accuracy on report cards.** Schools will challenge any rank or percentage. Mitigated by reusing the existing compute results as the single source and by showing the calculation in the detailed layout.
- **Scope creep** on report card layouts. First release ships three layouts and no free-form designer.
- **Plan layer and permissions** are not enforced at runtime (see `docs/permissions.md`), so each new endpoint must check the role layer itself.

## 8. Order and size (rough, one developer)

| Step | Size |
|---|---|
| Phase 0: engine, fonts, letterhead, migration, spike | 1 week |
| Phase 1: receipt | 3 days |
| Phase 2: hall ticket | 3 days |
| Phase 3: report card (backend 1.5 weeks, web 1 week, mobile 3 days) | about 3 weeks |
| Phase 4: certificates | 1 week |
| Phase 5: smaller documents | 1 week for all, or 2 days each |
| Phase 6: Vartul design and client polish (runs alongside) | 1 week |

## 9. Knowledge base updates when this is built

- New `docs/modules/documents.md` (rules, code map, parity, gaps); update `fee.md`, `exam.md`, `certificates.md`, `reports-dashboards.md` where they now say "not built".
- Graph: record the decision to use ReportLab over HTML-to-PDF, the signed verify token design, and the paper-engine flow (`python scripts/graph/kg_lint.py --format` and `python scripts/graph/kg_render.py`).
- Run `ruff check .`, `black --check .`, `pytest tests/unit/`, `npm run build:check`, `npm run lint`, `npx tsc --noEmit` in each app before committing.

## 10. Open questions for the school owner

1. Which report card layout does the school use today (one page, two pages, term-wise columns)? A sample card from a real class would settle phase 3.
2. Do report cards show rank and percentage, or grades only?
3. Which languages must names print in (English only, or Telugu / Hindi too)?
4. Which printer types matter first (A4 laser, A5, thermal receipt)?
5. Should parents see report cards in the app straight after publish, or after a release date?

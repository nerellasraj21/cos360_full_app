# Communication
Outbound SMS / WhatsApp / Email to parents and staff: reusable templates, recipient targeting, async delivery via Celery, and a per-message audit log. Also covers the holiday announcement and the module-specific "send SMS" triggers that share the same queue.
_Last verified against code: 2026-09-29_
Flows, decisions, and feature map: [graph view](../graph/views/communication.md) (source: docs/graph/graph.jsonl).

## What it does
- **Channels:** `sms` (MSG91 Flow API, DLT), `whatsapp` (Meta Cloud API, plain `text` message), `email` (SendGrid). Only outbound. There is **no** push, no in-app inbox, no read receipts, no attachments, and no inbound or reply handling.
- **Templates** (`message_templates`): name + channel + body with `{{var}}` placeholders. `variables` is always re-derived from the body on the server, and anything the client sends is ignored. `(name, channel)` is unique (400 on create). SMS bodies over 480 chars (3 credits) are rejected on create. "Delete" is a soft deactivate (`is_active=false`). Inactive templates can't be sent (400).
- **Variables:** the system resolves `name`, `student_name`, `class_name`, `section_name` per recipient (`SYSTEM_VARS` in `communication_schema.py`). Every other `{{var}}` must be supplied in `SendRequest.variables`, or the send fails with 400 before anything is queued.
- **Free-text sends:** only WhatsApp can send without a template (`template_id` omitted plus `message`). Those sends are limited to the plain parent/student/staff target types (`WHATSAPP_TEMPLATE_LESS_TARGET_TYPES`), so no `all_users`, `fee_defaulters` or `role_based`. Neither client exposes this yet.
- **Targets** (`recipient_resolver.py`, `target_type` + `target_ref`):

  | target_type | target_ref | resolves to |
  |---|---|---|
  | `individual_parent` / `multiple_parents` | `parent_id` / `parent_ids[]` | `parents` rows |
  | `individual_student` / `multiple_students` | `student_id` / `student_ids[]` | the student's linked parents (one row per parent×student) |
  | `individual_staff` / `multiple_staff` | `staff_id` / `staff_ids[]` | `staff` rows |
  | `class_section_parents` = `class_section_students` | `class_id`, optional `section_id` | parents of students admitted there |
  | `all_parents` / `all_students` / `all_staff` | `{}` | all parents / all students via parents / active staff |
  | `all_users` | `{}` | parents ∪ active staff, deduped by phone **and** email |
  | `fee_defaulters` | `{}` | parents of students with `fee_student_mappings.total_fee > 0` (proxy, see gotchas) |
  | `role_based` | `role` (role **name**) | active staff whose `users.role_id` has that name |

  Students are never contacted directly. "Student" targets always resolve to parent contacts.
- **Who can do what:** see [permissions](../permissions.md) for how the plan and role layers work.

  | Action | Endpoint | Resource:action |
  |---|---|---|
  | Create template | `POST /communication/templates` | `communications:create` |
  | List / get template | `GET /communication/templates[/{id}]` | `communications:list` |
  | Update / deactivate | `PUT` / `DELETE /communication/templates/{id}` | `communications:update` |
  | Recipient count | `GET /communication/send/preview-count` | `communications:list` |
  | Send | `POST /communication/send` | `communications:create` |
  | Log list / detail | `GET /communication/logs` / `logs/{id}` | `communications:list` / `communications:read` |
  | Holiday SMS to all parents | `POST /announcements/send-holiday-notice` | `announcements:send_sms` |
  | Module SMS triggers | see "Module-triggered SMS" below | `<module resource>:send_sms` |

  Parents and students have no access. Both clients hide the module for those roles.

## Where the code lives
| Layer | backend | web | mobile |
|---|---|---|---|
| Endpoints | `app/api/v1/communication/` (`/communication`), `app/api/v1/announcements/` (`/announcements`) | — | — |
| Models / migrations | `app/models/communication/communication_model.py`; `migrations/versions/a2b3c4d5e6f7_*`, `b7c8d9e0f1a2_*`, `d9e0f1a2b3c4_*` | — | — |
| Schemas / types | `app/schemas/communication/` | `src/types/communication.ts` | types inline in `src/api/communication.ts` |
| Services | `app/service/communication/` (`template_service`, `recipient_resolver`, `dispatch_service`, `msg91_service`, `sms_templates`) | — | — |
| Worker | `app/tasks/communication/send_tasks.py` (registered in `app/celery_app.py`) | — | — |
| API / hooks | — | `src/api/communication/communicationApi.ts`, `src/api/hooks/communication/` | `src/api/communication.ts`, `src/api/announcements.ts` |
| UI | — | `src/routes/_app/communication/` (index, compose, templates, logs) → `src/pages/Communication/`; `src/components/communication/QuickSendButton.tsx`; `src/lib/defaultCommunicationTemplates.ts` | `app/(tabs)/communication.tsx` (Compose/Templates/Logs in one screen); `app/admin/announcements.tsx`; `components/communication/QuickSendButton.tsx` |
| Seeds | `scripts/seed_communication_permissions.py`, `scripts/seed_communication_menu_test_tenant.py` | | |

## Rules & gotchas
1. **Render at queue time.** `notification_queue.rendered_message` is the immutable text. Editing a template never changes messages already queued. Jinja errors mark only that recipient as a `failed` log (`message=""`). The rest of the batch still goes out.
2. **Skipped recipients are not logged.** Recipients missing a phone (sms/whatsapp) or email are dropped silently and are not counted in `queued_count`, despite the code comment and spec FR-203. `queued_count` can be less than the preview count.
3. **Pass the tenant *schema* to the worker, not the `cschema` header.** `/communication/send` resolves it with `TenantService.get_tenant_schema(client_name)`, falling back to `cos360_masters`. The announcements endpoint and every module trigger pass `request.headers["cschema"]`, which is the client name. When client name ≠ schema name (e.g. `test_tenant` → `test_tenant_schema`), the worker cannot find the queue rows and skips them with only a warning.
4. **Worker failures roll back the batch.** `_process_single` re-raises on a provider error, so `_process_batch` never commits. The `failed` log and status are lost, and rows already sent earlier in the batch go back to `queued` and are **re-sent** on retry. After 3 retries nothing is persisted and the rows stay `queued`. Nothing checks `status == done` before sending.
5. **SMS needs MSG91 flow id + DLT TE id + positional vars.** `msg91_service.send_sms_via_msg91` rejects any row without `template_id` and `dlt_te_id` (both mandatory for Indian DLT routes). `sms_templates.py` holds the DLT-registered bodies, their ordered `var1..N` and the env names (`MSG91_TEMPLATE_ID_*`, `MSG91_DLT_TE_ID_*`). Use `build_target_ref(key, **values)` when queueing SMS.
   - Today **no caller uses it**. Module triggers and the holiday endpoint omit `dlt_te_id`, and their variable order doesn't match the registry.
   - `/communication/send` puts the `MessageTemplate` UUID in `template_id`, which fails on `.strip()`.
   - **Net effect: no SMS path currently succeeds.**
6. **DLT wording is fixed.** Per TRAI, each distinct SMS wording is its own registered template. The DB template body for SMS is only the human-readable audit copy. MSG91 renders the registered text, so editing an SMS template body changes the log text but not what the parent receives.
7. **WhatsApp sends free-form `text`.** Meta delivers these only inside the 24-hour customer-service window. Messages a business initiates need approved Meta templates, which are not implemented. Phone normalization is naive: a 10-digit number that starts with `91` is not prefixed. Use `msg91_service.normalize_phone` logic instead.
8. **Email** subject is hard-coded (`"Notification from COS360"`). `message_templates.subject` is rendered and then discarded because the queue has no subject column. The body goes out as `text/html` without escaping.
9. **Variable-name contract.** The backend field is `variables`. Both clients send `extra_variables` (the name in the spec's API contract), which Pydantic ignores. As a result, any template with a non-system variable fails with 400 "Missing user-provided template variables".
   - The clients also treat `parent_name` and `staff_name` as system variables and never ask for them. The backend does not resolve them, so they must be supplied as ordinary variables.
10. **`fee_defaulters` is a proxy.** `fee_student_mappings` has no balance column, so it targets every student with any fee mapping (`total_fee > 0`), paid or not.
11. **Fan-out duplication.** Student and class targets yield one row per (parent, student). A parent of two children gets two personalized messages. Only `all_users` dedupes, and only across the parent and staff lists.
12. **Rate limit** on `/send` is the shared `rate_limit_api()` = 200/min **per IP**, not the 10/min/user in the docstring and spec.
13. **Template update/deactivate use `commit()` → `refresh()`.** This was a MissingGreenlet workaround, and it breaks the repo rule. New code should follow `flush()` → `select()` → `commit()` (`backend/CLAUDE.md`). `PUT` doesn't re-check `(name, channel)` uniqueness (IntegrityError → 500) or the 480-char SMS limit.
14. **List quirks.** `GET /templates` returns a plain array and ignores `page`/`page_size`. Both clients normalise it to `{items,total,page,page_size}`. The clients call `/communication/templates/` with a trailing slash, which relies on FastAPI's slash redirect.
15. **Celery worker is not in `docker-compose`.** Only `web` runs `start.sh` (uvicorn). Without a separately run worker (`celery -A app.celery_app worker`) plus Redis, queue rows stay `queued`. `/send` swallows a `.delay()` failure, but the other callers don't, so they return a 500 after committing their rows.
16. **Permission seeding.** `seed_communication_permissions.py` seeds `communications: create/read/update/list` into `public.plan_resource_access`, which is copied to tenants only at onboarding. Existing tenants need tenant-level grants and a menu seed, and users must re-login to see the menu. Nothing in the repo seeds `announcements:send_sms` or any `<module>:send_sms`.

## Web / mobile parity
| Feature | Web | Mobile |
|---|---|---|
| Compose (4 target kinds, class/section checklist, staff picker, preview count) | Yes (`/communication/compose`) | Yes (Compose tab) |
| Send confirmation modal | **No**, "Send Now" sends immediately | Yes |
| Templates CRUD + deactivate (`create` / `update` gated) | Yes | Yes |
| Seed default templates | Yes | No |
| Logs list + detail | Yes | Yes |
| Access gating | `checkPermission('communications', …)` | Role-name check (student/parent aliases) and tab `hideForRoles`; no per-action permission check |
| QuickSend call sites | Admission, Staff enrollment, Staff attendance, Student attendance, Calendar holidays, Exam detail, Mark entry, Fee payment | Exam detail, Holidays |
| Holiday announcement (`/announcements/send-holiday-notice`) | No | Yes (`announcements` resource gate) |
| WhatsApp free-text | No | No |

Response-shape drift in both clients: `SendResponse` expects `channel` and `target_type`, but only `queued_count` is returned. `LogDetail` expects `updated_at`, but `target_ref` is an object, not a string.

## Known gaps
- **Security:**
  - Jinja2 renders template bodies and WhatsApp free-text with the unsandboxed `jinja2.Template`. The spec required `SandboxedEnvironment`. Anyone with `communications:create` can run server-side template injection.
  - The worker interpolates `tenant_schema` straight into `SET search_path`, and 10 callers pass the raw `cschema` header.
  - The spec's phone masking in the log list is not implemented.
- **Push notifications (FCM/APNs), in-app notification centre, and deep links:** not built. No `expo-notifications`, no device-token storage. The exam `POST /exams/{id}/notify` (`service/exam/notification_service.py`) only counts recipients; it is a stub.
- **Delivery status:** no provider webhooks, so `delivered` is never set. No read receipts, opt-out/unsubscribe, email attachments, scheduled sends (the spec'd `scheduled_at` and `retry_count` columns don't exist), manual resend, cost estimate, multi-language templates, or teacher restricted to own class/section.
- **Robustness:** the worker is not idempotent (rule 4), skipped recipients are not logged (rule 2), there is no queue pruning, and `role_based` with an unknown role returns 0 recipients instead of the 400 the spec asked for.
- **SMS wiring** (rule 5): migrate every SMS producer to `sms_templates.build_target_ref`. The `hall_ticket` template has no body yet. `.env.example` lacks the `MSG91_DLT_TE_ID_*` vars and names `MSG91_TEMPLATE_ID_STAFF_INTERVIEW` where the registry uses `MSG91_TEMPLATE_ID_STAFF_RECRUITING`.
- **Client contract bugs:** `extra_variables` vs `variables`, and the `parent_name` / `staff_name` system-variable mismatch (rule 9). Web Compose also lacks the send confirmation modal.

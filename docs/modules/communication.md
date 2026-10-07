# Communication
Outbound SMS / WhatsApp / Email to parents and staff: reusable templates, recipient targeting, async delivery via Celery, and a per-message audit log. Also covers the holiday announcement, the module-specific "send SMS" triggers that share the same queue, and the two fee SMS paths that call the provider directly.
_Last verified against code: 2026-10-07_
Flows, decisions, and feature map: [graph view](../graph/views/communication.md) (source: docs/graph/graph.jsonl).

## What it does
- **Channels:** `sms` (MSG91 Flow API, DLT), `whatsapp` (Meta Cloud API, plain `text` message), `email` (SendGrid). Only outbound. There is **no** push, no in-app inbox, no read receipts, no attachments, and no inbound or reply handling.
- **Templates** (`message_templates`): name + channel + body with `{{var}}` placeholders. `variables` is always re-derived from the body on the server, and anything the client sends is ignored. `(name, channel)` is unique per tenant (400 on create). SMS bodies over 480 chars (3 credits) are rejected on create. "Delete" is a soft deactivate (`is_active=false`) and is idempotent. Inactive templates can't be sent (400). `GET /templates` returns inactive templates too unless `is_active` is passed; an unknown `channel` filter is a 422.
- **Variables:** the system resolves `name`, `student_name`, `class_name`, `section_name` per recipient (`SYSTEM_VARS` in `communication_schema.py`). Every other `{{var}}` must be supplied in `SendRequest.variables`, or the send fails with 400 before anything is queued. A user variable with a system name overrides the system value.
- **Free-text sends:** only WhatsApp can send without a template (`template_id` omitted plus `message`). Those sends are limited to the plain parent/student/staff target types (`WHATSAPP_TEMPLATE_LESS_TARGET_TYPES`), so no `all_users`, `fee_defaulters` or `role_based`. Neither client exposes this yet.
- **Targets** (`recipient_resolver.py`, `target_type` + `target_ref`):

  | target_type | target_ref | resolves to |
  |---|---|---|
  | `individual_parent` / `multiple_parents` | `parent_id` / `parent_ids[]` | `parents` rows |
  | `individual_student` / `multiple_students` | `student_id` / `student_ids[]` | the student's linked parents (one row per parent x student) |
  | `individual_staff` / `multiple_staff` | `staff_id` / `staff_ids[]` | `staff` rows, inactive staff included |
  | `class_section_parents` = `class_section_students` | `class_id`, optional `section_id` | parents of students admitted there |
  | `all_parents` / `all_students` / `all_staff` | `{}` | all parents / all students via parents / active staff |
  | `all_users` | `{}` | parents plus active staff, deduped by phone **and** email |
  | `fee_defaulters` | `{}` | parents of students with `fee_student_mappings.total_fee > 0` (proxy, see gotchas) |
  | `role_based` | `role` (role **name**) | active staff whose `users.role_id` has that name |

  Students are never contacted directly. "Student" targets always resolve to parent contacts. An unknown `target_type` is a 422 on both `/send` and `/send/preview-count`. A missing id in `target_ref` resolves to 0 recipients, not an error.
- **Logs:** `GET /communication/logs` pages with `page` and `page_size` (max 100), newest first. `date_from` and `date_to` take an ISO date or datetime (anything else is a 422); a date-only `date_to` includes that whole day.
- **Who can do what:** see [permissions](../permissions.md) for how the plan and role layers work.

  | Action | Endpoint | Resource:action |
  |---|---|---|
  | Create template | `POST /communication/templates` | `communications:create` |
  | List / get template | `GET /communication/templates[/{id}]` | `communications:list` |
  | Update / deactivate | `PUT` / `DELETE /communication/templates/{id}` | `communications:update` |
  | Recipient count | `GET /communication/send/preview-count` | `communications:list` |
  | Send | `POST /communication/send` | `communications:create` |
  | Log list / detail | `GET /communication/logs` / `logs/{id}` | `communications:list` / `communications:read` |
  | Holiday SMS | `POST /announcements/send-holiday-notice` | `announcements:send_sms` |
  | Module SMS triggers | see the graph flow `flow:communication/module-triggered-sms` | `<module resource>:send_sms` |

  Parents and students have no access. Both clients hide the module for those roles.

## Where the code lives
| Layer | backend | web | mobile |
|---|---|---|---|
| Endpoints | `app/api/v1/communication/` (`/communication`), `app/api/v1/announcements/` (`/announcements`) | - | - |
| Models / migrations | `app/models/communication/communication_model.py`; tables are in `migrations/versions/0001_baseline_shared_tenancy.py` | - | - |
| Schemas / types | `app/schemas/communication/` | `src/types/communication.ts` | types inline in `src/api/communication.ts` |
| Services | `app/service/communication/` (`template_service`, `recipient_resolver`, `dispatch_service`, `msg91_service`, `sms_templates`) | - | - |
| Worker | `app/tasks/communication/send_tasks.py` (registered in `app/celery_app.py`), session from `app/tasks/tenant_context.py` | - | - |
| API / hooks | - | `src/api/communication/communicationApi.ts`, `src/api/hooks/communication/` | `src/api/communication.ts`, `src/api/announcements.ts` |
| UI | - | `src/routes/_app/communication/` (index, compose, templates, logs) -> `src/pages/Communication/`; `src/components/communication/QuickSendButton.tsx`; `src/lib/defaultCommunicationTemplates.ts` | `app/(tabs)/communication.tsx` (Compose/Templates/Logs in one screen); `app/admin/announcements.tsx`; `components/communication/QuickSendButton.tsx` |
| Permission defaults | `app/service/tenant/permission_catalog.py` (`ALL_ADMIN`) | | |

## Rules & gotchas
1. **Render at queue time.** `notification_queue.rendered_message` is the immutable text. Editing a template never changes messages already queued. Jinja errors mark only that recipient as a `failed` log (`message=""`). The rest of the batch still goes out.
2. **Skipped recipients are not logged.** Recipients missing a phone (sms/whatsapp) or email are dropped silently and are not counted in `queued_count`, despite the code comment and spec FR-203. The preview count does not filter by channel, so `queued_count` can be less than the preview count.
3. **Pass the tenant id to the worker, not the `cschema` header.** Every caller passes `get_tenant_id_from_request(request)`, and the worker opens `task_tenant_session(tenant_id)`, which sets `app.tenant_id` for each transaction. A queue id from another tenant is not visible to it, so it is skipped.
4. **Worker failures roll back the batch.** `_process_single` re-raises on a provider error, so `_process_batch` never commits. The `failed` log and status are lost, and rows already sent earlier in the batch go back to `queued` and are **re-sent** on retry. After 3 retries nothing is persisted and the rows stay `queued`. Nothing checks `status == done` before sending.
5. **SMS needs MSG91 flow id + DLT TE id + positional vars.** `msg91_service.send_sms_via_msg91` rejects any row without `template_id` and `dlt_te_id` (both mandatory for Indian DLT routes). `sms_templates.py` holds the DLT-registered bodies, their ordered `var1..N` and the env names (`MSG91_TEMPLATE_ID_*`, `MSG91_DLT_TE_ID_*`). Use `build_target_ref(key, **values)` when queueing SMS.
   - Today **no caller uses it**. Module triggers, the holiday endpoint and the two direct fee SMS paths omit `dlt_te_id`, and their variable order doesn't match the registry.
   - `/communication/send` puts the `MessageTemplate` UUID in `template_id`, which fails on `.strip()`.
   - **Net effect: no SMS path currently succeeds.**
6. **DLT wording is fixed.** Per TRAI, each distinct SMS wording is its own registered template. The DB template body for SMS is only the human-readable audit copy. MSG91 renders the registered text, so editing an SMS template body changes the log text but not what the parent receives.
7. **WhatsApp sends free-form `text`.** Meta delivers these only inside the 24-hour customer-service window. Messages a business initiates need approved Meta templates, which are not implemented. Phone normalization is naive: a 10-digit number that starts with `91` is not prefixed. Use `msg91_service.normalize_phone` logic instead.
8. **Email** subject is hard-coded (`"Notification from COS360"`). `message_templates.subject` is rendered and then discarded because the queue has no subject column. The body goes out as `text/html` without escaping.
9. **Variable-name contract.** The backend field is `variables`. Both clients send `extra_variables` (the name in the spec's API contract), which Pydantic ignores. As a result, any template with a non-system variable fails with 400 "Missing user-provided template variables".
   - The clients also treat `parent_name` and `staff_name` as system variables and never ask for them. The backend does not resolve them, so they must be supplied as ordinary variables.
10. **`fee_defaulters` is a proxy.** `fee_student_mappings` has no balance column, so it targets every student with any fee mapping (`total_fee > 0`), paid or not.
11. **Fan-out duplication.** Student and class targets yield one row per (parent, student). A parent of two children gets two personalized messages. Only `all_users` dedupes, and only across the parent and staff lists.
12. **Rate limit** on `/send` is the shared `rate_limit_api()` = 200/min **per IP**, not the 10/min/user in the docstring and spec. `RATE_LIMIT_ENABLED=false` turns it off (the QA API runs that way).
13. **Template update/deactivate use `commit()` -> `refresh()`.** This was a MissingGreenlet workaround, and it breaks the repo rule. New code should follow `flush()` -> `select()` -> `commit()` (`backend/CLAUDE.md`). `PUT` doesn't check `(name, channel)` uniqueness itself; a clash hits the unique constraint and the error middleware answers 400. `PUT` also skips the 480-char SMS limit.
14. **List quirks.** `GET /templates` returns a plain array and ignores `page`/`page_size`. Both clients normalise it to `{items,total,page,page_size}`. The clients call `/communication/templates/` with a trailing slash, which relies on FastAPI's slash redirect.
15. **Celery worker is not in either docker-compose file.** Without a separately started worker (`scripts/start_celery_worker.py`, see [architecture](../architecture.md)) plus Redis, queue rows stay `queued`. `/send` swallows a `.delay()` failure, but the other callers don't, so they return a 500 after committing their rows.
16. **Holiday notice is one row, not a fan-out.** `POST /announcements/send-holiday-notice` takes `holiday_name`, `holiday_date` and `reason` as query parameters (a JSON body is rejected), does not validate the date, and queues a single row named "All Parents" with no phone. `msg91_template_id` is null unless `MSG91_TEMPLATE_ID_HOLIDAY` is set.
17. **Permission seeding.** Provisioning grants Admin `communications:create/read/update/list` from `permission_catalog.ALL_ADMIN`, limited to what the tenant's plan lists in `plan_resource_access`. Nothing seeds `announcements:send_sms` or any `<module>:send_sms`, so the holiday notice and module triggers return 403 until a role is granted them. `scripts/seed_communication_permissions.py` and `seed_communication_menu_test_tenant.py` target the old per-schema layout; don't run them against the shared schema.

## Web / mobile parity
| Feature | Web | Mobile |
|---|---|---|
| Compose (4 target kinds, class/section checklist, staff picker, preview count) | Yes (`/communication/compose`) | Yes (Compose tab) |
| Send confirmation modal | **No**, "Send Now" sends immediately | Yes |
| Templates CRUD + deactivate (`create` / `update` gated) | Yes | Yes |
| Seed default templates | Yes | No |
| Logs list + detail | Yes | Yes |
| Access gating | `checkPermission('communications', ...)` | Role-name check (student/parent aliases) and tab `hideForRoles`; no per-action permission check |
| QuickSend call sites | Admission, Staff enrollment, Staff attendance, Student attendance, Calendar holidays, Exam detail, Mark entry, Fee payment | Exam detail, Holidays |
| Holiday announcement (`/announcements/send-holiday-notice`) | No | Yes (`announcements` resource gate) |
| WhatsApp free-text | No | No |

Response-shape drift in both clients: `SendResponse` declares `channel` and `target_type`, but only `queued_count` is returned. `LogDetail` declares `updated_at`, which the backend does not return, and types `target_ref` as a string, while the backend returns an object.

## Known gaps
- **Security:**
  - Jinja2 renders template bodies and WhatsApp free-text with the unsandboxed `jinja2.Template`. The spec required `SandboxedEnvironment`. Anyone with `communications:create` can run server-side template injection.
  - The spec's phone masking in the log list is not implemented.
- **Push notifications (FCM/APNs), in-app notification centre, and deep links:** not built. No `expo-notifications`, no device-token storage. The exam `POST /exams/{id}/notify` (`service/exam/notification_service.py`) only counts recipients; it is a stub.
- **Delivery status:** no provider webhooks, so `delivered` is never set. No read receipts, opt-out/unsubscribe, email attachments, scheduled sends (the spec'd `scheduled_at` and `retry_count` columns don't exist), manual resend, cost estimate, multi-language templates, or teacher restricted to own class/section.
- **Robustness:** the worker is not idempotent (rule 4), skipped recipients are not logged (rule 2), there is no queue pruning, and `role_based` with an unknown role returns 0 recipients instead of the 400 the spec asked for.
- **SMS wiring** (rule 5): migrate every SMS producer to `sms_templates.build_target_ref`. The `hall_ticket` template has no body yet. `.env.example` lacks the `MSG91_DLT_TE_ID_*` vars and names `MSG91_TEMPLATE_ID_STAFF_INTERVIEW` where the registry uses `MSG91_TEMPLATE_ID_STAFF_RECRUITING`.
- **Client contract bugs:** `extra_variables` vs `variables`, and the `parent_name` / `staff_name` system-variable mismatch (rule 9). Web Compose also lacks the send confirmation modal.

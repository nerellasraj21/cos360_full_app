# Release and onboarding plan: first customer schools

Status: proposed, not started. Written 2026-10-07 from the module docs, `docs/architecture.md`, `docs/permissions.md` and `docs/operations/*` as verified that day.

Goal: run COS360 as a hosted service for the first two or three schools, with a repeatable way to bring a school on board on a chosen plan, and a clear path to self-service SaaS after that.

Each item below has a priority:
- **Must**: the first customer cannot go live without it.
- **Should**: needed within the first months, can follow go-live.
- **Later**: needed for real self-service SaaS, not for the first schools.

Sizes are rough, for one developer: S up to 2 days, M up to 1 week, L up to 3 weeks.

## 1. Release phases

| Phase | What | Exit |
|---|---|---|
| 0 | Testing round (in progress): smoke, journeys, regression on `qa_manual` | Test report with every failure triaged |
| 1 | Security hardening | Section 2 Must items done and re-tested |
| 2 | Defect fixing from the test round | No open S1 or S2; known gaps accepted in writing |
| 3 | Production platform and deployment | Section 3 Must items done; staging mirrors production |
| 4 | Onboarding capability | Section 4 Must items done; a dry-run onboarding of a fake school on staging passes |
| 5 | Pilot school go-live | Section 6 checklist complete; two weeks of hypercare |
| 6 | Second and third school | Onboarding runbook followed without developer help |

Phases 1 and 3 can run in parallel with phase 2. Product features (section 5) are scheduled by the customer's needs, not by the release.

## 2. Security hardening (phase 1)

| Item | Why | Priority | Size |
|---|---|---|---|
| Remove or gate the unauthenticated seed and setup routes (`/auth/seed/permission-data`, `/auth/seed/verify-permission-data`, `/auth/seed/location-data`, `/super_admin/setup/status`, `/super_admin/setup/initialize`) behind super-admin auth and `ENVIRONMENT != production` | They write or read platform data without a login (`tenants-and-admin.md` gotcha 16) | Must | S |
| Move the `/docs` and `/redoc` HTTP-basic credentials from code to settings, or turn the docs off in production | Hard-coded credentials | Must | S |
| Set `ALLOWED_ORIGINS` to the real domains | Default is `*` with credentials | Must | S |
| Sandbox Jinja2 rendering of message templates (`SandboxedEnvironment`) | Server-side template injection by anyone with `communications:create` | Must | S |
| Return 401 (not 400) for an expired or invalid bearer token, so web refresh works | Web users get errors instead of a silent refresh (`architecture.md`, tenancy gaps) | Must | S |
| Serve tenant media safely to `<img>` tags (signed URLs or token in query) without opening other tenants' files | Photos, logos and certificate downloads do not load today (`/media` returns 400) | Must | M |
| Stop a school Admin writing to the shared menu catalog | One school can change every school's menu (gotcha 18) | Must | S |
| Revoke sessions after a password change or admin reset; add basic safeguards to admin password reset | Old tokens stay valid (`auth.md` gaps) | Must | S |
| Rotate every secret that was ever in git history (database, JWT, docs password) and keep secrets only in the host's secret store | Credential exposure | Must | S |
| Security review of the release candidate (OWASP top 10, tenant isolation, file upload, rate limits) | Independent check before real data | Must | M |
| Audit trail for admin actions (user edits, password resets, role and plan changes, super-admin tenant-data access) | Accountability; DPDP | Should | M |

## 3. Production platform and deployment (phase 3)

| Item | Why | Priority | Size |
|---|---|---|---|
| Decide hosting: the AWS target (`backend-deploy.md`, ECS Fargate, ap-south-1) or a simpler VPS with Docker for the first schools | Everything else depends on it | Must | decision |
| Production database: managed Postgres with the two roles (owner for migrations, app role without BYPASSRLS), RLS verified by the tenant isolation tests on the real connection (including the pooler) | Isolation must hold in production exactly as locally | Must | M |
| Staging environment identical to production, with its own database | Test releases and onboarding dry-runs before production | Must | M |
| Deployment pipeline from this repository: build images, run unit and integration tests, run `alembic upgrade head` as a one-off step, deploy API, worker and web | Nothing deploys from this repo today | Must | M |
| Production compose or task definitions that pass every required variable (`SECRET_KEY`, `JWT_SECRET_KEY`, Redis, providers) | `docker-compose.prod.yml` passes only `DATABASE_URL` | Must | S |
| Redis plus a Celery worker and `celery beat` | Messaging, hall tickets, uploads and the nightly cleanup need them; rate limits need Redis across workers | Must | S |
| Shared file storage (S3 or equivalent) for uploads, photos, receipts, certificates | Local container disk is lost on redeploy and not shared between instances | Must | M |
| Wildcard DNS and TLS for school subdomains (`<school>.<domain>`), web served from a CDN | The web app picks the tenant from the host name | Must | S |
| Backups: daily automated backups plus point-in-time restore, a tested restore drill, and a per-tenant export procedure | Data safety; required before real data | Must | S |
| Monitoring: error tracking (backend, web, mobile), uptime checks, logs kept 30 days, alerts to a person | Know about failures before schools call | Must | S |
| Mobile release: real EAS project id, production API URL per build profile, store listings, signing in EAS credentials (`mobile-release.md`) | Placeholders today | Must | M |
| Fix the CI unit job (tracked unit tests) and add web and mobile checks to CI | CI cannot gate releases today | Should | S |
| Load test the busiest flows (login at 8 am, attendance, fee collection) for the expected number of schools | Size the platform | Should | S |
| Status page and a maintenance window policy | Communicate outages | Later | S |

## 4. SaaS onboarding capability (phase 4)

What exists: a super admin can provision a tenant on a plan through the API (`POST /super_admin/system/tenants/`); provisioning creates the default roles, permissions limited by the plan, an admin login and a default academic year. Everything else below is missing or partial.

| Item | Why | Priority | Size |
|---|---|---|---|
| Written onboarding runbook (section 6) and a provisioning script or super-admin screen that does steps 1 to 5 in one go: tenant, plan, admin, menu catalog check, certificate templates | Onboarding must be repeatable without a developer | Must | M |
| Seed certificate templates and default message templates at provisioning | New schools start empty (`tenants-and-admin.md` gaps) | Must | S |
| Plan enforcement at runtime: a tenant cannot use or be granted resources outside its plan; plan edits reach existing tenants | Only the role layer is checked today (`permissions.md`), so plans are not real | Must | M |
| Fix role edit and delete on web and mobile; role delete with users returns a clear 409 | Schools need to adjust roles (gotchas 12, 19) | Must | S |
| Forgot-password / reset flow for every role (email or SMS link or OTP) | The screens only show an honest "contact your admin" message; at scale this is a support burden | Must | M |
| Working message delivery: fix the SMS path (MSG91 DLT ids), the client `variables` field name, and verify WhatsApp/email; welcome messages with first-login instructions | Credentials and notices reach parents and staff (`communication.md`) | Must | M |
| Data import for an existing school: students with parents (Excel exists), staff (Excel exists), opening fee balances (old fees), with a validated dry-run and an error report | Every school arrives with data | Must | M |
| Super-admin web console: tenants (list, create, suspend, plan change), plans, usage, tenant health | Operating more than a couple of schools by API calls is error-prone | Should | L |
| Plan limits: maximum students, staff and storage per plan, with warnings | Pricing tiers need limits | Should | M |
| Tenant suspension and reactivation for non-payment, with a clear message to users | Billing enforcement | Should | S |
| In-app setup checklist for a new school admin (school settings, year, classes, subjects, fees, staff, students) | Faster self-onboarding; fewer support calls | Should | M |
| Billing: invoices per school per plan (manual invoicing first; payment gateway such as Razorpay later), trial periods, renewals | Revenue | Should (manual) / Later (automated) | M / L |
| Offboarding: full data export for a school and verified deletion | Contracts and DPDP | Should | M |
| Self-service sign-up with email verification and a trial tenant | True SaaS | Later | L |
| Usage stats endpoint (fails today, gotcha 21) | Super-admin reporting | Later | S |

## 5. Product gaps that matter to schools

Not release blockers by themselves; schedule them with the pilot school. Each module doc lists the full set under "Known gaps".

| Item | Priority | Size |
|---|---|---|
| Printable documents: paper engine, receipts with the school letterhead, hall tickets, report cards, certificates (`docs/specs/printable-documents-plan.md`) | Must for receipts (placeholder school name today); Should for the rest | L |
| Web report pages for student, staff, attendance and financial reports; dashboard widgets | Should | M |
| Student and parent visibility gaps: exam results for students (DEF-EXM-6), hall tickets, published marks, issued certificates | Must (parents expect it) | M |
| Push notifications and an in-app notification list | Should | L |
| The UI defects found during documentation (raw ids shown instead of names, error states hidden behind spinners, `[object Object]` toasts) | Should, after triage in phase 2 | M |
| Web never uploads expense attachments; mobile old fees broken; mobile locations screen calls a missing endpoint | Should | S each |

## 6. School onboarding checklist (per school)

Owner: the onboarding lead. Record each item as done with the date in the school's onboarding sheet.

### Before provisioning
1. Contract signed; plan chosen; billing contact and start date recorded.
2. School details collected: legal name, address, board, contacts, logo, principal signature, academic year dates, class and section list, subjects, fee structure (types, terms, amounts, concessions), transport routes, staff list, student and parent list (template sheets provided).
3. Data checked against the import templates; problems sent back to the school.
4. Subdomain chosen (`<school>.<domain>`, lowercase letters, digits, `_` or `-`).

### Provisioning (super admin)
5. Tenant created on the plan with the admin login; tenant shows as active.
6. Menu catalog and plan resources verified for the tenant; certificate and message templates present.
7. Subdomain and TLS live; the admin can reach the sign-in page.

### Configuration (school admin, supported)
8. School settings complete (name, logo, signature, contacts).
9. Academic year, classes, sections, subjects and class-subject mappings.
10. Fee structure: categories, types, terms and dates, class mappings and term amounts, concessions.
11. Staff imported; designations set; staff logins issued.
12. Students and parents imported (dry-run first); admission numbers verified; opening fee balances imported as old fees.
13. Transport routes, stops, vehicles, trips, pricing and student assignments, if used.
14. Roles and permissions reviewed with the school (which staff see fees, who approves expenses).
15. Message templates and SMS sender approved (DLT) if messaging is used.

### Verification
16. Smoke set run on the school's tenant with the school admin: sign-in per role, attendance, one fee payment and receipt, one report.
17. Spot check of imported data: 10 random students against the school's sheet (class, section, parents, fee mapping, balance).
18. Parent and student logins sent with first-login instructions; mobile app links shared.

### Go-live and hypercare
19. Training sessions held: admin, accounts desk, teachers; short guides shared.
20. Go-live date agreed; support channel and hours communicated.
21. Daily check of errors and support requests for the first two weeks; weekly call with the school.
22. Hypercare closed: open issues listed with dates; school signs off.

## 7. Platform go-live checklist (once, before the first school)

- Section 2 Must items done and re-tested; security review findings closed or accepted.
- Section 3 Must items done; a staging deploy and a production deploy have run through the pipeline.
- Restore drill done from a production backup into staging.
- Monitoring alerts tested end to end.
- Terms of service, privacy policy and a data processing agreement (DPDP) ready for schools; consent text for parents.
- Support process: who answers, how defects reach developers, severity response times.
- Release notes list the accepted known gaps.

## 8. Decisions needed

1. Hosting for the first schools: AWS as planned, or a single VPS first.
2. Domain name and brand for school subdomains (COS360 or the new name).
3. Which messaging channels the first schools need (SMS with DLT, WhatsApp, email), and who owns the provider accounts.
4. Billing for the first schools: manual invoices, or a gateway from day one.
5. Plans and limits: names, prices, which modules and how many students per plan.
6. Which pilot school, and its go-live date, to set the order of sections 4 and 5.

## 9. Rough order and effort

| Step | Effort (one developer) |
|---|---|
| Phase 0 testing round | 1 to 2 weeks with a tester |
| Phase 1 security (Must) | 1.5 weeks |
| Phase 2 defect fixing | 2 to 3 weeks, depending on the test round |
| Phase 3 platform (Must) | 2 weeks, plus the hosting decision |
| Phase 4 onboarding (Must) | 3 weeks |
| Printable receipts (from section 5) | 1.5 weeks |
| Pilot go-live and hypercare | 2 weeks |

With phases 1 and 3 run alongside phase 2, a first school can go live roughly 8 to 10 weeks after the testing round starts.

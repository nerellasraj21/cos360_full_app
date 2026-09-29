"""
Safe data-only clear script for test_tenant schema.
- Takes a full JSON backup before deleting
- Deletes rows only (no DROP, no ALTER, no TRUNCATE)
- Skips: academic_years, issuable_certificate_templates,
          roles, menus, role_menu_permissions, resource_permissions,
          role_inheritance, users, profile_audit_logs
- Steps 9 & 10 (profile/audit/users) are excluded
- Runs inside a transaction — rolls back on any error
"""

import asyncio
import asyncpg
import json
import os
from datetime import datetime, date
from decimal import Decimal

# ── Connection ──────────────────────────────────────────────────────────────
DB_URL = "postgresql://neondb_owner:npg_3BRCMxJ8aKdN@ep-old-salad-a1x7ae1e-pooler.ap-southeast-1.aws.neon.tech/neondb"
TEST_CLIENT_NAME = "test_tenant"

# ── Tables to delete (order matters — children before parents) ───────────────
TABLES_TO_DELETE = [
    # Exam — deepest children first, parents last
    "exam_subject_components",      # child of exam_subject_config
    "student_marks",                # child of exams + exam_subject_config
    "student_subject_results",      # child of exams + exam_subject_config
    "student_exam_results",         # child of exams
    "exam_mark_entry_permissions",  # child of exams
    "hall_ticket_eligibility",      # child of exams
    "exam_dates",                   # child of exams
    "exam_class_sections",          # child of exams
    "exam_subject_config",          # child of exams + subject_grade_schemes
    "exam_config_template_items",   # child of exam_config_templates + subject_grade_schemes
    "exam_config_templates",
    "exam_audit_log",
    "board_pattern_exam_types",     # child of board_exam_patterns
    "board_exam_patterns",
    "exams",                        # references exam_grade_schemes — must be before it
    "exam_grade_bands",             # child of exam_grade_schemes
    "exam_grade_schemes",           # now safe (exams deleted)
    "subject_grade_bands",          # child of subject_grade_schemes
    "subject_grade_schemes",        # now safe (exam_subject_config deleted)
    "remark_grade_options",         # child of remark_grade_sets
    "remark_grade_sets",
    "exam_settings",
    "exam_streams",
    # Fee
    "fee_transaction_items",
    "fee_receipts",
    "fee_refunds",
    "fee_transactions",
    "fee_concessions",
    "fee_old",
    "fee_student_map_term_amounts",
    "fee_student_mappings",
    "fee_class_map_term_amounts",
    "fee_class_mappings",
    "fee_term_dates",
    "fee_types",
    "fee_terms",
    "fee_categories",
    # Expense
    "expense_attachments",
    "expense_audit_logs",
    "expense_transaction_items",
    "expense_transactions",
    "expense_types",
    "expense_categories",
    "expense_settings",
    # Transport
    "student_transport_assignments",
    "student_trips",
    "transport_pricing",
    "trips",
    "route_stops",
    "routes",
    "vehicles",
    "route_types",
    "trip_types",
    # Student
    "student_homework",
    "student_documents",
    "student_certificates",
    "generated_certificates",
    "student_parent_links",
    "student_attendance",
    "student_admissions",
    "students",
    # Masters
    "timetable_subject_options",
    "timetable_slots",
    "timetables",
    "slot_times",
    "class_subject_mappings",
    "holidays",
    "sections",
    "classes",
    "subjects",
    "subject_categories",
    "sub_castes",
    "castes",
    "designations",
    # Staff & Parents
    "staff_qualifications",
    "staff_attendance",
    "staff",
    "parents",
    # Communication
    "notification_log",
    "notification_queue",
    "message_templates",
]

NEVER_TOUCH = [
    "academic_years",
    "issuable_certificate_templates",
    "roles",
    "menus",
    "role_menu_permissions",
    "resource_permissions",
    "role_inheritance",
    "users",
    "profile_audit_logs",
    "report_audit",
    "stale_file_registry",
    "file_audit_log",
]


def serialize(obj):
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, bytes):
        return obj.hex()
    return str(obj)


async def main():
    print("=" * 60)
    print("COS360 — Test Tenant Data Clear Script")
    print("=" * 60)

    conn = await asyncpg.connect(DB_URL, ssl="require")

    try:
        # ── 1. Get schema name ───────────────────────────────────────
        row = await conn.fetchrow(
            "SELECT schema_name FROM public.tenants WHERE client_name = $1",
            TEST_CLIENT_NAME,
        )
        if not row:
            print(f"\nERROR: '{TEST_CLIENT_NAME}' not found in public.tenants")
            return

        schema = row["schema_name"]
        print(f"\nSchema found: {schema}")

        # ── 2. Backup ────────────────────────────────────────────────
        print("\n[BACKUP] Reading rows before delete...")
        backup = {}
        total_rows = 0
        for table in TABLES_TO_DELETE:
            try:
                rows = await conn.fetch(f'SELECT * FROM "{schema}"."{table}"')
                backup[table] = [dict(r) for r in rows]
                total_rows += len(rows)
                print(f"  {table}: {len(rows)} rows")
            except Exception as e:
                backup[table] = []
                print(f"  {table}: skipped ({e})")

        backup_file = f"backup_test_tenant_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(backup_file, "w") as f:
            json.dump(backup, f, default=serialize, indent=2)
        print(f"\n  Backup saved -> {backup_file}  ({total_rows} total rows)")

        # ── 3. Delete inside transaction (multi-pass with savepoints) ──
        print("\n[DELETE] Running inside transaction (multi-pass)...")
        async with conn.transaction():
            deleted = {}
            remaining = list(TABLES_TO_DELETE)

            for pass_num in range(1, len(TABLES_TO_DELETE) + 1):
                if not remaining:
                    break
                still_failing = []
                for table in remaining:
                    sp = f"sp_{table}"
                    await conn.execute(f"SAVEPOINT {sp}")
                    try:
                        result = await conn.execute(
                            f'DELETE FROM "{schema}"."{table}"'
                        )
                        count = int(result.split()[-1])
                        deleted[table] = count
                        await conn.execute(f"RELEASE SAVEPOINT {sp}")
                        print(f"  [pass {pass_num}] OK {table}: {count} rows deleted")
                    except Exception:
                        await conn.execute(f"ROLLBACK TO SAVEPOINT {sp}")
                        still_failing.append(table)

                if len(still_failing) == len(remaining):
                    # No progress made — genuine unresolvable FK
                    break
                remaining = still_failing

            if remaining:
                print(f"\n  Could not delete (FK conflict): {remaining}")
                raise Exception(f"Unresolvable FK on: {remaining}")

            # ── 4. Verify preserved tables ───────────────────────────
            print("\n[VERIFY] Checking preserved tables...")
            for table in NEVER_TOUCH:
                try:
                    count = await conn.fetchval(
                        f'SELECT COUNT(*) FROM "{schema}"."{table}"'
                    )
                    print(f"  OK {table}: {count} rows preserved")
                except Exception:
                    pass

        print("\n" + "=" * 60)
        print("DONE — All rows deleted, transaction committed.")
        print(f"Backup file: {backup_file}")
        print("Schema, tables, columns, permissions — all intact.")
        print("=" * 60)

    except Exception as e:
        print(f"\nROLLED BACK — {e}")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())

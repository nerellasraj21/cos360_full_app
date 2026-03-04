"""
Re-seed resource_permissions for Student and Parent roles.

Run from the project root:
    python scripts/reseed_student_parent_permissions.py

Why this is needed:
  The seed endpoint uses ON CONFLICT DO NOTHING — so updating _ROLE_PERMISSIONS
  in code does NOT automatically update the DB. This script:
    1. Deletes all existing resource_permissions for Student and Parent roles.
    2. Inserts the correct restricted set with _own / _related action variants.

Student permissions (own data only):
  - student_admissions:  read_own
  - student_attendance:  read_own, list_own
  - student_certificates:read_own, list_own
  - student_documents:   read_own, list_own
  - exam_marks:          read_own, list_own
  - exam_hall_tickets:   read_own, list_own
  - fee_receipts:        read_own, list_own
  - fee_transactions:    read_own, list_own
  - exams, classes, academic_years, subjects, certificate_types: read, list (reference)

Parent permissions (linked children only):
  - student_admissions:  read_related
  - student_attendance:  read_related, list_related
  - student_certificates:read_related, list_related
  - student_documents:   read_related, list_related
  - exam_marks:          read_related, list_related
  - exam_hall_tickets:   read_related, list_related
  - exams, classes, academic_years, subjects: read, list (reference)
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import text
from app.config import settings

SCHEMA = "test_tenant_schema"

STUDENT_PERMISSIONS = [
    # Own profile
    ("profile",              "read_own"),  ("profile",              "update_own"),
    # Reference data
    ("academic_years",       "read"),      ("academic_years",       "list"),
    ("classes",              "read"),      ("classes",              "list"),
    ("subjects",             "read"),      ("subjects",             "list"),
    ("certificate_types",    "read"),      ("certificate_types",    "list"),
    # Exam (own results & hall tickets)
    ("exams",                "read"),      ("exams",                "list"),
    ("exam_marks",           "read_own"),  ("exam_marks",           "list_own"),
    ("exam_hall_tickets",    "read_own"),  ("exam_hall_tickets",    "list_own"),
    # Own student data only
    ("student_admissions",   "read_own"),  ("student_admissions",   "list_own"),
    ("student_attendance",   "read_own"),  ("student_attendance",   "list_own"),
    ("student_certificates", "read_own"),  ("student_certificates", "list_own"),
    ("student_documents",    "read_own"),  ("student_documents",    "list_own"),
    ("student_transport",    "read_own"),
    # Fee (own only)
    ("fee_receipts",         "read_own"),  ("fee_receipts",         "list_own"),
    ("fee_transactions",     "read_own"),  ("fee_transactions",     "list_own"),
]

PARENT_PERMISSIONS = [
    # Reference data
    ("academic_years",       "read"),           ("academic_years",       "list"),
    ("classes",              "read"),           ("classes",              "list"),
    ("subjects",             "read"),           ("subjects",             "list"),
    # Children's details (related = only linked children)
    ("student_admissions",   "read_related"),   ("student_admissions",   "list_related"),
    ("student_attendance",   "read_related"),   ("student_attendance",   "list_related"),
    ("student_certificates", "read_related"),   ("student_certificates", "list_related"),
    ("student_documents",    "read_related"),   ("student_documents",    "list_related"),
    ("student_transport",    "read_related"),
    # Marks & Exam results (children only)
    ("exams",                "read"),           ("exams",                "list"),
    ("exam_marks",           "read_related"),   ("exam_marks",           "list_related"),
    # Hall tickets (children only)
    ("exam_hall_tickets",    "read_related"),   ("exam_hall_tickets",    "list_related"),
]


async def run():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with Session() as db:
        await db.execute(text(f"SET search_path TO {SCHEMA}, public"))

        for role_name, new_permissions in [("Student", STUDENT_PERMISSIONS), ("Parent", PARENT_PERMISSIONS)]:
            # Get role id
            r = await db.execute(text("SELECT id FROM roles WHERE name = :name"), {"name": role_name})
            role_id = r.scalar_one_or_none()
            if not role_id:
                print(f"[SKIP] Role '{role_name}' not found in DB")
                continue

            # Delete existing permissions for this role
            del_result = await db.execute(
                text("DELETE FROM resource_permissions WHERE role_id = :rid"),
                {"rid": role_id}
            )
            print(f"[OK] Deleted existing permissions for {role_name} role")

            # Insert new permissions
            inserted = 0
            for resource, action in new_permissions:
                await db.execute(text("""
                    INSERT INTO resource_permissions (id, role_id, resource, action, is_granted)
                    VALUES (gen_random_uuid(), :role_id, :res, :act, true)
                """), {"role_id": role_id, "res": resource, "act": action})
                inserted += 1

            await db.flush()
            print(f"[OK] Inserted {inserted} permissions for {role_name} role")

        await db.commit()

        print()
        print("=== Permission re-seed complete ===")
        print()
        print("Student role now has:")
        print("  student_admissions   : read_own")
        print("  student_attendance   : read_own, list_own")
        print("  student_certificates : read_own, list_own")
        print("  student_documents    : read_own, list_own")
        print("  exam_marks           : read_own, list_own")
        print("  exam_hall_tickets    : read_own, list_own")
        print("  fee_receipts         : read_own, list_own")
        print("  fee_transactions     : read_own, list_own")
        print("  exams, classes, etc. : read, list (reference only)")
        print()
        print("Parent role now has:")
        print("  student_admissions   : read_related")
        print("  student_attendance   : read_related, list_related")
        print("  student_certificates : read_related, list_related")
        print("  student_documents    : read_related, list_related")
        print("  exam_marks           : read_related, list_related")
        print("  exam_hall_tickets    : read_related, list_related")
        print("  exams, classes, etc. : read, list (reference only)")
        print()
        print("Effect:")
        print("  Student login -> UserContextService sees 'read_own' -> access_scope='own'")
        print("  -> all queries WHERE student_id = <their own student_id>")
        print("  -> class and section come from their admission record automatically")
        print()
        print("  Parent login  -> UserContextService sees 'read_related' -> access_scope='related'")
        print("  -> all queries WHERE student_id IN (<linked children's IDs>)")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())

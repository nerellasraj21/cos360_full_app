"""
Deletes the 15 dummy seed students (LB-2025-001..015) created by
scripts/seed_little_bunny_data.py from the little_bunny tenant schema.

Usage:
    python scripts/delete_little_bunny_seed_students.py            # dry run (reports only)
    python scripts/delete_little_bunny_seed_students.py --confirm  # actually deletes
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

load_dotenv()

from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.config import settings

SCHEMA = "little_bunny"
ADM_NO_PATTERN = "LB-2025-%"

# Tables that reference students.id — checked for dependent rows before deleting.
DEPENDENT_TABLES = [
    "student_marks",
    "student_exam_results",
    "student_subject_results",
    "fee_concessions",
    "fee_old",
    "fee_student_mappings",
    "fee_student_map_term_amounts",
    "fee_transactions",
    "student_attendance",
    "student_parent_links",
    "student_trips",
    "student_certificates",
    "student_documents",
    "student_homework",
    "student_transport_assignments",
]


async def run(confirm: bool):
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with Session() as db:
        await db.execute(text(f"SET search_path TO {SCHEMA}, public"))

        students = (
            await db.execute(
                text(
                    """
                    SELECT s.id AS student_id, s.user_id, sa.id AS admission_id, sa.admission_number
                    FROM student_admissions sa
                    JOIN students s ON s.id = sa.student_id
                    WHERE sa.admission_number LIKE :pat
                    ORDER BY sa.admission_number
                    """
                ),
                {"pat": ADM_NO_PATTERN},
            )
        ).mappings().all()

        if not students:
            print(f"No admissions matching '{ADM_NO_PATTERN}' found in schema '{SCHEMA}'. Nothing to do.")
            return

        student_ids = [str(r["student_id"]) for r in students]
        user_ids = [str(r["user_id"]) for r in students if r["user_id"]]
        admission_ids = [str(r["admission_id"]) for r in students]

        print(f"Found {len(students)} seed admissions in '{SCHEMA}':")
        for r in students:
            print(f"  {r['admission_number']}  student_id={r['student_id']}")

        print("\nChecking dependent tables for rows referencing these students...")
        blocking = {}
        for table in DEPENDENT_TABLES:
            result = await db.execute(
                text(f"SELECT COUNT(*) FROM {table} WHERE student_id = ANY(:ids)"),
                {"ids": student_ids},
            )
            count = result.scalar_one()
            if count:
                blocking[table] = count
                print(f"  [FOUND] {table}: {count} row(s)")

        if blocking and not confirm:
            print(
                "\nDependent rows exist. Re-run with --confirm to delete the students AND "
                "their dependent rows listed above, or investigate first."
            )
            return

        if not confirm:
            print(
                f"\nDry run only — would delete {len(students)} students, "
                f"{len(admission_ids)} admissions, and {len(user_ids)} user accounts. "
                "Re-run with --confirm to apply."
            )
            return

        print("\nDeleting...")
        for table, count in blocking.items():
            await db.execute(
                text(f"DELETE FROM {table} WHERE student_id = ANY(:ids)"),
                {"ids": student_ids},
            )
            print(f"  Deleted {count} row(s) from {table}")

        await db.execute(
            text("DELETE FROM student_admissions WHERE id = ANY(:ids)"),
            {"ids": admission_ids},
        )
        print(f"  Deleted {len(admission_ids)} row(s) from student_admissions")

        await db.execute(
            text("DELETE FROM students WHERE id = ANY(:ids)"),
            {"ids": student_ids},
        )
        print(f"  Deleted {len(student_ids)} row(s) from students")

        if user_ids:
            await db.execute(
                text("DELETE FROM users WHERE id = ANY(:ids)"),
                {"ids": user_ids},
            )
            print(f"  Deleted {len(user_ids)} row(s) from users")

        await db.commit()
        print("\nDone.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run(confirm="--confirm" in sys.argv))

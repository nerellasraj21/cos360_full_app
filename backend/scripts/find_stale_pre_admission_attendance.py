"""
Find (and optionally delete) student_attendance rows dated before the
student's own admission_date.

Background: attendance marking used to have no admission-date guard, so a
student could get an attendance row for a date before they'd even joined
(visible e.g. as an already-"Present" row on the attendance page for a date
prior to their admission). The create/update validation now blocks new rows
like this, but it doesn't retroactively clean up rows that were already
saved before that guard existed.

Usage:
    python scripts/find_stale_pre_admission_attendance.py <schema_name>          # report only
    python scripts/find_stale_pre_admission_attendance.py <schema_name> --apply  # delete them
    python scripts/find_stale_pre_admission_attendance.py --all                 # report across all active tenants
    python scripts/find_stale_pre_admission_attendance.py --all --apply
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

FIND_SQL = """
    SELECT
        sa.id AS attendance_id,
        sa.student_id,
        s.first_name,
        s.last_name,
        sa.date AS attendance_date,
        adm.admission_date
    FROM "{schema}".student_attendance sa
    JOIN "{schema}".students s ON s.id = sa.student_id
    JOIN "{schema}".student_admissions adm ON adm.student_id = sa.student_id
    WHERE sa.date < adm.admission_date
    ORDER BY sa.date
"""

DELETE_SQL = """
    DELETE FROM "{schema}".student_attendance
    WHERE id = ANY(:ids)
"""


async def get_active_tenant_schemas(engine) -> list[str]:
    async with engine.connect() as conn:
        await conn.execute(text("SET search_path TO public"))
        result = await conn.execute(text("SELECT schema_name FROM tenants WHERE is_active = true"))
        return [row[0] for row in result.fetchall()]


async def process_schema(engine, schema: str, apply: bool):
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)
    async with Session() as db:
        try:
            result = await db.execute(text(FIND_SQL.format(schema=schema)))
        except Exception as e:
            await db.rollback()
            print(f"[{schema}] skipped — {e.__class__.__name__}: {e}")
            return
        rows = result.fetchall()

        if not rows:
            print(f"[{schema}] no stale pre-admission attendance rows found")
            return

        print(f"[{schema}] found {len(rows)} stale row(s):")
        for row in rows:
            print(
                f"    attendance_id={row.attendance_id} student={row.first_name} {row.last_name} "
                f"attendance_date={row.attendance_date} admission_date={row.admission_date}"
            )

        if apply:
            ids = [row.attendance_id for row in rows]
            await db.execute(text(DELETE_SQL.format(schema=schema)), {"ids": ids})
            await db.commit()
            print(f"[{schema}] deleted {len(ids)} row(s)")
        else:
            print(f"[{schema}] dry run only — rerun with --apply to delete")


async def main():
    args = sys.argv[1:]
    apply = "--apply" in args
    args = [a for a in args if a != "--apply"]

    engine = create_async_engine(settings.DATABASE_URL, echo=False)

    if args and args[0] == "--all":
        schemas = await get_active_tenant_schemas(engine)
    elif args:
        schemas = [args[0]]
    else:
        print(__doc__)
        sys.exit(1)

    for schema in schemas:
        await process_schema(engine, schema, apply)

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())

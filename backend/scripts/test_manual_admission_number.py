"""
Integration test: manual admission_number on create + update.

Runs against test_tenant_schema. Creates a couple of admissions, asserts the
manual-number behaviour, then DELETES everything it created (finally block).

Covers:
  1. Create with a manual admission_number  -> number stored as-is, and the
     student's login username equals that number.
  2. Create again with the SAME manual number -> rejected (duplicate).
  3. Create with NO number -> auto-generated (NP{YEAR}{SEQ}).
  4. Update that admission's number to a new unique value -> succeeds.
  5. Update it to an already-used number -> rejected (duplicate).

Usage:
    python scripts/test_manual_admission_number.py
"""

import asyncio
import os
import sys
import uuid
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

load_dotenv()

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.config import settings
from app.schemas.masters.parent_schema import ParentCreate
from app.schemas.student.admission_schema import StudentAdmissionCreate, StudentAdmissionUpdate
from app.schemas.student.student_schema import StudentCreate
from app.service.student.admission_service import (
    add_admission,
    delete_admission,
    update_partial_details_admission,
)

SCHEMA = "test_tenant_schema"

# Short random suffix so re-runs never collide with leftover data.
TAG = uuid.uuid4().hex[:8]
MANUAL_1 = f"GOVT-{TAG}-1"   # manual number used on create
MANUAL_2 = f"GOVT-{TAG}-2"   # manual number used on update
MANUAL_3 = f"GOVT-{TAG}-3"   # manual number for the admission used in update tests


def _student(first: str) -> StudentCreate:
    """Build a minimal valid StudentCreate with unique parent emails."""
    return StudentCreate(
        first_name=first,
        last_name="Tester",
        date_of_birth=date(2010, 1, 1),
        gender="Male",
        is_primary="not_primary",
        father=ParentCreate(
            name=f"{first} Father",
            email=f"father.{TAG}.{first.lower()}@example.com",
            relation_to_student="Father",
        ),
        mother=ParentCreate(
            name=f"{first} Mother",
            email=f"mother.{TAG}.{first.lower()}@example.com",
            relation_to_student="Mother",
        ),
    )


async def run():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)

    created_admission_ids: list = []
    passed, failed = 0, 0

    def check(label: str, cond: bool):
        nonlocal passed, failed
        if cond:
            passed += 1
            print(f"[PASS] {label}")
        else:
            failed += 1
            print(f"[FAIL] {label}")

    async with Session() as db:
        await db.execute(text(f"SET search_path TO {SCHEMA}, public"))

        # --- Look up required FK references --------------------------------- #
        ay = (await db.execute(text(
            "SELECT id FROM academic_years ORDER BY is_active DESC, created_at DESC LIMIT 1"
        ))).scalar_one_or_none()
        cls = (await db.execute(text("SELECT id FROM classes ORDER BY name LIMIT 1"))).scalar_one_or_none()
        sec = (await db.execute(text(
            "SELECT id FROM sections WHERE class_id = :cid ORDER BY name LIMIT 1"
        ), {"cid": cls})).scalar_one_or_none() if cls else None

        if not (ay and cls and sec):
            print(f"[ABORT] Missing reference data -> academic_year={ay}, class={cls}, section={sec}")
            print("        test_tenant_schema needs at least one academic year, class, and section.")
            await engine.dispose()
            return

        base_kwargs = dict(
            admission_date=date.today(),
            academic_year_id=ay,
            admitted_class_id=cls,
            admitted_section_id=sec,
            address_line1="1 Test Street",
            city="Testville",
            state="Test State",
        )

        try:
            # --- 1. Create with manual number ------------------------------ #
            adm1 = await add_admission(
                StudentAdmissionCreate(
                    **base_kwargs,
                    admission_type="non_primary",
                    admission_number=MANUAL_1,
                    student=_student("Manual"),
                ),
                db,
            )
            created_admission_ids.append(adm1.id)
            check("1a: manual number stored as-is", adm1.admission_number == MANUAL_1)

            uname = (await db.execute(text(
                "SELECT u.username FROM users u JOIN students s ON s.user_id = u.id WHERE s.id = :sid"
            ), {"sid": adm1.student_id})).scalar_one_or_none()
            check("1b: student login username equals manual number", uname == MANUAL_1)

            # --- 2. Duplicate manual number rejected ----------------------- #
            try:
                dup = await add_admission(
                    StudentAdmissionCreate(
                        **base_kwargs,
                        admission_type="non_primary",
                        admission_number=MANUAL_1,
                        student=_student("Dupe"),
                    ),
                    db,
                )
                created_admission_ids.append(dup.id)
                check("2: duplicate manual number rejected", False)
            except HTTPException as e:
                check("2: duplicate manual number rejected", e.status_code in (400, 409, 422))

            # --- 3. Blank number -> rejected (manual entry required) ------- #
            try:
                blank = await add_admission(
                    StudentAdmissionCreate(
                        **base_kwargs,
                        admission_type="non_primary",
                        student=_student("Blank"),
                    ),
                    db,
                )
                created_admission_ids.append(blank.id)
                check("3: blank number rejected (manual entry required)", False)
            except HTTPException as e:
                check("3: blank number rejected (manual entry required)", e.status_code in (400, 409, 422))

            # Create a valid admission (manual number) to exercise the update tests.
            adm3 = await add_admission(
                StudentAdmissionCreate(
                    **base_kwargs,
                    admission_type="non_primary",
                    admission_number=MANUAL_3,
                    student=_student("Updatable"),
                ),
                db,
            )
            created_admission_ids.append(adm3.id)

            # --- 4. Update number to a new unique value -------------------- #
            upd = await update_partial_details_admission(
                adm3.student_id,
                StudentAdmissionUpdate(admission_number=MANUAL_2),
                db,
            )
            check("4: update to new unique number succeeds", upd.admission_number == MANUAL_2)

            # --- 5. Update to an already-used number rejected -------------- #
            try:
                await update_partial_details_admission(
                    adm3.student_id,
                    StudentAdmissionUpdate(admission_number=MANUAL_1),
                    db,
                )
                check("5: update to duplicate number rejected", False)
            except HTTPException as e:
                check("5: update to duplicate number rejected", e.status_code in (400, 409, 422))

        finally:
            # --- Cleanup: delete everything we created --------------------- #
            print("\n--- cleanup ---")
            for adm_id in created_admission_ids:
                try:
                    await delete_admission(adm_id, db)
                    print(f"[OK] deleted admission {adm_id}")
                except Exception as e:
                    print(f"[WARN] could not delete admission {adm_id}: {e}")

        print(f"\n=== RESULT: {passed} passed, {failed} failed ===")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())

"""
Seed script: Create admission record for Arjun Sharma (Child 2 of Sita Sharma).

Run from the project root:
    python scripts/seed_arjun_admission.py

What this script does:
  1. Finds Arjun Sharma's student record (created by create_parent_with_children.py).
  2. Looks up available classes and sections in the DB.
  3. Creates a student_admissions row so parent (Sita Sharma) can swap to Arjun
     and see his student details via the API.

After running:
  - Sita Sharma logs in -> entity_id = parent UUID
  - GET /student-parent-links/parent/{entity_id}/students
    -> [ Lambodhar Vinayak, Arjun Sharma ]
  - Parent swaps to Arjun -> calls student endpoints with Arjun's student_id
  - GET /students/admission/id/{arjun_student_id}  -> returns Arjun's admission details
"""

import asyncio
import sys
import os
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

load_dotenv()

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import text
from app.config import settings

SCHEMA = "test_tenant_schema"

# Arjun Sharma -- created by create_parent_with_children.py
ARJUN_USERNAME = "arjun.sharma"

# Preferred class/section for Arjun (different section from Lambodhar who is ABC/A)
PREFERRED_CLASS = "ABC"
PREFERRED_SECTION = "B"


async def run():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with Session() as db:
        await db.execute(text(f"SET search_path TO {SCHEMA}, public"))

        # ------------------------------------------------------------------ #
        # 1. Find Arjun's user and student records                            #
        # ------------------------------------------------------------------ #
        u = await db.execute(text("SELECT id FROM users WHERE username = :uname"), {"uname": ARJUN_USERNAME})
        arjun_user_id = u.scalar_one_or_none()
        if not arjun_user_id:
            print(f"[ERROR] User '{ARJUN_USERNAME}' not found.")
            print("        Run scripts/create_parent_with_children.py first.")
            return

        s = await db.execute(text("SELECT id FROM students WHERE user_id = :uid"), {"uid": arjun_user_id})
        arjun_student_id = s.scalar_one_or_none()
        if not arjun_student_id:
            print(f"[ERROR] Student record for '{ARJUN_USERNAME}' not found.")
            print("        Run scripts/create_parent_with_children.py first.")
            return

        print(f"[OK] Arjun Sharma found -- student_id: {arjun_student_id}")

        # ------------------------------------------------------------------ #
        # 2. Find class and section                                           #
        # ------------------------------------------------------------------ #
        # Try preferred class first
        c = await db.execute(text("SELECT id FROM classes WHERE name = :name"), {"name": PREFERRED_CLASS})
        class_id = c.scalar_one_or_none()
        class_name_used = PREFERRED_CLASS

        if not class_id:
            # Fallback: use any available class
            c2 = await db.execute(text("SELECT id, name FROM classes ORDER BY name LIMIT 1"))
            row = c2.fetchone()
            if row:
                class_id, class_name_used = row
                print(f"[INFO] Class '{PREFERRED_CLASS}' not found -- using '{class_name_used}'")
            else:
                print("[WARN] No classes found in DB -- admission will have class_id=NULL")
                class_name_used = "None"

        # Try preferred section within that class
        section_id = None
        section_name_used = "None"
        if class_id:
            sec = await db.execute(
                text("SELECT id FROM sections WHERE name = :name AND class_id = :cid"),
                {"name": PREFERRED_SECTION, "cid": class_id},
            )
            section_id = sec.scalar_one_or_none()
            section_name_used = PREFERRED_SECTION if section_id else "None"

            if not section_id:
                # Fallback: any section in this class
                sec2 = await db.execute(
                    text("SELECT id, name FROM sections WHERE class_id = :cid ORDER BY name LIMIT 1"), {"cid": class_id}
                )
                sec_row = sec2.fetchone()
                if sec_row:
                    section_id, section_name_used = sec_row
                    print(
                        f"[INFO] Section '{PREFERRED_SECTION}' not found in class '{class_name_used}' -- using '{section_name_used}'"
                    )
                else:
                    print(f"[WARN] No sections found for class '{class_name_used}' -- section_id=NULL")

        print(f"[OK] Class: {class_name_used}, Section: {section_name_used}")

        # ------------------------------------------------------------------ #
        # 3. Find active academic year                                        #
        # ------------------------------------------------------------------ #
        ay = await db.execute(
            text("SELECT id FROM academic_years WHERE is_active = true ORDER BY created_at DESC LIMIT 1")
        )
        academic_year_id = ay.scalar_one_or_none()
        if academic_year_id:
            print(f"[OK] Academic year found: {academic_year_id}")
        else:
            print("[WARN] No active academic year -- academic_year_id=NULL")

        # ------------------------------------------------------------------ #
        # 4. Check if admission already exists                                #
        # ------------------------------------------------------------------ #
        existing_adm = await db.execute(
            text("SELECT id FROM student_admissions WHERE student_id = :sid"), {"sid": arjun_student_id}
        )
        existing_adm_id = existing_adm.scalar_one_or_none()

        if existing_adm_id:
            # Update class/section to ensure latest values
            await db.execute(
                text("""
                UPDATE student_admissions
                SET current_class_id   = :class_id,
                    current_section_id = :section_id,
                    academic_year_id   = :ay_id
                WHERE id = :id
            """),
                {
                    "class_id": class_id,
                    "section_id": section_id,
                    "ay_id": academic_year_id,
                    "id": existing_adm_id,
                },
            )
            print(f"[OK] Admission record updated -- admission_id: {existing_adm_id}")
            adm_id = existing_adm_id
        else:
            await db.execute(
                text("""
                INSERT INTO student_admissions (
                    id, student_id, admission_date,
                    current_class_id, current_section_id, academic_year_id
                )
                VALUES (
                    gen_random_uuid(), :student_id, :adm_date,
                    :class_id, :section_id, :ay_id
                )
            """),
                {
                    "student_id": arjun_student_id,
                    "adm_date": date.today(),
                    "class_id": class_id,
                    "section_id": section_id,
                    "ay_id": academic_year_id,
                },
            )
            adm_result = await db.execute(
                text("SELECT id FROM student_admissions WHERE student_id = :sid"), {"sid": arjun_student_id}
            )
            adm_id = adm_result.scalar_one()
            print(f"[OK] Admission record created -- admission_id: {adm_id}")

        await db.commit()

        # ------------------------------------------------------------------ #
        # 5. Summary                                                          #
        # ------------------------------------------------------------------ #
        print()
        print("=== Arjun Sharma admission seeded successfully ===")
        print(f"  Student   : Arjun Sharma")
        print(f"  student_id: {arjun_student_id}")
        print(f"  Class     : {class_name_used}")
        print(f"  Section   : {section_name_used}")
        print(f"  Admission : {adm_id}")
        print()
        print("Parent (Sita Sharma) can now swap to Arjun:")
        print("  1. Login as sita.sharma -> get entity_id (parent UUID)")
        print("  2. GET /student-parent-links/parent/{entity_id}/students")
        print("     -> returns both Lambodhar Vinayak and Arjun Sharma")
        print("  3. Frontend stores the list, lets parent pick a child")
        print(f"  4. GET /students/admission/id/{arjun_student_id}")
        print("     -> returns Arjun's admission details (class, section, etc.)")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())

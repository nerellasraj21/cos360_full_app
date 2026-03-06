"""
Seed script: Create Lambodhar Vinayak as a Student in test_tenant_schema.

Run from the project root:
    python scripts/create_lambodhar_student.py

What this script does:
  1. Adds is_first_login column to users table if it doesn't exist.
  2. Ensures the 'Student' role exists and has resource permissions seeded.
  3. Creates a User account (username: lambodhar.vinayak, temp password: Welcome@123, is_first_login=True).
  4. Creates the Student record for Lambodhar Vinayak.
  5. Looks up class 'ABC' and section 'A' — if found, creates a student_admission record.

Login flow after running:
  Step 1 — POST /auth/login
    Body: { "username": "lambodhar.vinayak", "password": "Welcome@123", "client_name": "test_tenant" }
    Response: { "requires_password_change": true, "change_password_token": "..." }

  Step 2 — POST /auth/staff/set-password   (reused for all roles)
    Body: { "change_password_token": "<token>", "new_password": "NewPass@123", "confirm_password": "NewPass@123" }
    Response: full login credentials (access_token, refresh_token, menu, permissions, entity_id)

If username does NOT exist in DB -> login returns 401 Invalid Credentials.
If username exists but is_first_login = TRUE -> password change required.
After password change -> full access with Student role permissions.
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
from app.tools.password_util import hash_password

SCHEMA = "test_tenant_schema"
TEMP_PASSWORD = "Welcome@123"

STUDENT = {
    "first_name": "Lambodhar",
    "last_name": "Vinayak",
    "username": "lambodhar.vinayak",
    "email": "lambodhar.vinayak@school.com",
    "date_of_birth": date(2010, 6, 15),  # placeholder DOB
    "gender": "Male",
    "nationality": "Indian",
    "mother_tongue": "Telugu",
    "class_name": "ABC",
    "section_name": "A",
}

_STUDENT_PERMISSIONS = [
    ("academic_years", "read"),
    ("academic_years", "list"),
    ("classes", "read"),
    ("classes", "list"),
    ("subjects", "read"),
    ("subjects", "list"),
    ("holiday_management", "read"),
    ("holiday_management", "list"),
    ("locations", "read"),
    ("locations", "list"),
    ("certificate_types", "read"),
    ("certificate_types", "list"),
    ("exams", "read"),
    ("exams", "list"),
    ("student_admissions", "read"),
    ("student_attendance", "read"),
    ("student_attendance", "list"),
    ("student_certificates", "read"),
    ("student_certificates", "list"),
    ("student_documents", "read"),
    ("student_documents", "list"),
    ("fee_receipts", "read"),
    ("fee_receipts", "list"),
    ("fee_transactions", "read"),
    ("fee_transactions", "list"),
    ("routes", "read"),
    ("routes", "list"),
    ("transport_trips", "read"),
    ("transport_trips", "list"),
    ("student_reports", "read"),
    ("attendance_reports", "read"),
    ("reports", "read"),
]


async def run():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with Session() as db:
        # ------------------------------------------------------------------ #
        # 0. Switch to tenant schema                                           #
        # ------------------------------------------------------------------ #
        await db.execute(text(f"SET search_path TO {SCHEMA}, public"))

        # ------------------------------------------------------------------ #
        # 1. Ensure is_first_login column exists + username is wide enough    #
        # ------------------------------------------------------------------ #
        await db.execute(text("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN
        """))
        await db.execute(text("""
            ALTER TABLE users
            ALTER COLUMN username TYPE VARCHAR(100)
        """))
        print("[OK] is_first_login column ensured")
        print("[OK] username column widened to VARCHAR(100)")

        # ------------------------------------------------------------------ #
        # 2. Ensure Student role exists                                        #
        # ------------------------------------------------------------------ #
        await db.execute(text("""
            INSERT INTO roles (id, name, description, is_system_role, is_custom_role)
            VALUES (gen_random_uuid(), 'Student', 'Student with limited read access', true, false)
            ON CONFLICT (name) DO NOTHING
        """))
        result = await db.execute(text("SELECT id FROM roles WHERE name = 'Student'"))
        student_role_id = result.scalar_one()
        print(f"[OK] Student role ID: {student_role_id}")

        # ------------------------------------------------------------------ #
        # 3. Seed resource_permissions for Student role (idempotent)          #
        # ------------------------------------------------------------------ #
        seeded = 0
        for resource, action in _STUDENT_PERMISSIONS:
            await db.execute(
                text("""
                INSERT INTO resource_permissions (id, role_id, resource, action, is_granted)
                SELECT gen_random_uuid(), :role_id, :res, :act, true
                WHERE NOT EXISTS (
                    SELECT 1 FROM resource_permissions
                    WHERE role_id = :role_id2 AND resource = :res2 AND action = :act2
                )
            """),
                {
                    "role_id": student_role_id,
                    "res": resource,
                    "act": action,
                    "role_id2": student_role_id,
                    "res2": resource,
                    "act2": action,
                },
            )
            seeded += 1
        await db.flush()
        print(f"[OK] {seeded} resource_permissions ensured for Student role")

        # ------------------------------------------------------------------ #
        # 4. Seed role_menu_permissions for Student (all menus, can_view=true)#
        # ------------------------------------------------------------------ #
        menus_result = await db.execute(text("SELECT id FROM menus"))
        menu_rows = menus_result.fetchall()
        for (menu_id,) in menu_rows:
            await db.execute(
                text("""
                INSERT INTO role_menu_permissions (id, role_id, menu_id, can_view, can_edit)
                SELECT gen_random_uuid(), :role_id, :menu_id, true, false
                WHERE NOT EXISTS (
                    SELECT 1 FROM role_menu_permissions
                    WHERE role_id = :role_id2 AND menu_id = :menu_id2
                )
            """),
                {"role_id": student_role_id, "menu_id": menu_id, "role_id2": student_role_id, "menu_id2": menu_id},
            )
        await db.flush()
        print(f"[OK] role_menu_permissions ensured for {len(menu_rows)} menus")

        # ------------------------------------------------------------------ #
        # 5. Create or update User record                                      #
        # ------------------------------------------------------------------ #
        pwd_hash = hash_password(TEMP_PASSWORD)

        existing = await db.execute(
            text("SELECT id FROM users WHERE email = :email OR username = :username"),
            {"email": STUDENT["email"], "username": STUDENT["username"]},
        )
        existing_id = existing.scalar_one_or_none()

        if existing_id:
            await db.execute(
                text("""
                UPDATE users
                SET password_hash = :pwd, is_first_login = true,
                    username = :username, email = :email,
                    role_id = :role_id, is_active = true
                WHERE id = :id
            """),
                {
                    "pwd": pwd_hash,
                    "username": STUDENT["username"],
                    "email": STUDENT["email"],
                    "role_id": student_role_id,
                    "id": existing_id,
                },
            )
            user_id = existing_id
            print(f"[OK] Existing user updated — user_id: {user_id}")
        else:
            await db.execute(
                text("""
                INSERT INTO users (id, username, email, password_hash, is_active, is_first_login, role_id)
                VALUES (gen_random_uuid(), :username, :email, :pwd, true, true, :role_id)
            """),
                {
                    "username": STUDENT["username"],
                    "email": STUDENT["email"],
                    "pwd": pwd_hash,
                    "role_id": student_role_id,
                },
            )
            result = await db.execute(
                text("SELECT id FROM users WHERE username = :username"), {"username": STUDENT["username"]}
            )
            user_id = result.scalar_one()
            print(f"[OK] New user created — user_id: {user_id}")

        # ------------------------------------------------------------------ #
        # 6. Create or update Student record                                   #
        # ------------------------------------------------------------------ #
        existing_stu = await db.execute(text("SELECT id FROM students WHERE user_id = :user_id"), {"user_id": user_id})
        existing_stu_id = existing_stu.scalar_one_or_none()

        if existing_stu_id:
            await db.execute(
                text("""
                UPDATE students
                SET first_name = :first_name, last_name = :last_name,
                    gender = :gender, nationality = :nationality,
                    mother_tongue = :mother_tongue
                WHERE user_id = :user_id
            """),
                {
                    "first_name": STUDENT["first_name"],
                    "last_name": STUDENT["last_name"],
                    "gender": STUDENT["gender"],
                    "nationality": STUDENT["nationality"],
                    "mother_tongue": STUDENT["mother_tongue"],
                    "user_id": user_id,
                },
            )
            student_id = existing_stu_id
            print(f"[OK] Student record updated — student_id: {student_id}")
        else:
            await db.execute(
                text("""
                INSERT INTO students (
                    id, first_name, last_name, date_of_birth, gender,
                    nationality, mother_tongue, user_id
                )
                VALUES (
                    gen_random_uuid(), :first_name, :last_name, :dob, :gender,
                    :nationality, :mother_tongue, :user_id
                )
            """),
                {
                    "first_name": STUDENT["first_name"],
                    "last_name": STUDENT["last_name"],
                    "dob": STUDENT["date_of_birth"],
                    "gender": STUDENT["gender"],
                    "nationality": STUDENT["nationality"],
                    "mother_tongue": STUDENT["mother_tongue"],
                    "user_id": user_id,
                },
            )
            result2 = await db.execute(text("SELECT id FROM students WHERE user_id = :user_id"), {"user_id": user_id})
            student_id = result2.scalar_one()
            print(f"[OK] Student record created — student_id: {student_id}")

        # ------------------------------------------------------------------ #
        # 7. Create admission with class ABC / section A (if they exist)      #
        # ------------------------------------------------------------------ #
        class_result = await db.execute(
            text("SELECT id FROM classes WHERE name = :name"), {"name": STUDENT["class_name"]}
        )
        class_id = class_result.scalar_one_or_none()

        section_id = None
        if class_id:
            sec_result = await db.execute(
                text("SELECT id FROM sections WHERE name = :name AND class_id = :class_id"),
                {"name": STUDENT["section_name"], "class_id": class_id},
            )
            section_id = sec_result.scalar_one_or_none()

        # Look for an active academic year to attach
        ay_result = await db.execute(
            text("SELECT id FROM academic_years WHERE is_active = true ORDER BY created_at DESC LIMIT 1")
        )
        academic_year_id = ay_result.scalar_one_or_none()

        # Check if admission already exists for this student
        existing_adm = await db.execute(
            text("SELECT id FROM student_admissions WHERE student_id = :sid"), {"sid": student_id}
        )
        existing_adm_id = existing_adm.scalar_one_or_none()

        if existing_adm_id:
            # Update class/section if found
            if class_id:
                await db.execute(
                    text("""
                    UPDATE student_admissions
                    SET current_class_id = :class_id,
                        current_section_id = :section_id,
                        academic_year_id = :ay_id
                    WHERE id = :id
                """),
                    {
                        "class_id": class_id,
                        "section_id": section_id,
                        "ay_id": academic_year_id,
                        "id": existing_adm_id,
                    },
                )
            print(f"[OK] Admission record updated — admission_id: {existing_adm_id}")
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
                    "student_id": student_id,
                    "adm_date": date.today(),
                    "class_id": class_id,
                    "section_id": section_id,
                    "ay_id": academic_year_id,
                },
            )
            adm_result = await db.execute(
                text("SELECT id FROM student_admissions WHERE student_id = :sid"), {"sid": student_id}
            )
            adm_id = adm_result.scalar_one()
            if class_id:
                print(f"[OK] Admission created (class=ABC, section=A) — admission_id: {adm_id}")
            else:
                print(
                    f"[OK] Admission created (class 'ABC' not found — class/section set to NULL) — admission_id: {adm_id}"
                )
                print("     To assign class: seed a class named 'ABC' and run this script again.")

        await db.commit()

        print()
        print("=== Lambodhar Vinayak student account created ===")
        print(f"  Name        : {STUDENT['first_name']} {STUDENT['last_name']}")
        print(f"  Username    : {STUDENT['username']}")
        print(f"  Email       : {STUDENT['email']}")
        print(f"  Class       : {STUDENT['class_name']} / Section {STUDENT['section_name']}")
        print(f"  Role        : Student")
        print(f"  Temp PW     : {TEMP_PASSWORD}")
        print(f"  First login : True  (must set a new password on first login)")
        print()
        print("Next steps:")
        print("  1. POST /auth/login")
        print(
            f"       Body: {{ \"username\": \"{STUDENT['username']}\", \"password\": \"{TEMP_PASSWORD}\", \"client_name\": \"test_tenant\" }}"
        )
        print('       -> receives { "requires_password_change": true, "change_password_token": "..." }')
        print()
        print("  2. POST /auth/staff/set-password")
        print(
            '       Body: { "change_password_token": "<token>", "new_password": "NewPass@123", "confirm_password": "NewPass@123" }'
        )
        print("       -> receives full access_token, refresh_token, menu, permissions, entity_id")
        print()
        print("  If username does NOT exist in DB -> login returns 401 Invalid Credentials")
        print("  If username exists but is_first_login=TRUE -> password change required")
        print("  After password change -> full Student access with role-based permissions")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())

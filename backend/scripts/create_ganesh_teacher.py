"""
Seed script: Create Ganesh G as a Teacher staff member in test_tenant_schema.

Run from the project root:
    python scripts/create_ganesh_teacher.py

What this script does:
  1. Adds is_first_login column to users table if it doesn't exist.
  2. Ensures the 'Teacher' role exists.
  3. Creates a User account for Ganesh (email as username, temp password: Welcome@123, is_first_login=True).
  4. Creates the Staff record with full details.

After running, test the first-time login flow:
  POST /auth/login
    { "username": "Ganesh1@gmail.com", "password": "Welcome@123", "client_name": "test_tenant" }
  → receives { "requires_password_change": true, "change_password_token": "..." }

  POST /auth/staff/set-password
    { "change_password_token": "<token>", "new_password": "YourNew@123", "confirm_password": "YourNew@123" }
  → receives full login credentials (access_token, menu, permissions, etc.)
"""

import asyncio
import sys
import os
from datetime import date

# Allow importing app modules from the project root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

load_dotenv()

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import text
from app.config import settings
from app.tools.password_util import hash_password

SCHEMA = "test_tenant_schema"
TEMP_PASSWORD = "Welcome@123"

GANESH = {
    "first_name": "Ganesh",
    "last_name": "G",
    "email": "Ganesh1@gmail.com",
    "phone": "9701323926",
    "gender": "Male",
    "joining_date": date(2024, 6, 1),
    "qualification": "B.Tech",
    "department": "CSE",
    "is_active": True,
}


async def run():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with Session() as db:
        # ------------------------------------------------------------------ #
        # 0. Switch to tenant schema                                           #
        # ------------------------------------------------------------------ #
        await db.execute(text(f"SET search_path TO {SCHEMA}, public"))

        # ------------------------------------------------------------------ #
        # 1. Add is_first_login column if missing                              #
        #    Use NO DEFAULT so existing rows stay NULL (treated as False).     #
        #    Only new staff enrolled via the updated code get is_first_login=True.
        # ------------------------------------------------------------------ #
        await db.execute(text("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN
        """))
        # Also widen username to VARCHAR(100) to accommodate email identifiers
        await db.execute(text("""
            ALTER TABLE users
            ALTER COLUMN username TYPE VARCHAR(100)
        """))
        print("[OK] is_first_login column ensured (NULL for existing users = not first login)")
        print("[OK] username column widened to VARCHAR(100)")

        # ------------------------------------------------------------------ #
        # 2. Ensure Teacher role exists                                        #
        # ------------------------------------------------------------------ #
        await db.execute(text("""
            INSERT INTO roles (id, name, description, is_system_role, is_custom_role)
            VALUES (gen_random_uuid(), 'Teacher', 'Teaching staff with academic management access', true, false)
            ON CONFLICT (name) DO NOTHING
        """))
        result = await db.execute(text("SELECT id FROM roles WHERE name = 'Teacher'"))
        teacher_role_id = result.scalar_one()
        print(f"[OK] Teacher role ID: {teacher_role_id}")

        # ------------------------------------------------------------------ #
        # 3. Create or update User record for Ganesh                          #
        # ------------------------------------------------------------------ #
        pwd_hash = hash_password(TEMP_PASSWORD)

        # Look up existing user by email (covers both old enrollment and new)
        existing = await db.execute(
            text("SELECT id FROM users WHERE email = :email OR username = :username"),
            {"email": GANESH["email"], "username": GANESH["email"]},
        )
        existing_id = existing.scalar_one_or_none()

        if existing_id:
            # Update existing user: reset to temp password, mark first login, set Teacher role
            await db.execute(
                text("""
                UPDATE users
                SET password_hash = :pwd, is_first_login = true,
                    username = :username, role_id = :role_id, is_active = true
                WHERE id = :id
            """),
                {"pwd": pwd_hash, "role_id": teacher_role_id, "username": GANESH["email"], "id": existing_id},
            )
            user_id = existing_id
            print(f"[OK] Existing user updated (username set to email) — user_id: {user_id}")
        else:
            await db.execute(
                text("""
                INSERT INTO users (id, username, email, password_hash, is_active, is_first_login, role_id)
                VALUES (gen_random_uuid(), :username, :email, :pwd, true, true, :role_id)
            """),
                {
                    "username": GANESH["email"],
                    "email": GANESH["email"],
                    "pwd": pwd_hash,
                    "role_id": teacher_role_id,
                },
            )
            result = await db.execute(text("SELECT id FROM users WHERE email = :email"), {"email": GANESH["email"]})
            user_id = result.scalar_one()
            print(f"[OK] New user created — user_id: {user_id}")

        # ------------------------------------------------------------------ #
        # 4. Create or update Staff record                                     #
        # ------------------------------------------------------------------ #
        existing_staff = await db.execute(text("SELECT id FROM staff WHERE user_id = :user_id"), {"user_id": user_id})
        existing_staff_id = existing_staff.scalar_one_or_none()

        staff_params = {
            "first_name": GANESH["first_name"],
            "last_name": GANESH["last_name"],
            "email": GANESH["email"],
            "phone": GANESH["phone"],
            "gender": GANESH["gender"],
            "joining_date": GANESH["joining_date"],
            "qualification": GANESH["qualification"],
            "department": GANESH["department"],
            "is_active": GANESH["is_active"],
            "user_id": user_id,
        }

        if existing_staff_id:
            await db.execute(
                text("""
                UPDATE staff SET
                    first_name = :first_name, last_name = :last_name,
                    email = :email, phone = :phone, gender = :gender,
                    joining_date = :joining_date, qualification = :qualification,
                    department = :department, is_active = :is_active
                WHERE user_id = :user_id
            """),
                staff_params,
            )
            staff_id = existing_staff_id
            print(f"[OK] Staff record updated — staff_id: {staff_id}")
        else:
            await db.execute(
                text("""
                INSERT INTO staff (
                    id, first_name, last_name, email, phone, gender,
                    joining_date, qualification, department, is_active, user_id
                )
                VALUES (
                    gen_random_uuid(), :first_name, :last_name, :email, :phone, :gender,
                    :joining_date, :qualification, :department, :is_active, :user_id
                )
            """),
                staff_params,
            )
            result2 = await db.execute(text("SELECT id FROM staff WHERE user_id = :user_id"), {"user_id": user_id})
            staff_id = result2.scalar_one()
            print(f"[OK] Staff record created — staff_id: {staff_id}")

        await db.commit()
        print("\n=== Ganesh G created successfully ===")
        print(f"  Name        : {GANESH['first_name']} {GANESH['last_name']}")
        print(f"  Email       : {GANESH['email']}")
        print(f"  Phone       : {GANESH['phone']}")
        print(f"  Role        : Teacher")
        print(f"  Temp PW     : {TEMP_PASSWORD}")
        print(f"  First login : True  (must set a new password on first login)")
        print()
        print("Next steps:")
        print(
            "  1. POST /auth/login  { username: 'Ganesh1@gmail.com', password: 'Welcome@123', client_name: 'test_tenant' }"
        )
        print("  2. Copy change_password_token from response")
        print("  3. POST /auth/staff/set-password  { change_password_token, new_password, confirm_password }")
        print("  4. You will receive full access_token + refresh_token")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())

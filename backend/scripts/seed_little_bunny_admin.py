"""
Create an Admin user for the little_bunny tenant.
Run from the cos360_backend directory:
    python scripts/seed_little_bunny_admin.py
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

import bcrypt as _bcrypt
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.config import settings

SCHEMA = "little_bunny"
USERNAME = "admin.lb"
EMAIL = "admin@littlebunny.edu"
PASSWORD = "Admin@123"


async def run():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with Session() as db:
        await db.execute(text(f"SET search_path TO {SCHEMA}, public"))

        # Get Admin role
        result = await db.execute(text("SELECT id FROM roles WHERE name = 'Admin'"))
        admin_role_id = result.scalar_one_or_none()
        if not admin_role_id:
            print("ERROR: Admin role not found in little_bunny schema.")
            return
        print(f"Admin role — id={admin_role_id}")

        # Check if user already exists
        result = await db.execute(
            text("SELECT id FROM users WHERE username = :u OR email = :e"),
            {"u": USERNAME, "e": EMAIL},
        )
        existing_id = result.scalar_one_or_none()

        pwd_hash = _bcrypt.hashpw(PASSWORD.encode(), _bcrypt.gensalt()).decode()

        if existing_id:
            await db.execute(
                text("""
                    UPDATE users
                    SET password_hash = :pwd, is_active = true, is_first_login = false, role_id = :role
                    WHERE id = :id
                """),
                {"pwd": pwd_hash, "role": str(admin_role_id), "id": str(existing_id)},
            )
            print(f"Admin user updated — id={existing_id}")
        else:
            await db.execute(
                text("""
                    INSERT INTO users (id, username, email, password_hash, is_active, is_first_login, role_id)
                    VALUES (gen_random_uuid(), :u, :e, :pwd, true, false, :role)
                """),
                {"u": USERNAME, "e": EMAIL, "pwd": pwd_hash, "role": str(admin_role_id)},
            )
            result = await db.execute(
                text("SELECT id FROM users WHERE username = :u"), {"u": USERNAME}
            )
            new_id = result.scalar_one()
            print(f"Admin user created — id={new_id}")

        await db.commit()

        print()
        print("=" * 50)
        print("  Little Bunny — Admin Credentials")
        print("=" * 50)
        print(f"  client_name : little bunny")
        print(f"  username    : {USERNAME}")
        print(f"  password    : {PASSWORD}")
        print(f"  email       : {EMAIL}")
        print("=" * 50)

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())

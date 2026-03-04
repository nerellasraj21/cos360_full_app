"""
Utility script: Directly set a staff/teacher user's password and clear is_first_login.

Use this when the frontend has not yet implemented the first-login flow
and you need the user to be able to log in normally.

Usage:
    python scripts/set_staff_password.py

Updates Ganesh's password to Ganesh@123 and marks is_first_login = FALSE.
After running, login works normally:
  POST /auth/login
    { "username": "Ganesh1@gmail.com", "password": "Ganesh@123", "client_name": "test_tenant" }
  -> returns full LoginResponse (no password-change challenge)
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
from app.tools.password_util import hash_password

SCHEMA = "test_tenant_schema"

# --- Configure target user here ---
TARGET_EMAIL    = "Ganesh1@gmail.com"
NEW_PASSWORD    = "Ganesh@123"
# ----------------------------------


async def run():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with Session() as db:
        await db.execute(text(f"SET search_path TO {SCHEMA}, public"))

        # Verify user exists
        result = await db.execute(
            text("SELECT id, username FROM users WHERE email = :email OR username = :username"),
            {"email": TARGET_EMAIL, "username": TARGET_EMAIL}
        )
        row = result.fetchone()
        if not row:
            print(f"[ERROR] No user found with email/username: {TARGET_EMAIL}")
            return

        user_id, username = row
        print(f"[OK] Found user: {username} (id={user_id})")

        # Set new password and clear first-login flag
        pwd_hash = hash_password(NEW_PASSWORD)
        await db.execute(
            text("""
                UPDATE users
                SET password_hash = :pwd, is_first_login = FALSE
                WHERE id = :id
            """),
            {"pwd": pwd_hash, "id": user_id}
        )

        await db.commit()
        print(f"[OK] Password updated to '{NEW_PASSWORD}'")
        print("[OK] is_first_login set to FALSE")
        print()
        print("=== Ganesh can now log in normally ===")
        print(f"  Username : {TARGET_EMAIL}")
        print(f"  Password : {NEW_PASSWORD}")
        print(f"  Schema   : {SCHEMA}")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())

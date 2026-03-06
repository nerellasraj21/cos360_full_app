import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.tools.password_util import hash_password

logger = logging.getLogger("test_setup")
router = APIRouter(prefix="/auth/test-setup", tags=["Test Setup"])


@router.post("/create-test-users")
async def create_test_users(db: AsyncSession = Depends(get_tenant_db)):
    """
    Create test users for all 5 roles (Admin, Teacher, Student, Parent, Staff).

    Safe to call multiple times — roles are created only if they don't exist (by name),
    and users are upserted so passwords are always reset to the values below.

    Credentials:
      admin@test.com   / Admin@123
      teacher@test.com / Teacher@123
      student@test.com / Student@123
      parent@test.com  / Parent@123
      staff@test.com   / Staff@123
    """
    try:
        # ------------------------------------------------------------------ #
        # 1. Ensure all 5 system roles exist (conflict on name, not on id)    #
        # ------------------------------------------------------------------ #
        roles_to_ensure = [
            ("Admin", "System administrator with full access", "system"),
            ("Teacher", "Teaching staff with academic management access", "academic"),
            ("Student", "Student with limited read access", "academic"),
            ("Parent", "Parent with access to child information", "academic"),
            ("Staff", "Administrative staff with operational access", "administrative"),
        ]

        for name, desc, _ in roles_to_ensure:
            await db.execute(
                text("""
                INSERT INTO roles (id, name, description, is_system_role, is_custom_role)
                VALUES (gen_random_uuid(), :name, :desc, true, false)
                ON CONFLICT (name) DO NOTHING
            """),
                {"name": name, "desc": desc},
            )

        await db.flush()

        # ------------------------------------------------------------------ #
        # 2. Read back role IDs (keyed by name)                               #
        # ------------------------------------------------------------------ #
        result = await db.execute(
            text("SELECT id, name FROM roles WHERE name = ANY(:names)"), {"names": [r[0] for r in roles_to_ensure]}
        )
        role_map = {row.name: row.id for row in result}

        # ------------------------------------------------------------------ #
        # 3. Build test user list with fresh hashed passwords                 #
        # ------------------------------------------------------------------ #
        test_users = [
            {"username": "admin@test.com", "password": "Admin@123", "role": "Admin"},
            {"username": "teacher@test.com", "password": "Teacher@123", "role": "Teacher"},
            {"username": "student@test.com", "password": "Student@123", "role": "Student"},
            {"username": "parent@test.com", "password": "Parent@123", "role": "Parent"},
            {"username": "staff@test.com", "password": "Staff@123", "role": "Staff"},
        ]

        for user in test_users:
            role_id = role_map.get(user["role"])
            if not role_id:
                logger.warning(f"Role '{user['role']}' not found — skipping user {user['username']}")
                continue

            pwd_hash = hash_password(user["password"])

            await db.execute(
                text("""
                INSERT INTO users (id, username, email, password_hash, is_active, role_id)
                VALUES (gen_random_uuid(), :username, :email, :pwd, true, :role_id)
                ON CONFLICT (username)
                DO UPDATE SET
                    password_hash = EXCLUDED.password_hash,
                    role_id       = EXCLUDED.role_id,
                    is_active     = true
            """),
                {
                    "username": user["username"],
                    "email": user["username"],
                    "pwd": pwd_hash,
                    "role_id": role_id,
                },
            )

        await db.commit()

        return {
            "message": "Test users created (or updated) successfully",
            "users": [{"username": u["username"], "password": u["password"], "role": u["role"]} for u in test_users],
        }

    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating test users: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to create test users: {str(e)}"
        )

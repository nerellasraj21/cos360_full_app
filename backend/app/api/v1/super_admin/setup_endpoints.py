import logging
import bcrypt
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import text

from app.config import settings
from app.db.session import get_public_db

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/super_admin/setup", tags=["Super Admin/Setup"])


@router.post("/initialize", status_code=status.HTTP_201_CREATED)
async def initialize_super_admin_system():
    """
    Initialize Super Admin system - Create tables and default user

    **One-time setup endpoint** - Creates:
    - Super Admin tables (users, audit)
    - Initial Super Admin user
    - Security indexes

    **Warning**: This should only be run once during system setup
    """
    password = settings.SUPER_ADMIN_INITIAL_PASSWORD
    if not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Set SUPER_ADMIN_INITIAL_PASSWORD in the server environment before running setup",
        )

    try:
        async with get_public_db() as db:
            table_exists = (await db.execute(text("SELECT to_regclass('public.super_admin_users')"))).scalar()
            if table_exists is not None:
                existing = (await db.execute(text("SELECT 1 FROM public.super_admin_users LIMIT 1"))).first()
                if existing is not None:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Super Admin system is already initialized",
                    )

        async with get_public_db() as db:
            # 1. Create super_admin_users table
            await db.execute(text("""
            CREATE TABLE IF NOT EXISTS public.super_admin_users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                username VARCHAR(100) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                hashed_password VARCHAR(255) NOT NULL,
                full_name VARCHAR(255) NOT NULL,
                is_active BOOLEAN NOT NULL DEFAULT true,
                last_login_at TIMESTAMP,
                password_changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
                failed_login_attempts INTEGER NOT NULL DEFAULT 0,
                account_locked_until TIMESTAMP,
                requires_password_change BOOLEAN NOT NULL DEFAULT false
            );
        """))

        # 2. Create indexes for super_admin_users
        await db.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_public_super_admin_users_username 
            ON public.super_admin_users (username);
        """))
        await db.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_public_super_admin_users_email 
            ON public.super_admin_users (email);
        """))

        # 3. Create super_admin_audit table
        await db.execute(text("""
            CREATE TABLE IF NOT EXISTS public.super_admin_audit (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                super_admin_id UUID NOT NULL,
                action VARCHAR(100) NOT NULL,
                resource VARCHAR(100) NOT NULL,
                resource_id VARCHAR(100),
                tenant_id VARCHAR(100),
                details TEXT,
                ip_address VARCHAR(45),
                user_agent TEXT,
                timestamp TIMESTAMP NOT NULL DEFAULT NOW()
            );
        """))

        # 4. Create indexes for super_admin_audit
        indexes = [
            "CREATE INDEX IF NOT EXISTS ix_public_super_admin_audit_super_admin_id ON public.super_admin_audit (super_admin_id);",
            "CREATE INDEX IF NOT EXISTS ix_public_super_admin_audit_action ON public.super_admin_audit (action);",
            "CREATE INDEX IF NOT EXISTS ix_public_super_admin_audit_resource ON public.super_admin_audit (resource);",
            "CREATE INDEX IF NOT EXISTS ix_public_super_admin_audit_timestamp ON public.super_admin_audit (timestamp);",
        ]

        for index_sql in indexes:
            await db.execute(text(index_sql))

        # 5. Hash password for initial Super Admin
        password_bytes = password.encode("utf-8")
        salt = bcrypt.gensalt()
        hashed_password = bcrypt.hashpw(password_bytes, salt).decode("utf-8")

        # 6. Insert initial Super Admin user
        await db.execute(
            text("""
            INSERT INTO public.super_admin_users (
                id,
                username, 
                email, 
                hashed_password, 
                full_name,
                is_active,
                failed_login_attempts,
                requires_password_change
            ) VALUES (
                gen_random_uuid(),
                'superadmin',
                'superadmin@cos360.com',
                :hashed_password,
                'System Administrator',
                true,
                0,
                true
            ) ON CONFLICT (username) DO NOTHING;
        """),
            {"hashed_password": hashed_password},
        )

        # 7. Get super admin ID for audit log
        result = await db.execute(text("""
            SELECT id FROM public.super_admin_users WHERE username = 'superadmin'
        """))
        super_admin_id = result.scalar_one()

        # 8. Create audit log entry
        await db.execute(
            text("""
            INSERT INTO public.super_admin_audit (
                id,
                super_admin_id,
                action,
                resource,
                details
            ) VALUES (
                gen_random_uuid(),
                :super_admin_id,
                'SYSTEM_SETUP',
                'super_admin_user',
                'Initial Super Admin user created via API'
            );
        """),
            {"super_admin_id": super_admin_id},
        )

        await db.commit()

        return {
            "message": "Super Admin system initialized successfully",
            "initial_credentials": {
                "username": "superadmin",
                "email": "superadmin@cos360.com",
                "password": password,
                "warning": "CHANGE PASSWORD IMMEDIATELY AFTER FIRST LOGIN",
            },
            "login_endpoint": "POST /api/v1/super_admin/auth/login",
            "next_steps": [
                "1. Login with provided credentials",
                "2. Change password immediately",
                "3. Create additional Super Admin users if needed",
                "4. Setup tenant management",
            ],
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Unhandled error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initialize Super Admin system",
        )


@router.get("/status")
async def check_super_admin_status():
    """
    Check Super Admin system status

    Returns information about Super Admin setup state
    """
    try:
        async with get_public_db() as db:
            # Check if super_admin_users table exists
            tables_result = await db.execute(text("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('super_admin_users', 'super_admin_audit')
            ORDER BY table_name;
            """))
            existing_tables = [row[0] for row in tables_result.fetchall()]

            super_admin_count = 0
            if "super_admin_users" in existing_tables:
                # Count Super Admin users
                count_result = await db.execute(text("""
                    SELECT COUNT(*) FROM public.super_admin_users;
                """))
                super_admin_count = count_result.scalar()

            return {
                "system_status": "initialized" if len(existing_tables) == 2 else "not_initialized",
                "tables_exist": existing_tables,
                "missing_tables": [t for t in ["super_admin_users", "super_admin_audit"] if t not in existing_tables],
                "super_admin_count": super_admin_count,
                "ready_for_login": len(existing_tables) == 2 and super_admin_count > 0,
            }

    except Exception as e:
        logger.error("Unhandled error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to check Super Admin status"
        )

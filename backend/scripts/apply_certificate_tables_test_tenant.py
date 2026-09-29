"""
Migration script: Add certificate tables (stale_file_registry, file_audit_log)
and timestamp columns to certificate_types and student_certificates in test_tenant_schema.

Usage:
    python scripts/apply_certificate_tables_test_tenant.py
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

SCHEMA = "test_tenant_schema"


async def run():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with Session() as db:
        await db.execute(text(f"SET search_path TO {SCHEMA}, public"))

        # 1. Add created_at to certificate_types
        await db.execute(text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = '{SCHEMA}'
                      AND table_name = 'certificate_types'
                      AND column_name = 'created_at'
                ) THEN
                    ALTER TABLE certificate_types ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
                END IF;
            END $$;
        """))
        print("[OK] certificate_types.created_at (TIMESTAMP)")

        # 2. Add created_at and updated_at to student_certificates
        await db.execute(text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = '{SCHEMA}'
                      AND table_name = 'student_certificates'
                      AND column_name = 'created_at'
                ) THEN
                    ALTER TABLE student_certificates ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
                END IF;
            END $$;
        """))
        print("[OK] student_certificates.created_at (TIMESTAMP)")

        await db.execute(text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = '{SCHEMA}'
                      AND table_name = 'student_certificates'
                      AND column_name = 'updated_at'
                ) THEN
                    ALTER TABLE student_certificates ADD COLUMN updated_at TIMESTAMP;
                END IF;
            END $$;
        """))
        print("[OK] student_certificates.updated_at (TIMESTAMP)")

        # 3. Create stale_file_registry table
        await db.execute(text(f"""
            CREATE TABLE IF NOT EXISTS stale_file_registry (
                id UUID PRIMARY KEY,
                s3_key VARCHAR(500) NOT NULL,
                tenant_schema VARCHAR(100) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uk_stale_file_registry_id UNIQUE (id)
            );
        """))
        print("[OK] stale_file_registry table created")

        # Create indexes for stale_file_registry
        await db.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_stale_file_registry_id ON stale_file_registry(id);
        """))
        await db.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_stale_file_registry_tenant_schema ON stale_file_registry(tenant_schema);
        """))
        await db.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_stale_file_registry_expires_at ON stale_file_registry(expires_at);
        """))
        print("[OK] stale_file_registry indexes created")

        # 4. Create file_audit_log table
        await db.execute(text(f"""
            CREATE TABLE IF NOT EXISTS file_audit_log (
                id UUID PRIMARY KEY,
                actor_id UUID NOT NULL,
                actor_role VARCHAR(50) NOT NULL,
                student_id UUID,
                certificate_id UUID,
                action VARCHAR(50) NOT NULL,
                s3_key VARCHAR(500),
                tenant_schema VARCHAR(100) NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uk_file_audit_log_id UNIQUE (id)
            );
        """))
        print("[OK] file_audit_log table created")

        # Create indexes for file_audit_log
        await db.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_file_audit_log_id ON file_audit_log(id);
        """))
        await db.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_file_audit_log_actor_id ON file_audit_log(actor_id);
        """))
        await db.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_file_audit_log_student_id ON file_audit_log(student_id);
        """))
        await db.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_file_audit_log_certificate_id ON file_audit_log(certificate_id);
        """))
        await db.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_file_audit_log_tenant_schema ON file_audit_log(tenant_schema);
        """))
        print("[OK] file_audit_log indexes created")

        await db.commit()
        print()
        print(f"=== Certificate tables applied to {SCHEMA} ===")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())

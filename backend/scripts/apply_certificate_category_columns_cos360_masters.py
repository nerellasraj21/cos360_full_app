"""
Migration script: Add certificate_category enum, issued_by_name, and
issuer_signature_path columns to student_certificates in cos360_masters.

Usage:
    python scripts/apply_certificate_category_columns_cos360_masters.py
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

SCHEMA = "cos360_masters"


async def run():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with Session() as db:
        await db.execute(text(f"SET search_path TO {SCHEMA}, public"))

        # 1. Create enum type if not exists
        await db.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'certificate_category_enum') THEN
                    CREATE TYPE certificate_category_enum AS ENUM ('received', 'issued');
                END IF;
            END $$;
        """))
        print("[OK] certificate_category_enum type ensured")

        # 2. Add certificate_category column (nullable first)
        await db.execute(text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = '{SCHEMA}'
                      AND table_name = 'student_certificates'
                      AND column_name = 'certificate_category'
                ) THEN
                    ALTER TABLE student_certificates
                        ADD COLUMN certificate_category certificate_category_enum;
                END IF;
            END $$;
        """))
        print("[OK] student_certificates.certificate_category added")

        # 3. Backfill existing rows with default 'received'
        await db.execute(text("""
            UPDATE student_certificates
            SET certificate_category = 'received'
            WHERE certificate_category IS NULL
        """))
        print("[OK] Backfilled certificate_category = 'received' for existing rows")

        # 4. Set NOT NULL constraint if not already set
        await db.execute(text(f"""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = '{SCHEMA}'
                      AND table_name = 'student_certificates'
                      AND column_name = 'certificate_category'
                      AND is_nullable = 'YES'
                ) THEN
                    ALTER TABLE student_certificates
                        ALTER COLUMN certificate_category SET NOT NULL;
                END IF;
            END $$;
        """))
        print("[OK] certificate_category NOT NULL constraint applied")

        # 5. Add issued_by_name column
        await db.execute(text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = '{SCHEMA}'
                      AND table_name = 'student_certificates'
                      AND column_name = 'issued_by_name'
                ) THEN
                    ALTER TABLE student_certificates ADD COLUMN issued_by_name VARCHAR(150);
                END IF;
            END $$;
        """))
        print("[OK] student_certificates.issued_by_name added")

        # 6. Add issuer_signature_path column
        await db.execute(text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = '{SCHEMA}'
                      AND table_name = 'student_certificates'
                      AND column_name = 'issuer_signature_path'
                ) THEN
                    ALTER TABLE student_certificates ADD COLUMN issuer_signature_path VARCHAR(500);
                END IF;
            END $$;
        """))
        print("[OK] student_certificates.issuer_signature_path added")

        await db.commit()
        print()
        print(f"=== Certificate category columns applied to {SCHEMA} ===")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())

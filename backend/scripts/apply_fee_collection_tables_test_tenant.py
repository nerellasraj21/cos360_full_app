"""
Migration script: Create fee_concessions and fee_old tables in test_tenant_schema.

Usage:
    python scripts/apply_fee_collection_tables_test_tenant.py
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

        # ── Create enum types (idempotent) ────────────────────────────────────
        await db.execute(text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'concessionapproverenum'
                               AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = '{SCHEMA}')) THEN
                    CREATE TYPE concessionapproverenum AS ENUM ('owner', 'principal', 'management', 'correspondent');
                END IF;
            END $$;
        """))
        print("[OK] concessionapproverenum")

        await db.execute(text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'oldfeesourceenum'
                               AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = '{SCHEMA}')) THEN
                    CREATE TYPE oldfeesourceenum AS ENUM ('auto_carryforward', 'manual_entry');
                END IF;
            END $$;
        """))
        print("[OK] oldfeesourceenum")

        # ── fee_concessions ─────────────────────────────────────────────────
        await db.execute(text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = '{SCHEMA}' AND table_name = 'fee_concessions'
                ) THEN
                    CREATE TABLE fee_concessions (
                        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        student_id          UUID NOT NULL,
                        student_admission_num VARCHAR(50) NOT NULL,
                        fee_type_id         UUID NOT NULL,
                        fee_student_map_id  UUID NOT NULL,
                        academic_year_id    UUID NOT NULL,
                        assigned_fee        NUMERIC(10, 2) NOT NULL,
                        concession_amount   NUMERIC(10, 2) NOT NULL,
                        reason              VARCHAR(500) NOT NULL,
                        approved_by         concessionapproverenum NOT NULL,
                        approved_by_user_id UUID,
                        recorded_by_user_id UUID NOT NULL,
                        is_active           BOOLEAN NOT NULL DEFAULT TRUE,
                        created_at          TIMESTAMP NOT NULL DEFAULT now(),
                        updated_at          TIMESTAMP NOT NULL DEFAULT now(),
                        CONSTRAINT uq_concession_student_fee_year UNIQUE (student_id, fee_type_id, academic_year_id)
                    );
                    CREATE UNIQUE INDEX ix_fee_concessions_id ON fee_concessions (id);
                    CREATE INDEX ix_fee_concessions_student_id ON fee_concessions (student_id);
                    CREATE INDEX ix_fee_concessions_fee_type_id ON fee_concessions (fee_type_id);
                    CREATE INDEX ix_fee_concessions_academic_year_id ON fee_concessions (academic_year_id);
                END IF;
            END $$;
        """))
        print("[OK] fee_concessions")

        # ── fee_old ─────────────────────────────────────────────────────────
        await db.execute(text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = '{SCHEMA}' AND table_name = 'fee_old'
                ) THEN
                    CREATE TABLE fee_old (
                        id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        student_id              UUID NOT NULL,
                        student_admission_num   VARCHAR(50) NOT NULL,
                        academic_year_label     VARCHAR(20) NOT NULL,
                        source_academic_year_id UUID,
                        fee_type_name           VARCHAR(100) NOT NULL,
                        fee_type_id             UUID,
                        source                  oldfeesourceenum NOT NULL,
                        original_amount         NUMERIC(10, 2) NOT NULL,
                        paid_amount             NUMERIC(10, 2) NOT NULL DEFAULT 0,
                        paid_date               DATE,
                        receipt_manual          VARCHAR(100),
                        receipt_system          VARCHAR(100),
                        is_settled              BOOLEAN NOT NULL DEFAULT FALSE,
                        remarks                 VARCHAR(500),
                        current_academic_year_id UUID,
                        created_by_user_id      UUID,
                        created_at              TIMESTAMP NOT NULL DEFAULT now(),
                        updated_at              TIMESTAMP NOT NULL DEFAULT now()
                    );
                    CREATE UNIQUE INDEX ix_fee_old_id ON fee_old (id);
                    CREATE INDEX ix_fee_old_student_id ON fee_old (student_id);
                END IF;
            END $$;
        """))
        print("[OK] fee_old")

        await db.commit()
        print()
        print(f"=== Fee collection tables applied to {SCHEMA} ===")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())

"""
Migration script: Create exam_config_templates and exam_config_template_items tables
in test_tenant_schema.

No custom enum types needed.

Usage:
    python scripts/apply_exam_config_templates_test_tenant.py
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

        # 1. Create exam_config_templates table if not exists
        await db.execute(text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = '{SCHEMA}'
                      AND table_name = 'exam_config_templates'
                ) THEN
                    CREATE TABLE exam_config_templates (
                        id UUID PRIMARY KEY,
                        template_name VARCHAR(150) NOT NULL,
                        description TEXT,
                        board VARCHAR(50),
                        level VARCHAR(30),
                        source_exam_id UUID,
                        source_class_id UUID,
                        created_by UUID NOT NULL,
                        is_active BOOLEAN NOT NULL DEFAULT TRUE,
                        created_at TIMESTAMP NOT NULL DEFAULT now(),
                        updated_at TIMESTAMP NOT NULL DEFAULT now(),
                        CONSTRAINT uq_exam_config_template_name UNIQUE (template_name)
                    );
                    CREATE INDEX ix_exam_config_templates_id ON exam_config_templates(id);
                END IF;
            END $$;
        """))
        print("[OK] exam_config_templates table ensured")

        # 2. Create exam_config_template_items table if not exists
        await db.execute(text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = '{SCHEMA}'
                      AND table_name = 'exam_config_template_items'
                ) THEN
                    CREATE TABLE exam_config_template_items (
                        id UUID PRIMARY KEY,
                        template_id UUID NOT NULL REFERENCES exam_config_templates(id) ON DELETE CASCADE,
                        subject_id UUID NOT NULL,
                        subject_grade_scheme_id UUID,
                        credit_hours SMALLINT,
                        has_internal_external_split BOOLEAN NOT NULL DEFAULT FALSE,
                        internal_max_marks NUMERIC(8,2),
                        internal_min_pass NUMERIC(8,2),
                        external_max_marks NUMERIC(8,2),
                        external_min_pass NUMERIC(8,2),
                        sort_order SMALLINT,
                        components_json JSONB NOT NULL DEFAULT '[]'::jsonb
                    );
                    CREATE INDEX ix_exam_config_template_items_id ON exam_config_template_items(id);
                    CREATE INDEX ix_exam_config_template_items_template_id ON exam_config_template_items(template_id);
                END IF;
            END $$;
        """))
        print("[OK] exam_config_template_items table ensured")

        await db.commit()
        print()
        print(f"=== Exam config templates migration applied to {SCHEMA} ===")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())

"""
Migration script: Create parent and student_parent_link tables in cos360_masters (production schema).

These tables are required for:
- Storing parent/guardian information (Father, Mother, Guardian)
- Linking students to their parents/guardians
- Guardian functionality in student admissions

Usage:
    python scripts/apply_parent_tables_cos360_masters.py
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

        # ── Create parents table ──────────────────────────────────────────────
        await db.execute(text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = '{SCHEMA}' AND table_name = 'parents'
                ) THEN
                    CREATE TABLE parents (
                        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        name                VARCHAR(100) NOT NULL,
                        email               VARCHAR(100),
                        phone               VARCHAR(20),
                        occupation          VARCHAR(100),
                        aadhar_number       VARCHAR(12),
                        gender              VARCHAR(10),
                        relation_to_student VARCHAR(20),
                        salary_range        VARCHAR(20),
                        user_id             UUID NOT NULL UNIQUE REFERENCES public.users(id),
                        created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                    CREATE INDEX idx_parents_user_id ON parents(user_id);
                    CREATE INDEX idx_parents_relation ON parents(relation_to_student);
                END IF;
            END $$;
        """))
        print("[OK] parents table created")

        # ── Create student_parent_links table ──────────────────────────────────
        await db.execute(text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = '{SCHEMA}' AND table_name = 'student_parent_links'
                ) THEN
                    CREATE TABLE student_parent_links (
                        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        student_id  UUID NOT NULL REFERENCES cos360_masters.students(id),
                        parent_id   UUID NOT NULL REFERENCES cos360_masters.parents(id),
                        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                    CREATE INDEX idx_student_parent_links_student_id ON student_parent_links(student_id);
                    CREATE INDEX idx_student_parent_links_parent_id ON student_parent_links(parent_id);
                END IF;
            END $$;
        """))
        print("[OK] student_parent_links table created")

        await db.commit()
        print("\n[SUCCESS] Parent tables applied to cos360_masters schema")


if __name__ == "__main__":
    asyncio.run(run())

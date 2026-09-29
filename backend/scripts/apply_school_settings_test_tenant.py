"""
Migration script: Create school_settings table in test_tenant_schema.

Usage:
    python scripts/apply_school_settings_test_tenant.py
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

        await db.execute(text(f"""
            CREATE TABLE IF NOT EXISTS {SCHEMA}.school_settings (
                id UUID PRIMARY KEY,
                school_name VARCHAR(255),
                contact_no VARCHAR(20),
                alt_contact_no VARCHAR(20),
                school_email VARCHAR(255),
                address VARCHAR(500),
                city VARCHAR(100),
                state VARCHAR(100),
                district VARCHAR(100),
                pin_code VARCHAR(10),
                country VARCHAR(100),
                academic_year VARCHAR(50),
                installation_date DATE,
                image_url VARCHAR(500),
                principal_signature_url VARCHAR(500),
                school_board VARCHAR(100),
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
        """))
        print(f"[OK] school_settings table created/verified in {SCHEMA}")

        await db.commit()
        print()
        print(f"=== school_settings applied to {SCHEMA} ===")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())

"""
Create academic_years table in test_tenant_schema and seed default data.
Run from the cos360_backend directory:
    python scripts/seed_academic_years.py
"""
import os
import sys
import uuid
from datetime import date

import psycopg2
from dotenv import load_dotenv

load_dotenv()

raw_url = os.getenv("DATABASE_URL", "")
# Convert asyncpg URL to psycopg2 format and strip pooler suffix
pg_url = (
    raw_url
    .replace("postgresql+asyncpg://", "postgresql://")
    .replace("-pooler.", ".")
    .split("?")[0]  # strip query params
    + "?sslmode=require"
)

SCHEMA = "test_tenant_schema"

CREATE_TABLE = f"""
CREATE TABLE IF NOT EXISTS "{SCHEMA}".academic_years (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       VARCHAR(50) NOT NULL UNIQUE,
    is_active   BOOLEAN DEFAULT TRUE,
    start_date  DATE NOT NULL,
    end_date    DATE NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
"""

YEARS = [
    {
        "id": str(uuid.uuid4()),
        "title": "2024-2025",
        "is_active": True,
        "start_date": date(2024, 4, 1),
        "end_date": date(2025, 3, 31),
    },
    {
        "id": str(uuid.uuid4()),
        "title": "2025-2026",
        "is_active": False,
        "start_date": date(2025, 4, 1),
        "end_date": date(2026, 3, 31),
    },
]

def main():
    print(f"Connecting to database...")
    conn = psycopg2.connect(pg_url)
    conn.autocommit = True
    cur = conn.cursor()

    print(f"Creating academic_years table in {SCHEMA}...")
    cur.execute(CREATE_TABLE)
    print("[OK] Table ready.")

    print("Seeding academic years...")
    for yr in YEARS:
        cur.execute(
            f"""
            INSERT INTO "{SCHEMA}".academic_years
                (id, title, is_active, start_date, end_date)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (title) DO NOTHING
            """,
            (yr["id"], yr["title"], yr["is_active"], yr["start_date"], yr["end_date"]),
        )
        print(f"  {yr['title']} ({'active' if yr['is_active'] else 'inactive'})")

    cur.close()
    conn.close()
    print("Done.")

if __name__ == "__main__":
    main()

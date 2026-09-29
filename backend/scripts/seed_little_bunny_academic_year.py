"""
Seed 2025-26 academic year for the little_bunny tenant.
Run from the cos360_backend directory:
    python scripts/seed_little_bunny_academic_year.py
"""
import os
import uuid
from datetime import date

import psycopg2
from dotenv import load_dotenv

load_dotenv()

raw_url = os.getenv("DATABASE_URL", "")
pg_url = (
    raw_url
    .replace("postgresql+asyncpg://", "postgresql://")
    .replace("-pooler.", ".")
    .split("?")[0]
    + "?sslmode=require"
)

SCHEMA = "little_bunny"

YEAR = {
    "id": str(uuid.uuid4()),
    "title": "2025-2026",
    "is_active": True,
    "start_date": date(2025, 4, 1),
    "end_date": date(2026, 3, 31),
}


def main():
    print(f"Connecting to database...")
    conn = psycopg2.connect(pg_url)
    conn.autocommit = True
    cur = conn.cursor()

    print(f"Seeding academic year '{YEAR['title']}' into schema '{SCHEMA}'...")
    cur.execute(
        f"""
        INSERT INTO "{SCHEMA}".academic_years
            (id, title, is_active, start_date, end_date)
        SELECT %s, %s, %s, %s, %s
        WHERE NOT EXISTS (
            SELECT 1 FROM "{SCHEMA}".academic_years WHERE title = %s
        )
        """,
        (YEAR["id"], YEAR["title"], YEAR["is_active"], YEAR["start_date"], YEAR["end_date"], YEAR["title"]),
    )

    cur.execute(
        f'SELECT id, title, is_active, start_date, end_date FROM "{SCHEMA}".academic_years WHERE title = %s',
        (YEAR["title"],),
    )
    row = cur.fetchone()
    if row:
        print(f"  [OK] id={row[0]}  title={row[1]}  active={row[2]}  {row[3]} to {row[4]}")
    else:
        print("  [WARN] Row not found after insert — check for conflicts.")

    cur.close()
    conn.close()
    print("Done.")


if __name__ == "__main__":
    main()

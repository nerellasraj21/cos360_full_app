"""
Seed Class 1 to Class 5 for the little_bunny tenant (academic year 2025-2026).
Run from the cos360_backend directory:
    python scripts/seed_little_bunny_classes.py
"""
import os
import uuid

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
ACADEMIC_YEAR_TITLE = "2025-2026"

CLASSES = [
    {"name": "Class 1", "short_code": "C1", "description": "Class 1"},
    {"name": "Class 2", "short_code": "C2", "description": "Class 2"},
    {"name": "Class 3", "short_code": "C3", "description": "Class 3"},
    {"name": "Class 4", "short_code": "C4", "description": "Class 4"},
    {"name": "Class 5", "short_code": "C5", "description": "Class 5"},
]


def main():
    print("Connecting to database...")
    conn = psycopg2.connect(pg_url)
    conn.autocommit = True
    cur = conn.cursor()

    # Get academic year ID
    cur.execute(
        f'SELECT id FROM "{SCHEMA}".academic_years WHERE title = %s',
        (ACADEMIC_YEAR_TITLE,),
    )
    row = cur.fetchone()
    if not row:
        print(f"  ERROR: Academic year '{ACADEMIC_YEAR_TITLE}' not found in {SCHEMA}. Run seed_little_bunny_academic_year.py first.")
        return
    academic_year_id = row[0]
    print(f"Found academic year '{ACADEMIC_YEAR_TITLE}' — id={academic_year_id}")
    print()

    created = 0
    skipped = 0
    for cls in CLASSES:
        cur.execute(
            f"""
            INSERT INTO "{SCHEMA}".classes (id, name, short_code, description, is_active, academic_year_id)
            SELECT %s, %s, %s, %s, true, %s
            WHERE NOT EXISTS (
                SELECT 1 FROM "{SCHEMA}".classes WHERE name = %s AND academic_year_id = %s
            )
            """,
            (
                str(uuid.uuid4()),
                cls["name"],
                cls["short_code"],
                cls["description"],
                str(academic_year_id),
                cls["name"],
                str(academic_year_id),
            ),
        )
        if cur.rowcount == 1:
            print(f"  [CREATED] {cls['name']} ({cls['short_code']})")
            created += 1
        else:
            print(f"  [SKIPPED] {cls['name']} already exists")
            skipped += 1

    print()
    print(f"Done — {created} created, {skipped} skipped.")
    cur.close()
    conn.close()


if __name__ == "__main__":
    main()

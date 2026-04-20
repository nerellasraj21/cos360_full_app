"""
Seed default certificate templates into one or more tenant schemas.
Uses psycopg2 directly — no asyncpg, no alembic dependency.
Idempotent: skips templates that already exist (ON CONFLICT DO NOTHING).

Usage:
    python scripts/seed_cert_templates_direct.py                          # seeds both schemas
    python scripts/seed_cert_templates_direct.py cos360_master            # single schema
    python scripts/seed_cert_templates_direct.py test_tenant_schema
"""

import sys
import os
import psycopg2
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from scripts.seed_issuable_certificate_templates import TEMPLATES


def get_db_url() -> str:
    url = os.getenv("DATABASE_URL", "")
    url = url.replace("postgresql+asyncpg://", "postgresql://")
    url = url.replace("?ssl=", "?sslmode=").replace("&ssl=", "&sslmode=")
    url = url.replace("-pooler.", ".")
    return url


def seed_schema(schema: str, db_url: str) -> None:
    print(f"\n--- Seeding schema: {schema} ---")
    conn = psycopg2.connect(db_url)
    try:
        cur = conn.cursor()
        cur.execute(f"SET search_path TO {schema}, public")
        now = datetime.utcnow()

        for t in TEMPLATES:
            cur.execute(
                """
                INSERT INTO issuable_certificate_templates
                    (id, name, html_template, color_theme, variables_used, is_active, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
                """,
                (
                    str(t["id"]),
                    t["name"],
                    t["html_template"],
                    t["color_theme"],
                    t["variables_used"],
                    "True",
                    now,
                    now,
                ),
            )
            action = "skipped (exists)" if cur.rowcount == 0 else "inserted"
            print(f"  {t['name']}: {action}")

        conn.commit()

        cur.execute("SELECT COUNT(*) FROM issuable_certificate_templates")
        count = cur.fetchone()[0]
        print(f"  Total templates in {schema}: {count}")

    except Exception as e:
        conn.rollback()
        print(f"  Error seeding {schema}: {e}")
        raise
    finally:
        cur.close()
        conn.close()


def main():
    db_url = get_db_url()
    schemas = sys.argv[1:] if len(sys.argv) > 1 else ["cos360_master", "test_tenant_schema"]
    for schema in schemas:
        seed_schema(schema, db_url)
    print("\nDone.")


if __name__ == "__main__":
    main()

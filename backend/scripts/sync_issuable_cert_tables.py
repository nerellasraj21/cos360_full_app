"""
Create issuable certificate tables directly in a tenant schema.
Does NOT use Alembic — uses raw SQL with CREATE TABLE IF NOT EXISTS.

Usage:
    python scripts/sync_issuable_cert_tables.py [schema_name]
    python scripts/sync_issuable_cert_tables.py test_tenant_schema
"""

import sys
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()


def get_db_url() -> str:
    url = os.getenv("DATABASE_URL", "")
    url = url.replace("postgresql+asyncpg://", "postgresql://")
    url = url.replace("?ssl=", "?sslmode=").replace("&ssl=", "&sslmode=")
    url = url.replace("-pooler.", ".")
    return url


CREATE_TEMPLATES = """
CREATE TABLE IF NOT EXISTS {schema}.issuable_certificate_templates (
    id              UUID            NOT NULL,
    name            VARCHAR(255)    NOT NULL,
    html_template   TEXT            NOT NULL,
    color_theme     VARCHAR(20)     NOT NULL DEFAULT 'blue',
    variables_used  TEXT,
    is_active       VARCHAR         NOT NULL DEFAULT 'True',
    created_at      TIMESTAMP       NOT NULL,
    updated_at      TIMESTAMP       NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (id)
);
"""

CREATE_TEMPLATES_IDX = """
CREATE UNIQUE INDEX IF NOT EXISTS ix_issuable_certificate_templates_id
    ON {schema}.issuable_certificate_templates (id);
"""

CREATE_GENERATED = """
CREATE TABLE IF NOT EXISTS {schema}.generated_certificates (
    id              UUID            NOT NULL,
    student_id      UUID            NOT NULL,
    template_id     UUID            NOT NULL,
    html_content    TEXT            NOT NULL,
    pdf_content     BYTEA,
    issued_date     TIMESTAMP       NOT NULL,
    issued_by       UUID            NOT NULL,
    remarks         VARCHAR(500),
    is_active       VARCHAR         NOT NULL DEFAULT 'True',
    created_at      TIMESTAMP       NOT NULL,
    updated_at      TIMESTAMP       NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (id),
    CONSTRAINT fk_generated_certificates_template_id
        FOREIGN KEY (template_id)
        REFERENCES {schema}.issuable_certificate_templates (id)
        ON DELETE RESTRICT
);
"""

CREATE_GENERATED_INDEXES = [
    "CREATE UNIQUE INDEX IF NOT EXISTS ix_generated_certificates_id ON {schema}.generated_certificates (id);",
    "CREATE INDEX IF NOT EXISTS ix_generated_certificates_student_id ON {schema}.generated_certificates (student_id);",
    "CREATE INDEX IF NOT EXISTS ix_generated_certificates_template_id ON {schema}.generated_certificates (template_id);",
    "CREATE INDEX IF NOT EXISTS ix_generated_certificates_issued_by ON {schema}.generated_certificates (issued_by);",
]


def run(schema: str) -> None:
    db_url = get_db_url()
    print(f"\n=== Creating issuable certificate tables in schema: {schema} ===\n")

    conn = psycopg2.connect(db_url)
    try:
        cur = conn.cursor()

        print("Creating issuable_certificate_templates...")
        cur.execute(CREATE_TEMPLATES.format(schema=schema))
        cur.execute(CREATE_TEMPLATES_IDX.format(schema=schema))
        print("  [OK] issuable_certificate_templates")

        print("Creating generated_certificates...")
        cur.execute(CREATE_GENERATED.format(schema=schema))
        for idx_sql in CREATE_GENERATED_INDEXES:
            cur.execute(idx_sql.format(schema=schema))
        print("  [OK] generated_certificates")

        conn.commit()

        # Verify
        cur.execute(
            """
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = %s
              AND table_name IN ('issuable_certificate_templates', 'generated_certificates')
            ORDER BY table_name
            """,
            (schema,),
        )
        tables = [r[0] for r in cur.fetchall()]
        print(f"\nVerification -- tables in {schema}: {tables}")
        print("\nDone.")

    except Exception as e:
        conn.rollback()
        print(f"\nError: {e}")
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    schema = sys.argv[1] if len(sys.argv) > 1 else "test_tenant_schema"
    run(schema)

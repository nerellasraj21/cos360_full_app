"""
Create tenant-local copies of the shared enum types and rebind the affected
columns to them.

Background: several Postgres enum types (genderenum, admissiontypeenum, etc.)
were only ever created inside test_tenant_schema. Every other schema's columns
that use these types (including cos360_master's own) reference that single
physical type by OID. Since each tenant DB session runs with
`search_path = "<tenant_schema>"` only (see app/db/tenant_session.py), any
insert touching one of these columns fails with "type ... does not exist" for
every schema except test_tenant_schema itself.

`CREATE TABLE ... (LIKE ... INCLUDING ALL)` copies the literal type OID from
the source column - it does NOT re-resolve the type by name against the new
schema's search_path. So simply creating a same-named type in the target
schema is not enough; the column itself must be ALTERed to point at the new
local type.

This script is schema-agnostic: run it against any tenant schema (a newly
created one, or an existing one that's missing these types) to make that
schema fully self-contained for these enum-backed columns.

Usage:
    python scripts/fix_tenant_enum_types.py <schema_name>
    python scripts/fix_tenant_enum_types.py little_bunny
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

# type_name -> ordered enum labels (source of truth: test_tenant_schema, the
# only schema where these currently exist correctly)
ENUM_TYPES = {
    "genderenum": ["Male", "Female", "Other"],
    "admissiontypeenum": ["pre_primary", "regular"],
    "qualificationlevelenum": ["Below Graduation", "Graduation", "Post Graduation", "PhD"],
    "concessionapproverenum": ["owner", "principal", "management", "correspondent"],
    "oldfeesourceenum": ["auto_carryforward", "manual_entry"],
    "channelenum": ["sms", "whatsapp", "email"],
    "logstatusenum": ["queued", "sent", "delivered", "failed"],
    "queuestatusenum": ["queued", "processing", "done", "failed"],
    "billingcycleenum": ["annual", "semester", "monthly", "custom"],
    "certificate_category_enum": ["received", "issued"],
}

# (table, column) -> type_name, for columns whose DB type is still a real
# Postgres enum and therefore need ALTER COLUMN TYPE to rebind, in addition
# to the type being created. student_admissions.admission_type is
# deliberately excluded: that column is plain varchar today, so it only
# needs the type to exist for the SQLAlchemy-emitted `::admissiontypeenum`
# cast to resolve - no column rebinding required.
ENUM_COLUMNS = {
    ("staff", "gender"): "genderenum",
    ("staff_qualifications", "level"): "qualificationlevelenum",
    ("fee_concessions", "approved_by"): "concessionapproverenum",
    ("fee_old", "source"): "oldfeesourceenum",
    ("message_templates", "channel"): "channelenum",
    ("notification_log", "channel"): "channelenum",
    ("notification_log", "status"): "logstatusenum",
    ("notification_queue", "channel"): "channelenum",
    ("notification_queue", "status"): "queuestatusenum",
    ("student_certificates", "certificate_category"): "certificate_category_enum",
    ("transport_pricing", "billing_cycle"): "billingcycleenum",
}


async def run(schema: str):
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with Session() as db:
        print("=" * 70)
        print(f"Fixing enum types in schema: {schema}")
        print("=" * 70)

        # Step 1: create each type locally if missing
        for type_name, labels in ENUM_TYPES.items():
            exists = await db.scalar(
                text(
                    "SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace "
                    "WHERE n.nspname = :schema AND t.typname = :type_name"
                ),
                {"schema": schema, "type_name": type_name},
            )
            if exists:
                print(f"  [skip] {schema}.{type_name} already exists")
                continue

            labels_sql = ", ".join(f"'{label}'" for label in labels)
            await db.execute(text(f'CREATE TYPE "{schema}".{type_name} AS ENUM ({labels_sql})'))
            print(f"  [created] {schema}.{type_name} ({labels})")

        await db.commit()

        # Step 2: rebind affected columns to the new local type
        # Each column is handled + committed independently so one failure
        # (e.g. a default value that can't auto-cast) doesn't roll back the
        # columns already fixed.
        for (table, column), type_name in ENUM_COLUMNS.items():
            row = await db.execute(
                text(
                    "SELECT udt_schema, column_default FROM information_schema.columns "
                    "WHERE table_schema = :schema AND table_name = :table AND column_name = :column"
                ),
                {"schema": schema, "table": table, "column": column},
            )
            row = row.fetchone()
            if row is None:
                print(f"  [warn] {schema}.{table}.{column} not found - skipping")
                continue
            current_schema, current_default = row
            if current_schema == schema:
                print(f"  [skip] {schema}.{table}.{column} already bound to local type")
                continue

            try:
                if current_default is not None:
                    await db.execute(text(f'ALTER TABLE "{schema}".{table} ALTER COLUMN {column} DROP DEFAULT'))

                await db.execute(
                    text(
                        f'ALTER TABLE "{schema}".{table} '
                        f'ALTER COLUMN {column} TYPE "{schema}".{type_name} '
                        f'USING {column}::text::"{schema}".{type_name}'
                    )
                )

                if current_default is not None:
                    # current_default looks like "'queued'::test_tenant_schema.queuestatusenum";
                    # pull just the literal and recast against the local type.
                    literal = current_default.split("::", 1)[0]
                    await db.execute(
                        text(
                            f'ALTER TABLE "{schema}".{table} '
                            f'ALTER COLUMN {column} SET DEFAULT {literal}::"{schema}".{type_name}'
                        )
                    )

                await db.commit()
                print(f"  [rebound] {schema}.{table}.{column} -> {schema}.{type_name} (was {current_schema}.{type_name})")
            except Exception as e:
                await db.rollback()
                print(f"  [FAILED] {schema}.{table}.{column}: {e}")

        print()
        print("Done.")

    await engine.dispose()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python scripts/fix_tenant_enum_types.py <schema_name>")
        sys.exit(1)
    asyncio.run(run(sys.argv[1]))

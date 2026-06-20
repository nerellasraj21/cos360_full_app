"""
Create new tenant: "little bunny" (schema: little_bunny)
Clones structure from cos360_master — same process as all other tenants.
"""
import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

CLIENT_NAME = "little bunny"
SCHEMA_NAME = "little_bunny"


async def create_tenant():
    database_url = os.getenv("DATABASE_URL")
    if database_url.startswith("postgresql+asyncpg://"):
        database_url = database_url.replace("postgresql+asyncpg://", "postgresql://")

    conn = await asyncpg.connect(database_url)

    try:
        print("=" * 70)
        print(f"CREATING TENANT: {CLIENT_NAME}  (schema: {SCHEMA_NAME})")
        print("=" * 70)
        print()

        # Step 1: Check master schema is ready
        print("Step 1: Verifying cos360_master is ready...")
        master_tables = await conn.fetchval(
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'cos360_master'"
        )
        if master_tables < 30:
            print(f"  ERROR: cos360_master only has {master_tables} tables — aborting.")
            return
        print(f"  cos360_master has {master_tables} tables — OK")

        master_version = await conn.fetchval(
            "SELECT version_num FROM cos360_master.alembic_version LIMIT 1"
        )
        print(f"  Master alembic version: {master_version}")
        print()

        # Step 2: Check tenant doesn't already exist
        print("Step 2: Checking for conflicts...")
        existing = await conn.fetchval(
            "SELECT id FROM public.tenants WHERE client_name = $1 OR schema_name = $2",
            CLIENT_NAME, SCHEMA_NAME,
        )
        if existing:
            print(f"  ERROR: Tenant '{CLIENT_NAME}' or schema '{SCHEMA_NAME}' already exists — aborting.")
            return

        schema_exists = await conn.fetchval(
            "SELECT EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name = $1)",
            SCHEMA_NAME,
        )
        if schema_exists:
            print(f"  ERROR: Schema '{SCHEMA_NAME}' already exists in DB — aborting.")
            return
        print("  No conflicts found — OK")
        print()

        # Step 3: Insert tenant record in public.tenants
        print("Step 3: Creating tenant record in public.tenants...")
        tenant_id = await conn.fetchval(
            """
            INSERT INTO public.tenants (id, client_name, schema_name, is_active, created_at, updated_at)
            VALUES (gen_random_uuid(), $1, $2, true, NOW(), NOW())
            RETURNING id
            """,
            CLIENT_NAME, SCHEMA_NAME,
        )
        print(f"  Tenant record created — ID: {tenant_id}")
        print()

        # Step 4: Create schema and clone all tables from cos360_master
        print("Step 4: Creating schema and cloning tables from cos360_master...")
        await conn.execute(f'CREATE SCHEMA "{SCHEMA_NAME}"')

        tables = await conn.fetch(
            """
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'cos360_master' AND table_type = 'BASE TABLE'
            ORDER BY table_name
            """
        )

        cloned = 0
        failed = []
        for row in tables:
            table_name = row["table_name"]
            try:
                await conn.execute(
                    f'CREATE TABLE "{SCHEMA_NAME}"."{table_name}" '
                    f'(LIKE "cos360_master"."{table_name}" INCLUDING ALL)'
                )
                cloned += 1
            except Exception as e:
                failed.append((table_name, str(e)))

        print(f"  Tables cloned: {cloned} / {len(tables)}")
        if failed:
            print(f"  Failed tables: {[t for t, _ in failed]}")
        print()

        # Step 5: Set alembic version to match master
        print("Step 5: Setting migration version...")
        await conn.execute(
            f'INSERT INTO "{SCHEMA_NAME}".alembic_version (version_num) VALUES ($1)',
            master_version,
        )
        print(f"  Version set: {master_version}")
        print()

        # Step 6: Seed default roles
        print("Step 6: Seeding default roles...")
        default_roles = [
            ("Admin",   "Tenant Administrator - Full access to plan features"),
            ("Teacher", "Teaching staff - Student and academic management"),
            ("Staff",   "Administrative staff - Limited access"),
            ("Student", "Student users - Read access to their data"),
            ("Parent",  "Parent/Guardian - Access to children's data"),
        ]
        roles_created = 0
        for role_name, role_desc in default_roles:
            try:
                await conn.execute(
                    f'INSERT INTO "{SCHEMA_NAME}".roles (id, name, description, is_active) '
                    f'VALUES (gen_random_uuid(), $1, $2, true)',
                    role_name, role_desc,
                )
                roles_created += 1
            except Exception as e:
                print(f"  WARNING: Could not create role '{role_name}': {e}")
        print(f"  Roles created: {roles_created} / {len(default_roles)}")
        print()

        # Step 7: Final validation
        print("Step 7: Validating new schema...")
        final_table_count = await conn.fetchval(
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = $1",
            SCHEMA_NAME,
        )
        version_check = await conn.fetchval(
            f'SELECT version_num FROM "{SCHEMA_NAME}".alembic_version LIMIT 1'
        )
        print(f"  Tables in {SCHEMA_NAME}: {final_table_count}")
        print(f"  Alembic version: {version_check}")
        print()

        if final_table_count >= 30 and version_check:
            print("=" * 70)
            print(f"SUCCESS: Tenant '{CLIENT_NAME}' created (schema: {SCHEMA_NAME})")
            print(f"  Tenant ID : {tenant_id}")
            print(f"  Tables    : {final_table_count}")
            print(f"  Version   : {version_check}")
            print("=" * 70)
        else:
            print("WARNING: Validation failed — please check the schema manually.")

    except Exception as e:
        print(f"\nFATAL ERROR: {e}")
        raise
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(create_tenant())

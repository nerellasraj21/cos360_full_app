"""
Create Issuable Certificate Tables Script

This script creates the issuable_certificate_templates and generated_certificates tables
in the tenant schema for all active tenants.

Usage:
    python scripts/create_issuable_certificate_tables.py
    python scripts/create_issuable_certificate_tables.py test_tenant  # For specific tenant
"""

import asyncio
import sys
from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.db.base import BaseOrg


async def get_active_tenants(db: AsyncSession) -> list[dict]:
    """Fetch all active tenants from public schema"""
    try:
        # Ensure we're in public schema
        await db.execute(text("SET search_path TO public"))

        result = await db.execute(
            text("""
                SELECT schema_name, client_name
                FROM tenants
                WHERE is_active = true
                ORDER BY schema_name
            """)
        )
        return [dict(row) for row in result.fetchall()]
    except Exception as e:
        print(f"❌ Error fetching tenants: {e}")
        return []


async def create_tables_in_tenant(
    db: AsyncSession,
    schema_name: str,
    client_name: str
) -> bool:
    """Create issuable certificate tables in a tenant schema"""
    try:
        # Set search path to tenant schema
        await db.execute(text(f"SET search_path TO {schema_name}"))

        # Create tables using BaseOrg metadata
        await db.execute(
            text(f"CREATE TABLE IF NOT EXISTS {schema_name}.issuable_certificate_templates (id UUID PRIMARY KEY)")
        )

        # Use SQLAlchemy to create all tables
        async with db.begin():
            await db.run_sync(
                lambda conn: BaseOrg.metadata.create_all(
                    conn,
                    tables=[
                        BaseOrg.metadata.tables.get('issuable_certificate_templates'),
                        BaseOrg.metadata.tables.get('generated_certificates'),
                    ]
                )
            )

        print(f"  ✓ Created tables in schema: {schema_name} ({client_name})")
        return True

    except Exception as e:
        print(f"  ❌ Error creating tables in {schema_name}: {e}")
        return False


async def main():
    """Main entry point"""
    import os

    # Get database URL
    database_url = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://user:password@localhost/cos360"
    )

    # Check if specific tenant requested
    specific_tenant = sys.argv[1] if len(sys.argv) > 1 else None

    print(f"Connecting to database: {database_url}...")
    print()

    # Create engine
    engine = create_async_engine(database_url, echo=False)
    AsyncSessionLocal = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    try:
        async with AsyncSessionLocal() as db:
            # Get list of tenants
            tenants = await get_active_tenants(db)

            if not tenants:
                print("⚠️  No active tenants found")
                return

            if specific_tenant:
                tenants = [t for t in tenants if t['client_name'] == specific_tenant]
                if not tenants:
                    print(f"⚠️  Tenant '{specific_tenant}' not found or inactive")
                    return

            print(f"Found {len(tenants)} tenant(s)")
            print()

            # Create tables in each tenant schema
            success_count = 0
            for tenant in tenants:
                schema = tenant['schema_name']
                client = tenant['client_name']

                # Create new session for each tenant to avoid schema caching
                async with AsyncSessionLocal() as tenant_db:
                    if await create_tables_in_tenant(tenant_db, schema, client):
                        success_count += 1

            print()
            print(f"✅ Successfully created tables in {success_count}/{len(tenants)} tenant(s)")

    except Exception as e:
        print(f"❌ Fatal error: {e}")
        raise
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())

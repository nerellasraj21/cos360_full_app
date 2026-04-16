"""
Check migration application status
Identifies which migrations were applied to schemas vs which were applied directly to database
"""
import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def check_migration_status():
    database_url = os.getenv('DATABASE_URL')
    if database_url.startswith('postgresql+asyncpg://'):
        database_url = database_url.replace('postgresql+asyncpg://', 'postgresql://')

    conn = await asyncpg.connect(database_url)

    try:
        print("=" * 80)
        print("MIGRATION APPLICATION STATUS ANALYSIS")
        print("=" * 80)
        print()

        # Get migration versions from both schemas
        print("1. ALEMBIC VERSION TABLE STATUS")
        print("-" * 80)

        master_version = await conn.fetchval(
            "SELECT version_num FROM cos360_master.alembic_version"
        )
        tenant_version = await conn.fetchval(
            "SELECT version_num FROM test_tenant_schema.alembic_version"
        )

        print(f"cos360_master version:     {master_version}")
        print(f"test_tenant_schema version: {tenant_version}")
        print()

        # Check if specific tables exist that should be in later migrations
        print("2. FEATURE EXISTENCE CHECK")
        print("-" * 80)
        print()

        # Features from migrations AFTER f1a2b3c4d5e6
        checks = [
            {
                'feature': 'transport_pricing table',
                'migration': 'h4i5j6k7l8m9',
                'query': """
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.tables
                        WHERE table_schema = $1 AND table_name = 'transport_pricing'
                    )
                """
            },
            {
                'feature': 'exam_config_templates table',
                'migration': 'k7l8m9n0o1p2',
                'query': """
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.tables
                        WHERE table_schema = $1 AND table_name = 'exam_config_templates'
                    )
                """
            },
            {
                'feature': 'stale_file_registry table',
                'migration': 'f2a3b4c5d6e7',
                'query': """
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.tables
                        WHERE table_schema = $1 AND table_name = 'stale_file_registry'
                    )
                """
            },
            {
                'feature': 'staff.bank_name column',
                'migration': 'd2e3f4a5b6c7',
                'query': """
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = $1 AND table_name = 'staff'
                        AND column_name = 'bank_name'
                    )
                """
            },
            {
                'feature': 'route_stops.pickup_time column',
                'migration': 'h4i5j6k7l8m9',
                'query': """
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = $1 AND table_name = 'route_stops'
                        AND column_name = 'pickup_time'
                    )
                """
            },
            {
                'feature': 'certificate_types.created_at column',
                'migration': 'f2a3b4c5d6e7',
                'query': """
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = $1 AND table_name = 'certificate_types'
                        AND column_name = 'created_at'
                    )
                """
            },
            {
                'feature': 'users.is_first_login column',
                'migration': 'unknown',
                'query': """
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = $1 AND table_name = 'users'
                        AND column_name = 'is_first_login'
                    )
                """
            },
            {
                'feature': 'fee_class_map_term_amounts.term_date_id column',
                'migration': 'unknown',
                'query': """
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = $1 AND table_name = 'fee_class_map_term_amounts'
                        AND column_name = 'term_date_id'
                    )
                """
            }
        ]

        results = []
        for check in checks:
            master_exists = await conn.fetchval(check['query'], 'cos360_master')
            tenant_exists = await conn.fetchval(check['query'], 'test_tenant_schema')

            results.append({
                'feature': check['feature'],
                'migration': check['migration'],
                'master': master_exists,
                'tenant': tenant_exists
            })

        # Print results
        print(f"{'Feature':<50} {'Migration':<15} {'Master':<8} {'Tenant':<8} {'Status'}")
        print("-" * 100)

        for r in results:
            master_str = "YES" if r['master'] else "NO"
            tenant_str = "YES" if r['tenant'] else "NO"

            if r['master'] and r['tenant']:
                status = "[OK] Both have it"
            elif not r['master'] and not r['tenant']:
                status = "[OK] Neither has it"
            elif not r['master'] and r['tenant']:
                status = "[DRIFT] Tenant has it, Master missing"
            else:
                status = "[DRIFT] Master has it, Tenant missing"

            print(f"{r['feature']:<50} {r['migration']:<15} {master_str:<8} {tenant_str:<8} {status}")

        print()
        print("=" * 80)
        print("ANALYSIS SUMMARY")
        print("=" * 80)
        print()

        # Count drift issues
        both_at_same_version = master_version == tenant_version
        features_in_tenant_only = sum(1 for r in results if r['tenant'] and not r['master'])
        features_in_master_only = sum(1 for r in results if r['master'] and not r['tenant'])

        print(f"Alembic versions match: {both_at_same_version}")
        print(f"Features in tenant but not master: {features_in_tenant_only}")
        print(f"Features in master but not tenant: {features_in_master_only}")
        print()

        if both_at_same_version and (features_in_tenant_only > 0 or features_in_master_only > 0):
            print("[CRITICAL] DIRECT DATABASE MODIFICATIONS DETECTED")
            print()
            print("Evidence:")
            print("- Both schemas report same Alembic migration version")
            print("- But schemas have different structures")
            print()
            print("Conclusion:")
            print("Changes were applied DIRECTLY to database without Alembic migrations.")
            print("This bypassed the migration system and caused schema drift.")
            print()
            print("Likely causes:")
            print("1. Someone ran raw SQL ALTER TABLE commands directly")
            print("2. Someone created migration files but never ran 'alembic upgrade'")
            print("3. Database was manually edited outside of migration system")
            print()
            print("Recommended fix:")
            print("1. Review all migration files after f1a2b3c4d5e6")
            print("2. Fix migration chain (resolve multiple heads)")
            print("3. Apply missing migrations to both schemas")
            print("4. Or recreate schemas from corrected master")

    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(check_migration_status())

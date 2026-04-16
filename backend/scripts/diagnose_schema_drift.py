"""
Schema Drift Diagnostic Tool
Compares cos360_master with test_tenant_schema to identify discrepancies
NO WRITE OPERATIONS - READ-ONLY ANALYSIS
"""
import asyncio
import asyncpg
from typing import Dict, List, Set
import os
from dotenv import load_dotenv

load_dotenv()

class SchemaDriftAnalyzer:
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.master_schema = 'cos360_master'
        self.tenant_schema = 'test_tenant_schema'

    async def connect(self):
        """Create database connection"""
        return await asyncpg.connect(self.database_url)

    async def get_tables(self, conn, schema_name: str) -> Set[str]:
        """Get all tables in a schema"""
        query = """
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = $1
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        """
        rows = await conn.fetch(query, schema_name)
        return {row['table_name'] for row in rows}

    async def get_columns(self, conn, schema_name: str, table_name: str) -> Dict:
        """Get column definitions for a table"""
        query = """
            SELECT
                column_name,
                data_type,
                character_maximum_length,
                is_nullable,
                column_default
            FROM information_schema.columns
            WHERE table_schema = $1 AND table_name = $2
            ORDER BY ordinal_position
        """
        rows = await conn.fetch(query, schema_name, table_name)
        return {
            row['column_name']: {
                'data_type': row['data_type'],
                'max_length': row['character_maximum_length'],
                'nullable': row['is_nullable'],
                'default': row['column_default']
            }
            for row in rows
        }

    async def get_indexes(self, conn, schema_name: str, table_name: str) -> Dict:
        """Get indexes for a table"""
        query = """
            SELECT
                i.relname as index_name,
                a.attname as column_name,
                ix.indisunique as is_unique,
                ix.indisprimary as is_primary
            FROM pg_class t
            JOIN pg_index ix ON t.oid = ix.indrelid
            JOIN pg_class i ON i.oid = ix.indexrelid
            JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
            JOIN pg_namespace n ON n.oid = t.relnamespace
            WHERE n.nspname = $1 AND t.relname = $2
            ORDER BY i.relname, a.attname
        """
        rows = await conn.fetch(query, schema_name, table_name)
        indexes = {}
        for row in rows:
            idx_name = row['index_name']
            if idx_name not in indexes:
                indexes[idx_name] = {
                    'columns': [],
                    'is_unique': row['is_unique'],
                    'is_primary': row['is_primary']
                }
            indexes[idx_name]['columns'].append(row['column_name'])
        return indexes

    async def get_constraints(self, conn, schema_name: str, table_name: str) -> Dict:
        """Get constraints for a table"""
        query = """
            SELECT
                con.conname as constraint_name,
                con.contype as constraint_type,
                pg_get_constraintdef(con.oid) as definition
            FROM pg_constraint con
            JOIN pg_class rel ON rel.oid = con.conrelid
            JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
            WHERE nsp.nspname = $1 AND rel.relname = $2
            ORDER BY con.conname
        """
        rows = await conn.fetch(query, schema_name, table_name)
        return {
            row['constraint_name']: {
                'type': row['constraint_type'],
                'definition': row['definition']
            }
            for row in rows
        }

    async def get_migration_version(self, conn, schema_name: str) -> str:
        """Get Alembic migration version"""
        try:
            query = f"SELECT version_num FROM {schema_name}.alembic_version"
            result = await conn.fetchval(query)
            return result if result else "No version"
        except:
            return "No alembic_version table"

    async def analyze_drift(self):
        """Main analysis function"""
        conn = await self.connect()

        try:
            print("=" * 80)
            print("SCHEMA DRIFT ANALYSIS")
            print("=" * 80)
            print(f"Master Schema: {self.master_schema}")
            print(f"Tenant Schema: {self.tenant_schema}")
            print("=" * 80)
            print()

            # Check migration versions
            print("1. MIGRATION VERSION CHECK")
            print("-" * 80)
            master_version = await self.get_migration_version(conn, self.master_schema)
            tenant_version = await self.get_migration_version(conn, self.tenant_schema)

            print(f"Master version: {master_version}")
            print(f"Tenant version: {tenant_version}")

            if master_version != tenant_version:
                print("[WARNING] Migration versions differ!")
                print(f"  Recommendation: Run migration sync to bring tenant to {master_version}")
            else:
                print("[OK] Migration versions match")
            print()

            # Get tables from both schemas
            print("2. TABLE COMPARISON")
            print("-" * 80)
            master_tables = await self.get_tables(conn, self.master_schema)
            tenant_tables = await self.get_tables(conn, self.tenant_schema)

            print(f"Master tables count: {len(master_tables)}")
            print(f"Tenant tables count: {len(tenant_tables)}")

            # Tables only in master
            master_only = master_tables - tenant_tables
            if master_only:
                print(f"\n[WARNING] Tables in MASTER but not in TENANT ({len(master_only)}):")
                for table in sorted(master_only):
                    print(f"  - {table}")

            # Tables only in tenant
            tenant_only = tenant_tables - master_tables
            if tenant_only:
                print(f"\n[WARNING] Tables in TENANT but not in MASTER ({len(tenant_only)}):")
                for table in sorted(tenant_only):
                    print(f"  - {table}")

            # Common tables
            common_tables = master_tables & tenant_tables
            if len(master_only) == 0 and len(tenant_only) == 0:
                print(f"\n[OK] All tables match ({len(common_tables)} tables)")
            print()

            # Analyze each common table
            print("3. COLUMN STRUCTURE COMPARISON")
            print("-" * 80)

            column_diffs = []
            for table in sorted(common_tables):
                master_cols = await self.get_columns(conn, self.master_schema, table)
                tenant_cols = await self.get_columns(conn, self.tenant_schema, table)

                master_col_names = set(master_cols.keys())
                tenant_col_names = set(tenant_cols.keys())

                # Columns only in master
                master_only_cols = master_col_names - tenant_col_names
                if master_only_cols:
                    column_diffs.append({
                        'table': table,
                        'type': 'missing_in_tenant',
                        'columns': master_only_cols
                    })

                # Columns only in tenant
                tenant_only_cols = tenant_col_names - master_col_names
                if tenant_only_cols:
                    column_diffs.append({
                        'table': table,
                        'type': 'extra_in_tenant',
                        'columns': tenant_only_cols
                    })

                # Check column type differences for common columns
                common_cols = master_col_names & tenant_col_names
                type_diffs = []
                for col in common_cols:
                    if master_cols[col] != tenant_cols[col]:
                        type_diffs.append({
                            'column': col,
                            'master': master_cols[col],
                            'tenant': tenant_cols[col]
                        })

                if type_diffs:
                    column_diffs.append({
                        'table': table,
                        'type': 'type_mismatch',
                        'differences': type_diffs
                    })

            if column_diffs:
                print(f"[WARNING] Found column differences in {len(column_diffs)} issues:")
                for diff in column_diffs:
                    if diff['type'] == 'missing_in_tenant':
                        print(f"\n  Table: {diff['table']}")
                        print(f"  Issue: Columns in MASTER but not in TENANT")
                        for col in sorted(diff['columns']):
                            print(f"    - {col}")
                    elif diff['type'] == 'extra_in_tenant':
                        print(f"\n  Table: {diff['table']}")
                        print(f"  Issue: Columns in TENANT but not in MASTER")
                        for col in sorted(diff['columns']):
                            print(f"    - {col}")
                    elif diff['type'] == 'type_mismatch':
                        print(f"\n  Table: {diff['table']}")
                        print(f"  Issue: Column type mismatches")
                        for d in diff['differences']:
                            print(f"    Column: {d['column']}")
                            print(f"      Master: {d['master']}")
                            print(f"      Tenant: {d['tenant']}")
            else:
                print("[OK] All column structures match")
            print()

            # Index comparison for critical tables
            print("4. INDEX COMPARISON (Sample)")
            print("-" * 80)

            sample_tables = list(common_tables)[:5]  # Sample first 5 tables
            index_issues = []

            for table in sorted(sample_tables):
                master_idx = await self.get_indexes(conn, self.master_schema, table)
                tenant_idx = await self.get_indexes(conn, self.tenant_schema, table)

                master_idx_names = set(master_idx.keys())
                tenant_idx_names = set(tenant_idx.keys())

                missing = master_idx_names - tenant_idx_names
                extra = tenant_idx_names - master_idx_names

                if missing or extra:
                    index_issues.append({
                        'table': table,
                        'missing': missing,
                        'extra': extra
                    })

            if index_issues:
                print(f"[WARNING] Index differences found in sampled tables:")
                for issue in index_issues:
                    print(f"\n  Table: {issue['table']}")
                    if issue['missing']:
                        print(f"    Missing in tenant: {', '.join(issue['missing'])}")
                    if issue['extra']:
                        print(f"    Extra in tenant: {', '.join(issue['extra'])}")
            else:
                print("[OK] Indexes match in sampled tables")
            print()

            # Summary and recommendations
            print("=" * 80)
            print("SUMMARY AND RECOMMENDATIONS")
            print("=" * 80)

            has_issues = False

            if master_version != tenant_version:
                has_issues = True
                print("\n[WARNING] MIGRATION VERSION MISMATCH")
                print("  Recommendation: Sync tenant to master version")
                print("  Command: python migrate_tenants.py --schema test_tenant_schema --action upgrade")

            if master_only:
                has_issues = True
                print(f"\n[WARNING] MISSING TABLES IN TENANT ({len(master_only)} tables)")
                print("  Recommendation: Apply missing migrations or use Shadow Sync strategy")
                print("  Command: Use schema sync API with mode='shadow'")

            if tenant_only:
                has_issues = True
                print(f"\n[WARNING] EXTRA TABLES IN TENANT ({len(tenant_only)} tables)")
                print("  Recommendation: Review if these tables are needed")
                print("  Action: Manual review required - may be custom tenant-specific tables")

            if column_diffs:
                has_issues = True
                print(f"\n[WARNING] COLUMN STRUCTURE DIFFERENCES ({len(column_diffs)} issues)")
                print("  Recommendation: Use Recreate Sync strategy for breaking changes")
                print("  Command: Use schema sync API with mode='recreate' and preserve_data=true")

            if not has_issues:
                print("\n[OK] NO SIGNIFICANT SCHEMA DRIFT DETECTED")
                print("  Schemas are in sync. No action required.")
            else:
                print("\n" + "=" * 80)
                print("SYNC STRATEGY RECOMMENDATION")
                print("=" * 80)

                if master_version != tenant_version and not (master_only or column_diffs):
                    print("\nRecommended: IN-PLACE SYNC")
                    print("  - Migration versions differ but structure appears intact")
                    print("  - Minimal downtime (< 30 seconds)")
                    print("  - Run: python migrate_tenants.py --schema test_tenant_schema --action upgrade")

                elif master_only or (column_diffs and len(column_diffs) < 10):
                    print("\nRecommended: SHADOW SYNC")
                    print("  - Structural changes detected")
                    print("  - Data migration required")
                    print("  - Estimated downtime: < 5 minutes")
                    print("  - Creates shadow schema, migrates data, then swaps")

                else:
                    print("\nRecommended: RECREATE SYNC")
                    print("  - Significant schema drift detected")
                    print("  - Complete schema recreation needed")
                    print("  - Estimated downtime: < 10 minutes")
                    print("  - Full backup and restore with validation")

                print("\nBEFORE ANY SYNC:")
                print("  1. Create backup of test_tenant_schema")
                print("  2. Review all differences carefully")
                print("  3. Test sync in development environment first")
                print("  4. Schedule maintenance window for production")

        finally:
            await conn.close()

async def main():
    database_url = os.getenv('DATABASE_URL')

    if not database_url:
        print("ERROR: DATABASE_URL environment variable not set")
        return

    # Convert asyncpg format
    if database_url.startswith('postgresql+asyncpg://'):
        database_url = database_url.replace('postgresql+asyncpg://', 'postgresql://')

    analyzer = SchemaDriftAnalyzer(database_url)
    await analyzer.analyze_drift()

if __name__ == "__main__":
    asyncio.run(main())

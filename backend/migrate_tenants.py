#!/usr/bin/env python3
"""
COS360 Multi-Tenant Migration Manager

This script handles database migrations across multiple tenant schemas.
It ensures all tenant schemas stay synchronized with the main schema.

Usage:
    python migrate_tenants.py --schema test_tenant_schema --action upgrade --target head
    python migrate_tenants.py --schema cos360_main --action current
    python migrate_tenants.py --action sync-all  # Sync all known tenants
"""

import os
import sys
import subprocess
import argparse
from pathlib import Path

# Known tenant schemas - add new tenants here
TENANT_SCHEMAS = [
    'cos360_main',
    'test_tenant_schema',
    # Add more tenant schemas as needed
]

def run_alembic_command(schema_name, action, target=None):
    """Run alembic command with specific schema targeting"""
    
    # Set environment variable with explicit export for Windows
    env = os.environ.copy()
    env['SCHEMA_NAME'] = schema_name
    
    # Build alembic command
    cmd = ['alembic', action]
    if target and action not in ['current', 'history']:
        cmd.append(target)
    
    print(f"Running: {' '.join(cmd)} (Schema: {schema_name})")
    print(f"Environment: SCHEMA_NAME={schema_name}")
    
    try:
        # Use env parameter to ensure environment variable is passed
        result = subprocess.run(cmd, capture_output=True, text=True, check=True, env=env)
        print(f"Success for {schema_name}")
        if result.stdout:
            print(f"   Output: {result.stdout.strip()}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error for {schema_name}")
        print(f"   Error: {e.stderr}")
        print(f"   Command: {' '.join(cmd)}")
        print(f"   Schema: {schema_name}")
        return False

def get_current_version(schema_name):
    """Get current migration version for a schema"""
    env = os.environ.copy()
    env['SCHEMA_NAME'] = schema_name
    
    try:
        result = subprocess.run(['alembic', 'current'], capture_output=True, text=True, check=True, env=env)
        # Extract version from output like "ac8a8190d7dc (head)"
        output = result.stdout.strip()
        if output and not output.startswith('INFO'):
            version = output.split()[0]
            return version
    except Exception as e:
        print(f"Error getting version for {schema_name}: {e}")
    return "Unknown"

def sync_all_tenants():
    """Synchronize all known tenant schemas to head"""
    print(" Synchronizing all tenant schemas...")
    
    # Get main schema version first
    main_version = get_current_version('cos360_main')
    print(f" Main schema (cos360_main) version: {main_version}")
    
    results = {}
    for schema in TENANT_SCHEMAS:
        if schema == 'cos360_main':
            continue  # Skip main schema
            
        current_version = get_current_version(schema)
        print(f" {schema} current version: {current_version}")
        
        if current_version != main_version:
            print(f" Upgrading {schema} to match main schema...")
            success = run_alembic_command(schema, 'upgrade', 'head')
            results[schema] = 'Success' if success else 'Failed'
        else:
            print(f"[OK] {schema} is already synchronized")
            results[schema] = 'Already synced'
    
    print("\n Synchronization Summary:")
    for schema, status in results.items():
        icon = "[OK]" if status in ['Success', 'Already synced'] else "[ERROR]"
        print(f"   {icon} {schema}: {status}")

def check_schema_tables(schema_name):
    """Check what tables exist in a schema"""
    print(f"\n Checking tables in {schema_name}...")
    
    env = os.environ.copy()
    env['SCHEMA_NAME'] = schema_name
    
    # Use psql to check table existence
    query = f"SELECT table_name FROM information_schema.tables WHERE table_schema = '{schema_name}' ORDER BY table_name;"
    
    try:
        result = subprocess.run([
            'psql', '-U', 'postgres', '-d', 'postgres', '-t', '-A', '-c', query
        ], capture_output=True, text=True, check=True)
        
        tables = [line.strip() for line in result.stdout.strip().split('\n') if line.strip()]
        print(f"   Tables found: {len(tables)}")
        
        # Check for Phase 1 fee tables specifically
        fee_tables = [t for t in tables if t.startswith('fee_')]
        if fee_tables:
            print(f"   Fee tables: {fee_tables}")
        
        return tables
    except Exception as e:
        print(f"   Error checking tables: {e}")
        return []

def diagnose_migration_issues():
    """Comprehensive diagnosis of migration state"""
    print("\n" + "="*60)
    print("MIGRATION DIAGNOSIS")
    print("="*60)
    
    for schema in TENANT_SCHEMAS:
        print(f"\n--- {schema} ---")
        version = get_current_version(schema)
        print(f"Migration version: {version}")
        
        tables = check_schema_tables(schema)
        print(f"Table count: {len(tables)}")
        
        # Check if migration tracking matches reality
        has_fee_tables = any(t.startswith('fee_') for t in tables)
        print(f"Has fee tables: {has_fee_tables}")
        
        if version == "08bbd1b72f43" and not has_fee_tables:
            print("⚠️  WARNING: Migration says Phase 1 complete but no fee tables found!")
        elif version != "08bbd1b72f43" and has_fee_tables:
            print("⚠️  WARNING: Fee tables exist but migration tracking is behind!")
    
    print("\n" + "="*60)

def main():
    parser = argparse.ArgumentParser(description='COS360 Multi-Tenant Migration Manager')
    parser.add_argument('--schema', help='Target schema name')
    parser.add_argument('--action', choices=['upgrade', 'downgrade', 'current', 'history', 'sync-all', 'stamp', 'diagnose'], 
                       help='Migration action to perform')
    parser.add_argument('--target', default='head', help='Migration target (default: head)')
    
    args = parser.parse_args()
    
    print("COS360 Multi-Tenant Migration Manager")
    print("=" * 50)
    
    if args.action == 'sync-all':
        sync_all_tenants()
    elif args.action == 'diagnose':
        diagnose_migration_issues()
    elif args.schema and args.action:
        if args.schema not in TENANT_SCHEMAS:
            print(f"[WARNING]  Warning: {args.schema} is not in known tenant schemas")
            print(f"   Known schemas: {', '.join(TENANT_SCHEMAS)}")
            response = input("Continue anyway? (y/N): ")
            if response.lower() != 'y':
                return
        
        success = run_alembic_command(args.schema, args.action, args.target if args.target != 'head' or args.action == 'upgrade' else None)
        if success:
            print(f"[SUCCESS] Migration completed successfully for {args.schema}")
        else:
            print(f"[FAILED] Migration failed for {args.schema}")
            sys.exit(1)
    else:
        parser.print_help()

if __name__ == '__main__':
    main()
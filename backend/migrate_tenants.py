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
    
    # Set environment variable
    os.environ['SCHEMA_NAME'] = schema_name
    
    # Build alembic command
    cmd = ['alembic', action]
    if target:
        cmd.append(target)
    
    print(f"Running: {' '.join(cmd)} (Schema: {schema_name})")
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        print(f"Success for {schema_name}")
        if result.stdout:
            print(f"   Output: {result.stdout.strip()}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error for {schema_name}")
        print(f"   Error: {e.stderr}")
        return False

def get_current_version(schema_name):
    """Get current migration version for a schema"""
    os.environ['SCHEMA_NAME'] = schema_name
    
    try:
        result = subprocess.run(['alembic', 'current'], capture_output=True, text=True, check=True)
        # Extract version from output like "ac8a8190d7dc (head)"
        output = result.stdout.strip()
        if output and not output.startswith('INFO'):
            version = output.split()[0]
            return version
    except:
        pass
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

def main():
    parser = argparse.ArgumentParser(description='COS360 Multi-Tenant Migration Manager')
    parser.add_argument('--schema', help='Target schema name')
    parser.add_argument('--action', choices=['upgrade', 'downgrade', 'current', 'history', 'sync-all'], 
                       help='Migration action to perform')
    parser.add_argument('--target', default='head', help='Migration target (default: head)')
    
    args = parser.parse_args()
    
    print("COS360 Multi-Tenant Migration Manager")
    print("=" * 50)
    
    if args.action == 'sync-all':
        sync_all_tenants()
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
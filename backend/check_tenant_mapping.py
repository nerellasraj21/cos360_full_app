#!/usr/bin/env python3
"""
Check tenant mapping in public.tenants table
"""

import asyncio
import sys
import os
from sqlalchemy import create_engine, text

# Database connection
DATABASE_URL = "postgresql://postgres:Passw0rd!@localhost/postgres"

def check_tenants():
    """Check tenants table in public schema"""
    engine = create_engine(DATABASE_URL)
    
    print("=" * 60)
    print("CHECKING PUBLIC.TENANTS TABLE")
    print("=" * 60)
    
    with engine.connect() as conn:
        # Check what's in public.tenants
        result = conn.execute(text("""
            SELECT client_name, schema_name, is_active 
            FROM public.tenants 
            ORDER BY client_name
        """))
        
        rows = result.fetchall()
        
        if rows:
            print("\nFound tenants in public.tenants:")
            print("-" * 40)
            for row in rows:
                print(f"  client_name: {row[0]}")
                print(f"  schema_name: {row[1]}")
                print(f"  is_active: {row[2]}")
                print("-" * 40)
        else:
            print("\nNo tenants found in public.tenants table!")
            
        # Check if test_tenant exists
        result = conn.execute(text("""
            SELECT client_name, schema_name, is_active 
            FROM public.tenants 
            WHERE client_name = 'test_tenant'
        """))
        
        test_tenant = result.fetchone()
        
        print("\nLooking for client_name='test_tenant':")
        if test_tenant:
            print(f"  ✓ Found: schema_name='{test_tenant[1]}', is_active={test_tenant[2]}")
        else:
            print("  ✗ NOT FOUND - This is the problem!")
            print("\nTrying to insert test_tenant...")
            
            # Insert test_tenant if it doesn't exist
            try:
                conn.execute(text("""
                    INSERT INTO public.tenants (client_name, schema_name, is_active) 
                    VALUES ('test_tenant', 'test_tenant_schema', true)
                    ON CONFLICT (client_name) DO NOTHING
                """))
                conn.commit()
                print("  ✓ Inserted test_tenant successfully!")
            except Exception as e:
                print(f"  ✗ Failed to insert: {e}")
                
        # Also check for test_tenant_schema (wrong usage)
        result = conn.execute(text("""
            SELECT client_name, schema_name, is_active 
            FROM public.tenants 
            WHERE client_name = 'test_tenant_schema'
        """))
        
        wrong_entry = result.fetchone()
        
        print("\nChecking for incorrect entry (client_name='test_tenant_schema'):")
        if wrong_entry:
            print(f"  ⚠ FOUND INCORRECT ENTRY: This should be removed!")
            print(f"    schema_name='{wrong_entry[1]}', is_active={wrong_entry[2]}")
        else:
            print("  ✓ No incorrect entry found (good)")

if __name__ == "__main__":
    check_tenants()
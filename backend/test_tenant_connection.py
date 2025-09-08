#!/usr/bin/env python3
"""
Test direct tenant connection and academic year creation
"""

import asyncio
from sqlalchemy import create_engine, text

# Database connection
DATABASE_URL = "postgresql://postgres:Passw0rd!@localhost/postgres"

def test_tenant_connection():
    """Test direct connection to tenant schema"""
    engine = create_engine(DATABASE_URL)
    
    print("=" * 60)
    print("TESTING DIRECT TENANT SCHEMA CONNECTION")
    print("=" * 60)
    
    with engine.connect() as conn:
        # Set search path to tenant schema
        print("Setting search_path to test_tenant_schema...")
        conn.execute(text("SET search_path TO test_tenant_schema"))
        
        # Verify current search path
        result = conn.execute(text("SHOW search_path"))
        current_path = result.scalar()
        print(f"Current search_path: {current_path}")
        
        # Check if academic_years table exists
        result = conn.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'test_tenant_schema' 
                AND table_name = 'academic_years'
            )
        """))
        table_exists = result.scalar()
        print(f"academic_years table exists: {table_exists}")
        
        if table_exists:
            # Count existing records
            result = conn.execute(text("SELECT COUNT(*) FROM academic_years"))
            count = result.scalar()
            print(f"Existing academic year records: {count}")
            
            # Try to create a test record
            print("\nTrying to insert test academic year...")
            try:
                conn.execute(text("""
                    INSERT INTO academic_years (id, title, start_date, end_date, is_active, created_at, updated_at)
                    VALUES (gen_random_uuid(), 'Direct Test Academic Year 2024-25', '2024-04-01', '2025-03-31', true, now(), now())
                """))
                conn.commit()
                print("✓ Successfully inserted test academic year!")
                
                # Count again
                result = conn.execute(text("SELECT COUNT(*) FROM academic_years"))
                new_count = result.scalar()
                print(f"New record count: {new_count}")
                
            except Exception as e:
                print(f"✗ Failed to insert: {e}")
        else:
            print("✗ academic_years table does not exist in test_tenant_schema")

if __name__ == "__main__":
    test_tenant_connection()
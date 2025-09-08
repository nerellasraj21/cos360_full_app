#!/usr/bin/env python3
"""
Debug which schemas contain academic year data
"""

import asyncio
from sqlalchemy import create_engine, text

# Database connection
DATABASE_URL = "postgresql://postgres:Passw0rd!@localhost/postgres"

def check_academic_years_in_schemas():
    """Check academic years in different schemas"""
    engine = create_engine(DATABASE_URL)
    
    schemas_to_check = ['public', 'cos360_main', 'test_tenant_schema']
    
    print("=" * 70)
    print("CHECKING ACADEMIC YEARS IN DIFFERENT SCHEMAS")
    print("=" * 70)
    
    with engine.connect() as conn:
        for schema in schemas_to_check:
            print(f"\n--- Checking schema: {schema} ---")
            
            try:
                # Set search path
                conn.execute(text(f"SET search_path TO {schema}"))
                
                # Check if academic_years table exists
                result = conn.execute(text("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = :schema_name 
                        AND table_name = 'academic_years'
                    )
                """), {"schema_name": schema})
                
                table_exists = result.scalar()
                
                if table_exists:
                    print(f"  + academic_years table EXISTS in {schema}")
                    
                    # Count records
                    result = conn.execute(text("SELECT COUNT(*) FROM academic_years"))
                    count = result.scalar()
                    print(f"  Record count: {count}")
                    
                    if count > 0:
                        # Show titles
                        result = conn.execute(text("SELECT title FROM academic_years LIMIT 5"))
                        titles = result.fetchall()
                        print(f"  Sample titles:")
                        for title in titles:
                            print(f"    - {title[0]}")
                else:
                    print(f"  - academic_years table does NOT exist in {schema}")
                    
            except Exception as e:
                print(f"  ERROR checking {schema}: {str(e)}")
        
        # Also check what the current search_path is
        print(f"\n--- Current search_path ---")
        result = conn.execute(text("SHOW search_path"))
        current_path = result.scalar()
        print(f"Current search_path: {current_path}")

if __name__ == "__main__":
    check_academic_years_in_schemas()
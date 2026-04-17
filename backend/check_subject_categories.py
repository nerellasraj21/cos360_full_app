#!/usr/bin/env python3
import asyncio
import sys
from sqlalchemy import text, create_engine, MetaData, Table
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Database connection
DATABASE_URL = "postgresql+asyncpg://neondb_owner:npg_3BRCMxJ8aKdN@ep-old-salad-a1x7ae1e-pooler.ap-southeast-1.aws.neon.tech/neondb?ssl=require"

async def check_subject_categories():
    # Create async engine
    engine = create_async_engine(DATABASE_URL, echo=False)

    async with engine.begin() as conn:
        # Check test_tenant_schema
        print("=" * 80)
        print("SUBJECT CATEGORIES IN test_tenant_schema")
        print("=" * 80)
        try:
            result = await conn.execute(
                text("""
                    SELECT *
                    FROM test_tenant_schema.subject_categories
                    ORDER BY name
                """)
            )
            rows = result.fetchall()
            if rows:
                print(f"Found {len(rows)} subject categories:\n")
                for idx, row in enumerate(rows, 1):
                    print(f"{idx}. ID: {row[0]}")
                    print(f"   Name: {row[1]}")
                    print()
            else:
                print("No subject categories found in test_tenant_schema")
        except Exception as e:
            print(f"Error querying test_tenant_schema: {e}")

    # Create a fresh connection for cos360_masters
    async with engine.begin() as conn:
        # Check cos360_masters
        print("\n" + "=" * 80)
        print("SUBJECT CATEGORIES IN cos360_masters")
        print("=" * 80)
        try:
            result = await conn.execute(
                text("""
                    SELECT *
                    FROM cos360_masters.subject_categories
                    ORDER BY name
                """)
            )
            rows = result.fetchall()
            if rows:
                print(f"Found {len(rows)} subject categories:\n")
                for idx, row in enumerate(rows, 1):
                    print(f"{idx}. ID: {row[0]}")
                    print(f"   Name: {row[1]}")
                    print()
            else:
                print("No subject categories found in cos360_masters")
        except Exception as e:
            print(f"Error querying cos360_masters: {e}")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_subject_categories())

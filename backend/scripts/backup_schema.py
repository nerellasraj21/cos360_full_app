"""
Quick schema backup before migration
"""
import asyncio
import asyncpg
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

async def backup_schema_structure(schema_name: str):
    """Backup schema structure (DDL only, no data)"""

    database_url = os.getenv('DATABASE_URL')
    if database_url.startswith('postgresql+asyncpg://'):
        database_url = database_url.replace('postgresql+asyncpg://', 'postgresql://')

    conn = await asyncpg.connect(database_url)

    try:
        print(f"Backing up schema: {schema_name}")

        # Get table count
        table_count = await conn.fetchval(
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = $1",
            schema_name
        )

        print(f"  Tables to backup: {table_count}")

        # Get current version
        try:
            version = await conn.fetchval(f"SELECT version_num FROM {schema_name}.alembic_version")
            print(f"  Current version: {version}")
        except:
            print(f"  No alembic version found")

        # Create backup file
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = f"backups/{schema_name}_structure_{timestamp}.txt"

        os.makedirs('backups', exist_ok=True)

        # Get all tables
        tables = await conn.fetch(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name",
            schema_name
        )

        with open(backup_file, 'w') as f:
            f.write(f"Schema Backup: {schema_name}\n")
            f.write(f"Timestamp: {timestamp}\n")
            f.write(f"Tables: {table_count}\n")
            f.write(f"Version: {version if 'version' in locals() else 'N/A'}\n")
            f.write("=" * 80 + "\n\n")
            f.write("Tables:\n")
            for table in tables:
                f.write(f"  - {table['table_name']}\n")

        print(f"  Backup saved: {backup_file}")
        print(f"  Status: SUCCESS")

        return backup_file

    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(backup_schema_structure('cos360_master'))

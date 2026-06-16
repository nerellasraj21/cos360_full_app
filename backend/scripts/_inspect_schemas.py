"""Diagnostic: list all schemas and check student_admissions location."""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from app.config import settings


async def run():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with Session() as db:
        result = await db.execute(text("SELECT schema_name FROM information_schema.schemata ORDER BY schema_name"))
        schemas = [r[0] for r in result.fetchall()]
        print("Schemas:", schemas)

        result2 = await db.execute(text("""
            SELECT table_schema, table_name
            FROM information_schema.tables
            WHERE table_name = 'student_admissions'
        """))
        rows = result2.fetchall()
        print("student_admissions locations:", rows)

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())

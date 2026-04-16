import asyncio
from sqlalchemy import text
from app.db.tenant_session import get_tenant_db_dependency

async def check_student():
    from app.db.engine import get_async_engine
    from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
    from sqlalchemy.orm import sessionmaker
    
    # This is just a template - we need a running database
    print("To check student data in database, run:")
    print("SELECT id, first_name, last_name, aadhar_number, apaar_number, caste, identification_marks FROM students WHERE first_name ILIKE 'Lokesh';")
    
asyncio.run(check_student())

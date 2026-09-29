"""
Diagnose parent-child link for Bruc@gmail.com / Jackie Chan.
Usage: python scripts/diagnose_parent_link.py
"""
import asyncio, os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from app.config import settings

SCHEMA = "test_tenant_schema"

async def run():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)
    async with Session() as db:
        await db.execute(text(f"SET search_path TO {SCHEMA}, public"))

        # 1. Find Bruc@gmail.com user
        r = await db.execute(text("""
            SELECT u.id, u.username, u.email, r.name as role_name
            FROM users u LEFT JOIN roles r ON r.id = u.role_id
            WHERE LOWER(u.email) = LOWER('Bruc@gmail.com')
               OR LOWER(u.username) LIKE '%bruc%'
        """))
        users = r.mappings().all()
        print("=== Users matching Bruc ===")
        for u in users:
            print(f"  id={u['id']}  username={u['username']}  email={u['email']}  role={u['role_name']}")

        if not users:
            print("  [NOT FOUND]")
            await engine.dispose()
            return

        user_id = str(users[0]['id'])

        # 2. Check parent record
        r2 = await db.execute(text("SELECT id FROM parents WHERE user_id = :uid"), {"uid": user_id})
        parent = r2.mappings().first()
        print(f"\n=== Parent record ===")
        if parent:
            print(f"  parent.id = {parent['id']}")
            parent_id = str(parent['id'])
        else:
            print("  [MISSING] No parent record linked to this user")
            await engine.dispose()
            return

        # 3. Check student_parent_links
        r3 = await db.execute(text("""
            SELECT spl.student_id, s.first_name, s.last_name
            FROM student_parent_links spl
            JOIN students s ON s.id = spl.student_id
            WHERE spl.parent_id = :pid
        """), {"pid": parent_id})
        links = r3.mappings().all()
        print(f"\n=== Children linked to parent ===")
        if links:
            for l in links:
                print(f"  student_id={l['student_id']}  name={l['first_name']} {l['last_name']}")
        else:
            print("  [MISSING] No student_parent_links rows — this is why parent cannot see marks")

        # 4. Find Jackie Chan student
        r4 = await db.execute(text("""
            SELECT s.id, s.first_name, s.last_name, sa.admission_number
            FROM students s
            LEFT JOIN student_admissions sa ON sa.student_id = s.id
            WHERE LOWER(s.first_name) LIKE '%jackie%'
               OR LOWER(s.last_name) LIKE '%chan%'
        """))
        jc = r4.mappings().all()
        print(f"\n=== Jackie Chan students ===")
        for s in jc:
            print(f"  student_id={s['id']}  name={s['first_name']} {s['last_name']}  adm={s['admission_number']}")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run())

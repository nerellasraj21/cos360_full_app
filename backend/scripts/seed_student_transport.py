"""
Seed transport assignments for Lambodhar Vinayak and Arjun Sharma.

Uses existing route 'zhb-hyd' and its trip (trip_number=1).
Creates a route stop if none exists for that route.
Assigns both students to the stop with fee_per_term = 500.

Run from project root:
    python scripts/seed_student_transport.py
"""

import asyncio
import sys
import os
import uuid

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import text
from app.config import settings

SCHEMA = "test_tenant_schema"

ROUTE_ID  = "a46ae131-f582-4c99-b054-f561691e3e2d"   # zhb-hyd
TRIP_ID   = "55c9282e-1312-48b0-8c6a-6762d25136e1"   # trip_number=1
LAMBODHAR = "ca0f68a3-b445-4ef1-ae70-cac582a8a8f6"
ARJUN     = "f5a15d76-4f8d-4d59-942e-ed7d07218a42"


async def run():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with Session() as db:
        await db.execute(text(f"SET search_path TO {SCHEMA}, public"))

        # 1. Get or create a route stop
        r = await db.execute(
            text("SELECT id, name FROM route_stops WHERE route_id = :rid LIMIT 1"),
            {"rid": ROUTE_ID}
        )
        stop_row = r.fetchone()

        if stop_row:
            stop_id = str(stop_row[0])
            print(f"[OK] Using existing stop: {stop_row[1]} ({stop_id})")
        else:
            stop_id = str(uuid.uuid4())
            await db.execute(text("""
                INSERT INTO route_stops (id, route_id, name, number, fees, is_active)
                VALUES (:id, :route_id, :name, :number, :fees, true)
            """), {
                "id": stop_id,
                "route_id": ROUTE_ID,
                "name": "ZHB Bus Stand",
                "number": 1,
                "fees": 500,
            })
            print(f"[OK] Created route stop: ZHB Bus Stand ({stop_id})")

        # 2. Assign students (skip if already assigned to same trip)
        for student_id, name in [(LAMBODHAR, "Lambodhar Vinayak"), (ARJUN, "Arjun Sharma")]:
            r = await db.execute(
                text("SELECT id FROM student_transport_assignments WHERE student_id = :sid AND trip_id = :tid"),
                {"sid": student_id, "tid": TRIP_ID}
            )
            existing = r.fetchone()
            if existing:
                print(f"[SKIP] {name} already assigned to trip {TRIP_ID}")
                continue

            assignment_id = str(uuid.uuid4())
            await db.execute(text("""
                INSERT INTO student_transport_assignments
                    (id, student_id, trip_id, stop_id, fee_per_term)
                VALUES
                    (:id, :student_id, :trip_id, :stop_id, :fee)
            """), {
                "id": assignment_id,
                "student_id": student_id,
                "trip_id": TRIP_ID,
                "stop_id": stop_id,
                "fee": 500.0,
            })
            print(f"[OK] Assigned {name} -> trip:{TRIP_ID} | stop:{stop_id} | fee:500")

        await db.commit()

    print("\nDone. Run the endpoint tests to verify.")


if __name__ == "__main__":
    asyncio.run(run())

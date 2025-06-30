from sqlalchemy import select
from app.models.masters.transport import StudentTrip
from app.schemas.masters.transport import StudentTripCreate, StudentTripUpdate
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

async def add_student_trip(data: StudentTripCreate, db: AsyncSession):
    student_trip = StudentTrip(**data.dict())
    db.add(student_trip)
    await db.commit()
    await db.refresh(student_trip)
    return student_trip

async def get_student_trips(db: AsyncSession):
    result = await db.execute(select(StudentTrip).where(StudentTrip.is_active == True))
    return result.scalars().all()

async def get_individual_student_trip_by_id(student_trip_id: int, db: AsyncSession):
    result = await db.execute(select(StudentTrip).where(StudentTrip.id == student_trip_id))
    student_trip = result.scalar_one_or_none()
    if not student_trip:
        raise HTTPException(404, detail="Student trip not found")
    return student_trip

async def update_all_details_student_trip(student_trip_id: int, data: StudentTripCreate, db: AsyncSession):
    result = await db.execute(select(StudentTrip).where(StudentTrip.id == student_trip_id))
    student_trip = result.scalar_one_or_none()
    if not student_trip:
        raise HTTPException(404, detail="Student trip not found")
    for key, value in data.dict().items():
        setattr(student_trip, key, value)
    await db.commit()
    await db.refresh(student_trip)
    return student_trip

async def update_partial_details_student_trip(student_trip_id: int, data: StudentTripUpdate, db: AsyncSession):
    result = await db.execute(select(StudentTrip).where(StudentTrip.id == student_trip_id))
    student_trip = result.scalar_one_or_none()
    if not student_trip:
        raise HTTPException(404, detail="Student trip not found")
    for key, value in data.dict(exclude_unset=True).items():
        setattr(student_trip, key, value)
    await db.commit()
    await db.refresh(student_trip)
    return student_trip

async def deactivate_student_trip(student_trip_id: int, db: AsyncSession):
    result = await db.execute(select(StudentTrip).where(StudentTrip.id == student_trip_id))
    student_trip = result.scalar_one_or_none()
    if not student_trip:
        raise HTTPException(404, detail="Student trip not found")
    student_trip.is_active = False
    await db.commit()
    return {"message": "Student trip deactivated"}

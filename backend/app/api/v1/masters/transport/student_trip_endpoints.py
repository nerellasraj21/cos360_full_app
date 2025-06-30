from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.masters.transport import StudentTrip
from app.schemas.masters.transport import StudentTripCreate, StudentTripUpdate, StudentTripOut
from app.db.session import get_db
from app.service.masters.transport import update_partial_details_student_trip, update_all_details_student_trip, get_individual_student_trip_by_id, deactivate_student_trip, get_student_trips, add_student_trip

router = APIRouter(prefix="/student-trips", tags=["Student Trips"])

@router.post("/", response_model=StudentTripOut)
async def create_student_trip(data: StudentTripCreate, db: AsyncSession = Depends(get_db)):
    return await add_student_trip(data,db)

@router.get("/", response_model=list[StudentTripOut])
async def get_all_student_trips(db: AsyncSession = Depends(get_db)):
    return await get_student_trips(db)

@router.get("/{student_trip_id}", response_model=StudentTripOut)
async def get_student_trip_by_id(student_trip_id: int, db: AsyncSession = Depends(get_db)):
    return await get_individual_student_trip_by_id(student_trip_id,db)

@router.put("/{student_trip_id}", response_model=StudentTripOut)
async def update_student_trip(student_trip_id: int, data: StudentTripCreate, db: AsyncSession = Depends(get_db)):
    return await update_all_details_student_trip(student_trip_id,data,db)

@router.patch("/{student_trip_id}", response_model=StudentTripOut)
async def patch_student_trip(student_trip_id: int, data: StudentTripUpdate, db: AsyncSession = Depends(get_db)):
    return await update_partial_details_student_trip(student_trip_id,data,db)

@router.delete("/{student_trip_id}")
async def soft_delete_student_trip(student_trip_id: int, db: AsyncSession = Depends(get_db)):
    return await deactivate_student_trip(student_trip_id,db)

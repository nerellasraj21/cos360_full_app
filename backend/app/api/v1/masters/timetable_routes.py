from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.masters.timetable_schema import (
    TimetableSlotCreate, TimetableSlotUpdate, TimetableSlotOut, TimetableSlotPartialUpdate,
    TimetableSubjectOptionCreate, TimetableSubjectOptionUpdate, TimetableSubjectOptionOut
)
from app.service.masters.timetable_service import update_all_details_timetable_slot, get__all_timetable_slots, delete_timetable_slot_by_id, get_timetable_slot_by_id, add_timetable_slot, add_subject_option, get_subject_option_by_id, delete_subject_option_by_id, get__all_subject_options,update_all_details_subject_option, update_partial_details_timetable_slot

from app.db.session import get_db
from typing import List

router = APIRouter(prefix="/timetable", tags=["Timetable"])

@router.post("/slots", response_model=TimetableSlotOut)
async def create_timetable_slot(slot: TimetableSlotCreate, db: AsyncSession = Depends(get_db)):
    return await add_timetable_slot(slot,db)


@router.get("/slots", response_model=List[TimetableSlotOut])
async def get_timetable_slots(db: AsyncSession = Depends(get_db)):
    return await get__all_timetable_slots(db)


@router.get("/slots/{slot_id}", response_model=TimetableSlotOut)
async def get_timetable_slot(slot_id: int, db: AsyncSession = Depends(get_db)):
    return await get_timetable_slot_by_id(slot_id,db)


@router.put("/slots/{slot_id}", response_model=TimetableSlotOut)
async def update_timetable_slot(slot_id: int, slot_data: TimetableSlotUpdate, db: AsyncSession = Depends(get_db)):
    return await update_all_details_timetable_slot(slot_id,slot_data,db)

@router.patch("/slots/{slot_id}", response_model=TimetableSlotOut)
async def partial_update_timetable_slot(slot_id: int, slot_data: TimetableSlotPartialUpdate, db: AsyncSession = Depends(get_db)):
    return await update_partial_details_timetable_slot(slot_id, slot_data, db)


@router.delete("/slots/{slot_id}")
async def delete_timetable_slot(slot_id: int, db: AsyncSession = Depends(get_db)):
    return await delete_timetable_slot_by_id(slot_id,db)
    
# @router.post("/subject-options", response_model=TimetableSubjectOptionOut)
# async def create_subject_option(option: TimetableSubjectOptionCreate, db: AsyncSession = Depends(get_db)):
#     return await add_subject_option(option,db)


# @router.get("/subject-options", response_model=List[TimetableSubjectOptionOut])
# async def get_subject_options(db: AsyncSession = Depends(get_db)):
#     return await get__all_subject_options(db)


# @router.get("/subject-options/{option_id}", response_model=TimetableSubjectOptionOut)
# async def get_subject_option(option_id: int, db: AsyncSession = Depends(get_db)):
#     return await get_subject_option_by_id(option_id,db)


# @router.put("/subject-options/{option_id}", response_model=TimetableSubjectOptionOut)
# async def update_subject_option(option_id: int, update_data: TimetableSubjectOptionUpdate, db: AsyncSession = Depends(get_db)):
#     return await update_all_details_subject_option(option_id,update_data,db)


# @router.delete("/subject-options/{option_id}")
# async def delete_subject_option(option_id: int, db: AsyncSession = Depends(get_db)):
#     return await delete_subject_option_by_id(option_id,db)

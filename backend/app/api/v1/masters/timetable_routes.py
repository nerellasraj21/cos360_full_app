from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.masters.timetable_schema import (
    TimetableSlotCreate, TimetableSlotUpdate, TimetableSlotOut, TimetableSlotPartialUpdate,FullTimetableCreate, SlotTimeOut, SlotTimeCreate,SlotTimeUpdate,SlotTimePartialUpdate, GroupedSectionTimetableOut, TimetableSlotBulkUpdateRequest
)
from app.service.masters.timetable_service import update_all_details_timetable_slot, get__all_timetable_slots, delete_timetable_slot_by_id, get_timetable_slot_by_id, add_timetable_slot, update_partial_details_timetable_slot, add_full_timetable, add_slot_time, get_slot_times,get_slot_time,patch_slot_time,update_slot_time, get_timetable_by_section, bulk_update_timetable_slots

from app.db.session import get_db
from typing import List

router = APIRouter(prefix="/timetable", tags=["Timetable"])

# @router.post("/slots", response_model=TimetableSlotOut)
# async def create_timetable_slot(slot: TimetableSlotCreate, db: AsyncSession = Depends(get_db)):
#     return await add_timetable_slot(slot,db)

@router.post("/bulk")
async def create_full_timetable(
    data: FullTimetableCreate,
    db: AsyncSession = Depends(get_db),
):
    return await add_full_timetable(data, db)


# @router.get("/slots", response_model=List[TimetableSlotOut])
# async def get_timetable_slots(db: AsyncSession = Depends(get_db)):
#     return await get__all_timetable_slots(db)


# @router.get("/slots/{slot_id}", response_model=TimetableSlotOut)
# async def get_timetable_slot(slot_id: int, db: AsyncSession = Depends(get_db)):
#     return await get_timetable_slot_by_id(slot_id,db)


# @router.put("/slots/{slot_id}", response_model=TimetableSlotOut)
# async def update_timetable_slot(slot_id: int, slot_data: TimetableSlotUpdate, db: AsyncSession = Depends(get_db)):
#     return await update_all_details_timetable_slot(slot_id,slot_data,db)

# @router.patch("/slots/{slot_id}", response_model=TimetableSlotOut)
# async def partial_update_timetable_slot(slot_id: int, slot_data: TimetableSlotPartialUpdate, db: AsyncSession = Depends(get_db)):
#     return await update_partial_details_timetable_slot(slot_id, slot_data, db)


# @router.delete("/slots/{slot_id}")
# async def delete_timetable_slot(slot_id: int, db: AsyncSession = Depends(get_db)):
#     return await delete_timetable_slot_by_id(slot_id,db)

# # Create
# @router.post("/", response_model=SlotTimeOut)
# async def create_slot_time(slot_time: SlotTimeCreate, db: AsyncSession = Depends(get_db)):
#     return await add_slot_time(slot_time, db)

# # Get all slot times (optionally filtered by section)
# @router.get("/", response_model=list[SlotTimeOut])
# async def read_slot_times(section_id: int = Query(None), db: AsyncSession = Depends(get_db)):
#     return await get_slot_times(section_id, db)

# # Get by ID
# @router.get("/{slot_time_id}", response_model=SlotTimeOut)
# async def read_slot_time(slot_time_id: int = Path(...), db: AsyncSession = Depends(get_db)):
#     return await get_slot_time(slot_time_id, db)

@router.get("/section/{section_id}", response_model=GroupedSectionTimetableOut)
async def fetch_timetable_by_section(
    section_id: int,
    db: AsyncSession = Depends(get_db)
):
    return await get_timetable_by_section(section_id, db)

# # Full update (PUT)
# @router.put("/{slot_time_id}", response_model=SlotTimeOut)
# async def update_slot_time_endpoint(
#     slot_time_id: int,
#     update_data: SlotTimeUpdate,
#     db: AsyncSession = Depends(get_db),
# ):
#     return await update_slot_time(slot_time_id, update_data, db)

# # Partial update (PATCH)
# @router.patch("/{slot_time_id}", response_model=SlotTimeOut)
# async def patch_slot_time_endpoint(
#     slot_time_id: int,
#     patch_data: SlotTimePartialUpdate,
#     db: AsyncSession = Depends(get_db),
# ):
#     return await patch_slot_time(slot_time_id, patch_data.dict(exclude_unset=True), db)

@router.patch("/timetable/slots/bulk", response_model=List[TimetableSlotOut])
async def bulk_patch_slots(
    data: TimetableSlotBulkUpdateRequest,
    db: AsyncSession = Depends(get_db)
):
    return await bulk_update_timetable_slots(data, db)

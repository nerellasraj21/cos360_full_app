from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from app.models.masters.timetable_slot_model import TimetableSlot
from app.models.masters.timetable_model import Timetable
from collections import defaultdict
from app.models.masters.slot_time_model import SlotTime
from app.models.masters.timetable_subject_option_model import TimetableSubjectOption
from app.schemas.masters.timetable_schema import TimetableSlotCreate, TimetableSlotUpdate, TimetableSubjectOptionCreate, TimetableSubjectOptionUpdate, TimetableSlotPartialUpdate, FullTimetableCreate, SlotTimeCreate, GroupedSlotOut, GroupedSectionTimetableOut, TimetableSlotOut, TimetableSlotBulkUpdateRequest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

async def add_timetable_slot(slot: TimetableSlotCreate, db: AsyncSession):
    try:
        slot_data = slot.dict(exclude={"subject_options"})
        subject_options_data = slot.subject_options

        # Create TimetableSlot with actual TimetableSubjectOption instances
        new_slot = TimetableSlot(
            **slot_data,
            subject_options=[
                TimetableSubjectOption(**option.dict())
                for option in subject_options_data
            ]
        )

        db.add(new_slot)
        await db.commit()
        await db.refresh(new_slot)
        return new_slot
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating timetable slot: {str(e)}")


async def get__all_timetable_slots(db: AsyncSession):
    try:
        result = await db.execute(select(TimetableSlot))
        return result.scalars().all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching slots: {str(e)}")


async def get_timetable_slot_by_id(slot_id: int, db: AsyncSession):
    try:
        result = await db.execute(select(TimetableSlot).where(TimetableSlot.id == slot_id))
        slot = result.scalar_one_or_none()
        if not slot:
            raise HTTPException(status_code=404, detail="Timetable slot not found")
        return slot
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching slot: {str(e)}")


async def update_all_details_timetable_slot(slot_id: int, slot_data: TimetableSlotUpdate, db: AsyncSession):
    try:
        result = await db.execute(select(TimetableSlot).where(TimetableSlot.id == slot_id))
        slot = result.scalar_one_or_none()
        if not slot:
            raise HTTPException(status_code=404, detail="Timetable slot not found")
        slot_dict = slot_data.dict(exclude_unset=True)
        subject_options_data = slot_dict.pop("subject_options", None)
        for field, value in slot_dict.items():
            setattr(slot, field, value)

        # Handle subject_options if present
        if subject_options_data is not None:
            # Clear existing options
            slot.subject_options.clear()
            # Add new ones
            for option in subject_options_data:
                option_instance = TimetableSubjectOption(**option)
                slot.subject_options.append(option_instance)

        await db.commit()
        await db.refresh(slot)
        return slot
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating slot: {str(e)}")
    
async def update_partial_details_timetable_slot(slot_id: int, slot_data: TimetableSlotPartialUpdate, db: AsyncSession):
    try:
        result = await db.execute(select(TimetableSlot).where(TimetableSlot.id == slot_id))
        slot = result.scalar_one_or_none()
        if not slot:
            raise HTTPException(status_code=404, detail="Timetable slot not found")

        slot_dict = slot_data.dict(exclude_unset=True)
        subject_options_data = slot_dict.pop("subject_options", None)

        for field, value in slot_dict.items():
            setattr(slot, field, value)

        # Update subject options only if provided
        if subject_options_data is not None:
            slot.subject_options.clear()
            for option in subject_options_data:
                option_instance = TimetableSubjectOption(**option)
                slot.subject_options.append(option_instance)

        await db.commit()
        await db.refresh(slot)
        return slot
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error patching slot: {str(e)}")


async def delete_timetable_slot_by_id(slot_id: int, db: AsyncSession):
    try:
        result = await db.execute(select(TimetableSlot).where(TimetableSlot.id == slot_id))
        slot = result.scalar_one_or_none()
        if not slot:
            raise HTTPException(status_code=404, detail="Timetable slot not found")
        await db.delete(slot)
        await db.commit()
        return {"detail": "Slot deleted"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting slot: {str(e)}")
    
async def add_subject_option(option: TimetableSubjectOptionCreate, db: AsyncSession):
    try:
        new_option = TimetableSubjectOption(**option.dict())
        db.add(new_option)
        await db.commit()
        await db.refresh(new_option)
        return new_option
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating subject option: {str(e)}")


async def get__all_subject_options(db: AsyncSession):
    try:
        result = await db.execute(select(TimetableSubjectOption))
        return result.scalars().all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching subject options: {str(e)}")


async def get_subject_option_by_id(option_id: int, db: AsyncSession):
    try:
        result = await db.execute(select(TimetableSubjectOption).where(TimetableSubjectOption.id == option_id))
        option = result.scalar_one_or_none()
        if not option:
            raise HTTPException(status_code=404, detail="Subject option not found")
        return option
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching subject option: {str(e)}")


async def update_all_details_subject_option(option_id: int, update_data: TimetableSubjectOptionUpdate, db: AsyncSession):
    try:
        result = await db.execute(select(TimetableSubjectOption).where(TimetableSubjectOption.id == option_id))
        option = result.scalar_one_or_none()
        if not option:
            raise HTTPException(status_code=404, detail="Subject option not found")
        for field, value in update_data.dict(exclude_unset=True).items():
            setattr(option, field, value)
        await db.commit()
        await db.refresh(option)
        return option
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating subject option: {str(e)}")


async def delete_subject_option_by_id(option_id: int, db: AsyncSession):
    try:
        result = await db.execute(select(TimetableSubjectOption).where(TimetableSubjectOption.id == option_id))
        option = result.scalar_one_or_none()
        if not option:
            raise HTTPException(status_code=404, detail="Subject option not found")
        await db.delete(option)
        await db.commit()
        return {"detail": "Subject option deleted"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting subject option: {str(e)}")
    
async def add_full_timetable(data: FullTimetableCreate, db: AsyncSession):
    new_timetable = Timetable(section_id=data.section_id)
    db.add(new_timetable)
    await db.flush()

    for group in data.slot_time_data:
        slot_time_id = group.slot_time_id
        for slot_data in group.slots:
            new_slot = TimetableSlot(
                timetable_id=new_timetable.id,
                day=slot_data.day,
                slot_time_id=slot_time_id,
                is_break=slot_data.is_break,
                break_label=slot_data.break_label
            )
            db.add(new_slot)
            await db.flush()

            if not slot_data.is_break:
                for subj in slot_data.subject_options:
                    db.add(TimetableSubjectOption(slot_id=new_slot.id, subject_id=subj.subject_id))

    await db.commit()
    return new_timetable
    
# Create
async def add_slot_time(slot_time_data: SlotTimeCreate, db: AsyncSession) -> SlotTime:
    new_slot_time = SlotTime(**slot_time_data.dict())
    db.add(new_slot_time)
    await db.commit()
    await db.refresh(new_slot_time)
    return new_slot_time

# Get all (optional filter by section)
async def get_slot_times(section_id: int | None, db: AsyncSession) -> list[SlotTime]:
    query = select(SlotTime)
    if section_id:
        query = query.where(SlotTime.section_id == section_id)
    result = await db.execute(query)
    return result.scalars().all()

# Get by ID
async def get_slot_time(slot_time_id: int, db: AsyncSession) -> SlotTime:
    result = await db.execute(select(SlotTime).where(SlotTime.id == slot_time_id))
    slot_time = result.scalar_one_or_none()
    if not slot_time:
        raise HTTPException(status_code=404, detail="SlotTime not found")
    return slot_time

# Update (PUT)
async def update_slot_time(slot_time_id: int, updated_data: SlotTimeCreate, db: AsyncSession) -> SlotTime:
    slot_time = await get_slot_time(slot_time_id, db)
    for field, value in updated_data.dict().items():
        setattr(slot_time, field, value)
    await db.commit()
    await db.refresh(slot_time)
    return slot_time

# Patch
async def patch_slot_time(slot_time_id: int, data: dict, db: AsyncSession) -> SlotTime:
    slot_time = await get_slot_time(slot_time_id, db)
    for field, value in data.items():
        if hasattr(slot_time, field):
            setattr(slot_time, field, value)
    await db.commit()
    await db.refresh(slot_time)
    return slot_time

async def get_timetable_by_section(section_id: int, db: AsyncSession):
    # Step 1: Find the timetable for the section
    timetable_stmt = select(Timetable).where(Timetable.section_id == section_id)
    timetable_result = await db.execute(timetable_stmt)
    timetable = timetable_result.scalar_one_or_none()

    if not timetable:
        raise HTTPException(status_code=404, detail="Timetable not found for section")

    # Step 2: Fetch all slots for this timetable, including subject options
    slot_stmt = (
        select(TimetableSlot)
        .options(selectinload(TimetableSlot.subject_options))
        .where(TimetableSlot.timetable_id == timetable.id)
    )
    result = await db.execute(slot_stmt)
    all_slots = result.scalars().all()

    # Step 3: Group by slot_time_id
    grouped = defaultdict(list)
    for slot in all_slots:
        grouped[slot.slot_time_id].append(TimetableSlotOut.from_orm(slot))

    # Step 4: Structure output
    return {
        "section_id": section_id,
        "slot_time_data": [
            {
                "slot_time_id": slot_time_id,
                "slots": slots
            }
            for slot_time_id, slots in grouped.items()
        ]
    }

async def bulk_update_timetable_slots(
    data: TimetableSlotBulkUpdateRequest,
    db: AsyncSession
):
    updated_slots = []

    for slot_data in data.slots:
        stmt = select(TimetableSlot).where(TimetableSlot.id == slot_data.id)
        result = await db.execute(stmt)
        slot = result.scalar_one_or_none()

        if not slot:
            raise HTTPException(status_code=404, detail=f"Slot with id {slot_data.id} not found")

        if slot_data.day is not None:
            slot.day = slot_data.day
        if slot_data.is_break is not None:
            slot.is_break = slot_data.is_break
        if slot_data.break_label is not None:
            slot.break_label = slot_data.break_label

        if slot_data.subject_options is not None:
            if slot_data.is_break:
                raise HTTPException(
                    status_code=400,
                    detail=f"Slot {slot.id} is a break and should not have subject options"
                )

            # Delete old subject options
            await db.execute(
                delete(TimetableSubjectOption).where(TimetableSubjectOption.slot_id == slot.id)
            )

            # Add new subject options
            for subj in slot_data.subject_options:
                new_option = TimetableSubjectOption(
                    slot_id=slot.id,
                    subject_id=subj.subject_id
                )
                db.add(new_option)

        updated_slots.append(slot)

    await db.commit()
    for slot in updated_slots:
        await db.refresh(slot)
    return updated_slots
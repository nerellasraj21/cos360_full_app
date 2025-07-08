from sqlalchemy import select
from app.models.masters.timetable_slot_model import TimetableSlot
from app.models.masters.timetable_subject_option_model import TimetableSubjectOption
from app.schemas.masters.timetable_schema import TimetableSlotCreate, TimetableSlotUpdate, TimetableSubjectOptionCreate, TimetableSubjectOptionUpdate, TimetableSlotPartialUpdate
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


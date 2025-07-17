from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException
from typing import List, Optional

from app.models.masters.parent_model import Parent
from app.models.masters.student_parent_association_model import StudentParentLink
from app.schemas.masters.parent_schema import (
    ParentCreate, ParentUpdate
)

async def create_parent(parent_data: ParentCreate, db: AsyncSession) -> Parent:
    try:
        new_parent = Parent(**parent_data.dict())
        db.add(new_parent)
        await db.commit()
        await db.refresh(new_parent)
        return new_parent
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating parent: {str(e)}")

async def get_parent_by_id(parent_id: int, db: AsyncSession) -> Parent:
    result = await db.execute(select(Parent).where(Parent.id == parent_id))
    parent = result.scalar_one_or_none()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")
    return parent

async def get_all_parents(db: AsyncSession):
    result = await db.execute(
        select(Parent)
        .options(selectinload(Parent.student_links).selectinload(StudentParentLink.student))
    )
    return result.scalars().all()
    

async def update_parent(parent_id: int, parent_data: ParentUpdate, db: AsyncSession) -> Parent:
    result = await db.execute(select(Parent).where(Parent.id == parent_id))
    parent = result.scalar_one_or_none()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")
    for key, value in parent_data.dict(exclude_unset=True).items():
        setattr(parent, key, value)
    try:
        await db.commit()
        await db.refresh(parent)
        return parent
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating parent: {str(e)}")

async def delete_parent(parent_id: int, db: AsyncSession):
    result = await db.execute(select(Parent).where(Parent.id == parent_id))
    parent = result.scalar_one_or_none()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")
    try:
        await db.delete(parent)
        await db.commit()
        return {"detail": "Parent deleted successfully"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting parent: {str(e)}")

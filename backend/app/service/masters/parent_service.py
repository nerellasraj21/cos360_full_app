from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func, or_
from fastapi import HTTPException
from typing import List, Optional
from uuid import UUID

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

async def get_parent_by_id(parent_id: UUID, db: AsyncSession) -> Parent:
    result = await db.execute(
        select(Parent)
        .options(selectinload(Parent.student_links).selectinload(StudentParentLink.student))
        .where(Parent.id == parent_id)
    )
    parent = result.scalar_one_or_none()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")
    return parent

async def get_all_parents(db: AsyncSession, skip: int = 0, limit: int = 100):
    count_stmt = select(func.count(Parent.id))
    count_result = await db.execute(count_stmt)
    total_count = count_result.scalar()

    result = await db.execute(
        select(Parent)
        .options(selectinload(Parent.student_links).selectinload(StudentParentLink.student))
        .offset(skip)
        .limit(limit)
        .order_by(Parent.name)
    )
    parents = result.scalars().all()

    has_next = (skip + limit) < total_count

    return {
        "items": parents,
        "total_count": total_count,
        "has_next": has_next,
        "skip": skip,
        "limit": limit
    }

async def search_parents(
    db: AsyncSession,
    search_query: Optional[str] = None,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    relation_to_student: Optional[str] = None,
    skip: int = 0,
    limit: int = 10
):
    filters = []

    if search_query:
        filters.append(
            or_(
                Parent.name.ilike(f"%{search_query}%"),
                Parent.email.ilike(f"%{search_query}%"),
                Parent.phone.ilike(f"%{search_query}%")
            )
        )

    if email:
        filters.append(Parent.email.ilike(f"%{email}%"))

    if phone:
        filters.append(Parent.phone.ilike(f"%{phone}%"))

    if relation_to_student:
        filters.append(Parent.relation_to_student == relation_to_student)

    stmt = select(Parent).options(
        selectinload(Parent.student_links).selectinload(StudentParentLink.student)
    )

    if filters:
        stmt = stmt.where(or_(*filters))

    count_stmt = select(func.count(Parent.id))
    if filters:
        count_stmt = count_stmt.where(or_(*filters))

    count_result = await db.execute(count_stmt)
    total_count = count_result.scalar()

    stmt = stmt.offset(skip).limit(limit).order_by(Parent.name)

    result = await db.execute(stmt)
    parents = result.scalars().all()

    has_next = (skip + limit) < total_count

    return {
        "items": parents,
        "total_count": total_count,
        "has_next": has_next,
        "skip": skip,
        "limit": limit
    }


async def update_parent(parent_id: UUID, parent_data: ParentUpdate, db: AsyncSession) -> Parent:
    result = await db.execute(select(Parent).where(Parent.id == parent_id))
    parent = result.scalar_one_or_none()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")
    for key, value in parent_data.dict(exclude_unset=True).items():
        setattr(parent, key, value)
    try:
        await db.commit()
        # Reload parent with student_links eagerly loaded
        result = await db.execute(
            select(Parent)
            .options(selectinload(Parent.student_links).selectinload(StudentParentLink.student))
            .where(Parent.id == parent_id)
        )
        return result.scalar_one()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating parent: {str(e)}")

async def delete_parent(parent_id: UUID, db: AsyncSession):
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

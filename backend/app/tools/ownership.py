from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.masters.parent_model import Parent
from app.models.masters.student_parent_association_model import StudentParentLink
from app.models.student.student_model import Student


async def get_parent_id_for_user(db: AsyncSession, user_id: UUID) -> UUID | None:
    result = await db.execute(select(Parent.id).where(Parent.user_id == user_id).limit(1))
    return result.scalars().first()


async def is_parent_of_student(db: AsyncSession, user_id: UUID, student_id: UUID) -> bool:
    parent_id = await get_parent_id_for_user(db, user_id)
    if not parent_id:
        return False
    result = await db.execute(
        select(StudentParentLink.id)
        .where(StudentParentLink.student_id == student_id, StudentParentLink.parent_id == parent_id)
        .limit(1)
    )
    return result.scalars().first() is not None


async def is_own_student_record(db: AsyncSession, user_id: UUID, student_id: UUID) -> bool:
    result = await db.execute(select(Student.id).where(Student.id == student_id, Student.user_id == user_id).limit(1))
    return result.scalars().first() is not None


async def ensure_student_access(
    db: AsyncSession, role: str | None, user_id: UUID, student_id: UUID, detail: str | None = None
) -> None:
    if role == "Student":
        if not await is_own_student_record(db, user_id, student_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail=detail or "You can only access your own records"
            )
    elif role == "Parent":
        if not await is_parent_of_student(db, user_id, student_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail=detail or "You are not the parent of this student"
            )

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException
from typing import List
from uuid import UUID

from app.models.masters.student_parent_association_model import StudentParentLink
from app.models.masters.parent_model import Parent
from app.models.student.student_model import Student
from app.schemas.masters.student_parent_link_schema import StudentParentLinkCreate, StudentParentLinkOut

async def link_student_to_parent(student_id: UUID, parent_id: UUID, db: AsyncSession) -> StudentParentLink:
    try:
        existing_link = await db.execute(
            select(StudentParentLink).where(
                StudentParentLink.student_id == student_id,
                StudentParentLink.parent_id == parent_id
            )
        )
        if existing_link.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Student-parent link already exists")

        student_exists = await db.execute(select(Student).where(Student.id == student_id))
        if not student_exists.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Student not found")

        parent_exists = await db.execute(select(Parent).where(Parent.id == parent_id))
        if not parent_exists.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Parent not found")

        new_link = StudentParentLink(student_id=student_id, parent_id=parent_id)
        db.add(new_link)
        await db.flush()

        result = await db.execute(
            select(StudentParentLink)
            .options(
                selectinload(StudentParentLink.student),
                selectinload(StudentParentLink.parent)
            )
            .where(StudentParentLink.id == new_link.id)
        )
        created_link = result.scalar_one()

        await db.commit()
        return created_link
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating student-parent link: {str(e)}")

async def unlink_student_from_parent(student_id: UUID, parent_id: UUID, db: AsyncSession) -> bool:
    try:
        result = await db.execute(
            select(StudentParentLink).where(
                StudentParentLink.student_id == student_id,
                StudentParentLink.parent_id == parent_id
            )
        )
        link = result.scalar_one_or_none()
        if not link:
            raise HTTPException(status_code=404, detail="Student-parent link not found")

        await db.delete(link)
        await db.commit()
        return True
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error removing student-parent link: {str(e)}")

async def get_parents_for_student(student_id: UUID, db: AsyncSession) -> List[Parent]:
    try:
        result = await db.execute(
            select(Parent)
            .join(StudentParentLink, Parent.id == StudentParentLink.parent_id)
            .where(StudentParentLink.student_id == student_id)
        )
        return result.scalars().all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching parents for student: {str(e)}")

async def get_students_for_parent(parent_id: UUID, db: AsyncSession) -> List[Student]:
    try:
        result = await db.execute(
            select(Student)
            .join(StudentParentLink, Student.id == StudentParentLink.student_id)
            .where(StudentParentLink.parent_id == parent_id)
        )
        return result.scalars().all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching students for parent: {str(e)}")

async def get_all_student_parent_links(db: AsyncSession) -> List[StudentParentLink]:
    try:
        result = await db.execute(
            select(StudentParentLink)
            .options(
                selectinload(StudentParentLink.student),
                selectinload(StudentParentLink.parent)
            )
        )
        return result.scalars().all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching student-parent links: {str(e)}")
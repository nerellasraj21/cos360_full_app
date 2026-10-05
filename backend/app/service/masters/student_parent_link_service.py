import logging
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.masters.parent_model import Parent
from app.models.masters.student_parent_association_model import StudentParentLink
from app.models.student.student_model import Student

logger = logging.getLogger(__name__)



async def link_student_to_parent(student_id: UUID, parent_id: UUID, db: AsyncSession) -> StudentParentLink:
    try:
        existing_link = await db.execute(
            select(StudentParentLink).where(
                StudentParentLink.student_id == student_id, StudentParentLink.parent_id == parent_id
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
            .options(selectinload(StudentParentLink.student), selectinload(StudentParentLink.parent))
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
        logger.error("Unhandled error: %s", e)
        raise HTTPException(status_code=500, detail="Error creating student-parent link")


async def unlink_student_from_parent(student_id: UUID, parent_id: UUID, db: AsyncSession) -> bool:
    try:
        result = await db.execute(
            select(StudentParentLink).where(
                StudentParentLink.student_id == student_id, StudentParentLink.parent_id == parent_id
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
        logger.error("Unhandled error: %s", e)
        raise HTTPException(status_code=500, detail="Error removing student-parent link")


async def get_parents_for_student(student_id: UUID, db: AsyncSession) -> list[Parent]:
    try:
        result = await db.execute(
            select(Parent)
            .join(StudentParentLink, Parent.id == StudentParentLink.parent_id)
            .where(StudentParentLink.student_id == student_id)
        )
        return result.scalars().all()
    except Exception as e:
        logger.error("Unhandled error: %s", e)
        raise HTTPException(status_code=500, detail="Error fetching parents for student")


async def get_students_for_parent(parent_id: UUID, db: AsyncSession) -> list[Student]:
    try:
        import logging

        logger = logging.getLogger("student_parent_service")
        logger.error(f"DEBUG: get_students_for_parent called with parent_id={parent_id}")

        # Check current schema
        from sqlalchemy import text

        schema_result = await db.execute(text("SELECT current_schema()"))
        current_schema = schema_result.scalar()
        logger.error(f"DEBUG: Current schema = {current_schema}")

        # First, let's check if the link exists
        link_check = await db.execute(select(StudentParentLink).where(StudentParentLink.parent_id == parent_id))
        links = link_check.scalars().all()
        logger.error(f"DEBUG: Found {len(links)} links for parent")
        for link in links:
            logger.error(f"DEBUG: Link - student_id={link.student_id}, parent_id={link.parent_id}")

        result = await db.execute(
            select(Student)
            .options(selectinload(Student.parent_links).selectinload(StudentParentLink.parent))
            .join(StudentParentLink, Student.id == StudentParentLink.student_id)
            .where(StudentParentLink.parent_id == parent_id)
        )
        students = result.scalars().all()
        print(f"DEBUG: Found {len(students)} students")
        for student in students:
            print(f"DEBUG: Student {student.id}, first_name={student.first_name}")

        # Process father/mother relationships for each student
        for student in students:
            if student.parent_links:
                father = None
                mother = None

                for link in student.parent_links:
                    if link.parent and link.parent.relation_to_student:
                        if link.parent.relation_to_student.lower() == "father":
                            father = link.parent
                        elif link.parent.relation_to_student.lower() == "mother":
                            mother = link.parent

                # Set father and mother attributes on student
                student.father = father
                student.mother = mother
            else:
                # Set default None values if no parents
                student.father = None
                student.mother = None

        return students
    except Exception as e:
        logger.error("Unhandled error: %s", e)
        raise HTTPException(status_code=500, detail="Error fetching students for parent")


async def get_all_student_parent_links(db: AsyncSession) -> list[StudentParentLink]:
    try:
        result = await db.execute(
            select(StudentParentLink).options(
                selectinload(StudentParentLink.student), selectinload(StudentParentLink.parent)
            )
        )
        return result.scalars().all()
    except Exception as e:
        logger.error("Unhandled error: %s", e)
        raise HTTPException(status_code=500, detail="Error fetching student-parent links")

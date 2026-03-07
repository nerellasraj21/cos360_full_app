from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.masters.admission_model import Admission
from app.models.student.student_model import Student


async def get_students_dropdown(
    db: AsyncSession, class_id: UUID | None = None, section_id: UUID | None = None, active_only: bool = True
) -> list[dict]:
    """
    Get students dropdown data with name + admission number.
    Supports filtering by class_id, section_id, and active status.
    Returns: [{"id": "uuid", "display_name": "First Last (ADM001)", "first_name": "First", "last_name": "Last", "admission_number": "ADM001"}]
    """
    stmt = (
        select(Student, Admission.admission_number)
        .join(Admission, Student.id == Admission.student_id)
        .options(selectinload(Student.user))
    )

    if active_only:
        stmt = stmt.where(Student.user.has(is_active=True))

    if class_id:
        stmt = stmt.where(Admission.current_class_id == class_id)

    if section_id:
        stmt = stmt.where(Admission.current_section_id == section_id)

    result = await db.execute(stmt)
    students_data = result.all()

    dropdown_data = []
    for student, admission_number in students_data:
        display_name = f"{student.first_name} {student.last_name}"
        if admission_number:
            display_name += f" ({admission_number})"

        dropdown_data.append(
            {
                "id": str(student.id),
                "display_name": display_name,
                "first_name": student.first_name,
                "last_name": student.last_name,
                "admission_number": admission_number or "N/A",
            }
        )

    return sorted(dropdown_data, key=lambda x: x["display_name"])


async def get_students_simple_dropdown(
    db: AsyncSession, class_id: UUID | None = None, section_id: UUID | None = None, active_only: bool = True
) -> list[dict]:
    """
    Get simple students dropdown data.
    Supports filtering by class_id, section_id, and active status.
    Returns: [{"id": "uuid", "name": "First Last"}]
    """
    stmt = select(Student).join(Admission, Student.id == Admission.student_id).options(selectinload(Student.user))

    if active_only:
        stmt = stmt.where(Student.user.has(is_active=True))

    if class_id:
        stmt = stmt.where(Admission.current_class_id == class_id)

    if section_id:
        stmt = stmt.where(Admission.current_section_id == section_id)

    result = await db.execute(stmt)
    students = result.scalars().all()

    dropdown_data = [
        {"id": str(student.id), "name": f"{student.first_name} {student.last_name}"} for student in students
    ]

    return sorted(dropdown_data, key=lambda x: x["name"])

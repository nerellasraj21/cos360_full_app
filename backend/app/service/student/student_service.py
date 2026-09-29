import os
from datetime import date
from uuid import UUID

from fastapi import HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.masters.admission_model import Admission
from app.models.student.student_model import Student


async def get_students_dropdown(
    db: AsyncSession,
    class_id: UUID | None = None,
    section_id: UUID | None = None,
    active_only: bool = True,
    as_of_date: date | None = None,
) -> list[dict]:
    """
    Get students dropdown data with name + admission number.
    Supports filtering by class_id, section_id, and active status.
    as_of_date: if given, excludes students whose admission_date is after this date
    (e.g. for building an attendance roster for a past date).
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

    if as_of_date:
        stmt = stmt.where(Admission.admission_date <= as_of_date)

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
    db: AsyncSession,
    class_id: UUID | None = None,
    section_id: UUID | None = None,
    active_only: bool = True,
    as_of_date: date | None = None,
) -> list[dict]:
    """
    Get simple students dropdown data.
    Supports filtering by class_id, section_id, and active status.
    as_of_date: if given, excludes students whose admission_date is after this date
    (e.g. for building an attendance roster for a past date).
    Returns: [{"id": "uuid", "name": "First Last"}]
    """
    stmt = select(Student).join(Admission, Student.id == Admission.student_id).options(selectinload(Student.user))

    if active_only:
        stmt = stmt.where(Student.user.has(is_active=True))

    if class_id:
        stmt = stmt.where(Admission.current_class_id == class_id)

    if section_id:
        stmt = stmt.where(Admission.current_section_id == section_id)

    if as_of_date:
        stmt = stmt.where(Admission.admission_date <= as_of_date)

    result = await db.execute(stmt)
    students = result.scalars().all()

    dropdown_data = [
        {"id": str(student.id), "name": f"{student.first_name} {student.last_name}"} for student in students
    ]

    return sorted(dropdown_data, key=lambda x: x["name"])


async def upload_student_photo(student_id: UUID, file: UploadFile, db: AsyncSession):
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    ext = os.path.splitext(file.filename or "")[-1].lower()
    if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
        raise HTTPException(status_code=400, detail="Only jpg, png, webp files are allowed")

    save_dir = os.path.join("media", "student", "photos")
    os.makedirs(save_dir, exist_ok=True)

    filename = f"{student_id}{ext}"
    filepath = os.path.join(save_dir, filename)

    contents = await file.read()
    if len(contents) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size must not exceed 2 MB")

    with open(filepath, "wb") as f:
        f.write(contents)

    if student.photo and student.photo != f"/media/student/photos/{filename}":
        old_path = student.photo.lstrip("/")
        if os.path.exists(old_path):
            os.remove(old_path)

    student.photo = f"/media/student/photos/{filename}"
    await db.flush()

    result = await db.execute(select(Student).where(Student.id == student.id))
    student_out = result.scalar_one()
    await db.commit()
    return student_out


async def delete_student_photo(student_id: UUID, db: AsyncSession):
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if not student.photo:
        raise HTTPException(status_code=404, detail="No photo to delete")

    filepath = student.photo.lstrip("/")
    if os.path.exists(filepath):
        os.remove(filepath)

    student.photo = None
    await db.commit()
    return {"detail": "Student photo deleted successfully"}

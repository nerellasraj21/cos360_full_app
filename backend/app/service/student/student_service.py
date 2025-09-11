from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.models.student.student_model import Student
from app.models.masters.admission_model import Admission
from typing import List, Dict

async def get_students_dropdown(db: AsyncSession, active_only: bool = True) -> List[Dict]:
    """
    Get students dropdown data with name + admission number.
    Returns: [{"id": "uuid", "display_name": "First Last (ADM001)", "first_name": "First", "last_name": "Last", "admission_number": "ADM001"}]
    """
    stmt = (
        select(Student, Admission.admission_number)
        .join(Admission, Student.id == Admission.student_id)
        .options(selectinload(Student.user))
    )
    
    if active_only:
        stmt = stmt.where(Student.user.has(is_active=True))
    
    result = await db.execute(stmt)
    students_data = result.all()
    
    dropdown_data = []
    for student, admission_number in students_data:
        display_name = f"{student.first_name} {student.last_name}"
        if admission_number:
            display_name += f" ({admission_number})"
        
        dropdown_data.append({
            "id": str(student.id),
            "display_name": display_name,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "admission_number": admission_number or "N/A"
        })
    
    return sorted(dropdown_data, key=lambda x: x['display_name'])

async def get_students_simple_dropdown(db: AsyncSession, active_only: bool = True) -> List[Dict]:
    """
    Get simple students dropdown data.
    Returns: [{"id": "uuid", "name": "First Last"}]
    """
    stmt = select(Student).options(selectinload(Student.user))
    
    if active_only:
        stmt = stmt.where(Student.user.has(is_active=True))
    
    result = await db.execute(stmt)
    students = result.scalars().all()
    
    dropdown_data = [
        {
            "id": str(student.id),
            "name": f"{student.first_name} {student.last_name}"
        }
        for student in students
    ]
    
    return sorted(dropdown_data, key=lambda x: x['name'])
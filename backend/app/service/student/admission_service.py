from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.student.admission_schema import StudentAdmissionCreate, StudentAdmissionUpdate
from app.models.masters.admission_model import Admission
from app.models.student.student_model import Student
from app.models.masters.parent_model import Parent
from app.models.masters.student_parent_association_model import StudentParentLink
from sqlalchemy.orm import selectinload
from app.models.auth.user_model import User
from sqlalchemy.future import select
from uuid import UUID
from sqlalchemy import or_, String, func
from app.tools.password_util import hash_password

async def add_admission(admission: StudentAdmissionCreate, db: AsyncSession):

    admission_dict = admission.dict(exclude={"student"})

    # Convert student fields, excluding the nested ones
    student_data = admission.student.dict(exclude={"father", "mother"})
    
    student_dict = Student(**student_data)
    student_user_data = User(
        username = student_dict.first_name,
        password_hash = hash_password("student@123"),
        is_active = True,
        role_id= 3 #static value
    )

    db.add(student_user_data)
    await db.flush()

    student_dict.user_id=student_user_data.id
    db.add(student_dict)
    await db.flush()

    # Convert nested models directly
    father_dict = Parent(**admission.student.father.dict())
    father_user_data = User(
        username = father_dict.name,
        email = father_dict.email,
        password_hash = hash_password("parent@123"),
        is_active = True,
        role_id= 6 #static value
    )
    db.add(father_user_data)
    await db.flush()

    mother_dict = Parent(**admission.student.mother.dict())
    mother_user_data = User(
        username = mother_dict.name,
        email = mother_dict.email,
        password_hash = hash_password("parent@123"),
        is_active = True,
        role_id= 6 #static value
    )
    db.add(mother_user_data)
    await db.flush()

    father_dict.user_id=father_user_data.id
    db.add(father_dict)
    await db.flush()

    mother_dict.user_id=mother_user_data.id
    db.add(mother_dict)
    await db.flush()

    student_parent_link= StudentParentLink(student_id = student_dict.id, parent_id = father_dict.id)
    db.add(student_parent_link)
    await db.flush()

    student_parent_link= StudentParentLink(student_id = student_dict.id, parent_id = mother_dict.id)
    db.add(student_parent_link)
    await db.flush()

    new_admission = Admission(
        student_id=student_dict.id,
        **admission_dict
    )
    
    db.add(new_admission)
    await db.commit()

    result = await db.execute(
        select(Admission)
        .options(
            selectinload(Admission.student)
            .selectinload(Student.parent_links)
            .selectinload(StudentParentLink.parent)
        )
        .where(Admission.id == new_admission.id)
    )
    admission_out = result.scalar_one()

    return admission_out

async def get_admission_by_id(student_id: UUID, db: AsyncSession):
    result = await db.execute(select(Admission).options(
            selectinload(Admission.student)
            .selectinload(Student.parent_links)
            .selectinload(StudentParentLink.parent)
        ).where(Admission.student_id == student_id))
    admission = result.scalar_one_or_none()
    if not admission:
        raise HTTPException(status_code=404, detail="Admission not found")
    return admission

async def update_partial_details_admission(student_id: UUID, data: StudentAdmissionUpdate, db: AsyncSession):
    result = await db.execute(select(Admission).where(Admission.student_id == student_id))
    admission = result.scalar_one_or_none()
    if not admission:
        raise HTTPException(status_code=404, detail="Admission not found")
    for field, value in data.dict(exclude_unset=True).items():
        setattr(admission, field, value)
    await db.commit()
    await db.refresh(admission)
    return admission

async def get_student_by_admission_id(admission_id: UUID, db):
    stmt = (
        select(Admission)
        .where(Admission.id == admission_id)
        .options(selectinload(Admission.student))
    )
    result = await db.execute(stmt)
    admission = result.scalars().first()
    if not admission:
        raise HTTPException(status_code=404, detail="Admission ID not found")
    return admission.student

async def search_students(query: str, db):
    stmt = (
        select(Student)
        .join(Admission, Student.id == Admission.student_id)
        .where(
            or_(
                Admission.id.cast(String).ilike(f"%{query}%"),
                Student.first_name.ilike(f"%{query}%"),
                Student.last_name.ilike(f"%{query}%")
            )
        )
    )
    result = await db.execute(stmt)
    return result.scalars().all()

async def get_all_admissions(db: AsyncSession, skip: int = 0, limit: int = 10):
    """Get all admissions with pagination"""
    # Count total records
    count_stmt = select(func.count(Admission.id))
    count_result = await db.execute(count_stmt)
    total_count = count_result.scalar()
    
    # Get paginated admissions
    stmt = (
        select(Admission)
        .options(
            selectinload(Admission.student)
            .selectinload(Student.parent_links)
            .selectinload(StudentParentLink.parent)
        )
        .offset(skip)
        .limit(limit)
        .order_by(Admission.admission_date.desc())
    )
    
    result = await db.execute(stmt)
    admissions = result.scalars().all()
    
    has_next = (skip + limit) < total_count
    
    return {
        "items": admissions,
        "total_count": total_count,
        "has_next": has_next
    }

async def delete_admission(admission_id: UUID, db: AsyncSession):
    """Delete admission and related student data"""
    # Get admission with relationships
    stmt = (
        select(Admission)
        .options(selectinload(Admission.student))
        .where(Admission.id == admission_id)
    )
    result = await db.execute(stmt)
    admission = result.scalar_one_or_none()
    
    if not admission:
        raise HTTPException(status_code=404, detail="Admission not found")
    
    student = admission.student
    
    # Delete parent links
    parent_links_stmt = select(StudentParentLink).where(StudentParentLink.student_id == student.id)
    parent_links_result = await db.execute(parent_links_stmt)
    parent_links = parent_links_result.scalars().all()
    
    for link in parent_links:
        await db.delete(link)
    
    # Delete parents (if they exist)
    for link in parent_links:
        parent_stmt = select(Parent).where(Parent.id == link.parent_id)
        parent_result = await db.execute(parent_stmt)
        parent = parent_result.scalar_one_or_none()
        if parent:
            # Delete parent user
            if parent.user_id:
                user_stmt = select(User).where(User.id == parent.user_id)
                user_result = await db.execute(user_stmt)
                user = user_result.scalar_one_or_none()
                if user:
                    await db.delete(user)
            await db.delete(parent)
    
    # Delete student user
    if student.user_id:
        user_stmt = select(User).where(User.id == student.user_id)
        user_result = await db.execute(user_stmt)
        user = user_result.scalar_one_or_none()
        if user:
            await db.delete(user)
    
    # Delete student
    await db.delete(student)
    
    # Delete admission
    await db.delete(admission)
    
    await db.commit()
    
    return {"message": "Admission and related data deleted successfully"}
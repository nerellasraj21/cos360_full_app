from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.student.admission_schema import StudentAdmissionCreate, StudentAdmissionUpdate
from app.models.masters.admission_model import Admission
from app.models.student.student_model import Student
from app.models.masters.parent_model import Parent
from app.models.masters.student_parent_association_model import StudentParentLink
from sqlalchemy.orm import selectinload
from app.models.auth.user_model import User
from app.models.auth.role_model import Role
from sqlalchemy.future import select
from uuid import UUID
from sqlalchemy import or_, String, func, extract
from app.tools.password_util import hash_password
from datetime import datetime

async def generate_admission_number(db: AsyncSession, admission_date) -> str:
    """Generate admission number in format: ADM{YEAR}{SEQUENCE}"""
    year = admission_date.year

    # Get the count of admissions for the current year
    count_stmt = select(func.count(Admission.id)).where(
        extract('year', Admission.admission_date) == year
    )
    result = await db.execute(count_stmt)
    count = result.scalar() or 0

    # Generate next sequence number (padded to 3 digits)
    sequence = count + 1
    admission_number = f"ADM{year}{sequence:03d}"

    # Check if admission number already exists (for safety)
    existing_stmt = select(Admission).where(Admission.admission_number == admission_number)
    existing_result = await db.execute(existing_stmt)
    existing = existing_result.scalar_one_or_none()

    if existing:
        # If exists, increment until we find a unique one
        while existing:
            sequence += 1
            admission_number = f"ADM{year}{sequence:03d}"
            existing_stmt = select(Admission).where(Admission.admission_number == admission_number)
            existing_result = await db.execute(existing_stmt)
            existing = existing_result.scalar_one_or_none()

    return admission_number

async def get_role_by_name(db: AsyncSession, role_name: str) -> UUID:
    """Get role ID by role name"""
    result = await db.execute(select(Role).where(Role.name == role_name))
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail=f"Role '{role_name}' not found")
    return role.id

async def add_admission(admission: StudentAdmissionCreate, db: AsyncSession):
    try:
        # Get role IDs dynamically
        student_role_id = await get_role_by_name(db, "Student")
        parent_role_id = await get_role_by_name(db, "Parent")

        # Generate admission number
        admission_number = await generate_admission_number(db, admission.admission_date)

        admission_dict = admission.dict(exclude={"student"})
        admission_dict["admission_number"] = admission_number

        # Check for duplicate emails
        father_email = admission.student.father.email
        mother_email = admission.student.mother.email

        if father_email == mother_email:
            raise HTTPException(status_code=400, detail="Father and mother cannot have the same email address")

        # Check if emails already exist
        existing_users = await db.execute(
            select(User).where(User.email.in_([father_email, mother_email]))
        )
        existing_emails = {user.email for user in existing_users.scalars().all()}

        if father_email in existing_emails:
            raise HTTPException(status_code=400, detail=f"Email {father_email} already exists")
        if mother_email in existing_emails:
            raise HTTPException(status_code=400, detail=f"Email {mother_email} already exists")

        # Convert student fields, excluding the nested ones
        student_data = admission.student.dict(exclude={"father", "mother"})

        student_dict = Student(**student_data)
        student_user_data = User(
            username = student_dict.first_name,
            password_hash = hash_password("student@123"),
            is_active = True,
            role_id= student_role_id
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
            role_id= parent_role_id
        )
        db.add(father_user_data)
        await db.flush()

        mother_dict = Parent(**admission.student.mother.dict())
        mother_user_data = User(
            username = mother_dict.name,
            email = mother_dict.email,
            password_hash = hash_password("parent@123"),
            is_active = True,
            role_id= parent_role_id
        )
        db.add(mother_user_data)
        await db.flush()

        father_dict.user_id=father_user_data.id
        db.add(father_dict)
        await db.flush()

        mother_dict.user_id=mother_user_data.id
        db.add(mother_dict)
        await db.flush()

        student_parent_link_father = StudentParentLink(student_id = student_dict.id, parent_id = father_dict.id)
        db.add(student_parent_link_father)
        await db.flush()

        student_parent_link_mother = StudentParentLink(student_id = student_dict.id, parent_id = mother_dict.id)
        db.add(student_parent_link_mother)
        await db.flush()

        new_admission = Admission(
            student_id=student_dict.id,
            **admission_dict
        )

        db.add(new_admission)
        await db.flush()

        # Fetch the created admission with all relationships before commit
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

        await db.commit()
        return admission_out

    except Exception as e:
        await db.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Failed to create admission: {str(e)}")

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
    """Update admission details for a student"""
    try:
        result = await db.execute(select(Admission).where(Admission.student_id == student_id))
        admission = result.scalar_one_or_none()
        if not admission:
            raise HTTPException(status_code=404, detail="Admission not found")

        # Update only the fields that are provided
        update_data = data.dict(exclude_unset=True)
        for field, value in update_data.items():
            if hasattr(admission, field):
                setattr(admission, field, value)

        await db.commit()
        await db.refresh(admission)

        # Return admission with relationships
        result = await db.execute(
            select(Admission)
            .options(
                selectinload(Admission.student)
                .selectinload(Student.parent_links)
                .selectinload(StudentParentLink.parent)
            )
            .where(Admission.id == admission.id)
        )
        return result.scalar_one()

    except Exception as e:
        await db.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Failed to update admission: {str(e)}")

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
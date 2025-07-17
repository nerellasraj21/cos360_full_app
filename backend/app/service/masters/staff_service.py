from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import and_
from sqlalchemy.orm import selectinload
from fastapi import HTTPException
from typing import Optional,List
from datetime import date
from app.tools.password_util import hash_password


from app.models.masters.staff_model import Staff
from app.models.auth.user_model import User
from app.models.masters.staff_attendance_model import StaffAttendance
from app.schemas.masters.staff_schema import StaffEnrollmentCreate, StaffEnrollmentUpdate
from app.schemas.masters.staff_attendance_schema import StaffAttendanceCreate, StaffAttendanceUpdate, StaffAttendanceOut


# -------------------- Staff Enrollment --------------------

async def create_staff_enrollment(data: StaffEnrollmentCreate, db: AsyncSession):
    try:

        new_user = User(
            username = data.first_name,
            email = data.email,
            password_hash = hash_password("staff@123"),
            is_active = True,
            role_id = data.role_id
        )

        
        db.add(new_user)
        await db.flush()

        new_staff = Staff(**data.dict(exclude={"role_id"}),user_id=new_user.id)
        db.add(new_staff)
        await db.commit()
        await db.refresh(new_staff)
        return new_staff
    except SQLAlchemyError as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating staff enrollment: {str(e)}")


async def get_all_staff_enrollments(db: AsyncSession):
    result = await db.execute(select(Staff))
    return result.scalars().all()


async def get_staff_enrollment_by_id(staff_id: int, db: AsyncSession):
    result = await db.execute(select(Staff).where(Staff.id == staff_id))
    staff = result.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    return staff


async def update_staff_enrollment(staff_id: int, data: StaffEnrollmentUpdate, db: AsyncSession):
    result = await db.execute(select(Staff).where(Staff.id == staff_id))
    staff = result.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")

    for field, value in data.dict(exclude_unset=True).items():
        setattr(staff, field, value)

    await db.commit()
    await db.refresh(staff)
    return staff


async def delete_staff_enrollment(staff_id: int, db: AsyncSession):
    result = await db.execute(select(Staff).where(Staff.id == staff_id))
    staff = result.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")

    await db.delete(staff)
    await db.commit()
    return {"detail": "Staff enrollment deleted successfully"}


# -------------------- Staff Attendance --------------------

async def create_staff_attendance(data: StaffAttendanceCreate, db: AsyncSession):
    try:
        new_attendance = StaffAttendance(**data.dict())
        db.add(new_attendance)
        await db.commit()
        await db.refresh(new_attendance)
        return new_attendance
    except SQLAlchemyError as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating staff attendance: {str(e)}")
    
async def get_all_staff_attendance(
    db: AsyncSession,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    name: Optional[str] = None
) -> List[StaffAttendanceOut]:
    try:
        stmt = select(StaffAttendance).options(selectinload(StaffAttendance.staff))

        if start_date and end_date:
            stmt = stmt.where(
                and_(
                    StaffAttendance.attendance_date >= start_date,
                    StaffAttendance.attendance_date <= end_date
                )
            )

        if name:
            stmt = stmt.join(Staff).where(Staff.name.ilike(f"%{name}%"))

        result = await db.execute(stmt)
        return [StaffAttendanceOut.from_orm(record) for record in result.scalars().all()]
    except Exception as e:
        raise Exception(f"Error retrieving staff attendance records: {str(e)}")


async def get_attendance_for_staff(
    staff_id: int,
    db: AsyncSession,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
):
    query = select(StaffAttendance).where(StaffAttendance.staff_id == staff_id)

    if start_date and end_date:
        query = query.where(and_(
            StaffAttendance.date >= start_date,
            StaffAttendance.date <= end_date
        ))
    elif start_date:
        query = query.where(StaffAttendance.date >= start_date)
    elif end_date:
        query = query.where(StaffAttendance.date <= end_date)

    result = await db.execute(query)
    return result.scalars().all()


async def update_staff_attendance(attendance_id: int, data: StaffAttendanceUpdate, db: AsyncSession):
    result = await db.execute(select(StaffAttendance).where(StaffAttendance.id == attendance_id))
    attendance = result.scalar_one_or_none()
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    for field, value in data.dict(exclude_unset=True).items():
        setattr(attendance, field, value)

    await db.commit()
    await db.refresh(attendance)
    return attendance


async def delete_staff_attendance(attendance_id: int, db: AsyncSession):
    result = await db.execute(select(StaffAttendance).where(StaffAttendance.id == attendance_id))
    attendance = result.scalar_one_or_none()
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    await db.delete(attendance)
    await db.commit()
    return {"detail": "Staff attendance deleted successfully"}

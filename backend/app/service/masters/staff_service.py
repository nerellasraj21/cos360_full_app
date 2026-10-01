import os
import uuid as _uuid
from datetime import date
from uuid import UUID

from fastapi import HTTPException, UploadFile
from sqlalchemy import and_
from sqlalchemy.exc import IntegrityError, OperationalError, SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.auth.role_model import Role
from app.models.auth.user_model import User
from app.models.masters.designations_model import Designation
from app.models.masters.staff_attendance_model import StaffAttendance
from app.models.masters.staff_model import GenderEnum, Staff, StaffQualification
from app.schemas.masters.staff_attendance_schema import StaffAttendanceCreate, StaffAttendanceOut, StaffAttendanceUpdate
from app.schemas.masters.staff_schema import StaffEnrollmentCreate, StaffEnrollmentUpdate, StaffQualificationCreate, StaffQualificationUpdate
from app.tools.password_util import hash_password

# -------------------- Staff Enrollment --------------------


async def create_staff_enrollment(data: StaffEnrollmentCreate, db: AsyncSession):
    try:
        # If no role_id provided, find 'Staff' role as default
        role_id = data.role_id
        if not role_id:
            staff_role_result = await db.execute(select(Role).where(Role.name == "Staff"))
            staff_role = staff_role_result.scalar_one_or_none()
            if not staff_role:
                raise HTTPException(status_code=400, detail="Default 'Staff' role not found. Please provide a role_id.")
            role_id = staff_role.id

        # Use email as the login identifier; fall back to phone, then first_name
        if not data.email and not data.phone:
            raise HTTPException(status_code=400, detail="Either email or phone is required for staff enrollment")
        username_identifier = data.email or data.phone

        new_user = User(
            username=username_identifier,
            email=data.email,
            password_hash=hash_password("Welcome@123"),
            is_active=True,
            role_id=role_id,
        )

        db.add(new_user)
        await db.flush()

        # Mark as first login via raw SQL (graceful if column doesn't exist yet)
        try:
            from sqlalchemy import text as _text

            await db.execute(_text("UPDATE users SET is_first_login = TRUE WHERE id = :id"), {"id": str(new_user.id)})
        except Exception:
            pass  # column not yet added — seed script adds it

        staff_data = data.dict(exclude={"role_id"})

        # Handle gender enum conversion if provided
        if staff_data.get("gender"):
            gender_value = staff_data["gender"]
            if isinstance(gender_value, str):
                # Convert string to proper enum value (handle case variations)
                gender_lower = gender_value.lower()
                if gender_lower == "male":
                    staff_data["gender"] = GenderEnum.Male
                elif gender_lower == "female":
                    staff_data["gender"] = GenderEnum.Female
                elif gender_lower == "other":
                    staff_data["gender"] = GenderEnum.Other
                else:
                    # Try direct enum value lookup
                    try:
                        staff_data["gender"] = GenderEnum(gender_value)
                    except ValueError:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Invalid gender value: {gender_value}. Must be 'Male', 'Female', or 'Other'",
                        )

        new_staff = Staff(**staff_data, user_id=new_user.id)
        db.add(new_staff)
        await db.flush()

        # Fetch the created staff with all relationships before commit
        result = await db.execute(
            select(Staff)
            .options(selectinload(Staff.designation_obj), selectinload(Staff.user), selectinload(Staff.qualifications))
            .where(Staff.id == new_staff.id)
        )
        staff_out = result.scalar_one()

        await db.commit()
        return staff_out
    except SQLAlchemyError as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating staff enrollment: {str(e)}")


async def get_all_staff_enrollments(db: AsyncSession):
    result = await db.execute(
        select(Staff).options(
            selectinload(Staff.designation_obj), selectinload(Staff.user), selectinload(Staff.qualifications)
        )
    )
    return result.scalars().all()


async def get_staff_enrollment_by_id(staff_id: UUID, db: AsyncSession):
    result = await db.execute(
        select(Staff)
        .options(selectinload(Staff.designation_obj), selectinload(Staff.user), selectinload(Staff.qualifications))
        .where(Staff.id == staff_id)
    )
    staff = result.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    return staff


async def update_staff_enrollment(staff_id: UUID, data: StaffEnrollmentUpdate, db: AsyncSession):
    try:
        result = await db.execute(select(Staff).where(Staff.id == staff_id))
        staff = result.scalar_one_or_none()
        if not staff:
            raise HTTPException(status_code=404, detail="Staff not found")

        for field, value in data.dict(exclude_unset=True).items():
            setattr(staff, field, value)

        await db.flush()

        # Fetch the updated staff with all relationships before commit
        result = await db.execute(
            select(Staff)
            .options(selectinload(Staff.designation_obj), selectinload(Staff.user), selectinload(Staff.qualifications))
            .where(Staff.id == staff.id)
        )
        staff_out = result.scalar_one()

        await db.commit()
        return staff_out

    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=400, detail="Data integrity violation - check for duplicate values or invalid references"
        )
    except OperationalError:
        await db.rollback()
        raise HTTPException(status_code=503, detail="Database operation failed - please try again")
    except Exception as e:
        await db.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Failed to update staff: {str(e)}")


async def delete_staff_enrollment(staff_id: UUID, db: AsyncSession):
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
        await db.flush()

        result = await db.execute(
            select(StaffAttendance)
            .options(selectinload(StaffAttendance.staff))
            .where(StaffAttendance.id == new_attendance.id)
        )
        attendance_out = result.scalar_one()

        await db.commit()
        return attendance_out
    except SQLAlchemyError as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating staff attendance: {str(e)}")


async def get_all_staff_attendance(
    db: AsyncSession, start_date: date | None = None, end_date: date | None = None, name: str | None = None
) -> list[StaffAttendanceOut]:
    try:
        stmt = select(StaffAttendance).options(selectinload(StaffAttendance.staff))

        if start_date and end_date:
            stmt = stmt.where(and_(StaffAttendance.date >= start_date, StaffAttendance.date <= end_date))

        if name:
            stmt = stmt.join(Staff).where(Staff.first_name.ilike(f"%{name}%"))

        result = await db.execute(stmt)
        return [StaffAttendanceOut.from_orm(record) for record in result.scalars().all()]
    except Exception as e:
        raise Exception(f"Error retrieving staff attendance records: {str(e)}")


async def get_staff_attendance_by_id(attendance_id: UUID, db: AsyncSession):
    try:
        result = await db.execute(
            select(StaffAttendance)
            .options(selectinload(StaffAttendance.staff))
            .where(StaffAttendance.id == attendance_id)
        )
        attendance = result.scalar_one_or_none()
        if not attendance:
            raise HTTPException(status_code=404, detail="Staff attendance record not found")
        return attendance
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving staff attendance: {str(e)}")


async def get_attendance_for_staff(
    staff_id: UUID,
    db: AsyncSession,
    start_date: date | None = None,
    end_date: date | None = None,
):
    query = select(StaffAttendance).where(StaffAttendance.staff_id == staff_id)

    if start_date and end_date:
        query = query.where(and_(StaffAttendance.date >= start_date, StaffAttendance.date <= end_date))
    elif start_date:
        query = query.where(StaffAttendance.date >= start_date)
    elif end_date:
        query = query.where(StaffAttendance.date <= end_date)

    result = await db.execute(query)
    return result.scalars().all()


async def update_staff_attendance(attendance_id: UUID, data: StaffAttendanceUpdate, db: AsyncSession):
    try:
        result = await db.execute(select(StaffAttendance).where(StaffAttendance.id == attendance_id))
        attendance = result.scalar_one_or_none()
        if not attendance:
            raise HTTPException(status_code=404, detail="Attendance record not found")

        for field, value in data.dict(exclude_unset=True).items():
            setattr(attendance, field, value)

        await db.flush()

        result = await db.execute(
            select(StaffAttendance)
            .options(selectinload(StaffAttendance.staff))
            .where(StaffAttendance.id == attendance.id)
        )
        attendance_out = result.scalar_one()

        await db.commit()
        return attendance_out
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating staff attendance: {str(e)}")


async def delete_staff_attendance(attendance_id: UUID, db: AsyncSession):
    result = await db.execute(select(StaffAttendance).where(StaffAttendance.id == attendance_id))
    attendance = result.scalar_one_or_none()
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    await db.delete(attendance)
    await db.commit()
    return {"detail": "Staff attendance deleted successfully"}


async def get_staff_attendance_by_date(attendance_date: date, db: AsyncSession):
    try:
        stmt = (
            select(StaffAttendance)
            .options(selectinload(StaffAttendance.staff).selectinload(Staff.designation_obj))
            .where(StaffAttendance.date == attendance_date)
        )

        result = await db.execute(stmt)
        return result.scalars().all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving staff attendance by date: {str(e)}")


async def update_staff_attendance_by_date(
    attendance_date: date, attendance_updates: list[dict], db: AsyncSession
):
    try:
        if attendance_date > date.today():
            raise HTTPException(status_code=400, detail="Cannot update attendance for future dates")

        if not attendance_updates:
            raise HTTPException(status_code=400, detail="No attendance updates provided")

        updated_records = []
        valid_statuses = ["present", "absent", "late", "half_day", "leave"]

        for update_data in attendance_updates:
            staff_id = update_data.get("staff_id")
            new_status = update_data.get("status")
            new_remarks = update_data.get("remarks")

            if not staff_id or not new_status:
                continue

            if new_status not in valid_statuses:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid attendance status '{new_status}'. Must be one of: {', '.join(valid_statuses)}",
                )

            result = await db.execute(
                select(StaffAttendance).where(
                    and_(StaffAttendance.staff_id == staff_id, StaffAttendance.date == attendance_date)
                )
            )
            attendance = result.scalar_one_or_none()

            if attendance:
                attendance.status = new_status
                if new_remarks:
                    attendance.remarks = new_remarks
                updated_records.append(attendance)
            else:
                new_record = StaffAttendance(
                    staff_id=staff_id,
                    date=attendance_date,
                    status=new_status,
                    remarks=new_remarks,
                )
                db.add(new_record)
                updated_records.append(new_record)

        await db.flush()

        result = await db.execute(
            select(StaffAttendance)
            .options(selectinload(StaffAttendance.staff))
            .where(
                and_(
                    StaffAttendance.date == attendance_date,
                    StaffAttendance.id.in_([r.id for r in updated_records]),
                )
            )
        )
        refreshed_records = result.scalars().all()

        await db.commit()
        return refreshed_records

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating staff attendance by date: {str(e)}")


async def get_staff_list_by_gender(gender: GenderEnum | None, db: AsyncSession):
    stmt = select(Staff).options(
        selectinload(Staff.designation_obj), selectinload(Staff.user), selectinload(Staff.qualifications)
    )
    if gender:
        stmt = stmt.where(Staff.gender == gender)
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_staff_details_by_designation(designation_id: UUID | None, db: AsyncSession):
    stmt = select(Staff).options(
        selectinload(Staff.designation_obj), selectinload(Staff.user), selectinload(Staff.qualifications)
    )
    if designation_id:
        stmt = stmt.where(Staff.designation_id == designation_id)
    result = await db.execute(stmt)
    return result.scalars().all()


# -------------------- Staff Qualification CRUD --------------------


async def add_staff_qualification(staff_id: UUID, data: StaffQualificationCreate, db: AsyncSession):
    result = await db.execute(select(Staff).where(Staff.id == staff_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Staff not found")

    new_qual = StaffQualification(staff_id=staff_id, **data.dict())
    db.add(new_qual)
    await db.commit()
    await db.refresh(new_qual)
    return new_qual


async def get_staff_qualifications(staff_id: UUID, db: AsyncSession):
    result = await db.execute(select(Staff).where(Staff.id == staff_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Staff not found")

    result = await db.execute(
        select(StaffQualification).where(StaffQualification.staff_id == staff_id)
    )
    return result.scalars().all()


async def update_staff_qualification(staff_id: UUID, qualification_id: UUID, data: StaffQualificationUpdate, db: AsyncSession):
    result = await db.execute(
        select(StaffQualification).where(
            StaffQualification.id == qualification_id,
            StaffQualification.staff_id == staff_id,
        )
    )
    qual = result.scalar_one_or_none()
    if not qual:
        raise HTTPException(status_code=404, detail="Qualification not found")

    for field, value in data.dict(exclude_unset=True).items():
        setattr(qual, field, value)

    await db.commit()
    await db.refresh(qual)
    return qual


async def delete_staff_qualification(staff_id: UUID, qualification_id: UUID, db: AsyncSession):
    result = await db.execute(
        select(StaffQualification).where(
            StaffQualification.id == qualification_id,
            StaffQualification.staff_id == staff_id,
        )
    )
    qual = result.scalar_one_or_none()
    if not qual:
        raise HTTPException(status_code=404, detail="Qualification not found")

    await db.delete(qual)
    await db.commit()
    return {"detail": "Qualification deleted successfully"}


async def get_all_designations_list(db: AsyncSession):
    try:
        result = await db.execute(select(Designation))
        return result.scalars().all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving designations: {str(e)}")


async def upload_staff_photo(staff_id: UUID, file: UploadFile, db: AsyncSession):
    result = await db.execute(select(Staff).where(Staff.id == staff_id))
    staff = result.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")

    ext = os.path.splitext(file.filename or "")[-1].lower()
    if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
        raise HTTPException(status_code=400, detail="Only jpg, png, webp files are allowed")

    tenant_id = db.info["tenant_id"]
    save_dir = os.path.join("media", tenant_id, "staff", "photos")
    os.makedirs(save_dir, exist_ok=True)

    filename = f"{staff_id}{ext}"
    filepath = os.path.join(save_dir, filename)

    contents = await file.read()
    if len(contents) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size must not exceed 2 MB")

    with open(filepath, "wb") as f:
        f.write(contents)

    # Delete old photo file if different
    photo_url = f"/media/{tenant_id}/staff/photos/{filename}"
    if staff.photo and staff.photo != photo_url:
        old_path = staff.photo.lstrip("/")
        if os.path.exists(old_path):
            os.remove(old_path)

    staff.photo = photo_url
    await db.flush()

    result = await db.execute(
        select(Staff)
        .options(selectinload(Staff.designation_obj), selectinload(Staff.user), selectinload(Staff.qualifications))
        .where(Staff.id == staff.id)
    )
    staff_out = result.scalar_one()
    await db.commit()
    return staff_out


async def delete_staff_photo(staff_id: UUID, db: AsyncSession):
    result = await db.execute(select(Staff).where(Staff.id == staff_id))
    staff = result.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    if not staff.photo:
        raise HTTPException(status_code=404, detail="No photo to delete")

    filepath = staff.photo.lstrip("/")
    if os.path.exists(filepath):
        os.remove(filepath)

    staff.photo = None
    await db.commit()
    return {"detail": "Staff photo deleted successfully"}


async def get_all_drivers_list(db: AsyncSession):
    try:
        stmt = (
            select(Staff)
            .join(Staff.designation_obj)
            .options(selectinload(Staff.designation_obj))
            .where(Designation.title.ilike("driver"))
        )

        result = await db.execute(stmt)
        drivers = result.scalars().all()

        return [
            {
                "id": driver.user_id,
                "full_name": f"{driver.first_name} {driver.last_name or ''}".strip(),
                "user_id": driver.user_id,
                "staff_id": driver.id,
            }
            for driver in drivers
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching drivers: {str(e)}")

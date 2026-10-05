from uuid import UUID

from fastapi import HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.masters.class_model import Class
from app.models.masters.sections_model import Section
from app.models.student.student_model import Student
from app.schemas.profile.student_profile_schema import StudentProfileOut, StudentProfileUpdate
from app.service.profile.profile_audit_service import ProfileAuditService
from app.service.student.attendance_percentage import attendance_percentage_from_statuses


class StudentProfileService:
    """Service for student profile operations"""

    @staticmethod
    async def get_profile(
        db: AsyncSession,
        user_id: UUID,
        actor_user_id: UUID,
        actor_role: str,
        actor_username: str,
        request: Request | None = None,
    ) -> StudentProfileOut:
        """
        Get student profile by user_id

        Args:
            db: Database session
            user_id: UUID of the user

        Returns:
            StudentProfileOut schema

        Raises:
            HTTPException: If student not found
        """
        # Get student with related data
        result = await db.execute(
            select(Student)
            .options(
                selectinload(Student.user),
                selectinload(Student.admissions),
                selectinload(Student.attendances),
                selectinload(Student.certificates),
                selectinload(Student.documents),
            )
            .where(Student.user_id == user_id)
        )
        student = result.scalar_one_or_none()

        if not student:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")

        # Get admission details
        admission = student.admissions
        class_name = None
        section_name = None
        admission_number = None

        if admission:
            admission_number = admission.admission_number

            # Get class name from current_class_id
            if admission.current_class_id:
                class_result = await db.execute(select(Class).where(Class.id == admission.current_class_id))
                class_obj = class_result.scalar_one_or_none()
                if class_obj:
                    class_name = class_obj.name

            # Get section name from current_section_id
            if admission.current_section_id:
                section_result = await db.execute(select(Section).where(Section.id == admission.current_section_id))
                section_obj = section_result.scalar_one_or_none()
                if section_obj:
                    section_name = section_obj.name

        # Calculate attendance percentage
        attendance_percentage = attendance_percentage_from_statuses(att.status for att in student.attendances)

        # Count certificates and documents
        total_certificates = len(student.certificates)
        total_documents = len(student.documents)

        # Log profile view
        await ProfileAuditService.log_profile_view(
            db=db,
            user_id=user_id,
            profile_type="student",
            actor_user_id=actor_user_id,
            actor_role=actor_role,
            actor_username=actor_username,
            request=request,
            org_id=user_id,
        )
        await db.commit()

        # Build response
        return StudentProfileOut(
            student_id=student.id,
            user_id=student.user_id,
            first_name=student.first_name,
            last_name=student.last_name,
            date_of_birth=student.date_of_birth,
            gender=student.gender,
            email=student.user.email if student.user else None,
            admission_number=admission_number,
            class_name=class_name,
            section_name=section_name,
            is_active=student.user.is_active if student.user else False,
            profile_photo_url=None,
            attendance_percentage=attendance_percentage,
            total_certificates=total_certificates,
            total_documents=total_documents,
        )

    @staticmethod
    async def update_profile(
        db: AsyncSession,
        user_id: UUID,
        update_data: StudentProfileUpdate,
        actor_user_id: UUID,
        actor_role: str,
        actor_username: str,
        request: Request | None = None,
    ) -> StudentProfileOut:
        """
        Update student profile

        Args:
            db: Database session
            user_id: UUID of the user
            update_data: StudentProfileUpdate schema

        Returns:
            Updated StudentProfileOut schema

        Raises:
            HTTPException: If student not found
        """
        # Get student
        result = await db.execute(select(Student).options(selectinload(Student.user)).where(Student.user_id == user_id))
        student = result.scalar_one_or_none()

        if not student:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")

        # Track changes for audit log
        changes = {}

        # Update email in user table
        if update_data.email is not None:
            old_email = student.user.email
            student.user.email = update_data.email
            changes["email"] = (old_email, update_data.email)

        await db.flush()

        # Log profile updates
        if changes:
            await ProfileAuditService.log_bulk_update(
                db=db,
                user_id=user_id,
                profile_type="student",
                changes=changes,
                actor_user_id=actor_user_id,
                actor_role=actor_role,
                actor_username=actor_username,
                request=request,
                org_id=user_id,
            )

        await db.commit()
        await db.refresh(student)

        # Return updated profile
        return await StudentProfileService.get_profile(
            db=db,
            user_id=user_id,
            actor_user_id=actor_user_id,
            actor_role=actor_role,
            actor_username=actor_username,
            request=request,
        )

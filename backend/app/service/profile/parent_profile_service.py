from uuid import UUID

from fastapi import HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.masters.admission_model import Admission
from app.models.masters.class_model import Class
from app.models.masters.parent_model import Parent
from app.models.masters.sections_model import Section
from app.models.masters.student_parent_association_model import StudentParentLink
from app.models.student.student_model import Student
from app.schemas.profile.parent_profile_schema import ChildProfileOut, ParentProfileOut, ParentProfileUpdate
from app.service.profile.profile_audit_service import ProfileAuditService


class ParentProfileService:
    """Service for parent profile operations"""

    @staticmethod
    async def get_profile(
        db: AsyncSession,
        user_id: UUID,
        actor_user_id: UUID,
        actor_role: str,
        actor_username: str,
        request: Request | None = None,
    ) -> ParentProfileOut:
        """
        Get parent profile by user_id with children information

        Args:
            db: Database session
            user_id: UUID of the user
            actor_user_id: UUID of the user performing the action
            actor_role: Role of the user performing the action
            actor_username: Username of the user performing the action
            request: Optional FastAPI request object for audit context

        Returns:
            ParentProfileOut schema

        Raises:
            HTTPException: If parent not found
        """
        # Get parent with related data
        result = await db.execute(
            select(Parent)
            .options(
                selectinload(Parent.user), selectinload(Parent.student_links).selectinload(StudentParentLink.student)
            )
            .where(Parent.user_id == user_id)
        )
        parent = result.scalar_one_or_none()

        if not parent:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent profile not found")

        # Build children list
        children: list[ChildProfileOut] = []
        for link in parent.student_links:
            student = link.student
            if not student:
                continue

            # Get admission details
            admission_result = await db.execute(select(Admission).where(Admission.student_id == student.id))
            admission = admission_result.scalar_one_or_none()

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

            # Get student user to check is_active
            student_user_result = await db.execute(
                select(Student).options(selectinload(Student.user)).where(Student.id == student.id)
            )
            student_with_user = student_user_result.scalar_one_or_none()
            is_active = student_with_user.user.is_active if student_with_user and student_with_user.user else False

            children.append(
                ChildProfileOut(
                    student_id=student.id,
                    first_name=student.first_name,
                    last_name=student.last_name,
                    admission_number=admission_number,
                    class_name=class_name,
                    section_name=section_name,
                    is_active=is_active,
                )
            )

        # Log profile view
        await ProfileAuditService.log_profile_view(
            db=db,
            user_id=user_id,
            profile_type="parent",
            actor_user_id=actor_user_id,
            actor_role=actor_role,
            actor_username=actor_username,
            request=request,
            org_id=user_id,
        )
        await db.commit()

        # Build response
        return ParentProfileOut(
            parent_id=parent.id,
            user_id=parent.user_id,
            name=parent.name,
            email=parent.email,
            phone=parent.phone,
            occupation=parent.occupation,
            relation_to_student=parent.relation_to_student,
            profile_photo_url=None,  # TODO: Implement photo upload
            children=children,
        )

    @staticmethod
    async def update_profile(
        db: AsyncSession,
        user_id: UUID,
        update_data: ParentProfileUpdate,
        actor_user_id: UUID,
        actor_role: str,
        actor_username: str,
        request: Request | None = None,
    ) -> ParentProfileOut:
        """
        Update parent profile

        Args:
            db: Database session
            user_id: UUID of the user
            update_data: ParentProfileUpdate schema
            actor_user_id: UUID of the user performing the action
            actor_role: Role of the user performing the action
            actor_username: Username of the user performing the action
            request: Optional FastAPI request object for audit context

        Returns:
            Updated ParentProfileOut schema

        Raises:
            HTTPException: If parent not found
        """
        # Get parent
        result = await db.execute(select(Parent).options(selectinload(Parent.user)).where(Parent.user_id == user_id))
        parent = result.scalar_one_or_none()

        if not parent:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent profile not found")

        # Track changes for audit log
        changes = {}

        # Update fields
        if update_data.email is not None:
            old_email = parent.email
            parent.email = update_data.email
            changes["email"] = (old_email, update_data.email)

        if update_data.phone is not None:
            old_phone = parent.phone
            parent.phone = update_data.phone
            changes["phone"] = (old_phone, update_data.phone)

        if update_data.occupation is not None:
            old_occupation = parent.occupation
            parent.occupation = update_data.occupation
            changes["occupation"] = (old_occupation, update_data.occupation)

        await db.flush()

        # Log profile updates
        if changes:
            await ProfileAuditService.log_bulk_update(
                db=db,
                user_id=user_id,
                profile_type="parent",
                changes=changes,
                actor_user_id=actor_user_id,
                actor_role=actor_role,
                actor_username=actor_username,
                request=request,
                org_id=user_id,
            )

        await db.commit()
        await db.refresh(parent)

        # Return updated profile
        return await ParentProfileService.get_profile(
            db=db,
            user_id=user_id,
            actor_user_id=actor_user_id,
            actor_role=actor_role,
            actor_username=actor_username,
            request=request,
        )

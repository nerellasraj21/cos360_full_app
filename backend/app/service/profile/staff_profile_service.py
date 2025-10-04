from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status, Request
from uuid import UUID
from typing import Optional
from app.models.masters.staff_model import Staff
# Designation model removed - not needed
from app.schemas.profile.staff_profile_schema import StaffProfileOut, StaffProfileUpdate
from app.service.profile.profile_audit_service import ProfileAuditService

class StaffProfileService:
    """Service for staff profile operations"""

    @staticmethod
    async def get_profile(
        db: AsyncSession,
        user_id: UUID,
        actor_user_id: UUID,
        actor_role: str,
        actor_username: str,
        request: Optional[Request] = None
    ) -> StaffProfileOut:
        """
        Get staff profile by user_id

        Args:
            db: Database session
            user_id: UUID of the user
            actor_user_id: UUID of the user performing the action
            actor_role: Role of the user performing the action
            actor_username: Username of the user performing the action
            request: Optional FastAPI request object for audit context

        Returns:
            StaffProfileOut schema

        Raises:
            HTTPException: If staff not found
        """
        # Get staff with related data
        result = await db.execute(
            select(Staff)
            .options(
                selectinload(Staff.user),
                selectinload(Staff.designation_obj)
            )
            .where(Staff.user_id == user_id)
        )
        staff = result.scalar_one_or_none()

        if not staff:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Staff profile not found"
            )

        # Get designation name
        designation = None
        if staff.designation_obj:
            designation = staff.designation_obj.name

        # Get employee ID (assuming it's stored in some field, need to check model)
        employee_id = None  # TODO: Map to correct field if exists

        # Log profile view
        await ProfileAuditService.log_profile_view(
            db=db,
            user_id=user_id,
            profile_type="staff",
            actor_user_id=actor_user_id,
            actor_role=actor_role,
            actor_username=actor_username,
            request=request,
            org_id=user_id
        )

        # Build response
        return StaffProfileOut(
            staff_id=staff.id,
            user_id=staff.user_id,
            first_name=staff.first_name,
            last_name=staff.last_name,
            email=staff.email,
            phone=staff.phone,
            designation=designation,
            employee_id=employee_id,
            date_of_joining=staff.joining_date,
            is_active=staff.is_active,
            profile_photo_url=None  # TODO: Implement photo upload
        )

    @staticmethod
    async def update_profile(
        db: AsyncSession,
        user_id: UUID,
        update_data: StaffProfileUpdate,
        actor_user_id: UUID,
        actor_role: str,
        actor_username: str,
        request: Optional[Request] = None
    ) -> StaffProfileOut:
        """
        Update staff profile

        Args:
            db: Database session
            user_id: UUID of the user
            update_data: StaffProfileUpdate schema
            actor_user_id: UUID of the user performing the action
            actor_role: Role of the user performing the action
            actor_username: Username of the user performing the action
            request: Optional FastAPI request object for audit context

        Returns:
            Updated StaffProfileOut schema

        Raises:
            HTTPException: If staff not found
        """
        # Get staff
        result = await db.execute(
            select(Staff)
            .options(selectinload(Staff.user))
            .where(Staff.user_id == user_id)
        )
        staff = result.scalar_one_or_none()

        if not staff:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Staff profile not found"
            )

        # Track changes for audit log
        changes = {}

        # Update fields
        if update_data.email is not None:
            old_email = staff.email
            staff.email = update_data.email
            changes["email"] = (old_email, update_data.email)

        if update_data.phone is not None:
            old_phone = staff.phone
            staff.phone = update_data.phone
            changes["phone"] = (old_phone, update_data.phone)

        await db.flush()

        # Log profile updates
        if changes:
            await ProfileAuditService.log_bulk_update(
                db=db,
                user_id=user_id,
                profile_type="staff",
                changes=changes,
                actor_user_id=actor_user_id,
                actor_role=actor_role,
                actor_username=actor_username,
                request=request,
                org_id=user_id
            )

        await db.commit()
        await db.refresh(staff)

        # Return updated profile
        return await StaffProfileService.get_profile(
            db=db,
            user_id=user_id,
            actor_user_id=actor_user_id,
            actor_role=actor_role,
            actor_username=actor_username,
            request=request
        )

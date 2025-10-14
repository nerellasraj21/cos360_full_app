from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException, status, Request
from uuid import UUID
from typing import Optional
from app.models.auth.user_model import User
from app.tools.password_util import hash_password, verify_password
from app.service.profile.profile_audit_service import ProfileAuditService

class BaseProfileService:
    """Base service for profile operations common to all user types"""

    @staticmethod
    async def change_password(
        db: AsyncSession,
        user_id: UUID,
        current_password: str,
        new_password: str,
        confirm_password: str,
        actor_user_id: UUID,
        actor_role: str,
        actor_username: str,
        profile_type: str,
        request: Optional[Request] = None
    ) -> dict:
        """
        Change user password

        Args:
            db: Database session
            user_id: UUID of the user
            current_password: Current password
            new_password: New password
            confirm_password: Confirmation of new password
            actor_user_id: UUID of the user performing the action
            actor_role: Role of the user performing the action
            actor_username: Username of the user performing the action
            profile_type: Type of profile (student/staff/parent)
            request: Optional FastAPI request object for audit context

        Returns:
            dict with success message

        Raises:
            HTTPException: If validation fails
        """
        # Validate new password matches confirmation
        if new_password != confirm_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password and confirmation do not match"
            )

        # Get user
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Verify current password
        if not verify_password(current_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )

        # Hash and update new password
        user.password_hash = hash_password(new_password)

        await db.flush()

        # Log password change (highly sensitive)
        await ProfileAuditService.log_password_change(
            db=db,
            user_id=user_id,
            profile_type=profile_type,
            actor_user_id=actor_user_id,
            actor_role=actor_role,
            actor_username=actor_username,
            request=request,
            org_id=user_id
        )

        await db.commit()

        return {
            "message": "Password changed successfully",
            "success": True
        }

    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: UUID) -> User:
        """
        Get user by ID

        Args:
            db: Database session
            user_id: UUID of the user

        Returns:
            User model

        Raises:
            HTTPException: If user not found
        """
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        return user

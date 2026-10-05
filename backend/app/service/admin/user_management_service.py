"""
User Management Service for Tenant Admin

This service provides business logic for tenant admin user management operations.
Allows admins to view, filter, search, and manage all users across different types.

Created: 2025-10-04
Module: Tenant Admin - User Management
"""

import logging
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.auth.role_model import Role
from app.models.auth.user_model import User
from app.schemas.admin.user_management_schema import (
    UserListResponse,
    UserPasswordResetRequest,
    UserUpdateRequest,
    UserWithDetailsResponse,
)
from app.tools.password_util import hash_password

logger = logging.getLogger(__name__)


class UserManagementService:
    """
    Tenant Admin User Management Service

    Provides unified user management across all user types (students, staff, parents, teachers, admins)
    """

    @staticmethod
    async def get_all_users_with_details(
        db: AsyncSession,
        page: int = 1,
        limit: int = 50,
        role_filter: str | None = None,
        search_query: str | None = None,
        is_active_filter: bool | None = None,
    ) -> UserListResponse:
        """
        Get all users in tenant with their entity details

        Args:
            db: Database session
            page: Page number (1-indexed)
            limit: Items per page
            role_filter: Filter by role name (Admin, Teacher, Student, Staff, Parent)
            search_query: Search in username, email, entity names
            is_active_filter: Filter by active status

        Returns:
            UserListResponse with paginated user list and entity details

        Raises:
            HTTPException: For database or validation errors
        """
        try:
            # Build base query
            query = select(User).options(
                selectinload(User.role), selectinload(User.student), selectinload(User.staff), selectinload(User.parent)
            )

            # Apply filters
            conditions = []

            if role_filter:
                role_subquery = select(Role.id).where(Role.name == role_filter)
                conditions.append(User.role_id.in_(role_subquery))

            if is_active_filter is not None:
                conditions.append(User.is_active == is_active_filter)

            if search_query:
                search_conditions = [User.username.ilike(f"%{search_query}%"), User.email.ilike(f"%{search_query}%")]
                conditions.append(or_(*search_conditions))

            if conditions:
                query = query.where(and_(*conditions))

            # Get total count
            count_query = select(func.count()).select_from(User)
            if conditions:
                count_query = count_query.where(and_(*conditions))
            total_result = await db.execute(count_query)
            total = total_result.scalar() or 0

            # Apply pagination
            offset = (page - 1) * limit
            query = query.offset(offset).limit(limit).order_by(User.username)

            # Execute query
            result = await db.execute(query)
            users = result.scalars().all()

            # Build response with entity details
            user_responses = []
            for user in users:
                entity_type = None
                entity_id = None
                entity_name = None
                entity_details = None

                # Determine entity type and extract details
                if user.student:
                    entity_type = "student"
                    entity_id = user.student.id
                    entity_name = f"{user.student.first_name} {user.student.last_name}"
                    entity_details = {
                        "date_of_birth": user.student.date_of_birth.isoformat() if user.student.date_of_birth else None,
                        "gender": user.student.gender,
                        "aadhar_number": user.student.aadhar_number,
                        "nationality": user.student.nationality,
                    }
                elif user.staff:
                    entity_type = "staff"
                    entity_id = user.staff.id
                    entity_name = f"{user.staff.first_name} {user.staff.last_name or ''}".strip()
                    entity_details = {
                        "designation": user.staff.department,
                        "joining_date": user.staff.joining_date.isoformat() if user.staff.joining_date else None,
                        "phone": user.staff.phone,
                        "qualification": user.staff.qualification,
                        "experience_years": user.staff.experience_years,
                    }
                elif user.parent:
                    entity_type = "parent"
                    entity_id = user.parent.id
                    entity_name = user.parent.name
                    entity_details = {
                        "phone": user.parent.phone,
                        "occupation": user.parent.occupation,
                        "relation": user.parent.relation_to_student,
                        "aadhar_number": user.parent.aadhar_number,
                    }

                user_responses.append(
                    UserWithDetailsResponse(
                        id=user.id,
                        username=user.username,
                        email=user.email,
                        is_active=user.is_active,
                        role_id=user.role_id,
                        role_name=user.role.name if user.role else "No Role",
                        entity_type=entity_type,
                        entity_id=entity_id,
                        entity_name=entity_name,
                        entity_details=entity_details,
                        created_at=None,  # Add if you have timestamp columns
                        updated_at=None,
                    )
                )

            total_pages = (total + limit - 1) // limit

            logger.info(f"Retrieved {len(user_responses)} users (page {page}/{total_pages}, total: {total})")

            return UserListResponse(users=user_responses, total=total, page=page, limit=limit, total_pages=total_pages)

        except Exception as e:
            logger.error(f"Error retrieving users: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve users"
            )

    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: UUID) -> UserWithDetailsResponse:
        """
        Get single user with details

        Args:
            db: Database session
            user_id: User UUID

        Returns:
            UserWithDetailsResponse with complete user and entity information

        Raises:
            HTTPException: If user not found or database error
        """
        try:
            query = (
                select(User)
                .options(
                    selectinload(User.role),
                    selectinload(User.student),
                    selectinload(User.staff),
                    selectinload(User.parent),
                )
                .where(User.id == user_id)
            )

            result = await db.execute(query)
            user = result.scalar_one_or_none()

            if not user:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with ID {user_id} not found")

            # Build entity details
            entity_type = None
            entity_id = None
            entity_name = None
            entity_details = None

            if user.student:
                entity_type = "student"
                entity_id = user.student.id
                entity_name = f"{user.student.first_name} {user.student.last_name}"
                entity_details = {
                    "date_of_birth": user.student.date_of_birth.isoformat() if user.student.date_of_birth else None,
                    "gender": user.student.gender,
                    "aadhar_number": user.student.aadhar_number,
                    "caste": user.student.caste,
                    "community": user.student.community,
                    "nationality": user.student.nationality,
                    "mother_tongue": user.student.mother_tongue,
                }
            elif user.staff:
                entity_type = "staff"
                entity_id = user.staff.id
                entity_name = f"{user.staff.first_name} {user.staff.last_name or ''}".strip()
                entity_details = {
                    "phone": user.staff.phone,
                    "designation": user.staff.department,
                    "joining_date": user.staff.joining_date.isoformat() if user.staff.joining_date else None,
                    "qualification": user.staff.qualification,
                    "experience_years": user.staff.experience_years,
                    "address": user.staff.address,
                    "gender": user.staff.gender.value if user.staff.gender else None,
                }
            elif user.parent:
                entity_type = "parent"
                entity_id = user.parent.id
                entity_name = user.parent.name
                entity_details = {
                    "phone": user.parent.phone,
                    "occupation": user.parent.occupation,
                    "relation": user.parent.relation_to_student,
                    "aadhar_number": user.parent.aadhar_number,
                    "gender": user.parent.gender,
                }

            logger.info(f"Retrieved user {user.username} (ID: {user_id}) with entity type: {entity_type}")

            return UserWithDetailsResponse(
                id=user.id,
                username=user.username,
                email=user.email,
                is_active=user.is_active,
                role_id=user.role_id,
                role_name=user.role.name if user.role else "No Role",
                entity_type=entity_type,
                entity_id=entity_id,
                entity_name=entity_name,
                entity_details=entity_details,
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error retrieving user {user_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve user"
            )

    @staticmethod
    async def update_user(db: AsyncSession, user_id: UUID, update_data: UserUpdateRequest) -> UserWithDetailsResponse:
        """
        Update user basic information

        Args:
            db: Database session
            user_id: User UUID
            update_data: Update request with optional username, email, is_active

        Returns:
            Updated UserWithDetailsResponse

        Raises:
            HTTPException: If user not found, validation fails, or database error
        """
        try:
            # Get user
            query = select(User).where(User.id == user_id)
            result = await db.execute(query)
            user = result.scalar_one_or_none()

            if not user:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with ID {user_id} not found")

            changes_made = []

            # Apply updates
            if update_data.username is not None and update_data.username != user.username:
                # Check username uniqueness
                existing = await db.execute(
                    select(User).where(User.username == update_data.username, User.id != user_id)
                )
                if existing.scalar_one_or_none():
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Username '{update_data.username}' already exists",
                    )
                old_username = user.username
                user.username = update_data.username
                changes_made.append(f"username: {old_username} -> {update_data.username}")

            if update_data.email is not None and update_data.email != user.email:
                # Check email uniqueness
                existing = await db.execute(select(User).where(User.email == update_data.email, User.id != user_id))
                if existing.scalar_one_or_none():
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST, detail=f"Email '{update_data.email}' already exists"
                    )
                old_email = user.email
                user.email = update_data.email
                changes_made.append(f"email: {old_email} -> {update_data.email}")

            if update_data.is_active is not None and update_data.is_active != user.is_active:
                old_status = user.is_active
                user.is_active = update_data.is_active
                changes_made.append(f"is_active: {old_status} -> {update_data.is_active}")

            if not changes_made:
                logger.info(f"No changes made to user {user.username} (ID: {user_id})")
            else:
                await db.commit()
                await db.refresh(user)
                logger.info(f"Updated user {user.username} (ID: {user_id}): {', '.join(changes_made)}")

            # Return updated user with details
            return await UserManagementService.get_user_by_id(db, user_id)

        except HTTPException:
            raise
        except Exception as e:
            await db.rollback()
            logger.error(f"Error updating user {user_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update user"
            )

    @staticmethod
    async def reset_user_password(db: AsyncSession, user_id: UUID, password_data: UserPasswordResetRequest) -> dict:
        """
        Admin reset user password

        Args:
            db: Database session
            user_id: User UUID
            password_data: New password request

        Returns:
            Success message dictionary

        Raises:
            HTTPException: If user not found or database error
        """
        try:
            query = select(User).where(User.id == user_id)
            result = await db.execute(query)
            user = result.scalar_one_or_none()

            if not user:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with ID {user_id} not found")

            user.password_hash = hash_password(password_data.new_password)
            await db.commit()

            logger.info(f"Password reset successfully for user {user.username} (ID: {user_id})")

            return {
                "message": f"Password reset successfully for user {user.username}",
                "user_id": str(user_id),
                "username": user.username,
            }

        except HTTPException:
            raise
        except Exception as e:
            await db.rollback()
            logger.error(f"Error resetting password for user {user_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to reset password"
            )

    @staticmethod
    async def update_user_role(db: AsyncSession, user_id: UUID, new_role_id: UUID) -> dict:
        """
        Change user's role

        Args:
            db: Database session
            user_id: User UUID
            new_role_id: New role UUID to assign

        Returns:
            Success message with role change details

        Raises:
            HTTPException: If user or role not found, or database error
        """
        try:
            # Get user
            query = select(User).options(selectinload(User.role)).where(User.id == user_id)
            result = await db.execute(query)
            user = result.scalar_one_or_none()

            if not user:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with ID {user_id} not found")

            # Verify role exists
            role_query = select(Role).where(Role.id == new_role_id)
            role_result = await db.execute(role_query)
            role = role_result.scalar_one_or_none()

            if not role:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail=f"Role with ID {new_role_id} not found"
                )

            # Update role
            old_role_name = user.role.name
            old_role_id = user.role_id
            user.role_id = new_role_id
            await db.commit()

            logger.info(f"User {user.username} (ID: {user_id}) role changed from {old_role_name} to {role.name}")

            return {
                "message": "User role updated successfully",
                "user_id": str(user_id),
                "username": user.username,
                "old_role": {"id": str(old_role_id), "name": old_role_name},
                "new_role": {"id": str(new_role_id), "name": role.name},
            }

        except HTTPException:
            raise
        except Exception as e:
            await db.rollback()
            logger.error(f"Error updating role for user {user_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update user role"
            )

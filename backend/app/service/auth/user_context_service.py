"""
User Context Service for resolving user context and access scope.

This service determines what data a user can access based on their role,
relationships, and specific permissions.
"""

from typing import List, Optional
from uuid import UUID
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from sqlalchemy.orm import selectinload
from fastapi import HTTPException

from app.models.auth.user_model import User
from app.models.student.student_model import Student
from app.models.masters.staff_model import Staff
from app.models.masters.parent_model import Parent
from app.models.masters.student_parent_association_model import StudentParentLink
from app.schemas.auth.user_context_schema import UserContext
from app.service.auth.permission_service import PermissionService

logger = logging.getLogger("user_context_service")


class UserContextService:
    """Service for resolving user context and access scope"""

    @staticmethod
    async def resolve_user_context(
        db: AsyncSession,
        current_user: dict,
        resource: str,
        action: str
    ) -> UserContext:
        """
        Resolve complete user context including entity IDs and access scope

        Args:
            db: Database session
            current_user: JWT token payload
            resource: Resource being accessed
            action: Action being performed

        Returns:
            UserContext with resolved access scope and entity IDs
        """
        user_id = UUID(current_user.get('sub'))
        role = current_user.get('role')
        username = current_user.get('username')

        # Get user with all entity relationships
        user_query = select(User).options(
            selectinload(User.student),
            selectinload(User.staff),
            selectinload(User.parent)
        ).where(User.id == user_id)

        result = await db.execute(user_query)
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        # Build basic context
        context = UserContext(
            user_id=user_id,
            username=username,
            role=role,
            student_id=user.student.id if user.student else None,
            staff_id=user.staff.id if user.staff else None,
            parent_id=user.parent.id if user.parent else None,
            department_id=user.staff.department_id if user.staff and hasattr(user.staff, 'department_id') else None
        )

        # Determine access scope based on permissions
        access_scope = await UserContextService._determine_access_scope(
            db, context, resource, action
        )
        context.access_scope = access_scope

        # Get related entity IDs for "related" access
        if access_scope == "related":
            context.allowed_entity_ids = await UserContextService._get_related_entity_ids(
                db, context, resource
            )

        logger.info(f"Resolved user context: {username} ({role}) -> {resource}:{action} = {access_scope}")
        return context

    @staticmethod
    async def _determine_access_scope(
        db: AsyncSession,
        context: UserContext,
        resource: str,
        action: str
    ) -> str:
        """
        Determine user's access scope for the resource:action

        Priority order:
        1. _own permissions (highest priority for specific user data)
        2. _related permissions (for relationship-based access)
        3. standard permissions (full access)
        4. denied (no permission found)
        """

        # Check for _own permissions first (most restrictive)
        has_own_permission = await PermissionService.check_role_name_permission(
            db, context.role, resource, f"{action}_own"
        )
        if has_own_permission:
            logger.debug(f"User {context.username} has {action}_own permission for {resource}")
            return "own"

        # Check for _related permissions
        has_related_permission = await PermissionService.check_role_name_permission(
            db, context.role, resource, f"{action}_related"
        )
        if has_related_permission:
            logger.debug(f"User {context.username} has {action}_related permission for {resource}")
            return "related"

        # Check for standard permissions (implies "all" access)
        has_all_permission = await PermissionService.check_role_name_permission(
            db, context.role, resource, action
        )
        if has_all_permission:
            logger.debug(f"User {context.username} has {action} permission for {resource}")
            return "all"

        # No permission found
        logger.debug(f"User {context.username} has no permission for {resource}:{action}")
        return "denied"

    @staticmethod
    async def _get_related_entity_ids(
        db: AsyncSession,
        context: UserContext,
        resource: str
    ) -> List[UUID]:
        """
        Get entity IDs user can access through relationships

        This handles:
        - Parent accessing children's data
        - Teacher accessing assigned students (when teacher assignment system is implemented)
        """

        entity_ids = []

        # Parent accessing children's data
        if context.parent_id and resource in [
            'students', 'student_admissions', 'fee_transactions',
            'student_attendance', 'student_certificates', 'student_documents'
        ]:
            # Get all children of this parent
            children_query = select(StudentParentLink.student_id).where(
                StudentParentLink.parent_id == context.parent_id
            )
            result = await db.execute(children_query)
            child_ids = [row[0] for row in result.fetchall()]
            entity_ids.extend(child_ids)

            logger.debug(f"Parent {context.parent_id} has access to {len(child_ids)} children")

        # Teacher accessing assigned students
        # TODO: Implement when teacher assignment tables are created
        if context.staff_id and resource in ['students', 'student_admissions', 'student_attendance']:
            # This will query teacher-student assignment tables when implemented
            # For now, we'll leave this empty until Phase 3 creates the tables
            pass

        return entity_ids

    @staticmethod
    async def get_user_entity_info(
        db: AsyncSession,
        user_id: UUID
    ) -> dict:
        """
        Get basic entity information for a user (for debugging/logging)

        Returns:
            Dict with user's entity associations
        """
        try:
            user_query = select(User).options(
                selectinload(User.student),
                selectinload(User.staff),
                selectinload(User.parent)
            ).where(User.id == user_id)

            result = await db.execute(user_query)
            user = result.scalar_one_or_none()

            if not user:
                return {"error": "User not found"}

            return {
                "user_id": str(user.id),
                "username": user.username,
                "role": user.role.name if user.role else "Unknown",
                "student_id": str(user.student.id) if user.student else None,
                "staff_id": str(user.staff.id) if user.staff else None,
                "parent_id": str(user.parent.id) if user.parent else None,
                "is_active": user.is_active
            }

        except Exception as e:
            logger.error(f"Error getting user entity info: {str(e)}")
            return {"error": str(e)}

    @staticmethod
    async def validate_context_consistency(
        db: AsyncSession,
        context: UserContext
    ) -> bool:
        """
        Validate that the user context is consistent with database state

        This is useful for debugging and ensuring data integrity
        """
        try:
            # Verify user exists and relationships are correct
            user_query = select(User).options(
                selectinload(User.student),
                selectinload(User.staff),
                selectinload(User.parent)
            ).where(User.id == context.user_id)

            result = await db.execute(user_query)
            user = result.scalar_one_or_none()

            if not user:
                logger.warning(f"Context validation failed: User {context.user_id} not found")
                return False

            # Check entity ID consistency
            if context.student_id and (not user.student or user.student.id != context.student_id):
                logger.warning(f"Context validation failed: Student ID mismatch for user {context.user_id}")
                return False

            if context.staff_id and (not user.staff or user.staff.id != context.staff_id):
                logger.warning(f"Context validation failed: Staff ID mismatch for user {context.user_id}")
                return False

            if context.parent_id and (not user.parent or user.parent.id != context.parent_id):
                logger.warning(f"Context validation failed: Parent ID mismatch for user {context.user_id}")
                return False

            return True

        except Exception as e:
            logger.error(f"Error validating context consistency: {str(e)}")
            return False

    @staticmethod
    async def get_parent_children_count(
        db: AsyncSession,
        parent_id: UUID
    ) -> int:
        """
        Get count of children for a parent (utility method)
        """
        try:
            # Use raw SQL for better performance with count
            count_query = text("""
                SELECT COUNT(*)
                FROM student_parent_links
                WHERE parent_id = :parent_id
            """)

            result = await db.execute(count_query, {"parent_id": parent_id})
            count = result.scalar()
            return count or 0

        except Exception as e:
            logger.error(f"Error getting parent children count: {str(e)}")
            return 0

    @staticmethod
    async def check_user_can_access_student(
        db: AsyncSession,
        user_context: UserContext,
        student_id: UUID
    ) -> bool:
        """
        Check if user can access a specific student's data

        This is a convenience method for common access checks
        """

        # Admin access
        if user_context.role.lower() in ['super_admin', 'tenant_admin', 'admin']:
            return True

        # Full access scope
        if user_context.access_scope == "all":
            return True

        # Own access - student accessing their own data
        if user_context.access_scope == "own" and user_context.student_id == student_id:
            return True

        # Related access - parent or teacher accessing assigned student
        if user_context.access_scope == "related":
            return student_id in (user_context.allowed_entity_ids or [])

        return False
from typing import Any, List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import or_, and_, select, func
from fastapi import HTTPException, status

from app.schemas.auth.user_context_schema import UserContext


class UserScopedService:
    """
    Base service for user-specific data access - extends existing expense module patterns.

    This service provides standardized user-scoped filtering for all COS360 modules,
    building on the proven department filtering patterns from the expense module.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_scoped_query(
        self,
        base_query,
        user_context: UserContext,
        model_class,
        access_type: str = "read"
    ):
        """
        Apply user-specific scoping to queries - extends existing department logic

        Args:
            base_query: Base SQLAlchemy query
            user_context: User context with access scope
            model_class: SQLAlchemy model class
            access_type: Type of access (read, list, update, delete)

        Returns:
            Filtered query based on user access scope
        """

        # Admin roles see everything (existing pattern from expense module)
        if user_context.role.lower() in ['super_admin', 'tenant_admin', 'admin']:
            return await self._apply_department_filtering(base_query, user_context, model_class)

        # Apply filtering based on access scope
        if user_context.access_scope == "all":
            # User has full access - apply only department filtering if exists
            return await self._apply_department_filtering(base_query, user_context, model_class)

        elif user_context.access_scope == "own":
            # User can only access their own data
            return await self._apply_ownership_filtering(base_query, user_context, model_class)

        elif user_context.access_scope == "related":
            # User can access related entities (parent-child, teacher-student)
            return await self._apply_relationship_filtering(base_query, user_context, model_class)

        elif user_context.access_scope == "department":
            # Department-level access (existing pattern)
            return await self._apply_department_filtering(base_query, user_context, model_class)

        else:
            # Default: no access (denied)
            return base_query.where(False)  # Returns empty result

    async def _apply_department_filtering(self, query, user_context, model_class):
        """Apply department filtering (existing pattern from expense module)"""

        # Admin roles bypass department filtering
        if user_context.role.lower() in ['super_admin', 'tenant_admin', 'admin']:
            return query

        # Apply department filtering if model has department_id and user has department
        if hasattr(model_class, 'department_id') and user_context.department_id:
            return query.where(
                or_(
                    model_class.department_id == user_context.department_id,
                    model_class.department_id.is_(None)  # Include unrestricted records
                )
            )
        elif hasattr(model_class, 'department_id'):
            # User has no department, only show unrestricted records
            return query.where(model_class.department_id.is_(None))

        return query

    async def _apply_ownership_filtering(self, query, user_context, model_class):
        """Apply ownership filtering - user owns the record"""

        conditions = []

        # Records created by user (audit pattern from expense module)
        if hasattr(model_class, 'created_by_user_id'):
            conditions.append(model_class.created_by_user_id == user_context.user_id)

        # Entity ownership patterns
        if model_class.__tablename__ == 'students' and user_context.student_id:
            conditions.append(model_class.id == user_context.student_id)
        elif model_class.__tablename__ == 'staff' and user_context.staff_id:
            conditions.append(model_class.id == user_context.staff_id)
        elif model_class.__tablename__ == 'parents' and user_context.parent_id:
            conditions.append(model_class.id == user_context.parent_id)
        elif model_class.__tablename__ == 'users':
            conditions.append(model_class.id == user_context.user_id)

        # Student-related records ownership
        elif hasattr(model_class, 'student_id') and user_context.student_id:
            conditions.append(model_class.student_id == user_context.student_id)
        elif hasattr(model_class, 'staff_id') and user_context.staff_id:
            conditions.append(model_class.staff_id == user_context.staff_id)
        elif hasattr(model_class, 'parent_id') and user_context.parent_id:
            conditions.append(model_class.parent_id == user_context.parent_id)

        if conditions:
            return query.where(or_(*conditions))
        else:
            # No ownership conditions match - deny access
            return query.where(False)

    async def _apply_relationship_filtering(self, query, user_context, model_class):
        """Apply relationship filtering - user can access related entities"""

        if not user_context.allowed_entity_ids:
            return query.where(False)  # No related entities

        conditions = []

        # Student-related records (admissions, fees, attendance, certificates, etc.)
        if hasattr(model_class, 'student_id'):
            conditions.append(model_class.student_id.in_(user_context.allowed_entity_ids))

        # Direct student records
        elif model_class.__tablename__ == 'students':
            conditions.append(model_class.id.in_(user_context.allowed_entity_ids))

        # Handle other relationship patterns as needed
        # (staff-student, teacher-class, etc.)

        if conditions:
            return query.where(or_(*conditions))
        else:
            return query.where(False)

    async def validate_entity_access(
        self,
        user_context: UserContext,
        resource_type: str,
        entity_id: UUID
    ) -> bool:
        """
        Validate if user can access a specific entity

        Args:
            user_context: User context with access scope
            resource_type: Type of resource being accessed
            entity_id: ID of the specific entity

        Returns:
            True if access is allowed, False otherwise
        """

        # Admin access
        if user_context.role.lower() in ['super_admin', 'tenant_admin', 'admin']:
            return True

        # Full access scope
        if user_context.access_scope == "all":
            return True

        # Own access validation
        if user_context.access_scope == "own":
            if resource_type == "students" and user_context.student_id == entity_id:
                return True
            elif resource_type == "staff" and user_context.staff_id == entity_id:
                return True
            elif resource_type == "parents" and user_context.parent_id == entity_id:
                return True
            elif resource_type == "users" and user_context.user_id == entity_id:
                return True

        # Related access validation
        elif user_context.access_scope == "related":
            if user_context.allowed_entity_ids and entity_id in user_context.allowed_entity_ids:
                return True

        return False

    async def count_user_scoped_records(
        self,
        user_context: UserContext,
        model_class,
        additional_filters=None
    ) -> int:
        """
        Count records with user-specific filtering applied

        Args:
            user_context: User context with access scope
            model_class: SQLAlchemy model class
            additional_filters: Additional WHERE conditions

        Returns:
            Count of accessible records
        """

        # Base count query
        count_query = select(func.count(model_class.id))

        # Apply additional filters first
        if additional_filters is not None:
            count_query = count_query.where(additional_filters)

        # Apply user scoping
        scoped_query = await self.get_user_scoped_query(
            count_query, user_context, model_class, "list"
        )

        result = await self.db.execute(scoped_query)
        return result.scalar() or 0

    def validate_department_access(
        self,
        user_department_id: Optional[UUID],
        resource_department_id: Optional[UUID],
        user_role: str
    ) -> bool:
        """
        Validate department-level access control (from expense module)

        This method maintains compatibility with existing expense module patterns
        """

        # Super admin and tenant admin have access to all departments
        if user_role.lower() in ['super_admin', 'tenant_admin', 'admin']:
            return True

        # If resource has no department restriction, allow access
        if resource_department_id is None:
            return True

        # If user has no department, deny access to department-specific resources
        if user_department_id is None:
            return False

        # Check if user's department matches resource's department
        return user_department_id == resource_department_id

    def build_access_denied_error(
        self,
        resource_type: str,
        action: str,
        reason: str = "insufficient_permissions"
    ) -> HTTPException:
        """Build standardized access denied error responses"""

        return HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "access_denied",
                "message": f"Access denied: Cannot {action} {resource_type}",
                "reason": reason,
                "resource_type": resource_type,
                "action": action
            }
        )

    def build_not_found_error(
        self,
        resource_type: str,
        entity_id: Optional[UUID] = None
    ) -> HTTPException:
        """Build standardized not found error responses"""

        message = f"{resource_type.replace('_', ' ').title()} not found"
        if entity_id:
            message += f" (ID: {entity_id})"

        return HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "not_found",
                "message": message,
                "resource_type": resource_type,
                "entity_id": str(entity_id) if entity_id else None
            }
        )
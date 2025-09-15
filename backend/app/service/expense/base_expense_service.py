from typing import Optional, Dict, Any, List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException, status
from datetime import datetime
import json

from app.models.expense import ExpenseAuditLog


class BaseExpenseService:
    """Base service class with common expense module functionality"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_audit_log(
        self,
        transaction_id: UUID,
        action: str,
        action_category: str,
        actor_user_id: UUID,
        actor_role: str,
        actor_username: str,
        field_name: Optional[str] = None,
        old_value: Optional[str] = None,
        new_value: Optional[str] = None,
        full_record_before: Optional[Dict[str, Any]] = None,
        full_record_after: Optional[Dict[str, Any]] = None,
        action_reason: Optional[str] = None,
        action_notes: Optional[str] = None,
        request_context: Optional[Dict[str, Any]] = None,
        department_id: Optional[UUID] = None
    ) -> ExpenseAuditLog:
        """Create an audit log entry for expense operations"""

        audit_log = ExpenseAuditLog(
            transaction_id=transaction_id,
            action=action,
            action_category=action_category,
            field_name=field_name,
            old_value=old_value,
            new_value=new_value,
            full_record_before=full_record_before,
            full_record_after=full_record_after,
            action_reason=action_reason,
            action_notes=action_notes,
            department_id=department_id,
            actor_user_id=actor_user_id,
            actor_role=actor_role,
            actor_username=actor_username
        )

        # Add request context if provided
        if request_context:
            audit_log.request_ip_address = request_context.get('ip_address')
            audit_log.request_user_agent = request_context.get('user_agent')
            audit_log.request_session_id = request_context.get('session_id')
            audit_log.api_endpoint = request_context.get('endpoint')
            audit_log.http_method = request_context.get('method')
            audit_log.request_id = request_context.get('request_id')

        self.db.add(audit_log)
        await self.db.flush()
        return audit_log

    def validate_department_access(
        self,
        user_department_id: Optional[UUID],
        resource_department_id: Optional[UUID],
        user_role: str
    ) -> bool:
        """Validate department-level access control"""

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

    def prepare_record_snapshot(self, record: Any) -> Dict[str, Any]:
        """Prepare a clean snapshot of a record for audit logging"""
        if not record:
            return {}

        # Convert SQLAlchemy model to dict, handling various data types
        snapshot = {}
        for column in record.__table__.columns:
            value = getattr(record, column.name, None)

            # Handle different data types for JSON serialization
            if value is None:
                snapshot[column.name] = None
            elif isinstance(value, (str, int, float, bool)):
                snapshot[column.name] = value
            elif hasattr(value, 'isoformat'):  # datetime objects
                snapshot[column.name] = value.isoformat()
            elif isinstance(value, UUID):
                snapshot[column.name] = str(value)
            else:
                # For complex objects, convert to string
                snapshot[column.name] = str(value)

        return snapshot

    async def validate_unique_constraint(
        self,
        model_class,
        field_name: str,
        field_value: Any,
        exclude_id: Optional[UUID] = None
    ) -> bool:
        """Validate unique constraints for expense models"""

        query = select(func.count(getattr(model_class, field_name))).where(
            getattr(model_class, field_name) == field_value
        )

        # Exclude current record from uniqueness check (for updates)
        if exclude_id:
            query = query.where(model_class.id != exclude_id)

        result = await self.db.execute(query)
        count = result.scalar()

        return count == 0

    def handle_optimistic_locking(
        self,
        current_version: int,
        stored_version: int,
        record_type: str = "record"
    ) -> None:
        """Handle optimistic locking version conflicts"""

        if current_version != stored_version:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "error": "Optimistic locking conflict",
                    "message": f"The {record_type} has been modified by another user. Please refresh and try again.",
                    "current_version": stored_version,
                    "provided_version": current_version
                }
            )

    async def get_department_scoped_query(
        self,
        base_query,
        user_department_id: Optional[UUID],
        user_role: str,
        model_class
    ):
        """Apply department-level scoping to queries"""

        # Super admin and tenant admin see everything
        if user_role.lower() in ['super_admin', 'tenant_admin', 'admin']:
            return base_query

        # Regular users only see their department's records
        if user_department_id:
            return base_query.where(
                (model_class.department_id == user_department_id) |
                (model_class.department_id.is_(None))  # Include records with no department restriction
            )
        else:
            # Users with no department can only see unrestricted records
            return base_query.where(model_class.department_id.is_(None))

    def build_error_response(
        self,
        error_code: str,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        status_code: int = status.HTTP_400_BAD_REQUEST
    ) -> HTTPException:
        """Build standardized error responses"""

        error_response = {
            "error_code": error_code,
            "message": message
        }

        if details:
            error_response["details"] = details

        return HTTPException(status_code=status_code, detail=error_response)

    async def check_record_exists(
        self,
        model_class,
        record_id: UUID,
        error_message: str = "Record not found"
    ):
        """Check if a record exists and return it or raise 404"""

        query = select(model_class).where(model_class.id == record_id)
        result = await self.db.execute(query)
        record = result.scalar_one_or_none()

        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error_message
            )

        return record
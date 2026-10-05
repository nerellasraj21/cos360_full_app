import logging
from typing import Any
from uuid import UUID

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.profile.profile_audit_log_model import ProfileAuditLog

logger = logging.getLogger(__name__)


class ProfileAuditService:
    """Service for logging profile-related actions"""

    @staticmethod
    async def log_profile_view(
        db: AsyncSession,
        user_id: UUID,
        profile_type: str,
        actor_user_id: UUID,
        actor_role: str,
        actor_username: str,
        request: Request | None = None,
        org_id: UUID | None = None,
    ):
        """Log profile view action"""
        try:
            logger.info(f"AUDIT: Logging {profile_type} view for user {user_id}")
            audit_log = ProfileAuditLog(
                org_id=org_id or user_id,
                user_id=user_id,
                profile_type=profile_type,
                action="view",
                action_category="profile",
                actor_user_id=actor_user_id,
                actor_role=actor_role,
                actor_username=actor_username,
                request_ip_address=request.client.host if request and request.client else None,
                request_user_agent=request.headers.get("user-agent") if request else None,
                api_endpoint=str(request.url.path) if request else None,
                http_method=request.method if request else None,
                is_sensitive_change="FALSE",
            )

            db.add(audit_log)
            await db.flush()
            logger.info(f"AUDIT: Successfully flushed audit log for {profile_type} view")
        except Exception as e:
            logger.error(f"AUDIT ERROR: Failed to log profile view: {e}", exc_info=True)

    @staticmethod
    async def log_profile_update(
        db: AsyncSession,
        user_id: UUID,
        profile_type: str,
        field_name: str,
        old_value: Any,
        new_value: Any,
        actor_user_id: UUID,
        actor_role: str,
        actor_username: str,
        request: Request | None = None,
        org_id: UUID | None = None,
        is_sensitive: bool = False,
    ):
        """Log profile update action"""
        try:
            if is_sensitive:
                old_display = "***REDACTED***" if old_value else None
                new_display = "***REDACTED***" if new_value else None
            else:
                old_display = str(old_value) if old_value is not None else None
                new_display = str(new_value) if new_value is not None else None

            audit_log = ProfileAuditLog(
                org_id=org_id or user_id,
                user_id=user_id,
                profile_type=profile_type,
                action="update",
                action_category="profile",
                field_name=field_name,
                old_value=old_display,
                new_value=new_display,
                actor_user_id=actor_user_id,
                actor_role=actor_role,
                actor_username=actor_username,
                request_ip_address=request.client.host if request and request.client else None,
                request_user_agent=request.headers.get("user-agent") if request else None,
                api_endpoint=str(request.url.path) if request else None,
                http_method=request.method if request else None,
                is_sensitive_change="TRUE" if is_sensitive else "FALSE",
            )

            db.add(audit_log)
            await db.flush()
        except Exception as e:
            logger.error(f"Failed to log profile update: {e}")

    @staticmethod
    async def log_password_change(
        db: AsyncSession,
        user_id: UUID,
        actor_user_id: UUID,
        actor_role: str,
        actor_username: str,
        profile_type: str = "security",
        request: Request | None = None,
        org_id: UUID | None = None,
        success: bool = True,
    ):
        """Log password change action (highly sensitive)"""
        try:
            audit_log = ProfileAuditLog(
                org_id=org_id or user_id,
                user_id=user_id,
                profile_type=profile_type,
                action="password_change",
                action_category="security",
                field_name="password_hash",
                old_value="***REDACTED***",
                new_value="***REDACTED***",
                action_notes=f"Password change {'successful' if success else 'failed'}",
                actor_user_id=actor_user_id,
                actor_role=actor_role,
                actor_username=actor_username,
                request_ip_address=request.client.host if request and request.client else None,
                request_user_agent=request.headers.get("user-agent") if request else None,
                api_endpoint=str(request.url.path) if request else None,
                http_method=request.method if request else None,
                is_sensitive_change="TRUE",
                requires_verification="FALSE",
            )

            db.add(audit_log)
            await db.flush()
        except Exception as e:
            logger.error(f"Failed to log password change: {e}")

    @staticmethod
    async def log_bulk_update(
        db: AsyncSession,
        user_id: UUID,
        profile_type: str,
        changes: dict[str, tuple],
        actor_user_id: UUID,
        actor_role: str,
        actor_username: str,
        request: Request | None = None,
        org_id: UUID | None = None,
    ):
        """Log multiple field updates in a single transaction"""
        sensitive_fields = {"password_hash", "password", "email"}

        for field_name, (old_value, new_value) in changes.items():
            is_sensitive = field_name in sensitive_fields

            await ProfileAuditService.log_profile_update(
                db=db,
                user_id=user_id,
                profile_type=profile_type,
                field_name=field_name,
                old_value=old_value,
                new_value=new_value,
                actor_user_id=actor_user_id,
                actor_role=actor_role,
                actor_username=actor_username,
                request=request,
                org_id=org_id,
                is_sensitive=is_sensitive,
            )

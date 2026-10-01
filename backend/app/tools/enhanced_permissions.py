"""
Enhanced Permission Checking System with User-Specific Access Control

This module extends the existing simple_permissions system to support user-specific
permissions (*_own, *_related) while maintaining backward compatibility.
"""

import logging
from uuid import UUID

from fastapi import HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.auth.user_context_schema import UserContext
from app.service.auth.user_context_service import UserContextService
from app.tools.simple_permissions import get_current_user_token

logger = logging.getLogger("enhanced_permissions")


async def check_user_resource_access(
    db: AsyncSession, request: Request, resource: str, action: str, target_entity_id: UUID | None = None
) -> UserContext:
    """
    Enhanced permission check that returns user context with access scope

    This is the primary function for user-specific permission checking.
    It checks role permissions from the tenant schema and resolves user context.

    NOTE: Plan permissions are checked ONLY during tenant onboarding when permissions
    are copied from public.plan_resource_access to the tenant's resource_permissions.
    Runtime checks ONLY query the tenant schema - this is by design per the dual-layer
    permission architecture.

    Args:
        db: Database session
        request: FastAPI request object
        resource: Resource being accessed (e.g., 'students', 'student_admissions')
        action: Action being performed (e.g., 'read', 'list', 'create')
        target_entity_id: Specific entity ID being accessed (for validation)

    Returns:
        UserContext with resolved permissions and access scope

    Raises:
        HTTPException: If access is denied (401, 403)
    """

    try:
        # Step 1: Get current user from JWT token
        current_user = await get_current_user_token(request)
        logger.debug(f"Token verified for user: {current_user.get('username')} ({current_user.get('role')})")

        # Step 2: Resolve user context and access scope
        user_context = await UserContextService.resolve_user_context(db, current_user, resource, action)

        # Step 3: Check if access is denied
        if user_context.access_scope == "denied":
            logger.warning(f"Access denied: {user_context.username} ({user_context.role}) -> {resource}:{action}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "permission_denied",
                    "message": f"Permission denied: {user_context.role} cannot {action} {resource}",
                    "resource": resource,
                    "action": action,
                    "user_role": user_context.role,
                },
            )

        # Step 4: Entity-specific validation for targeted operations
        if target_entity_id and user_context.access_scope in ["own", "related"]:
            await _validate_entity_access(user_context, resource, target_entity_id)

        # Step 5: Set additional context info

        logger.info(
            f"Access granted: {user_context.username} ({user_context.role}) -> {resource}:{action} [{user_context.access_scope}]"
        )
        return user_context

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in enhanced permission check: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Permission validation failed")


async def _validate_entity_access(user_context: UserContext, resource: str, entity_id: UUID) -> None:
    """
    Validate user can access specific entity

    Args:
        user_context: User context with access scope
        resource: Resource type being accessed
        entity_id: Specific entity ID

    Raises:
        HTTPException: If access to specific entity is denied
    """

    if user_context.access_scope == "own":
        # Validate ownership based on resource type
        allowed = False

        if resource in ["students", "student_admissions"] and user_context.student_id == entity_id:
            allowed = True
        elif resource in ["staff"] and user_context.staff_id == entity_id:
            allowed = True
        elif resource in ["parents"] and user_context.parent_id == entity_id:
            allowed = True
        elif resource in ["users"] and user_context.user_id == entity_id:
            allowed = True

        if not allowed:
            logger.warning(f"Own access denied: {user_context.username} -> {resource}:{entity_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,  # Return 404 instead of 403 for security
                detail=f"{resource.replace('_', ' ').title()} not found",
            )

    elif user_context.access_scope == "related":
        # Entity must be in allowed list
        if entity_id not in (user_context.allowed_entity_ids or []):
            logger.warning(f"Related access denied: {user_context.username} -> {resource}:{entity_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,  # Return 404 instead of 403 for security
                detail=f"{resource.replace('_', ' ').title()} not found",
            )


# Convenience decorator for endpoints
def require_user_access(resource: str, action: str, entity_id_param: str | None = None):
    """
    Decorator for endpoint-level user-specific permission checking

    Args:
        resource: Resource name (e.g., 'students')
        action: Action name (e.g., 'read', 'list')
        entity_id_param: Name of the parameter containing entity ID (optional)

    Returns:
        Decorator function that adds user_context to endpoint arguments
    """

    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Extract request and db from function arguments
            # This assumes standard FastAPI parameter order
            request = None
            db = None

            for arg in args:
                if hasattr(arg, "headers"):  # FastAPI Request object
                    request = arg
                elif hasattr(arg, "execute"):  # AsyncSession object
                    db = arg

            # Check kwargs for request and db
            if not request:
                request = kwargs.get("request")
            if not db:
                db = kwargs.get("db")

            if not request or not db:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Invalid endpoint configuration: missing request or db",
                )

            # Extract entity ID if specified
            target_entity_id = None
            if entity_id_param and entity_id_param in kwargs:
                target_entity_id = kwargs[entity_id_param]

            # Perform permission check
            user_context = await check_user_resource_access(db, request, resource, action, target_entity_id)

            # Add user_context to function arguments
            kwargs["user_context"] = user_context

            return await func(*args, **kwargs)

        return wrapper

    return decorator


# Backward compatibility functions - these maintain the existing API
async def check_role_plan_permission_with_user_context(
    db: AsyncSession, request: Request, role: str, resource: str, action: str
) -> UserContext:
    """
    Enhanced version of check_role_plan_permission_with_error that returns UserContext

    This maintains backward compatibility while providing enhanced functionality.
    """
    return await check_user_resource_access(db, request, resource, action)


# User context access helpers
async def get_user_access_scope(db: AsyncSession, request: Request, resource: str, action: str) -> str:
    """
    Get user's access scope for a resource without raising exceptions

    Returns:
        Access scope string: 'all', 'own', 'related', 'denied'
    """
    try:
        user_context = await check_user_resource_access(db, request, resource, action)
        return user_context.access_scope
    except HTTPException:
        return "denied"
    except Exception:
        return "denied"


async def can_user_access_entity(
    db: AsyncSession, request: Request, resource: str, action: str, entity_id: UUID
) -> bool:
    """
    Check if user can access a specific entity without raising exceptions

    Returns:
        True if user can access the entity, False otherwise
    """
    try:
        user_context = await check_user_resource_access(db, request, resource, action, entity_id)
        return user_context.access_scope != "denied"
    except HTTPException:
        return False
    except Exception:
        return False


# Enhanced permission requirement functions with user context
def RequireUserAccess(resource: str, action: str):
    """
    Enhanced version of permission requirements that supports user-specific access

    This replaces the simple RequireRead, RequireList, etc. functions
    with user context-aware versions.
    """

    async def permission_check(request: Request, db: AsyncSession) -> UserContext:
        return await check_user_resource_access(db, request, resource, action)

    return permission_check


def RequireEntityAccess(resource: str, action: str, entity_id_param: str):
    """
    Require access to a specific entity

    Args:
        resource: Resource name
        action: Action name
        entity_id_param: Name of the function parameter containing entity ID
    """

    async def permission_check(request: Request, db: AsyncSession, **kwargs) -> UserContext:
        entity_id = kwargs.get(entity_id_param)
        if not entity_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=f"Missing required parameter: {entity_id_param}"
            )

        return await check_user_resource_access(db, request, resource, action, entity_id)

    return permission_check


# Logging and debugging helpers
def log_permission_check(user_context: UserContext, resource: str, action: str, result: str):
    """Log permission check results for debugging"""
    logger.info(f"Permission check: {user_context.username} ({user_context.role}) -> {resource}:{action} = {result}")


async def validate_user_context_integrity(db: AsyncSession, user_context: UserContext) -> bool:
    """
    Validate that user context is consistent with database state

    Useful for debugging permission issues
    """
    return await UserContextService.validate_context_consistency(db, user_context)

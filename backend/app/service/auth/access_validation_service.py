"""
Access Validation Service

Service for validating user access to specific endpoints or menu items.
Combines role-based permissions with plan-based permissions to determine
if a user has access to perform a specific action on a resource.
"""

import logging

from fastapi import Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.middleware.tenant_middleware import get_client_name_from_request
from app.models.auth.role_model import Role
from app.models.auth.user_model import User
from app.schemas.auth.access_validation_schema import AccessValidationRequest, AccessValidationResponse
from app.tools.endpoint_resource_mapping import get_resource_from_endpoint, get_resource_from_menu
from app.tools.simple_permissions import check_role_plan_permission

logger = logging.getLogger("access_validation_service")


class AccessValidationService:
    """Service for validating user access to endpoints and menu items"""

    @staticmethod
    async def get_user_with_role(db: AsyncSession, user_id: str) -> tuple[User, Role] | None:
        """
        Get user and their role from database.

        Args:
            db: Database session
            user_id: UUID of the user

        Returns:
            Tuple[User, Role]: User and Role objects or None if not found
        """
        try:
            # Query user with role relationship
            result = await db.execute(
                select(User).options(selectinload(User.role)).where(User.id == user_id, User.is_active)
            )
            user = result.scalar_one_or_none()

            if not user:
                logger.warning(f"User not found or inactive: {user_id}")
                return None

            if not user.role:
                logger.warning(f"User has no role assigned: {user_id}")
                return None

            logger.info(f"Retrieved user {user.username} with role {user.role.name}")
            return (user, user.role)

        except Exception as e:
            logger.error(f"Error retrieving user with role: {str(e)}")
            return None

    @staticmethod
    def resolve_resource_action(
        request_data: AccessValidationRequest, http_method: str = "GET"
    ) -> tuple[str, str] | None:
        """
        Resolve resource and action from the request data.

        Args:
            request_data: The access validation request
            http_method: HTTP method for endpoint requests

        Returns:
            Tuple[str, str]: (resource, action) or None if not resolvable
        """
        try:
            # If endpoint is provided, use endpoint mapping
            if request_data.endpoint:
                result = get_resource_from_endpoint(request_data.endpoint, http_method)
                if result:
                    resource, action = result
                    # Override action if explicitly provided in request
                    if request_data.action and request_data.action != "read":
                        action = request_data.action
                    return (resource, action)

            # If menu_item is provided, use menu mapping
            if request_data.menu_item:
                result = get_resource_from_menu(request_data.menu_item)
                if result:
                    resource, action = result
                    # Override action if explicitly provided in request
                    if request_data.action and request_data.action != "read":
                        action = request_data.action
                    return (resource, action)

            logger.warning(
                f"Could not resolve resource for endpoint: {request_data.endpoint}, menu: {request_data.menu_item}"
            )
            return None

        except Exception as e:
            logger.error(f"Error resolving resource and action: {str(e)}")
            return None

    @staticmethod
    async def validate_user_access(
        db: AsyncSession, request: Request, request_data: AccessValidationRequest, http_method: str = "GET"
    ) -> AccessValidationResponse:
        """
        Main method to validate user access to a resource.

        Args:
            db: Database session
            request: FastAPI request object for tenant detection
            request_data: Access validation request data
            http_method: HTTP method for endpoint requests

        Returns:
            AccessValidationResponse: Validation result with details
        """
        try:
            # Step 1: Get user and role
            user_role_data = await AccessValidationService.get_user_with_role(db, str(request_data.user_id))

            if not user_role_data:
                return AccessValidationResponse(
                    has_access=False, reason="User not found or inactive", user_role=None, resource=None, action=None
                )

            user, role = user_role_data

            # Step 2: Resolve resource and action
            resource_action = AccessValidationService.resolve_resource_action(request_data, http_method)

            if not resource_action:
                return AccessValidationResponse(
                    has_access=False,
                    reason="Could not resolve resource from endpoint or menu item",
                    user_role=role.name,
                    resource=None,
                    action=request_data.action,
                )

            resource, action = resource_action

            # Step 3: Check permissions using existing dual-layer validation
            client_name = get_client_name_from_request(request)

            has_access = await check_role_plan_permission(
                db=db, client_name=client_name, role=role.name, resource=resource, action=action
            )

            # Step 4: Determine reason for denial
            reason = None
            if not has_access:
                reason = f"Access denied: {role.name} cannot {action} {resource} or plan limitation"

            logger.info(
                f"Access validation result: user={user.username}, role={role.name}, "
                f"resource={resource}, action={action}, has_access={has_access}"
            )

            return AccessValidationResponse(
                has_access=has_access, reason=reason, user_role=role.name, resource=resource, action=action
            )

        except Exception as e:
            logger.error(f"Error in access validation: {str(e)}")
            return AccessValidationResponse(
                has_access=False,
                reason=f"Internal error during validation: {str(e)}",
                user_role=None,
                resource=None,
                action=request_data.action,
            )

    @staticmethod
    async def validate_user_endpoint_access(
        db: AsyncSession, request: Request, user_id: str, endpoint: str, http_method: str = "GET", action: str = "read"
    ) -> bool:
        """
        Simplified method to validate user access to a specific endpoint.

        Args:
            db: Database session
            request: FastAPI request object
            user_id: UUID of the user
            endpoint: API endpoint path
            http_method: HTTP method
            action: Action to validate

        Returns:
            bool: True if user has access, False otherwise
        """
        try:
            request_data = AccessValidationRequest(user_id=user_id, endpoint=endpoint, action=action)

            result = await AccessValidationService.validate_user_access(db, request, request_data, http_method)

            return result.has_access

        except Exception as e:
            logger.error(f"Error in simplified endpoint access validation: {str(e)}")
            return False

    @staticmethod
    async def validate_user_menu_access(
        db: AsyncSession, request: Request, user_id: str, menu_item: str, action: str = "read"
    ) -> bool:
        """
        Simplified method to validate user access to a specific menu item.

        Args:
            db: Database session
            request: FastAPI request object
            user_id: UUID of the user
            menu_item: Menu item identifier
            action: Action to validate

        Returns:
            bool: True if user has access, False otherwise
        """
        try:
            request_data = AccessValidationRequest(user_id=user_id, menu_item=menu_item, action=action)

            result = await AccessValidationService.validate_user_access(db, request, request_data)

            return result.has_access

        except Exception as e:
            logger.error(f"Error in simplified menu access validation: {str(e)}")
            return False

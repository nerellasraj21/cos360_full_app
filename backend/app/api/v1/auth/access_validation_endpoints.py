"""
Access Validation API Endpoints

Provides endpoints for validating user access to specific resources, endpoints, or menu items.
Uses dual-layer permission checking (role + plan) to determine access rights.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any
import logging

from app.schemas.auth.access_validation_schema import (
    AccessValidationRequest,
    AccessValidationResponse,
    AccessValidationError
)
from app.service.auth.access_validation_service import AccessValidationService
from app.db.tenant_session import get_tenant_db
from app.tools.simple_permissions import get_current_user_token
from app.middleware.rate_limit_middleware import rate_limit_api

logger = logging.getLogger("access_validation_endpoints")

router = APIRouter(prefix="/auth", tags=["Auth/Access Validation"])

@router.post(
    "/validate-access",
    response_model=AccessValidationResponse,
    status_code=status.HTTP_200_OK,
    summary="Validate User Access",
    description="""
    Validate if a user has access to a specific endpoint or menu item.

    This endpoint performs dual-layer permission checking:
    1. Role-based permissions: Check if user's role has required permissions
    2. Plan-based permissions: Check if tenant's plan allows the resource/action

    Request body should contain:
    - user_id: UUID of the user to validate
    - endpoint: API endpoint path (optional if menu_item provided)
    - menu_item: Menu item identifier (optional if endpoint provided)
    - action: Action to validate (create, read, update, delete, list)

    Returns boolean result with detailed information for debugging.
    """
)
@rate_limit_api
async def validate_user_access(
    request_data: AccessValidationRequest,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user_token)
):
    """
    Validate user access to specific endpoint or menu item.

    Args:
        request_data: Access validation request containing user_id and target resource
        request: FastAPI request object for tenant detection
        db: Database session
        current_user: Currently authenticated user (from JWT)

    Returns:
        AccessValidationResponse: Validation result with access status and details

    Raises:
        HTTPException: If validation fails due to system errors
    """
    try:
        logger.info(
            f"Access validation request from user {current_user.get('username')}: "
            f"target_user={request_data.user_id}, endpoint={request_data.endpoint}, "
            f"menu={request_data.menu_item}, action={request_data.action}"
        )

        # Validate that the requesting user has permission to validate access
        # Note: For now, we allow any authenticated user to validate access
        # In production, you might want to restrict this to admin users only

        # Perform the access validation
        result = await AccessValidationService.validate_user_access(
            db=db,
            request=request,
            request_data=request_data,
            http_method="GET"  # Default to GET for general validation
        )

        logger.info(
            f"Access validation result: user={request_data.user_id}, "
            f"has_access={result.has_access}, reason={result.reason}"
        )

        return result

    except Exception as e:
        logger.error(f"Error in access validation endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "validation_error",
                "message": "Failed to validate user access",
                "details": str(e)
            }
        )

@router.post(
    "/validate-endpoint-access",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Validate Endpoint Access (Simplified)",
    description="""
    Simplified endpoint for validating access to a specific API endpoint.

    Returns a simple boolean result indicating whether the user has access.
    This is useful for quick access checks in frontend applications.
    """
)
@rate_limit_api
async def validate_endpoint_access(
    user_id: str,
    endpoint: str,
    action: str = "read",
    http_method: str = "GET",
    request: Request = None,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user_token)
):
    """
    Simplified endpoint access validation.

    Args:
        user_id: UUID of the user to validate
        endpoint: API endpoint path
        action: Action to validate (default: read)
        http_method: HTTP method (default: GET)
        request: FastAPI request object
        db: Database session
        current_user: Currently authenticated user

    Returns:
        Dict with has_access boolean and basic info
    """
    try:
        has_access = await AccessValidationService.validate_user_endpoint_access(
            db=db,
            request=request,
            user_id=user_id,
            endpoint=endpoint,
            http_method=http_method,
            action=action
        )

        return {
            "has_access": has_access,
            "user_id": user_id,
            "endpoint": endpoint,
            "action": action,
            "http_method": http_method
        }

    except Exception as e:
        logger.error(f"Error in simplified endpoint access validation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "validation_error",
                "message": "Failed to validate endpoint access",
                "details": str(e)
            }
        )

@router.post(
    "/validate-menu-access",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Validate Menu Access (Simplified)",
    description="""
    Simplified endpoint for validating access to a specific menu item.

    Returns a simple boolean result indicating whether the user has access.
    """
)
@rate_limit_api
async def validate_menu_access(
    user_id: str,
    menu_item: str,
    action: str = "read",
    request: Request = None,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user_token)
):
    """
    Simplified menu access validation.

    Args:
        user_id: UUID of the user to validate
        menu_item: Menu item identifier
        action: Action to validate (default: read)
        request: FastAPI request object
        db: Database session
        current_user: Currently authenticated user

    Returns:
        Dict with has_access boolean and basic info
    """
    try:
        has_access = await AccessValidationService.validate_user_menu_access(
            db=db,
            request=request,
            user_id=user_id,
            menu_item=menu_item,
            action=action
        )

        return {
            "has_access": has_access,
            "user_id": user_id,
            "menu_item": menu_item,
            "action": action
        }

    except Exception as e:
        logger.error(f"Error in simplified menu access validation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "validation_error",
                "message": "Failed to validate menu access",
                "details": str(e)
            }
        )

@router.get(
    "/available-resources",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Get Available Resources",
    description="Get list of all available resources and actions for permission validation."
)
@rate_limit_api
async def get_available_resources(
    current_user: dict = Depends(get_current_user_token)
):
    """
    Get list of available resources and actions.

    Returns:
        Dict containing available resources and actions
    """
    try:
        from app.tools.endpoint_resource_mapping import get_all_resources, get_all_actions

        resources = get_all_resources()
        actions = get_all_actions()

        return {
            "resources": resources,
            "actions": actions,
            "total_resources": len(resources),
            "total_actions": len(actions)
        }

    except Exception as e:
        logger.error(f"Error getting available resources: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "system_error",
                "message": "Failed to retrieve available resources",
                "details": str(e)
            }
        )
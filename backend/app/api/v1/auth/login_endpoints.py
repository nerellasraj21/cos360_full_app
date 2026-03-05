from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.orm import Session
from app.db.tenant_session import get_tenant_db
from app.schemas.auth.login_schema import (
    LoginRequest,
    LoginResponse,
    LegacyLoginResponse,
    LoginErrorResponse,
    RefreshTokenRequest,
    RefreshTokenResponse,
    LogoutRequest,
    LogoutResponse,
    LogoutErrorResponse,
    LogoutInstructions,
    PasswordChangeRequiredResponse,
    SetPasswordRequest,
    SetPasswordResponse,
    AcademicYearOption,
)
from app.service.auth.token_blacklist_service import TokenBlacklistService
from app.service.auth.auth_service import login_user
from app.service.auth.multi_tenant_auth_service import MultiTenantAuthService
from app.tools.jwt_utils import verify_refresh_token, verify_access_token, create_access_token, create_refresh_token
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Union, List
import logging

logger = logging.getLogger("login_endpoints")

router = APIRouter(prefix="/auth", tags=["Auth/Login"])


@router.get("/academic-years", response_model=List[AcademicYearOption])
async def list_academic_years(db: AsyncSession = Depends(get_tenant_db)):
    """Return available academic years for the login screen (public, no auth required)."""
    from sqlalchemy import select
    from app.models.masters.academic_year_model import AcademicYear
    result = await db.execute(select(AcademicYear).order_by(AcademicYear.start_date.desc()))
    years = result.scalars().all()
    return [{"id": y.id, "title": y.title, "is_active": y.is_active} for y in years]


@router.post("/login",
             response_model=Union[LoginResponse, PasswordChangeRequiredResponse, LegacyLoginResponse],
             responses={
                 401: {"model": LoginErrorResponse, "description": "Invalid connection or credentials"},
                 500: {"model": LoginErrorResponse, "description": "Server error"}
             })
async def login(request: LoginRequest, fastapi_request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """
    Multi-tenant login endpoint.

    Normal login → returns full LoginResponse (user, role, menu, tokens).
    First-time staff login → returns PasswordChangeRequiredResponse with a
    short-lived change_password_token. Call POST /auth/staff/set-password to
    complete the flow and receive full credentials.
    """
    try:
        logger.info(f"DEBUG LOGIN 1: Login request for user: {request.username}")

        # Determine if this is a multi-tenant request
        client_name_from_request = getattr(fastapi_request.state, 'client_name', None)
        client_name_from_body = request.client_name

        logger.info(f"DEBUG LOGIN 2: client_name_from_request: {client_name_from_request}")
        logger.info(f"DEBUG LOGIN 3: client_name_from_body: {client_name_from_body}")

        is_multi_tenant_request = bool(client_name_from_request or client_name_from_body)

        if is_multi_tenant_request:
            try:
                login_result = await MultiTenantAuthService.login_user(
                    fastapi_request,
                    request.username,
                    request.password,
                    client_name_from_body,
                    academic_year_id=request.academic_year_id,
                )
                # First-time staff login — return the password-change challenge
                if login_result.get("requires_password_change"):
                    return PasswordChangeRequiredResponse(**login_result)
                return LoginResponse(**login_result)

            except HTTPException as e:
                logger.warning(f"Multi-tenant login failed: {e.detail}")
                raise e

        else:
            # Legacy login flow for backward compatibility
            logger.info("Using legacy login flow for backward compatibility")
            try:
                access_token = await login_user(db, request.username, request.password)
                return LegacyLoginResponse(access_token=access_token)

            except HTTPException as e:
                logger.warning(f"Legacy login failed: {e.detail}")
                if "Invalid username or password" in str(e.detail):
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid Credentials",
                    )
                raise e

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during login: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service unavailable",
        )


@router.post(
    "/staff/set-password",
    response_model=SetPasswordResponse,
    responses={
        401: {"model": LoginErrorResponse, "description": "Invalid or expired change-password token"},
        400: {"model": LoginErrorResponse, "description": "Passwords do not match"},
        500: {"model": LoginErrorResponse, "description": "Server error"},
    },
)
async def set_password_first_login(body: SetPasswordRequest, fastapi_request: Request):
    """
    Complete the first-time staff login flow by setting a new password.

    Steps:
    1. Call POST /auth/login with email/phone + temp password (Welcome@123).
    2. Receive `change_password_token` in the response.
    3. Call this endpoint with that token + your new password.
    4. Receive full login credentials — you are now fully authenticated.
    """
    if body.new_password != body.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match",
        )
    try:
        result = await MultiTenantAuthService.set_password_first_login(
            fastapi_request,
            body.change_password_token,
            body.new_password,
        )
        return SetPasswordResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in set_password_first_login: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password update service unavailable",
        )

@router.post("/refresh",
             response_model=RefreshTokenResponse,
             responses={
                 401: {"model": LoginErrorResponse, "description": "Invalid refresh token"},
                 500: {"model": LoginErrorResponse, "description": "Server error"}
             })
async def refresh_token(request: RefreshTokenRequest, fastapi_request: Request):
    """
    Refresh access token using a valid refresh token.

    Returns new access_token and refresh_token pair.
    Both tokens will have updated expiry times.
    """
    try:
        # Verify the refresh token
        payload = verify_refresh_token(request.refresh_token)

        # Reject if this refresh token was already blacklisted (i.e. user logged out)
        if await TokenBlacklistService.is_blacklisted(request.refresh_token):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has been invalidated. Please login again.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Validate tenant if present
        client_name = payload.get("client_name")
        if client_name and client_name != "default":
            # Validate tenant is still active
            is_valid_tenant = await MultiTenantAuthService.validate_tenant(client_name)
            if not is_valid_tenant:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid connection"
                )

        # Create new token data (excluding exp and token_type)
        new_token_data = {
            "sub": payload.get("sub"),
            "username": payload.get("username"),
            "role": payload.get("role"),
            "client_name": payload.get("client_name"),
            "academic_year_id": payload.get("academic_year_id"),
            "academic_year_title": payload.get("academic_year_title"),
        }

        # Generate new access token and refresh token
        new_access_token = create_access_token(new_token_data)
        new_refresh_token = create_refresh_token(new_token_data)

        logger.info(f"Token refreshed successfully for user: {payload.get('username')}")

        return RefreshTokenResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            token_type="bearer"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during token refresh: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh service unavailable"
        )

@router.post("/logout",
             response_model=LogoutResponse,
             responses={
                 401: {"model": LogoutErrorResponse, "description": "Invalid or expired token"},
                 500: {"model": LogoutErrorResponse, "description": "Server error"}
             })
async def logout(request: Request, body: LogoutRequest = None):
    """
    Server-side logout endpoint.

    Blacklists the access token (and optionally the refresh token when provided
    in the request body) so they cannot be used again even before natural expiry.
    """
    try:
        # Extract access token from Authorization header
        authorization = request.headers.get("Authorization")
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authorization header missing or invalid",
                headers={"WWW-Authenticate": "Bearer"},
            )

        access_token = authorization.split(" ")[1]

        # Verify the access token (raises 401 if invalid/expired)
        payload = verify_access_token(access_token)

        username    = payload.get("username", "unknown")
        client_name = payload.get("client_name", "unknown")

        # Blacklist the access token
        await TokenBlacklistService.blacklist_token(access_token, payload)
        logger.info(f"User logout: {username} from tenant: {client_name} — access token blacklisted")

        # Blacklist the refresh token too if the client sent it
        if body and body.refresh_token:
            try:
                refresh_payload = verify_refresh_token(body.refresh_token)
                await TokenBlacklistService.blacklist_token(body.refresh_token, refresh_payload)
                logger.info(f"Refresh token also blacklisted for user: {username}")
            except HTTPException:
                # Invalid refresh token — ignore, access token is already revoked
                logger.warning(f"Could not blacklist refresh token for user: {username} (invalid token)")

        return LogoutResponse(
            message="Logout successful",
            instructions=LogoutInstructions(
                clear_tokens=True,
                clear_menu=True,
                redirect_to="/login",
            ),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during logout: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout service unavailable"
        )

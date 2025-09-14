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
    LogoutResponse,
    LogoutErrorResponse,
    LogoutInstructions
)
from app.service.auth.auth_service import login_user
from app.service.auth.multi_tenant_auth_service import MultiTenantAuthService
from app.tools.jwt_utils import verify_refresh_token, verify_access_token, create_access_token, create_refresh_token
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Union
import logging

logger = logging.getLogger("login_endpoints")

router = APIRouter(prefix="/auth", tags=["Auth/Login"])

@router.post("/login",
             response_model=Union[LoginResponse, LegacyLoginResponse],
             responses={
                 401: {"model": LoginErrorResponse, "description": "Invalid connection or credentials"},
                 500: {"model": LoginErrorResponse, "description": "Server error"}
             })
async def login(request: LoginRequest, fastapi_request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """
    Multi-tenant login endpoint supporting:
    1. Client detection from cschema header or subdomain
    2. Backward compatibility with legacy clients
    3. Complete user profile with hierarchical menus
    4. Access token (24 hours) and refresh token (7 days)
    
    For new multi-tenant clients, returns user, role, menu, and tokens.
    For legacy clients (without client_name), returns only access_token for backward compatibility.
    """
    try:
        logger.info(f"DEBUG LOGIN 1: Login request for user: {request.username}")

        # Determine if this is a multi-tenant request
        client_name_from_request = getattr(fastapi_request.state, 'client_name', None)
        client_name_from_body = request.client_name

        logger.info(f"DEBUG LOGIN 2: client_name_from_request: {client_name_from_request}")
        logger.info(f"DEBUG LOGIN 3: client_name_from_body: {client_name_from_body}")
        
        # Check if this is a multi-tenant request
        is_multi_tenant_request = bool(client_name_from_request or client_name_from_body)
        
        if is_multi_tenant_request:
            # Multi-tenant login flow
            try:
                login_result = await MultiTenantAuthService.login_user(
                    fastapi_request, 
                    request.username, 
                    request.password,
                    client_name_from_body
                )
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
                # Convert legacy error to new format
                if "Invalid username or password" in str(e.detail):
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid Credentials"
                    )
                raise e
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during login: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service unavailable"
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
            "client_name": payload.get("client_name")
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
async def logout(request: Request):
    """
    Simple client-side logout endpoint.
    
    Validates the access token and instructs the client to clear tokens and redirect.
    The token remains valid until natural expiry, but client should clear it immediately.
    """
    try:
        # Extract token from Authorization header
        authorization = request.headers.get("Authorization")
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authorization header missing or invalid",
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        token = authorization.split(" ")[1]
        
        # Verify the access token (this will raise HTTPException if invalid)
        payload = verify_access_token(token)
        
        username = payload.get("username", "unknown")
        client_name = payload.get("client_name", "unknown")
        
        logger.info(f"User logout: {username} from tenant: {client_name}")
        
        # Return success response with client instructions
        return LogoutResponse(
            message="Logout successful",
            instructions=LogoutInstructions(
                clear_tokens=True,
                clear_menu=True,
                redirect_to="/login"
            )
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions (like invalid token)
        raise
    except Exception as e:
        logger.error(f"Unexpected error during logout: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout service unavailable"
        )

from uuid import UUID

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse

from app.db.session import get_public_db
from app.schemas.public.super_admin_schema import (
    SuperAdminCreate,
    SuperAdminLogin,
    SuperAdminPasswordChange,
    SuperAdminRead,
    SuperAdminToken,
    SuperAdminUpdate,
    SystemHealthCheck,
)
from app.service.super_admin.super_admin_service import SuperAdminService
from app.tools.simple_permissions import get_current_super_admin, super_admin_only

router = APIRouter(prefix="/super_admin/auth", tags=["Super Admin/Authentication"])


@router.post("/login", response_model=SuperAdminToken, status_code=status.HTTP_200_OK)
async def super_admin_login(login_data: SuperAdminLogin, request: Request):
    """
    Super Admin login endpoint

    **Capabilities**:
    - Authenticates Super Admin credentials
    - Returns JWT tokens for system-wide access
    - Implements account lockout security (5 failed attempts = 30 min lock)
    - Creates audit trail for login attempts

    **Security Features**:
    - Password verification with bcrypt
    - Failed login attempt tracking
    - IP address logging for audit
    - Account lockout mechanism
    """
    # Get client IP
    client_ip = request.client.host if request.client else None

    # Authenticate and get tokens
    async with get_public_db() as db:
        super_admin, tokens = await SuperAdminService.authenticate_super_admin(
            db=db, username=login_data.username, password=login_data.password, ip_address=client_ip
        )

    return SuperAdminToken(**tokens)


@router.post("/register", response_model=SuperAdminRead, status_code=status.HTTP_201_CREATED)
@super_admin_only
async def create_super_admin(
    super_admin_data: SuperAdminCreate, request: Request, current_super_admin: dict = Depends(get_current_super_admin)
):
    """
    Create new Super Admin user (requires existing Super Admin)

    **Required**: Existing Super Admin authentication
    **Capabilities**:
    - Creates new Super Admin with system-wide permissions
    - Validates username and email uniqueness
    - Implements secure password hashing
    - Creates audit trail for user creation

    **Security**: Only existing Super Admins can create new Super Admins
    """
    async with get_public_db() as db:
        new_super_admin = await SuperAdminService.create_super_admin(db, super_admin_data)

        # Create audit log
        await SuperAdminService.create_audit_log(
            db=db,
            super_admin_id=UUID(current_super_admin["sub"]),
            action="CREATE",
            resource="super_admin",
            resource_id=str(new_super_admin.id),
            details={"username": super_admin_data.username, "email": super_admin_data.email},
            ip_address=request.client.host if request.client else None,
        )

    return new_super_admin


@router.get("/profile", response_model=SuperAdminRead)
@super_admin_only
async def get_super_admin_profile(current_super_admin: dict = Depends(get_current_super_admin)):
    """
    Get current Super Admin profile information

    **Returns**: Complete Super Admin profile with security status
    """
    super_admin_id = UUID(current_super_admin["sub"])
    async with get_public_db() as db:
        return await SuperAdminService.get_super_admin_by_id(db, super_admin_id)


@router.put("/profile", response_model=SuperAdminRead)
@super_admin_only
async def update_super_admin_profile(
    update_data: SuperAdminUpdate, request: Request, current_super_admin: dict = Depends(get_current_super_admin)
):
    """
    Update Super Admin profile information

    **Capabilities**:
    - Update email, full name, and active status
    - Validates email uniqueness
    - Creates audit trail for profile changes
    """
    super_admin_id = UUID(current_super_admin["sub"])

    async with get_public_db() as db:
        updated_super_admin = await SuperAdminService.update_super_admin(
            db=db, super_admin_id=super_admin_id, update_data=update_data, updated_by_id=super_admin_id
        )

    return updated_super_admin


@router.post("/change-password")
@super_admin_only
async def change_super_admin_password(
    password_data: SuperAdminPasswordChange,
    request: Request,
    current_super_admin: dict = Depends(get_current_super_admin),
):
    """
    Change Super Admin password

    **Security Features**:
    - Validates current password before change
    - Implements secure password hashing
    - Creates audit trail for password changes
    - Resets password change requirements
    """
    super_admin_id = UUID(current_super_admin["sub"])

    async with get_public_db() as db:
        result = await SuperAdminService.change_password(
            db=db, super_admin_id=super_admin_id, password_data=password_data
        )

    return JSONResponse(status_code=status.HTTP_200_OK, content=result)


@router.get("/health", response_model=SystemHealthCheck)
@super_admin_only
async def system_health_check(current_super_admin: dict = Depends(get_current_super_admin)):
    """
    System health check for Super Admin dashboard

    **Returns**:
    - Database connection status
    - Tenant statistics (total/active)
    - System version and uptime
    - Overall system health status
    """
    async with get_public_db() as db:
        return await SuperAdminService.get_system_health(db)

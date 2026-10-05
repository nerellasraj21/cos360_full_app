import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy import func, select, text

from app.db.tenant_session import PublicAsyncSessionLocal, TenantService
from app.models.public.tenant_model import Tenant
from app.schemas.public.super_admin_schema import SystemHealthCheck
from app.service.super_admin.super_admin_service import SuperAdminService
from app.service.tenant.provisioning_service import TenantProvisioningService
from app.tools.simple_permissions import get_current_super_admin, super_admin_only

router = APIRouter(prefix="/super_admin/system", tags=["Super Admin/System Management"])

logger = logging.getLogger("super_admin.system")


@router.get("/health", response_model=SystemHealthCheck)
@super_admin_only
async def get_system_health(current_super_admin: dict = Depends(get_current_super_admin)):
    """
    System health check for Super Admin dashboard

    **Capabilities**:
    - Database connection status
    - Tenant statistics (total/active)
    - System version and uptime
    - Overall system health status

    **Super Admin Only**: Complete system overview
    """
    async with PublicAsyncSessionLocal() as db:
        return await SuperAdminService.get_system_health(db)


@router.get("/tenants/")
@super_admin_only
async def get_all_tenants(
    request: Request,
    current_super_admin: dict = Depends(get_current_super_admin),
    is_active: bool | None = Query(None, description="Filter by active status"),
    limit: int = Query(100, description="Number of tenants to return"),
    offset: int = Query(0, description="Number of tenants to skip"),
):
    """
    Super Admin: View all tenants in the system

    **Capabilities**:
    - List all tenants with pagination
    - Filter by active status
    - View tenant creation details
    - See plan assignments

    **Returns**: Complete tenant information for system management
    """
    try:
        async with PublicAsyncSessionLocal() as db:
            # Build query with optional filters
            query = select(Tenant)

            if is_active is not None:
                query = query.where(Tenant.is_active == is_active)

            query = query.order_by(Tenant.created_at.desc())
            query = query.offset(offset).limit(limit)

            result = await db.execute(query)
            tenants = result.scalars().all()

            # Get total count for pagination
            count_query = select(func.count(Tenant.id))
            if is_active is not None:
                count_query = count_query.where(Tenant.is_active == is_active)

            count_result = await db.execute(count_query)
            total_count = count_result.scalar()

            # Log Super Admin action
            await SuperAdminService.create_audit_log(
                db=db,
                super_admin_id=UUID(current_super_admin["sub"]),
                action="LIST_TENANTS",
                resource="tenant",
                details={"filter_active": is_active, "count": len(tenants)},
                ip_address=request.client.host if request.client else None,
            )

            return {
                "tenants": [
                    {
                        "id": tenant.id,
                        "client_name": tenant.client_name,
                        "is_active": tenant.is_active,
                        "created_at": tenant.created_at,
                        "updated_at": tenant.updated_at,
                    }
                    for tenant in tenants
                ],
                "pagination": {
                    "total": total_count,
                    "limit": limit,
                    "offset": offset,
                    "has_more": (offset + limit) < total_count,
                },
            }

    except Exception as e:
        logger.error(f"Error getting tenants: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve tenants"
        )


class TenantAdminCredentials(BaseModel):
    username: str
    email: str | None = None
    password: str


@router.post("/tenants/", status_code=status.HTTP_201_CREATED)
@super_admin_only
async def create_tenant(
    request: Request,
    current_super_admin: dict = Depends(get_current_super_admin),
    client_name: str = Query(..., description="Tenant client name"),
    plan_id: UUID = Query(..., description="Plan to assign"),
    schema_name: str | None = Query(None, description="Deprecated and ignored"),
    admin: TenantAdminCredentials | None = None,
):
    """
    Super Admin: create a tenant with its default roles, permissions and menu access in one transaction.

    The optional JSON body creates the tenant's first Admin user. Nothing is created if any step fails.
    """
    result = await TenantProvisioningService.provision(
        client_name,
        plan_id,
        admin_username=admin.username if admin else None,
        admin_email=admin.email if admin else None,
        admin_password=admin.password if admin else None,
    )

    async with PublicAsyncSessionLocal() as db:
        await SuperAdminService.create_audit_log(
            db=db,
            super_admin_id=UUID(current_super_admin["sub"]),
            action="CREATE_TENANT",
            resource="tenant",
            resource_id=result["tenant_id"],
            tenant_id=result["client_name"],
            details={
                "client_name": result["client_name"],
                "plan_id": result["plan_id"],
                "roles": result["roles"],
                "permissions": result["permissions"],
                "role_menu_links": result["role_menu_links"],
                "admin_created": result["admin_user_id"] is not None,
            },
            ip_address=request.client.host if request.client else None,
        )
    return {"message": "Tenant created successfully", "tenant": result}


@router.put("/tenants/{tenant_id}/activate")
@super_admin_only
async def activate_tenant(
    tenant_id: UUID, request: Request, current_super_admin: dict = Depends(get_current_super_admin)
):
    """
    Super Admin: Activate/Deactivate tenant

    **Capabilities**:
    - Toggle tenant active status
    - Audit tenant status changes
    - System-wide tenant management
    """
    try:
        async with PublicAsyncSessionLocal() as db:
            # Get tenant
            result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
            tenant = result.scalar_one_or_none()

            if not tenant:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail=f"Tenant with ID {tenant_id} not found"
                )

            # Toggle status
            old_status = tenant.is_active
            tenant.is_active = not tenant.is_active
            tenant.updated_at = func.now()

            await db.commit()
            await TenantService.clear_cache()
            await db.refresh(tenant)

            # Log Super Admin action
            await SuperAdminService.create_audit_log(
                db=db,
                super_admin_id=UUID(current_super_admin["sub"]),
                action="TOGGLE_TENANT_STATUS",
                resource="tenant",
                resource_id=str(tenant.id),
                tenant_id=str(tenant.id),
                details={"old_status": old_status, "new_status": tenant.is_active, "client_name": tenant.client_name},
                ip_address=request.client.host if request.client else None,
            )

            return {
                "message": f"Tenant {'activated' if tenant.is_active else 'deactivated'} successfully",
                "tenant": {
                    "id": tenant.id,
                    "client_name": tenant.client_name,
                    "is_active": tenant.is_active,
                    "updated_at": tenant.updated_at,
                },
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling tenant status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update tenant status"
        )


@router.put("/tenants/{tenant_id}/plan")
@super_admin_only
async def assign_plan_to_tenant(
    tenant_id: UUID,
    request: Request,
    current_super_admin: dict = Depends(get_current_super_admin),
    plan_id: UUID = Query(..., description="Plan ID to assign to tenant"),
):
    """
    Super Admin: change a tenant's plan.

    Adds the roles' permissions and menu access the new plan grants and removes what it no longer allows,
    in one transaction. Existing roles, users and other tenant data are untouched.
    """
    result = await TenantProvisioningService.change_plan(tenant_id, plan_id)
    await TenantService.clear_cache()

    async with PublicAsyncSessionLocal() as db:
        await SuperAdminService.create_audit_log(
            db=db,
            super_admin_id=UUID(current_super_admin["sub"]),
            action="ASSIGN_TENANT_PLAN",
            resource="tenant",
            resource_id=str(tenant_id),
            tenant_id=str(tenant_id),
            details=result,
            ip_address=request.client.host if request.client else None,
        )
    return {"message": "Plan assigned and permissions synchronized", **result}


@router.get("/usage-stats")
@super_admin_only
async def get_usage_statistics(request: Request, current_super_admin: dict = Depends(get_current_super_admin)):
    """
    Super Admin: Usage statistics across all tenants

    **Capabilities**:
    - System-wide usage metrics
    - Tenant activity statistics
    - Resource utilization data
    - Performance insights
    """
    try:
        async with PublicAsyncSessionLocal() as db:
            # Get basic tenant statistics
            tenant_stats = await db.execute(text("""
                SELECT 
                    COUNT(*) as total_tenants,
                    COUNT(*) FILTER (WHERE is_active = true) as active_tenants,
                    COUNT(*) FILTER (WHERE is_active = false) as inactive_tenants
                FROM public.tenants
            """))
            tenant_data = tenant_stats.fetchone()

            # Get Super Admin activity
            admin_stats = await db.execute(text("""
                SELECT 
                    COUNT(DISTINCT super_admin_id) as total_super_admins,
                    COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '24 hours') as actions_24h,
                    COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '7 days') as actions_7d
                FROM public.super_admin_audit
            """))
            admin_data = admin_stats.fetchone()

            # Log Super Admin action
            await SuperAdminService.create_audit_log(
                db=db,
                super_admin_id=UUID(current_super_admin["sub"]),
                action="VIEW_USAGE_STATS",
                resource="system",
                details={"requested_stats": "usage_overview"},
                ip_address=request.client.host if request.client else None,
            )

            return {
                "system_overview": {
                    "total_tenants": tenant_data[0],
                    "active_tenants": tenant_data[1],
                    "inactive_tenants": tenant_data[2],
                },
                "super_admin_activity": {
                    "total_super_admins": admin_data[0],
                    "actions_last_24h": admin_data[1],
                    "actions_last_7d": admin_data[2],
                },
                "generated_at": func.now(),
                "generated_by": current_super_admin["username"],
            }

    except Exception as e:
        logger.error(f"Error getting usage statistics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve usage statistics"
        )

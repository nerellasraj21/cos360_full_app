import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select, text

from app.db.session import get_public_db
from app.models.public.menu_model import Menu as PublicMenu
from app.models.public.plan_menu_model import PlanMenuAccess
from app.models.public.plan_model import Plan
from app.models.public.tenant_model import Tenant
from app.schemas.public.super_admin_schema import SystemHealthCheck
from app.service.super_admin.super_admin_service import SuperAdminService
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
    async with get_public_db() as db:
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
        async with get_public_db() as db:
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
                        "schema_name": tenant.schema_name,
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
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to retrieve tenants: {str(e)}"
        )


@router.post("/tenants/", status_code=status.HTTP_201_CREATED)
@super_admin_only
async def create_tenant(
    request: Request,
    current_super_admin: dict = Depends(get_current_super_admin),
    client_name: str = Query(..., description="Tenant client name"),
    schema_name: str = Query(..., description="Database schema name"),
    plan_id: UUID | None = Query(None, description="Optional plan to assign immediately"),
):
    """
    Super Admin: Create new tenant + initialize schema

    **Capabilities**:
    - Create entry in public.tenants table
    - Create new database schema
    - Setup default roles and permissions
    - Initialize tenant with basic data

    **Process**:
    1. Create tenant record
    2. Create database schema
    3. Run migrations on new schema
    4. Setup default tenant admin user

    **Super Admin Only**: System-wide tenant management
    """
    try:
        async with get_public_db() as db:
            # Check if tenant already exists
            existing_tenant = await db.execute(
                select(Tenant).where((Tenant.client_name == client_name) | (Tenant.schema_name == schema_name))
            )
            if existing_tenant.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Tenant with this client_name or schema_name already exists",
                )

            # Validate plan if provided
            plan = None
            if plan_id:
                plan_result = await db.execute(select(Plan).where(Plan.id == plan_id))
                plan = plan_result.scalar_one_or_none()
                if not plan:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND, detail=f"Plan with ID {plan_id} not found"
                    )

            # Create tenant record
            new_tenant = Tenant(client_name=client_name, schema_name=schema_name, plan_id=plan_id, is_active=True)

            db.add(new_tenant)
            await db.flush()  # Get ID before commit

            # Create database schema
            await db.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"'))

            # Set search path and create basic tables (simplified for now)
            await db.execute(text(f'SET search_path TO "{schema_name}", public'))

            # Create basic roles table for new tenant
            await db.execute(text(f"""
                CREATE TABLE IF NOT EXISTS "{schema_name}".roles (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name VARCHAR(50) UNIQUE NOT NULL,
                    description VARCHAR(255),
                    is_active BOOLEAN DEFAULT true,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
            """))

            # Insert default Admin role
            await db.execute(text(f"""
                INSERT INTO "{schema_name}".roles (name, description)
                VALUES ('Admin', 'Tenant Administrator')
                ON CONFLICT (name) DO NOTHING;
            """))

            # Auto-populate menus if plan is assigned
            menus_synced = 0
            if plan_id:
                # Get plan's allowed menus
                menu_access_result = await db.execute(
                    select(PlanMenuAccess.menu_id).where(PlanMenuAccess.plan_id == plan_id, PlanMenuAccess.is_active)
                )
                allowed_menu_ids = [row.menu_id for row in menu_access_result.fetchall()]

                if allowed_menu_ids:
                    # Get public menus for the allowed menu IDs
                    public_menus_result = await db.execute(
                        select(PublicMenu)
                        .where(PublicMenu.id.in_(allowed_menu_ids))
                        .order_by(PublicMenu.level, PublicMenu.id)
                    )
                    public_menus = public_menus_result.fetchall()

                    # Create menus table in tenant schema
                    await db.execute(text(f"""
                        CREATE TABLE IF NOT EXISTS "{schema_name}".menus (
                            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                            name VARCHAR(50) NOT NULL,
                            url VARCHAR(100),
                            level VARCHAR(2) NOT NULL,
                            parent_id UUID REFERENCES "{schema_name}".menus(id),
                            display_order INTEGER NOT NULL DEFAULT 0,
                            created_at TIMESTAMP DEFAULT NOW(),
                            updated_at TIMESTAMP DEFAULT NOW()
                        );
                    """))

                    # Insert menus from plan
                    for menu in public_menus:
                        await db.execute(
                            text(f"""
                            INSERT INTO "{schema_name}".menus (id, name, url, level, display_order)
                            VALUES (gen_random_uuid(), :name, :url, :level, :display_order)
                        """),
                            {"name": menu.name, "url": menu.url, "level": menu.level, "display_order": menus_synced},
                        )
                        menus_synced += 1

            await db.commit()
            await db.refresh(new_tenant)

            # Log Super Admin action
            await SuperAdminService.create_audit_log(
                db=db,
                super_admin_id=UUID(current_super_admin["sub"]),
                action="CREATE_TENANT",
                resource="tenant",
                resource_id=str(new_tenant.id),
                tenant_id=schema_name,
                details={
                    "client_name": client_name,
                    "schema_name": schema_name,
                    "plan_id": plan_id,
                    "plan_name": plan.name if plan else None,
                    "menus_synced": menus_synced,
                },
                ip_address=request.client.host if request.client else None,
            )

            response = {
                "message": f"Tenant created successfully{' with plan assignment' if plan else ''}",
                "tenant": {
                    "id": new_tenant.id,
                    "client_name": new_tenant.client_name,
                    "schema_name": new_tenant.schema_name,
                    "plan_id": new_tenant.plan_id,
                    "is_active": new_tenant.is_active,
                    "created_at": new_tenant.created_at,
                },
            }

            if plan:
                response["plan"] = {"id": plan.id, "name": plan.name, "description": plan.description}
                response["menus_synced"] = menus_synced
                response["next_steps"] = [
                    "1. Run full migrations on the new schema",
                    "2. Create tenant admin user",
                    "3. Tenant admin can assign role permissions to synced menus",
                    "4. Users will only see menus allowed by their plan",
                ]
            else:
                response["next_steps"] = [
                    "1. Run full migrations on the new schema",
                    "2. Create tenant admin user",
                    "3. Assign plan to populate menus",
                    "4. Setup default permissions",
                ]

            return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating tenant: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to create tenant: {str(e)}"
        )


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
        async with get_public_db() as db:
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
            await db.refresh(tenant)

            # Log Super Admin action
            await SuperAdminService.create_audit_log(
                db=db,
                super_admin_id=UUID(current_super_admin["sub"]),
                action="TOGGLE_TENANT_STATUS",
                resource="tenant",
                resource_id=str(tenant.id),
                tenant_id=tenant.schema_name,
                details={"old_status": old_status, "new_status": tenant.is_active, "client_name": tenant.client_name},
                ip_address=request.client.host if request.client else None,
            )

            return {
                "message": f"Tenant {'activated' if tenant.is_active else 'deactivated'} successfully",
                "tenant": {
                    "id": tenant.id,
                    "client_name": tenant.client_name,
                    "schema_name": tenant.schema_name,
                    "is_active": tenant.is_active,
                    "updated_at": tenant.updated_at,
                },
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling tenant status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to update tenant status: {str(e)}"
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
    Super Admin: Assign plan to tenant + auto-populate tenant menus

    **Capabilities**:
    - Assign/change tenant's subscription plan
    - Automatically populate tenant schema with plan's allowed menus
    - Audit plan assignments with full logging
    - Setup menu structure for tenant admin to assign role permissions

    **Process**:
    1. Validate plan and tenant exist
    2. Update tenant's plan assignment
    3. Get plan's allowed menus from public schema
    4. Create/update menus in tenant schema
    5. Log Super Admin action
    """
    try:
        async with get_public_db() as db:
            # Validate tenant exists
            tenant_result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
            tenant = tenant_result.scalar_one_or_none()

            if not tenant:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail=f"Tenant with ID {tenant_id} not found"
                )

            # Validate plan exists
            plan_result = await db.execute(select(Plan).where(Plan.id == plan_id))
            plan = plan_result.scalar_one_or_none()

            if not plan:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Plan with ID {plan_id} not found")

            # Update tenant's plan
            old_plan_id = tenant.plan_id
            tenant.plan_id = plan_id
            tenant.updated_at = func.now()

            # Get plan's allowed menus
            logger.info(f"Querying plan menu access for plan_id: {plan_id}")
            menu_access_result = await db.execute(
                select(PlanMenuAccess.menu_id).where(PlanMenuAccess.plan_id == plan_id, PlanMenuAccess.is_active)
            )
            allowed_menu_ids = [row.menu_id for row in menu_access_result.fetchall()]
            logger.info(f"Found {len(allowed_menu_ids)} allowed menu IDs: {allowed_menu_ids}")

            if not allowed_menu_ids:
                logger.warning(f"No menus found for plan_id {plan_id}")
                await db.commit()
                await db.refresh(tenant)

                return {
                    "message": "Plan assigned successfully (no menus to sync)",
                    "tenant": {
                        "id": tenant.id,
                        "client_name": tenant.client_name,
                        "schema_name": tenant.schema_name,
                        "plan_id": tenant.plan_id,
                        "updated_at": tenant.updated_at,
                    },
                    "plan": {"id": plan.id, "name": plan.name, "description": plan.description},
                    "menus_synced": 0,
                }

            # Get public menus for the allowed menu IDs
            public_menus_result = await db.execute(
                select(PublicMenu).where(PublicMenu.id.in_(allowed_menu_ids)).order_by(PublicMenu.level, PublicMenu.id)
            )
            public_menus = public_menus_result.scalars().all()

            # Create/update menus in tenant schema
            menus_synced = 0
            schema_name = tenant.schema_name

            # Set search path to tenant schema
            await db.execute(text(f'SET search_path TO "{schema_name}", public'))

            # Create menus table if it doesn't exist
            await db.execute(text(f"""
                CREATE TABLE IF NOT EXISTS "{schema_name}".menus (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name VARCHAR(50) NOT NULL,
                    url VARCHAR(100),
                    level VARCHAR(2) NOT NULL,
                    parent_id UUID REFERENCES "{schema_name}".menus(id),
                    display_order INTEGER NOT NULL DEFAULT 0,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
            """))

            # Clear existing menus and recreate based on plan
            await db.execute(text(f'DELETE FROM "{schema_name}".menus'))

            # Insert menus from plan (simplified - assuming no complex hierarchy for now)
            for menu in public_menus:
                await db.execute(
                    text(f"""
                    INSERT INTO "{schema_name}".menus (id, name, url, level, display_order)
                    VALUES (gen_random_uuid(), :name, :url, :level, :display_order)
                """),
                    {"name": menu.name, "url": menu.url, "level": menu.level, "display_order": menus_synced},
                )
                menus_synced += 1

            # Create role_menu_permissions table if it doesn't exist
            await db.execute(text(f"""
                CREATE TABLE IF NOT EXISTS "{schema_name}".role_menu_permissions (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    role_id UUID REFERENCES "{schema_name}".roles(id) NOT NULL,
                    menu_id UUID REFERENCES "{schema_name}".menus(id) NOT NULL,
                    can_view BOOLEAN DEFAULT true,
                    can_edit BOOLEAN DEFAULT false,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
            """))

            # Clear existing role menu permissions for Admin role
            await db.execute(text(f"""
                DELETE FROM "{schema_name}".role_menu_permissions
                WHERE role_id = (
                    SELECT id FROM "{schema_name}".roles WHERE name = 'Admin'
                )
            """))

            # Get Admin role ID
            admin_role_result = await db.execute(text(f"""
                SELECT id FROM "{schema_name}".roles WHERE name = 'Admin'
            """))
            admin_role_id = admin_role_result.scalar_one_or_none()

            # Create role_menu_permissions for Admin role (full access to all synced menus)
            permissions_created = 0
            if admin_role_id:
                menu_ids_result = await db.execute(text(f"""
                    SELECT id FROM "{schema_name}".menus
                """))
                menu_ids = [row.id for row in menu_ids_result.fetchall()]

                for menu_id in menu_ids:
                    await db.execute(
                        text(f"""
                        INSERT INTO "{schema_name}".role_menu_permissions
                        (id, role_id, menu_id, can_view, can_edit)
                        VALUES (gen_random_uuid(), :role_id, :menu_id, true, true)
                    """),
                        {"role_id": admin_role_id, "menu_id": menu_id},
                    )
                    permissions_created += 1

            await db.commit()
            await db.refresh(tenant)

            # Log Super Admin action
            await SuperAdminService.create_audit_log(
                db=db,
                super_admin_id=UUID(current_super_admin["sub"]),
                action="ASSIGN_TENANT_PLAN",
                resource="tenant",
                resource_id=str(tenant.id),
                tenant_id=tenant.schema_name,
                details={
                    "old_plan_id": old_plan_id,
                    "new_plan_id": plan_id,
                    "plan_name": plan.name,
                    "menus_synced": menus_synced,
                    "permissions_created": permissions_created,
                    "allowed_menu_ids": allowed_menu_ids,
                },
                ip_address=request.client.host if request.client else None,
            )

            return {
                "message": "Plan assigned and menus synchronized successfully",
                "tenant": {
                    "id": tenant.id,
                    "client_name": tenant.client_name,
                    "schema_name": tenant.schema_name,
                    "plan_id": tenant.plan_id,
                    "updated_at": tenant.updated_at,
                },
                "plan": {"id": plan.id, "name": plan.name, "description": plan.description},
                "menus_synced": menus_synced,
                "permissions_created": permissions_created,
                "next_steps": [
                    "1. Admin role now has full access to all synced menus",
                    "2. Users will only see menus allowed by their plan and role",
                    "3. Tenant authentication should now work with complete menu structure",
                ],
            }

    except HTTPException:
        raise
    except Exception as e:
        import traceback

        logger.error(f"Error assigning plan to tenant: {type(e).__name__}: {str(e)}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to assign plan to tenant: {type(e).__name__}: {str(e)}",
        )


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
        async with get_public_db() as db:
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
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to retrieve usage statistics: {str(e)}"
        )

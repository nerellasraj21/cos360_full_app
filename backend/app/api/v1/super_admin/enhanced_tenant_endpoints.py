"""
Enhanced Tenant Creation Endpoints for COS360
Uses cos360_master schema as source of truth for tenant creation
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select, func
from sqlalchemy.orm import selectinload
from typing import List, Optional, Dict, Any
from uuid import UUID
import logging

from app.db.session import get_public_db
from app.models.public.tenant_model import Tenant
from app.models.public.plan_model import Plan
from app.service.super_admin.super_admin_service import SuperAdminService
from app.service.schema.enhanced_tenant_schema_service import EnhancedTenantSchemaService
from app.service.schema.master_schema_service import MasterSchemaService
from app.tools.simple_permissions import get_current_super_admin, super_admin_only

router = APIRouter(prefix="/super_admin/tenants", tags=["Super Admin/Enhanced Tenant Management"])
logger = logging.getLogger(__name__)

@router.post("/enhanced", status_code=status.HTTP_201_CREATED)
@super_admin_only
async def create_enhanced_tenant(
    request: Request,
    current_super_admin: dict = Depends(get_current_super_admin),
    client_name: str = Query(..., description="Tenant client name"),
    schema_name: str = Query(..., description="Database schema name"),
    plan_id: Optional[UUID] = Query(None, description="Plan to assign to tenant"),
    validate_complete: bool = Query(True, description="Run complete validation after creation"),
    create_admin_user: bool = Query(False, description="Create initial admin user (requires additional params)")
):
    """
    Enhanced Tenant Creation using cos360_master as source of truth

    **Enhanced Features**:
    - Uses cos360_master schema for complete 55+ table setup
    - Fast schema cloning (no migration runtime)
    - Comprehensive validation
    - Production-ready tenant initialization
    - Audit logging for all operations

    **Process**:
    1. Create tenant record in public.tenants
    2. Clone complete schema from cos360_master
    3. Set migration version alignment
    4. Seed essential tenant data (roles, etc.)
    5. Validate complete setup
    6. Create audit trail

    **Super Admin Only**: Ultimate tenant management capabilities
    """
    try:
        async with get_public_db() as db:
            logger.info(f"Starting enhanced tenant creation: {client_name} ({schema_name})")

            # Step 1: Pre-validation checks
            # Check if tenant already exists
            existing_tenant = await db.execute(
                select(Tenant).where(
                    (Tenant.client_name == client_name) | (Tenant.schema_name == schema_name)
                )
            )
            if existing_tenant.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Tenant with this client_name or schema_name already exists"
                )

            # Validate plan if provided
            plan = None
            if plan_id:
                plan_result = await db.execute(
                    select(Plan).where(Plan.id == plan_id)
                )
                plan = plan_result.scalar_one_or_none()
                if not plan:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Plan with ID {plan_id} not found"
                    )

            # Verify master schema is ready
            master_info = await MasterSchemaService.get_master_schema_info(db)
            if not master_info.get('ready_for_tenant_creation', False):
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Master schema not ready for tenant creation. Tables: {master_info.get('table_count', 0)}"
                )

            # Step 2: Create tenant record
            new_tenant = Tenant(
                client_name=client_name,
                schema_name=schema_name,
                plan_id=plan_id,
                is_active=True
            )

            db.add(new_tenant)
            await db.flush()  # Get ID before continuing

            logger.info(f"Tenant record created: {new_tenant.id}")

            # Step 3: Create enhanced schema from master
            schema_result = await EnhancedTenantSchemaService.create_tenant_schema_from_master(
                db=db,
                schema_name=schema_name,
                tenant_id=new_tenant.id,
                plan_id=plan_id or UUID('00000000-0000-0000-0000-000000000000'),
                validate_complete=validate_complete
            )

            if not schema_result["success"]:
                # Rollback tenant creation if schema creation failed
                await db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Enhanced tenant schema creation failed: {schema_result.get('error', 'Unknown error')}"
                )

            await db.commit()
            await db.refresh(new_tenant)

            logger.info(f"Enhanced tenant creation completed: {schema_name}")

            # Step 4: Create comprehensive audit log
            await SuperAdminService.create_audit_log(
                db=db,
                super_admin_id=UUID(current_super_admin["sub"]),
                action="CREATE_ENHANCED_TENANT",
                resource="enhanced_tenant",
                resource_id=str(new_tenant.id),
                tenant_id=schema_name,
                details={
                    "client_name": client_name,
                    "schema_name": schema_name,
                    "plan_id": plan_id,
                    "plan_name": plan.name if plan else None,
                    "method": "master_schema_cloning",
                    "tables_created": schema_result["tables_created"],
                    "phases_completed": schema_result["phases_completed"],
                    "validation_passed": schema_result["validation_passed"],
                    "migration_version_set": schema_result["migration_version_set"],
                    "performance": schema_result.get("performance", {}),
                    "warnings": schema_result.get("warnings", [])
                },
                ip_address=request.client.host if request.client else None
            )

            # Step 5: Build comprehensive response
            response = {
                "message": "Enhanced tenant created successfully using master schema",
                "method": "master_schema_cloning",
                "tenant": {
                    "id": new_tenant.id,
                    "client_name": new_tenant.client_name,
                    "schema_name": new_tenant.schema_name,
                    "plan_id": new_tenant.plan_id,
                    "is_active": new_tenant.is_active,
                    "created_at": new_tenant.created_at
                },
                "schema_creation": {
                    "success": schema_result["success"],
                    "tables_created": schema_result["tables_created"],
                    "constraints_applied": schema_result.get("constraints_applied", 0),
                    "phases_completed": schema_result["phases_completed"],
                    "migration_version_set": schema_result["migration_version_set"],
                    "validation_passed": schema_result["validation_passed"],
                    "data_seeded": schema_result.get("data_seeded", False)
                }
            }

            if plan:
                response["plan"] = {
                    "id": plan.id,
                    "name": plan.name,
                    "description": plan.description
                }

            if schema_result.get("warnings"):
                response["warnings"] = schema_result["warnings"]

            # Production readiness indicators
            response["production_ready"] = (
                schema_result["tables_created"] >= 30 and
                schema_result["validation_passed"] and
                schema_result["migration_version_set"]
            )

            response["next_steps"] = [
                "1. Tenant schema is production-ready with complete table structure",
                "2. Create tenant admin user via auth endpoints",
                "3. Configure plan-specific permissions and menus",
                "4. Tenant can begin normal operations"
            ]

            return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in enhanced tenant creation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Enhanced tenant creation failed: {str(e)}"
        )

@router.get("/enhanced/{tenant_id}/status")
@super_admin_only
async def get_enhanced_tenant_status(
    tenant_id: UUID,
    current_super_admin: dict = Depends(get_current_super_admin)
):
    """
    Get comprehensive status of enhanced tenant

    **Capabilities**:
    - Tenant record status
    - Schema table count and structure
    - Migration version alignment
    - Production readiness assessment
    - Performance metrics
    """
    try:
        async with get_public_db() as db:
            # Get tenant record
            tenant_result = await db.execute(
                select(Tenant).where(Tenant.id == tenant_id)
            )
            tenant = tenant_result.scalar_one_or_none()

            if not tenant:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Tenant with ID {tenant_id} not found"
                )

            # Get schema status
            schema_name = tenant.schema_name

            # Check schema exists
            schema_exists = await db.fetchval(text("""
                SELECT EXISTS(
                    SELECT 1 FROM information_schema.schemata
                    WHERE schema_name = :schema_name
                )
            """), {"schema_name": schema_name})

            tenant_status = {
                "tenant": {
                    "id": tenant.id,
                    "client_name": tenant.client_name,
                    "schema_name": tenant.schema_name,
                    "plan_id": tenant.plan_id,
                    "is_active": tenant.is_active,
                    "created_at": tenant.created_at
                },
                "schema": {
                    "exists": schema_exists,
                    "name": schema_name
                }
            }

            if schema_exists:
                # Get detailed schema information
                table_count = await db.fetchval(text("""
                    SELECT COUNT(*)
                    FROM information_schema.tables
                    WHERE table_schema = :schema_name
                      AND table_type = 'BASE TABLE'
                """), {"schema_name": schema_name})

                # Check migration version
                migration_version = None
                try:
                    migration_version = await db.fetchval(text(f"""
                        SELECT version_num FROM "{schema_name}".alembic_version LIMIT 1
                    """))
                except:
                    pass

                # Get master schema version for comparison
                master_version = None
                try:
                    master_version = await db.fetchval(text("""
                        SELECT version_num FROM cos360_master.alembic_version LIMIT 1
                    """))
                except:
                    pass

                tenant_status["schema"].update({
                    "table_count": table_count,
                    "migration_version": migration_version,
                    "master_version": master_version,
                    "versions_aligned": migration_version == master_version,
                    "production_ready": (
                        table_count >= 30 and
                        migration_version is not None and
                        migration_version == master_version
                    )
                })

                # Check for essential tables
                essential_tables = ['users', 'roles', 'menus', 'classes', 'students']
                missing_tables = []
                for table in essential_tables:
                    table_exists = await db.fetchval(text("""
                        SELECT EXISTS(
                            SELECT 1 FROM information_schema.tables
                            WHERE table_schema = :schema_name
                              AND table_name = :table_name
                        )
                    """), {"schema_name": schema_name, "table_name": table})

                    if not table_exists:
                        missing_tables.append(table)

                tenant_status["schema"]["missing_essential_tables"] = missing_tables
                tenant_status["schema"]["structure_complete"] = len(missing_tables) == 0

            return tenant_status

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting enhanced tenant status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get tenant status: {str(e)}"
        )

@router.delete("/enhanced/{tenant_id}/rollback")
@super_admin_only
async def rollback_enhanced_tenant(
    tenant_id: UUID,
    request: Request,
    current_super_admin: dict = Depends(get_current_super_admin),
    confirm: bool = Query(False, description="Must be true to confirm rollback")
):
    """
    Emergency rollback of enhanced tenant creation

    **DESTRUCTIVE OPERATION**:
    - Removes tenant schema completely
    - Removes tenant record from public.tenants
    - Cannot be undone
    - Use only if tenant creation failed or needs complete reset

    **Super Admin Only**: System-wide tenant management
    """
    if not confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must set confirm=true to proceed with tenant rollback"
        )

    try:
        async with get_public_db() as db:
            # Get tenant record
            tenant_result = await db.execute(
                select(Tenant).where(Tenant.id == tenant_id)
            )
            tenant = tenant_result.scalar_one_or_none()

            if not tenant:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Tenant with ID {tenant_id} not found"
                )

            schema_name = tenant.schema_name

            # Rollback schema
            schema_rollback = await EnhancedTenantSchemaService.rollback_tenant_schema(
                db, schema_name
            )

            # Remove tenant record
            await db.execute(text("""
                DELETE FROM public.tenants WHERE id = :tenant_id
            """), {"tenant_id": tenant_id})

            await db.commit()

            # Create audit log
            await SuperAdminService.create_audit_log(
                db=db,
                super_admin_id=UUID(current_super_admin["sub"]),
                action="ROLLBACK_ENHANCED_TENANT",
                resource="enhanced_tenant",
                resource_id=str(tenant_id),
                tenant_id=schema_name,
                details={
                    "client_name": tenant.client_name,
                    "schema_name": schema_name,
                    "schema_rollback": schema_rollback,
                    "tenant_record_removed": True
                },
                ip_address=request.client.host if request.client else None
            )

            return {
                "message": "Enhanced tenant rollback completed",
                "tenant_id": tenant_id,
                "schema_name": schema_name,
                "schema_rollback": schema_rollback,
                "tenant_record_removed": True
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rolling back enhanced tenant: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Enhanced tenant rollback failed: {str(e)}"
        )
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select, func, and_
from typing import List, Optional, Dict
from uuid import UUID
import logging
import json

from app.db.session import get_public_db
from app.tools.simple_permissions import get_current_super_admin
from app.service.super_admin.super_admin_service import SuperAdminService

router = APIRouter(prefix="/super_admin/plans", tags=["Super Admin/Plan Management"])

logger = logging.getLogger("super_admin.plans")

@router.get("/")
async def get_all_plans(
    request: Request,
    current_super_admin: dict = Depends(get_current_super_admin),
    include_resources: bool = Query(False, description="Include plan resource permissions")
):
    """
    Super Admin: View all subscription plans
    
    **Capabilities**:
    - List all available plans
    - View plan resource permissions
    - See plan usage statistics
    - System-wide plan management
    
    **Returns**: Complete plan information with optional resource details
    """
    try:
        async with get_public_db() as db:
            # Get all plans
            plans_result = await db.execute(text("""
                SELECT id, name, description, is_active 
                FROM public.plans 
                ORDER BY id
            """))
            plans = plans_result.fetchall()
            
            plan_data = []
            for plan in plans:
                plan_info = {
                    "id": plan[0],
                    "name": plan[1],
                    "description": plan[2],
                    "is_active": plan[3]
                }
                
                if include_resources:
                    # Get resources for this plan
                    resources_result = await db.execute(text("""
                        SELECT resource_name, actions 
                        FROM public.plan_resource_access 
                        WHERE plan_id = :plan_id
                        ORDER BY resource_name
                    """), {"plan_id": plan[0]})
                    
                    resources = resources_result.fetchall()
                    plan_info["resources"] = [
                        {"resource": r[0], "actions": r[1]} for r in resources
                    ]
                    plan_info["total_permissions"] = len(resources)
                
                # Get tenant count using this plan
                tenant_count_result = await db.execute(text("""
                    SELECT COUNT(*) FROM public.tenants
                    WHERE plan_id = :plan_id
                """), {"plan_id": plan[0]})
                
                plan_info["tenant_count"] = tenant_count_result.scalar() or 0
                plan_data.append(plan_info)
            
            # Log Super Admin action
            await SuperAdminService.create_audit_log(
                db=db,
                super_admin_id=UUID(current_super_admin["sub"]),
                action="LIST_PLANS",
                resource="plan",
                details={
                    "include_resources": include_resources,
                    "plan_count": len(plans)
                },
                ip_address=request.client.host if request.client else None
            )
            
            return {
                "plans": plan_data,
                "total_plans": len(plans)
            }
            
    except Exception as e:
        logger.error(f"Error getting plans: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve plans: {str(e)}"
        )

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_plan(
    request: Request,
    current_super_admin: dict = Depends(get_current_super_admin),
    name: str = Query(..., description="Plan name"),
    description: str = Query(..., description="Plan description"),
    is_active: bool = Query(True, description="Plan active status")
):
    """
    Super Admin: Create new subscription plan
    
    **Capabilities**:
    - Create new plan with basic info
    - Set plan active status
    - Initialize empty resource permissions
    - Audit plan creation
    
    **Process**:
    1. Create plan record
    2. Initialize empty resource permissions
    3. Log creation for audit
    
    **Super Admin Only**: Plan management system
    """
    try:
        async with get_public_db() as db:
            # Check if plan name already exists
            existing_plan = await db.execute(text("""
                SELECT id FROM public.plans WHERE name = :name
            """), {"name": name})
            
            if existing_plan.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Plan with name '{name}' already exists"
                )
            
            # Create plan
            result = await db.execute(text("""
                INSERT INTO public.plans (name, description, is_active) 
                VALUES (:name, :description, :is_active)
                RETURNING id, name, description, is_active
            """), {
                "name": name,
                "description": description,
                "is_active": is_active
            })
            
            new_plan = result.fetchone()
            await db.commit()
            
            # Log Super Admin action
            await SuperAdminService.create_audit_log(
                db=db,
                super_admin_id=UUID(current_super_admin["sub"]),
                action="CREATE_PLAN",
                resource="plan",
                resource_id=str(new_plan[0]),
                details={
                    "name": name,
                    "description": description,
                    "is_active": is_active
                },
                ip_address=request.client.host if request.client else None
            )
            
            return {
                "message": "Plan created successfully",
                "plan": {
                    "id": new_plan[0],
                    "name": new_plan[1],
                    "description": new_plan[2],
                    "is_active": new_plan[3]
                },
                "next_steps": [
                    "1. Add resource permissions to the plan",
                    "2. Assign plan to tenants",
                    "3. Test plan functionality"
                ]
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating plan: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create plan: {str(e)}"
        )

@router.get("/{plan_id}")
async def get_single_plan(
    plan_id: UUID,
    request: Request,
    current_super_admin: dict = Depends(get_current_super_admin),
    include_resources: bool = Query(False, description="Include plan resource permissions")
):
    """
    Super Admin: Get single plan details

    **Capabilities**:
    - View specific plan information
    - See plan resource permissions
    - Check tenant usage of plan
    - Plan management support
    """
    try:
        async with get_public_db() as db:
            # Get plan details
            plan_result = await db.execute(text("""
                SELECT id, name, description, is_active
                FROM public.plans
                WHERE id = :plan_id
            """), {"plan_id": plan_id})

            plan = plan_result.fetchone()
            if not plan:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Plan with ID {plan_id} not found"
                )

            plan_info = {
                "id": plan[0],
                "name": plan[1],
                "description": plan[2],
                "is_active": plan[3]
            }

            if include_resources:
                # Get resources for this plan
                resources_result = await db.execute(text("""
                    SELECT resource_name, actions
                    FROM public.plan_resource_access
                    WHERE plan_id = :plan_id
                    ORDER BY resource_name
                """), {"plan_id": plan_id})

                resources = resources_result.fetchall()
                plan_info["resources"] = [
                    {"resource": r[0], "actions": r[1]} for r in resources
                ]
                plan_info["total_permissions"] = sum(len(r[1]) for r in resources) if resources else 0

            # Get tenant count using this plan
            tenant_count_result = await db.execute(text("""
                SELECT COUNT(*) FROM public.tenants
                WHERE plan_id = :plan_id
            """), {"plan_id": plan_id})

            plan_info["tenant_count"] = tenant_count_result.scalar() or 0

            # Log Super Admin action
            await SuperAdminService.create_audit_log(
                db=db,
                super_admin_id=UUID(current_super_admin["sub"]),
                action="VIEW_PLAN",
                resource="plan",
                resource_id=str(plan_id),
                details={
                    "plan_name": plan[1],
                    "include_resources": include_resources
                },
                ip_address=request.client.host if request.client else None
            )

            return plan_info

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting plan {plan_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve plan: {str(e)}"
        )

@router.put("/{plan_id}", status_code=status.HTTP_200_OK)
async def update_plan(
    plan_id: UUID,
    request: Request,
    current_super_admin: dict = Depends(get_current_super_admin),
    name: Optional[str] = Query(None, description="Plan name"),
    description: Optional[str] = Query(None, description="Plan description"),
    is_active: Optional[bool] = Query(None, description="Plan active status")
):
    """
    Super Admin: Update subscription plan
    
    **Capabilities**:
    - Update plan basic information
    - Toggle plan active status
    - Audit plan changes
    - Affect all tenants using this plan
    
    **Super Admin Only**: Plan management system
    """
    try:
        async with get_public_db() as db:
            # Get existing plan
            existing_plan = await db.execute(text("""
                SELECT id, name, description, is_active 
                FROM public.plans WHERE id = :plan_id
            """), {"plan_id": plan_id})
            
            plan = existing_plan.fetchone()
            if not plan:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Plan with ID {plan_id} not found"
                )
            
            # Build update query
            updates = []
            params = {"plan_id": plan_id}
            
            if name is not None:
                updates.append("name = :name")
                params["name"] = name
            
            if description is not None:
                updates.append("description = :description")
                params["description"] = description
                
            if is_active is not None:
                updates.append("is_active = :is_active")
                params["is_active"] = is_active
            
            if not updates:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No update parameters provided"
                )
            
            # Update plan
            update_query = f"""
                UPDATE public.plans 
                SET {', '.join(updates)}
                WHERE id = :plan_id
                RETURNING id, name, description, is_active
            """
            
            result = await db.execute(text(update_query), params)
            updated_plan = result.fetchone()
            await db.commit()
            
            # Log Super Admin action
            await SuperAdminService.create_audit_log(
                db=db,
                super_admin_id=UUID(current_super_admin["sub"]),
                action="UPDATE_PLAN",
                resource="plan",
                resource_id=str(plan_id),
                details={
                    "old_values": {
                        "name": plan[1],
                        "description": plan[2],
                        "is_active": plan[3]
                    },
                    "new_values": {
                        "name": updated_plan[1],
                        "description": updated_plan[2],
                        "is_active": updated_plan[3]
                    }
                },
                ip_address=request.client.host if request.client else None
            )
            
            return {
                "message": "Plan updated successfully",
                "plan": {
                    "id": updated_plan[0],
                    "name": updated_plan[1],
                    "description": updated_plan[2],
                    "is_active": updated_plan[3]
                }
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating plan: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update plan: {str(e)}"
        )

@router.get("/{plan_id}/resources")
async def get_plan_resources(
    plan_id: UUID,
    request: Request,
    current_super_admin: dict = Depends(get_current_super_admin)
):
    """
    Super Admin: View plan resource permissions
    
    **Capabilities**:
    - List all resources available to plan
    - View resource-action combinations
    - Understand plan capabilities
    - Plan permission management
    """
    try:
        async with get_public_db() as db:
            # Check if plan exists
            plan_result = await db.execute(text("""
                SELECT id, name FROM public.plans WHERE id = :plan_id
            """), {"plan_id": plan_id})
            
            plan = plan_result.fetchone()
            if not plan:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Plan with ID {plan_id} not found"
                )
            
            # Get plan resources
            resources_result = await db.execute(text("""
                SELECT resource_name, actions 
                FROM public.plan_resource_access 
                WHERE plan_id = :plan_id
                ORDER BY resource_name
            """), {"plan_id": plan_id})
            
            resources = resources_result.fetchall()
            
            # Process resources (actions are already arrays)
            resource_list = []
            for resource, actions_array in resources:
                resource_list.append({
                    "resource": resource,
                    "actions": actions_array
                })
            
            # Log Super Admin action
            await SuperAdminService.create_audit_log(
                db=db,
                super_admin_id=UUID(current_super_admin["sub"]),
                action="VIEW_PLAN_RESOURCES",
                resource="plan",
                resource_id=str(plan_id),
                details={"plan_name": plan[1], "resource_count": len(resources)},
                ip_address=request.client.host if request.client else None
            )
            
            return {
                "plan": {
                    "id": plan[0],
                    "name": plan[1]
                },
                "resources": resource_list,
                "total_resources": len(resource_list),
                "total_permissions": sum(len(r["actions"]) for r in resource_list) if resource_list else 0
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting plan resources: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve plan resources: {str(e)}"
        )

@router.post("/{plan_id}/resources", status_code=status.HTTP_201_CREATED)
async def add_plan_resource(
    plan_id: UUID,
    request: Request,
    current_super_admin: dict = Depends(get_current_super_admin),
    resource_name: str = Query(..., description="Resource name"),
    action_name: str = Query(..., description="Action name")
):
    """
    Super Admin: Add resource permission to plan
    
    **Critical Function**: This solves the manual SQL query problem!
    
    **Capabilities**:
    - Add specific resource:action to plan
    - Grant new capabilities to all tenants on this plan
    - Manage plan-based permission system via API
    - Replace manual SQL queries with proper API
    
    **Impact**: All tenants on this plan gain this permission immediately
    """
    try:
        async with get_public_db() as db:
            # Check if plan exists
            plan_result = await db.execute(text("""
                SELECT id, name FROM public.plans WHERE id = :plan_id
            """), {"plan_id": plan_id})
            
            plan = plan_result.fetchone()
            if not plan:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Plan with ID {plan_id} not found"
                )
            
            # Check if resource already exists and if action is already in the actions array
            existing_result = await db.execute(text("""
                SELECT id, actions FROM public.plan_resource_access
                WHERE plan_id = :plan_id AND resource_name = :resource_name
            """), {
                "plan_id": plan_id,
                "resource_name": resource_name
            })

            existing_row = existing_result.fetchone()

            if existing_row:
                # Resource exists, check if action is already in the array
                current_actions = existing_row[1] or []
                if action_name in current_actions:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Resource '{resource_name}:{action_name}' already exists for this plan"
                    )

                # Add action to existing resource
                await db.execute(text("""
                    UPDATE public.plan_resource_access
                    SET actions = array_append(actions, :action_name)
                    WHERE plan_id = :plan_id AND resource_name = :resource_name
                """), {
                    "plan_id": plan_id,
                    "resource_name": resource_name,
                    "action_name": action_name
                })
            else:
                # Create new resource with action
                await db.execute(text("""
                    INSERT INTO public.plan_resource_access (plan_id, resource_name, actions, is_active)
                    VALUES (:plan_id, :resource_name, ARRAY[:action_name], true)
                """), {
                    "plan_id": plan_id,
                    "resource_name": resource_name,
                    "action_name": action_name
                })
            
            await db.commit()
            
            # Get count of affected tenants
            tenant_count_result = await db.execute(text("""
                SELECT COUNT(*) FROM public.tenants WHERE plan_id = :plan_id
            """), {"plan_id": plan_id})
            affected_tenants = tenant_count_result.scalar() or 0
            
            # Log Super Admin action
            await SuperAdminService.create_audit_log(
                db=db,
                super_admin_id=UUID(current_super_admin["sub"]),
                action="ADD_PLAN_RESOURCE",
                resource="plan",
                resource_id=str(plan_id),
                details={
                    "plan_name": plan[1],
                    "resource_name": resource_name,
                    "action_name": action_name,
                    "affected_tenants": affected_tenants
                },
                ip_address=request.client.host if request.client else None
            )
            
            return {
                "message": "Resource permission added to plan successfully",
                "plan": {
                    "id": plan[0],
                    "name": plan[1]
                },
                "added_permission": {
                    "resource": resource_name,
                    "action": action_name
                },
                "impact": {
                    "affected_tenants": affected_tenants,
                    "immediate_effect": "All tenants on this plan now have this permission"
                }
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding plan resource: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add resource to plan: {str(e)}"
        )

@router.delete("/{plan_id}/resources", status_code=status.HTTP_200_OK)
async def remove_plan_resource(
    plan_id: UUID,
    request: Request,
    current_super_admin: dict = Depends(get_current_super_admin),
    resource_name: str = Query(..., description="Resource name"),
    action_name: str = Query(..., description="Action name")
):
    """
    Super Admin: Remove resource permission from plan
    
    **Critical Function**: Manage plan permissions via API
    
    **Capabilities**:
    - Remove specific resource:action from plan
    - Revoke capabilities from all tenants on this plan
    - Manage plan-based permission system via API
    - Replace manual SQL queries with proper API
    
    **Impact**: All tenants on this plan lose this permission immediately
    **Warning**: This affects all tenants on this plan
    """
    try:
        async with get_public_db() as db:
            # Check if plan exists
            plan_result = await db.execute(text("""
                SELECT id, name FROM public.plans WHERE id = :plan_id
            """), {"plan_id": plan_id})
            
            plan = plan_result.fetchone()
            if not plan:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Plan with ID {plan_id} not found"
                )
            
            # Check if resource exists and if action is in the actions array
            existing_result = await db.execute(text("""
                SELECT id, actions FROM public.plan_resource_access
                WHERE plan_id = :plan_id AND resource_name = :resource_name
            """), {
                "plan_id": plan_id,
                "resource_name": resource_name
            })

            existing_row = existing_result.fetchone()

            if not existing_row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Resource '{resource_name}' not found for this plan"
                )

            current_actions = existing_row[1] or []
            if action_name not in current_actions:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Resource '{resource_name}:{action_name}' not found for this plan"
                )
            
            # Get count of affected tenants
            tenant_count_result = await db.execute(text("""
                SELECT COUNT(*) FROM public.tenants WHERE plan_id = :plan_id
            """), {"plan_id": plan_id})
            affected_tenants = tenant_count_result.scalar() or 0
            
            # Remove action from the actions array
            remaining_actions = [action for action in current_actions if action != action_name]

            if not remaining_actions:
                # If no actions left, delete the entire resource record
                await db.execute(text("""
                    DELETE FROM public.plan_resource_access
                    WHERE plan_id = :plan_id AND resource_name = :resource_name
                """), {
                    "plan_id": plan_id,
                    "resource_name": resource_name
                })
            else:
                # Update with remaining actions
                await db.execute(text("""
                    UPDATE public.plan_resource_access
                    SET actions = :remaining_actions
                    WHERE plan_id = :plan_id AND resource_name = :resource_name
                """), {
                    "plan_id": plan_id,
                    "resource_name": resource_name,
                    "remaining_actions": remaining_actions
                })
            
            await db.commit()
            
            # Log Super Admin action
            await SuperAdminService.create_audit_log(
                db=db,
                super_admin_id=UUID(current_super_admin["sub"]),
                action="REMOVE_PLAN_RESOURCE",
                resource="plan",
                resource_id=str(plan_id),
                details={
                    "plan_name": plan[1],
                    "resource_name": resource_name,
                    "action_name": action_name,
                    "affected_tenants": affected_tenants
                },
                ip_address=request.client.host if request.client else None
            )
            
            return {
                "message": "Resource permission removed from plan successfully",
                "plan": {
                    "id": plan[0],
                    "name": plan[1]
                },
                "removed_permission": {
                    "resource": resource_name,
                    "action": action_name
                },
                "impact": {
                    "affected_tenants": affected_tenants,
                    "immediate_effect": "All tenants on this plan no longer have this permission"
                }
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing plan resource: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove resource from plan: {str(e)}"
        )
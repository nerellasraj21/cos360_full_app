"""
Plan-based access control service for multi-tenant subscription management.
"""
from typing import Optional, List, Dict, Any
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from sqlalchemy.orm import selectinload

from app.db.tenant_session import get_public_db

logger = logging.getLogger("plan_service")

class PlanService:
    """Service for managing subscription plans and plan-based access control"""

    @staticmethod
    async def get_tenant_plan(client_name: str) -> Optional[Dict[str, Any]]:
        """
        Get the subscription plan for a tenant by client name.
        
        Args:
            client_name: The client identifier
            
        Returns:
            Dict containing plan information or None if not found
        """
        try:
            async for db in get_public_db():
                result = await db.execute(text("""
                    SELECT p.id, p.name, p.description, p.is_active
                    FROM public.tenants t
                    JOIN public.plans p ON t.plan_id = p.id
                    WHERE t.client_name = :client_name AND t.is_active = true
                """), {"client_name": client_name})
                
                plan_data = result.fetchone()
                if plan_data:
                    return {
                        "id": plan_data[0],
                        "name": plan_data[1],
                        "description": plan_data[2],
                        "is_active": plan_data[3]
                    }
                
                logger.warning(f"No plan found for tenant: {client_name}")
                return None
                break
                
        except Exception as e:
            logger.error(f"Error fetching tenant plan for '{client_name}': {str(e)}")
            return None

    @staticmethod
    async def check_plan_permission(client_name: str, resource: str, action: str) -> bool:
        """
        Check if a tenant's plan allows access to a specific resource:action.
        
        Args:
            client_name: The client identifier
            resource: Resource name (e.g., 'fee_categories')
            action: Action name (e.g., 'create', 'read', 'update', 'delete', 'list')
            
        Returns:
            bool: True if plan allows access, False otherwise
        """
        try:
            async for db in get_public_db():
                result = await db.execute(text("""
                    SELECT pra.actions
                    FROM public.tenants t
                    JOIN public.plans p ON t.plan_id = p.id
                    JOIN public.plan_resource_access pra ON p.id = pra.plan_id
                    WHERE t.client_name = :client_name 
                    AND t.is_active = true 
                    AND p.is_active = true
                    AND pra.resource_name = :resource
                    AND pra.is_active = true
                """), {
                    "client_name": client_name,
                    "resource": resource
                })
                
                plan_permissions = result.fetchone()
                if plan_permissions:
                    allowed_actions = plan_permissions[0]  # This is the TEXT[] array
                    has_permission = action in allowed_actions
                    
                    logger.info(f"Plan permission check: {client_name} -> {resource}:{action} = {has_permission}")
                    logger.debug(f"Allowed actions for {resource}: {allowed_actions}")
                    
                    return has_permission
                
                logger.warning(f"No plan permissions found for {client_name} -> {resource}")
                return False
                break
                
        except Exception as e:
            logger.error(f"Error checking plan permission: {str(e)}")
            return False

    @staticmethod
    async def get_plan_resources(client_name: str) -> List[Dict[str, Any]]:
        """
        Get all resources and actions allowed by a tenant's plan.
        
        Args:
            client_name: The client identifier
            
        Returns:
            List of dicts containing resource information
        """
        try:
            async for db in get_public_db():
                result = await db.execute(text("""
                    SELECT pra.resource_name, pra.actions
                    FROM public.tenants t
                    JOIN public.plans p ON t.plan_id = p.id
                    JOIN public.plan_resource_access pra ON p.id = pra.plan_id
                    WHERE t.client_name = :client_name 
                    AND t.is_active = true 
                    AND p.is_active = true
                    AND pra.is_active = true
                    ORDER BY pra.resource_name
                """), {"client_name": client_name})
                
                resources = []
                for row in result.fetchall():
                    resources.append({
                        "resource": row[0],
                        "actions": row[1]
                    })
                
                logger.info(f"Retrieved {len(resources)} plan resources for tenant: {client_name}")
                return resources
                break
                
        except Exception as e:
            logger.error(f"Error getting plan resources: {str(e)}")
            return []

    @staticmethod
    async def get_all_plans() -> List[Dict[str, Any]]:
        """
        Get all available subscription plans.
        
        Returns:
            List of plan dictionaries
        """
        try:
            async for db in get_public_db():
                result = await db.execute(text("""
                    SELECT p.id, p.name, p.description, p.is_active,
                           COUNT(pra.id) as resource_count
                    FROM public.plans p
                    LEFT JOIN public.plan_resource_access pra ON p.id = pra.plan_id
                    WHERE p.is_active = true
                    GROUP BY p.id, p.name, p.description, p.is_active
                    ORDER BY p.id
                """))
                
                plans = []
                for row in result.fetchall():
                    plans.append({
                        "id": row[0],
                        "name": row[1],
                        "description": row[2],
                        "is_active": row[3],
                        "resource_count": row[4]
                    })
                
                return plans
                break
                
        except Exception as e:
            logger.error(f"Error getting all plans: {str(e)}")
            return []

    @staticmethod
    async def assign_plan_to_tenant(client_name: str, plan_id: int) -> bool:
        """
        Assign a subscription plan to a tenant.
        
        Args:
            client_name: The client identifier
            plan_id: ID of the plan to assign
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            async for db in get_public_db():
                # Verify plan exists and is active
                plan_check = await db.execute(text("""
                    SELECT id FROM public.plans 
                    WHERE id = :plan_id AND is_active = true
                """), {"plan_id": plan_id})
                
                if not plan_check.fetchone():
                    logger.warning(f"Plan {plan_id} not found or inactive")
                    return False
                
                # Update tenant's plan
                result = await db.execute(text("""
                    UPDATE public.tenants 
                    SET plan_id = :plan_id 
                    WHERE client_name = :client_name AND is_active = true
                """), {
                    "plan_id": plan_id,
                    "client_name": client_name
                })
                
                if result.rowcount > 0:
                    await db.commit()
                    logger.info(f"Assigned plan {plan_id} to tenant {client_name}")
                    return True
                else:
                    logger.warning(f"No active tenant found with client_name: {client_name}")
                    return False
                break
                
        except Exception as e:
            logger.error(f"Error assigning plan to tenant: {str(e)}")
            return False

    @staticmethod
    async def get_plan_limitation_info(client_name: str, resource: str, action: str) -> Dict[str, Any]:
        """
        Get detailed information about plan limitations for user-friendly error messages.
        
        Args:
            client_name: The client identifier
            resource: Resource name
            action: Action name
            
        Returns:
            Dict containing limitation information
        """
        try:
            # Get current plan info
            current_plan = await PlanService.get_tenant_plan(client_name)
            if not current_plan:
                return {
                    "error": "plan_not_found",
                    "message": "No subscription plan found for this organization",
                    "current_plan": None
                }
            
            # Check if any plan allows this resource:action
            async for db in get_public_db():
                result = await db.execute(text("""
                    SELECT p.name, p.id
                    FROM public.plans p
                    JOIN public.plan_resource_access pra ON p.id = pra.plan_id
                    WHERE pra.resource_name = :resource 
                    AND :action = ANY(pra.actions)
                    AND p.is_active = true 
                    AND pra.is_active = true
                    ORDER BY p.id
                """), {
                    "resource": resource,
                    "action": action
                })
                
                compatible_plans = result.fetchall()
                
                if compatible_plans:
                    # Find the lowest tier plan that supports this feature
                    required_plan = compatible_plans[0]  # First one (lowest ID)
                    
                    return {
                        "error": "plan_limitation",
                        "message": f"This feature requires a {required_plan[0]} plan or higher",
                        "current_plan": current_plan["name"],
                        "required_plan": required_plan[0],
                        "resource": resource,
                        "action": action,
                        "upgrade_available": True
                    }
                else:
                    return {
                        "error": "feature_not_available",
                        "message": "This feature is not available in any subscription plan",
                        "current_plan": current_plan["name"],
                        "resource": resource,
                        "action": action,
                        "upgrade_available": False
                    }
                break
                
        except Exception as e:
            logger.error(f"Error getting plan limitation info: {str(e)}")
            return {
                "error": "system_error",
                "message": "Unable to check plan limitations"
            }
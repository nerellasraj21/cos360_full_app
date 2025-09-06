#!/usr/bin/env python3
"""
Seed script for multi-tenant permission system
Creates default role templates, menu actions, and permission templates
"""
import asyncio
import sys
import os

# Add the app directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
import logging

from app.models.public import (
    RoleTemplate, PermissionTemplate, MenuAction, Menu, Plan, PlanMenuAccess
)
from app.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database connection for public schema
# Convert psycopg2 URL to asyncpg for async operations
database_url = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
async_engine = create_async_engine(database_url)
async_session = sessionmaker(async_engine, class_=AsyncSession)

class PermissionSeedData:
    """Seed data for the permission system"""
    
    # Default role templates with descriptions
    ROLE_TEMPLATES = [
        {
            "name": "Admin",
            "description": "System administrator with full access",
            "category": "system",
            "is_system_role": True
        },
        {
            "name": "Teacher", 
            "description": "Teaching staff with academic management access",
            "category": "academic",
            "is_system_role": True
        },
        {
            "name": "Student",
            "description": "Student with limited read access to own data",
            "category": "academic", 
            "is_system_role": True
        },
        {
            "name": "Parent",
            "description": "Parent with access to child's academic information",
            "category": "academic",
            "is_system_role": True
        },
        {
            "name": "Staff",
            "description": "Administrative staff with operational access",
            "category": "administrative",
            "is_system_role": True
        }
    ]
    
    # Menu actions for different resources
    MENU_ACTIONS = [
        # Academic Year actions
        {"menu_name": "Academic Years", "resource_name": "academic_years", "action_name": "create", "description": "Create new academic years"},
        {"menu_name": "Academic Years", "resource_name": "academic_years", "action_name": "read", "description": "View academic year details"},
        {"menu_name": "Academic Years", "resource_name": "academic_years", "action_name": "update", "description": "Update academic year information"},
        {"menu_name": "Academic Years", "resource_name": "academic_years", "action_name": "delete", "description": "Delete academic years"},
        {"menu_name": "Academic Years", "resource_name": "academic_years", "action_name": "list", "description": "List all academic years"},
        
        # Fee Categories actions
        {"menu_name": "Fee Management", "resource_name": "fee_categories", "action_name": "create", "description": "Create fee categories"},
        {"menu_name": "Fee Management", "resource_name": "fee_categories", "action_name": "read", "description": "View fee category details"},
        {"menu_name": "Fee Management", "resource_name": "fee_categories", "action_name": "update", "description": "Update fee categories"},
        {"menu_name": "Fee Management", "resource_name": "fee_categories", "action_name": "delete", "description": "Delete fee categories"},
        {"menu_name": "Fee Management", "resource_name": "fee_categories", "action_name": "list", "description": "List fee categories"},
        
        # Student Management actions
        {"menu_name": "Student Management", "resource_name": "students", "action_name": "create", "description": "Add new students"},
        {"menu_name": "Student Management", "resource_name": "students", "action_name": "read", "description": "View student details"},
        {"menu_name": "Student Management", "resource_name": "students", "action_name": "update", "description": "Update student information"},
        {"menu_name": "Student Management", "resource_name": "students", "action_name": "delete", "description": "Remove students"},
        {"menu_name": "Student Management", "resource_name": "students", "action_name": "list", "description": "List all students"},
    ]

async def seed_role_templates():
    """Create default role templates in public schema"""
    async with async_session() as session:
        try:
            logger.info("Seeding role templates...")
            
            for role_data in PermissionSeedData.ROLE_TEMPLATES:
                # Check if role template already exists
                query = select(RoleTemplate).where(RoleTemplate.name == role_data["name"])
                result = await session.execute(query)
                existing_role = result.scalar_one_or_none()
                
                if not existing_role:
                    role_template = RoleTemplate(**role_data)
                    session.add(role_template)
                    logger.info(f"Created role template: {role_data['name']}")
                else:
                    logger.info(f"Role template already exists: {role_data['name']}")
            
            await session.commit()
            logger.info("Role templates seeding completed")
            
        except Exception as e:
            await session.rollback()
            logger.error(f"Error seeding role templates: {str(e)}")
            raise

async def seed_menu_actions():
    """Create menu actions for different resources"""
    async with async_session() as session:
        try:
            logger.info("Seeding menu actions...")
            
            for action_data in PermissionSeedData.MENU_ACTIONS:
                # Find menu by name
                menu_query = select(Menu).where(Menu.name.ilike(f"%{action_data['menu_name']}%"))
                result = await session.execute(menu_query)
                menu = result.scalar_one_or_none()
                
                if menu:
                    # Check if menu action already exists
                    action_query = select(MenuAction).where(
                        MenuAction.menu_id == menu.id,
                        MenuAction.resource_name == action_data["resource_name"],
                        MenuAction.action_name == action_data["action_name"]
                    )
                    result = await session.execute(action_query)
                    existing_action = result.scalar_one_or_none()
                    
                    if not existing_action:
                        menu_action = MenuAction(
                            menu_id=menu.id,
                            resource_name=action_data["resource_name"],
                            action_name=action_data["action_name"],
                            description=action_data["description"]
                        )
                        session.add(menu_action)
                        logger.info(f"Created menu action: {action_data['resource_name']}:{action_data['action_name']}")
                    else:
                        logger.info(f"Menu action already exists: {action_data['resource_name']}:{action_data['action_name']}")
                else:
                    logger.warning(f"Menu not found for: {action_data['menu_name']}")
            
            await session.commit()
            logger.info("Menu actions seeding completed")
            
        except Exception as e:
            await session.rollback()
            logger.error(f"Error seeding menu actions: {str(e)}")
            raise

async def seed_permission_templates():
    """Create default permission templates for role templates"""
    async with async_session() as session:
        try:
            logger.info("Seeding permission templates...")
            
            # Get all role templates and menus
            role_query = select(RoleTemplate)
            result = await session.execute(role_query)
            role_templates = result.scalars().all()
            
            menu_query = select(Menu)
            result = await session.execute(menu_query)
            menus = result.scalars().all()
            
            # Academic Year specific permissions
            academic_year_menu = next((m for m in menus if "academic" in m.name.lower() and "year" in m.name.lower()), None)
            
            if academic_year_menu:
                for role_template in role_templates:
                    # Check if permission template already exists
                    perm_query = select(PermissionTemplate).where(
                        PermissionTemplate.role_template_id == role_template.id,
                        PermissionTemplate.menu_id == academic_year_menu.id
                    )
                    result = await session.execute(perm_query)
                    existing_perm = result.scalar_one_or_none()
                    
                    if not existing_perm:
                        # Set permissions based on role
                        if role_template.name == "Admin":
                            can_view = True
                            can_edit = True
                        else:  # Parent, Teacher, Student, Staff - Read only
                            can_view = True
                            can_edit = False
                        
                        permission_template = PermissionTemplate(
                            role_template_id=role_template.id,
                            menu_id=academic_year_menu.id,
                            can_view=can_view,
                            can_edit=can_edit
                        )
                        session.add(permission_template)
                        logger.info(f"Created permission template: {role_template.name} -> Academic Years (view: {can_view}, edit: {can_edit})")
                    else:
                        logger.info(f"Permission template already exists: {role_template.name} -> Academic Years")
            
            await session.commit()
            logger.info("Permission templates seeding completed")
            
        except Exception as e:
            await session.rollback()
            logger.error(f"Error seeding permission templates: {str(e)}")
            raise

async def seed_plan_menu_access():
    """Ensure all plans have access to Academic Years menu"""
    async with async_session() as session:
        try:
            logger.info("Seeding plan-menu access for Academic Years...")
            
            # Get all plans and Academic Years menu
            plans_query = select(Plan)
            result = await session.execute(plans_query)
            plans = result.scalars().all()
            
            menu_query = select(Menu).where(Menu.name.ilike("%academic%year%"))
            result = await session.execute(menu_query)
            academic_year_menu = result.scalar_one_or_none()
            
            if academic_year_menu:
                for plan in plans:
                    # Check if access already exists
                    access_query = select(PlanMenuAccess).where(
                        PlanMenuAccess.plan_id == plan.id,
                        PlanMenuAccess.menu_id == academic_year_menu.id
                    )
                    result = await session.execute(access_query)
                    existing_access = result.scalar_one_or_none()
                    
                    if not existing_access:
                        plan_access = PlanMenuAccess(
                            plan_id=plan.id,
                            menu_id=academic_year_menu.id,
                            is_active=True
                        )
                        session.add(plan_access)
                        logger.info(f"Created plan access: {plan.name} -> Academic Years")
                    else:
                        logger.info(f"Plan access already exists: {plan.name} -> Academic Years")
            else:
                logger.warning("Academic Years menu not found")
            
            await session.commit()
            logger.info("Plan-menu access seeding completed")
            
        except Exception as e:
            await session.rollback()
            logger.error(f"Error seeding plan-menu access: {str(e)}")
            raise

async def main():
    """Main seeding function"""
    try:
        logger.info("Starting permission system data seeding...")
        
        # Seed in order of dependencies
        await seed_role_templates()
        await seed_menu_actions() 
        await seed_permission_templates()
        await seed_plan_menu_access()
        
        logger.info("✅ Permission system seeding completed successfully!")
        
    except Exception as e:
        logger.error(f"❌ Seeding failed: {str(e)}")
        raise
    finally:
        await async_engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
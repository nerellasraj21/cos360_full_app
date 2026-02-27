from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select
from app.db.tenant_session import get_tenant_db
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
import logging

logger = logging.getLogger("test_setup")
router = APIRouter(prefix="/auth/test-setup", tags=["Test Setup"])

@asynccontextmanager
async def get_public_db_simple():
    """Simple public DB connection"""
    from app.db.session import DATABASE_URL
    engine = create_async_engine(DATABASE_URL)
    SessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)
    
    async with SessionLocal() as session:
        await session.execute(text("SET search_path TO public"))
        try:
            yield session
        finally:
            await engine.dispose()

@router.post("/seed-basic-data")
async def seed_basic_permission_data():
    """Seed basic permission data for testing"""
    try:
        async with get_public_db_simple() as public_db:
            # Create basic plans
            await public_db.execute(text("""
                INSERT INTO public.plans (id, name, description, is_active) VALUES 
                (1, 'Standard', 'Standard plan with basic features', true),
                (2, 'Premium', 'Premium plan with all features', true)
                ON CONFLICT (id) DO NOTHING;
            """))
            
            # Create Academic Years menu
            await public_db.execute(text("""
                INSERT INTO public.menus (id, name, url, level, parent_id) VALUES
                (1, 'Academic Years', '/academic-years', 'L1', NULL)
                ON CONFLICT (id) DO NOTHING;
            """))
            
            # Create role templates
            await public_db.execute(text("""
                INSERT INTO public.role_templates (id, name, description, category, is_active, is_system_role) VALUES
                (1, 'Admin', 'System administrator with full access', 'system', true, true),
                (2, 'Teacher', 'Teaching staff with academic management access', 'academic', true, true),
                (3, 'Student', 'Student with limited read access', 'academic', true, true),
                (4, 'Parent', 'Parent with access to child information', 'academic', true, true),
                (5, 'Staff', 'Administrative staff with operational access', 'administrative', true, true)
                ON CONFLICT (id) DO NOTHING;
            """))
            
            # Create menu actions
            await public_db.execute(text("""
                INSERT INTO public.menu_actions (id, menu_id, resource_name, action_name, description, is_active) VALUES
                (1, 1, 'academic_years', 'create', 'Create new academic years', true),
                (2, 1, 'academic_years', 'read', 'View academic year details', true),
                (3, 1, 'academic_years', 'update', 'Update academic year information', true),
                (4, 1, 'academic_years', 'delete', 'Delete academic years', true),
                (5, 1, 'academic_years', 'list', 'List all academic years', true)
                ON CONFLICT (id) DO NOTHING;
            """))
            
            # Create permission templates
            await public_db.execute(text("""
                INSERT INTO public.permission_templates (id, role_template_id, menu_id, can_view, can_edit, is_active) VALUES
                (1, 1, 1, true, true, true),   -- Admin: view + edit
                (2, 2, 1, true, false, true),  -- Teacher: view only
                (3, 3, 1, true, false, true),  -- Student: view only
                (4, 4, 1, true, false, true),  -- Parent: view only
                (5, 5, 1, true, false, true)   -- Staff: view only
                ON CONFLICT (id) DO NOTHING;
            """))
            
            # Grant plan access to menu
            await public_db.execute(text("""
                INSERT INTO public.plan_menu_access (id, plan_id, menu_id, is_active) VALUES
                (1, 1, 1, true),
                (2, 2, 1, true)
                ON CONFLICT (id) DO NOTHING;
            """))
            
            await public_db.commit()
            
        return {"message": "Basic permission data seeded successfully"}
        
    except Exception as e:
        logger.error(f"Error seeding data: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to seed data: {str(e)}"
        )

@router.post("/create-test-users")
async def create_test_users(db: AsyncSession = Depends(get_tenant_db)):
    """Create test users with different roles"""
    try:
        # First, create roles in tenant schema based on templates
        await db.execute(text("""
            INSERT INTO roles (id, name, description, is_system_role, is_custom_role) VALUES
            ('550e8400-e29b-41d4-a716-446655440001', 'Admin', 'System administrator', true, false),
            ('550e8400-e29b-41d4-a716-446655440002', 'Teacher', 'Teaching staff', true, false),
            ('550e8400-e29b-41d4-a716-446655440003', 'Student', 'Student user', true, false)
            ON CONFLICT (id) DO NOTHING;
        """))
        
        # Create role menu permissions (Admin gets edit, others get view only)
        await db.execute(text("""
            INSERT INTO role_menu_permissions (id, role_id, menu_id, can_view, can_edit) VALUES
            ('550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440201', true, true),
            ('550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440201', true, false),
            ('550e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440201', true, false)
            ON CONFLICT (id) DO NOTHING;
        """))
        
        # Create tenant menus
        await db.execute(text("""
            INSERT INTO menus (id, name, url, level, parent_id) VALUES
            ('550e8400-e29b-41d4-a716-446655440201', 'Academic Years', '/academic-years', 'L1', NULL)
            ON CONFLICT (id) DO NOTHING;
        """))
        
        # Create resource permissions (Admin gets all, others get read only)
        await db.execute(text("""
            INSERT INTO resource_permissions (id, role_id, resource, action, is_granted) VALUES
            -- Admin permissions (all actions)
            ('550e8400-e29b-41d4-a716-446655440301', '550e8400-e29b-41d4-a716-446655440001', 'academic_years', 'create', true),
            ('550e8400-e29b-41d4-a716-446655440302', '550e8400-e29b-41d4-a716-446655440001', 'academic_years', 'read', true),
            ('550e8400-e29b-41d4-a716-446655440303', '550e8400-e29b-41d4-a716-446655440001', 'academic_years', 'update', true),
            ('550e8400-e29b-41d4-a716-446655440304', '550e8400-e29b-41d4-a716-446655440001', 'academic_years', 'delete', true),
            ('550e8400-e29b-41d4-a716-446655440305', '550e8400-e29b-41d4-a716-446655440001', 'academic_years', 'list', true),
            -- Teacher permissions (read only)
            ('550e8400-e29b-41d4-a716-446655440306', '550e8400-e29b-41d4-a716-446655440002', 'academic_years', 'read', true),
            ('550e8400-e29b-41d4-a716-446655440307', '550e8400-e29b-41d4-a716-446655440002', 'academic_years', 'list', true),
            -- Student permissions (read only)
            ('550e8400-e29b-41d4-a716-446655440308', '550e8400-e29b-41d4-a716-446655440003', 'academic_years', 'read', true),
            ('550e8400-e29b-41d4-a716-446655440309', '550e8400-e29b-41d4-a716-446655440003', 'academic_years', 'list', true)
            ON CONFLICT (id) DO NOTHING;
        """))
        
        # Create test users
        # Passwords: admin=testpass123, teacher=Teacher@123, student=Student@123
        await db.execute(text("""
            INSERT INTO users (id, username, email, password_hash, is_active, role_id) VALUES
            ('550e8400-e29b-41d4-a716-446655440401', 'admin@test.com', 'admin@test.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6VqPd6.cQK', true, '550e8400-e29b-41d4-a716-446655440001'),
            ('550e8400-e29b-41d4-a716-446655440402', 'teacher@test.com', 'teacher@test.com', '$2b$12$6rWZ47GjhcJykdRc4CeVyu9ZGCHpS2.1cd.espKGXPLBBFgsTdUtm', true, '550e8400-e29b-41d4-a716-446655440002'),
            ('550e8400-e29b-41d4-a716-446655440403', 'student@test.com', 'student@test.com', '$2b$12$p2DckEXZWUIKDAd3nrf/E.1Burzlad3yYnFidJDOXzdiy797iJ2GK', true, '550e8400-e29b-41d4-a716-446655440003')
            ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash;
        """))

        await db.commit()

        return {
            "message": "Test users created successfully",
            "users": [
                {"username": "admin@test.com", "password": "testpass123", "role": "Admin"},
                {"username": "teacher@test.com", "password": "Teacher@123", "role": "Teacher"},
                {"username": "student@test.com", "password": "Student@123", "role": "Student"}
            ]
        }
        
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating test users: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create test users: {str(e)}"
        )
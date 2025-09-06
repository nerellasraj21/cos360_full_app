-- Seed data for multi-tenant permission system
-- Run this script against your PostgreSQL database

-- Insert Role Templates into public schema
INSERT INTO public.role_templates (name, description, category, is_active, is_system_role) VALUES
('Admin', 'System administrator with full access', 'system', true, true),
('Teacher', 'Teaching staff with academic management access', 'academic', true, true),
('Student', 'Student with limited read access to own data', 'academic', true, true),
('Parent', 'Parent with access to child''s academic information', 'academic', true, true),
('Staff', 'Administrative staff with operational access', 'administrative', true, true)
ON CONFLICT (name) DO NOTHING;

-- Get the Academic Years menu ID (assuming it exists)
-- If the menu doesn't exist, this will need to be created first
DO $$
DECLARE
    academic_menu_id INTEGER;
    admin_role_id INTEGER;
    teacher_role_id INTEGER;
    student_role_id INTEGER;
    parent_role_id INTEGER;
    staff_role_id INTEGER;
    plan_record RECORD;
BEGIN
    -- Get Academic Years menu ID
    SELECT id INTO academic_menu_id FROM public.menus WHERE name ILIKE '%academic%year%' LIMIT 1;
    
    IF academic_menu_id IS NOT NULL THEN
        -- Get role template IDs
        SELECT id INTO admin_role_id FROM public.role_templates WHERE name = 'Admin';
        SELECT id INTO teacher_role_id FROM public.role_templates WHERE name = 'Teacher';
        SELECT id INTO student_role_id FROM public.role_templates WHERE name = 'Student';
        SELECT id INTO parent_role_id FROM public.role_templates WHERE name = 'Parent';
        SELECT id INTO staff_role_id FROM public.role_templates WHERE name = 'Staff';
        
        -- Insert Menu Actions for Academic Years
        INSERT INTO public.menu_actions (menu_id, resource_name, action_name, description, is_active) VALUES
        (academic_menu_id, 'academic_years', 'create', 'Create new academic years', true),
        (academic_menu_id, 'academic_years', 'read', 'View academic year details', true),
        (academic_menu_id, 'academic_years', 'update', 'Update academic year information', true),
        (academic_menu_id, 'academic_years', 'delete', 'Delete academic years', true),
        (academic_menu_id, 'academic_years', 'list', 'List all academic years', true)
        ON CONFLICT (menu_id, action_name) DO NOTHING;
        
        -- Insert Permission Templates
        -- Admin: Full access (view + edit)
        INSERT INTO public.permission_templates (role_template_id, menu_id, can_view, can_edit, is_active) VALUES
        (admin_role_id, academic_menu_id, true, true, true);
        
        -- Teacher, Student, Parent, Staff: Read-only access
        INSERT INTO public.permission_templates (role_template_id, menu_id, can_view, can_edit, is_active) VALUES
        (teacher_role_id, academic_menu_id, true, false, true),
        (student_role_id, academic_menu_id, true, false, true),
        (parent_role_id, academic_menu_id, true, false, true),
        (staff_role_id, academic_menu_id, true, false, true)
        ON CONFLICT (role_template_id, menu_id) DO NOTHING;
        
        -- Insert Plan-Menu Access for all plans
        FOR plan_record IN SELECT id FROM public.plans WHERE is_active = true LOOP
            INSERT INTO public.plan_menu_access (plan_id, menu_id, is_active) VALUES
            (plan_record.id, academic_menu_id, true)
            ON CONFLICT (plan_id, menu_id) DO NOTHING;
        END LOOP;
        
        RAISE NOTICE 'Successfully seeded permission data for Academic Years menu (ID: %)', academic_menu_id;
    ELSE
        RAISE NOTICE 'Academic Years menu not found. Please create the menu first.';
    END IF;
END $$;

-- Verify the seeded data
SELECT 'Role Templates:' as section;
SELECT id, name, description, category FROM public.role_templates ORDER BY name;

SELECT 'Menu Actions:' as section;
SELECT ma.id, m.name as menu_name, ma.resource_name, ma.action_name, ma.description 
FROM public.menu_actions ma 
JOIN public.menus m ON ma.menu_id = m.id 
WHERE ma.resource_name = 'academic_years'
ORDER BY ma.action_name;

SELECT 'Permission Templates:' as section;
SELECT rt.name as role_name, m.name as menu_name, pt.can_view, pt.can_edit
FROM public.permission_templates pt
JOIN public.role_templates rt ON pt.role_template_id = rt.id
JOIN public.menus m ON pt.menu_id = m.id
WHERE m.name ILIKE '%academic%year%'
ORDER BY rt.name;

SELECT 'Plan-Menu Access:' as section;
SELECT p.name as plan_name, m.name as menu_name, pma.is_active
FROM public.plan_menu_access pma
JOIN public.plans p ON pma.plan_id = p.id
JOIN public.menus m ON pma.menu_id = m.id
WHERE m.name ILIKE '%academic%year%'
ORDER BY p.name;
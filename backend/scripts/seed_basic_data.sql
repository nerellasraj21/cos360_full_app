-- Basic permission data for testing
-- Run this against your database

-- First, let's check if we have plans (assuming they exist)
-- If not, create a basic plan
INSERT INTO public.plans (id, name, description, is_active) VALUES 
(1, 'Standard', 'Standard plan with basic features', true),
(2, 'Premium', 'Premium plan with all features', true)
ON CONFLICT (id) DO NOTHING;

-- Create a basic menu for Academic Years (if it doesn't exist)
INSERT INTO public.menus (id, name, url, level, parent_id) VALUES
(1, 'Academic Years', '/academic-years', 'L1', NULL)
ON CONFLICT (id) DO NOTHING;

-- Create role templates
INSERT INTO public.role_templates (id, name, description, category, is_active, is_system_role) VALUES
(1, 'Admin', 'System administrator with full access', 'system', true, true),
(2, 'Teacher', 'Teaching staff with academic management access', 'academic', true, true),
(3, 'Student', 'Student with limited read access', 'academic', true, true),
(4, 'Parent', 'Parent with access to child information', 'academic', true, true),
(5, 'Staff', 'Administrative staff with operational access', 'administrative', true, true)
ON CONFLICT (id) DO NOTHING;

-- Create menu actions for academic years
INSERT INTO public.menu_actions (id, menu_id, resource_name, action_name, description, is_active) VALUES
(1, 1, 'academic_years', 'create', 'Create new academic years', true),
(2, 1, 'academic_years', 'read', 'View academic year details', true),
(3, 1, 'academic_years', 'update', 'Update academic year information', true),
(4, 1, 'academic_years', 'delete', 'Delete academic years', true),
(5, 1, 'academic_years', 'list', 'List all academic years', true)
ON CONFLICT (id) DO NOTHING;

-- Create permission templates (Admin gets all, others get read only)
INSERT INTO public.permission_templates (id, role_template_id, menu_id, can_view, can_edit, is_active) VALUES
(1, 1, 1, true, true, true),   -- Admin: view + edit
(2, 2, 1, true, false, true),  -- Teacher: view only
(3, 3, 1, true, false, true),  -- Student: view only
(4, 4, 1, true, false, true),  -- Parent: view only
(5, 5, 1, true, false, true)   -- Staff: view only
ON CONFLICT (id) DO NOTHING;

-- Grant all plans access to Academic Years menu
INSERT INTO public.plan_menu_access (id, plan_id, menu_id, is_active) VALUES
(1, 1, 1, true),  -- Standard plan
(2, 2, 1, true)   -- Premium plan
ON CONFLICT (id) DO NOTHING;

-- Verify the data
SELECT 'Role Templates:' as section;
SELECT id, name, description FROM public.role_templates ORDER BY id;

SELECT 'Menu Actions:' as section;
SELECT ma.id, ma.resource_name, ma.action_name FROM public.menu_actions ma ORDER BY ma.id;

SELECT 'Permission Templates:' as section;
SELECT rt.name as role_name, pt.can_view, pt.can_edit 
FROM public.permission_templates pt
JOIN public.role_templates rt ON pt.role_template_id = rt.id
ORDER BY rt.id;
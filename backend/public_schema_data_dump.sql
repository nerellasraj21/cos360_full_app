--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: menus; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.menus VALUES (2, 'Dashboard', '/dashboard', 'L0', NULL);
INSERT INTO public.menus VALUES (3, 'Masters', '/masters', 'L0', NULL);
INSERT INTO public.menus VALUES (16, 'Students', '/students', 'L0', NULL);
INSERT INTO public.menus VALUES (23, 'Fee Management', '/fees', 'L0', NULL);
INSERT INTO public.menus VALUES (33, 'Transport', '/transport', 'L0', NULL);
INSERT INTO public.menus VALUES (39, 'Reports', '/reports', 'L0', NULL);
INSERT INTO public.menus VALUES (45, 'Administration', '/admin', 'L0', NULL);
INSERT INTO public.menus VALUES (4, 'Classes', '/masters/classes', 'L1', 3);
INSERT INTO public.menus VALUES (5, 'Sections', '/masters/sections', 'L1', 3);
INSERT INTO public.menus VALUES (6, 'Staff Management', '/masters/staff', 'L1', 3);
INSERT INTO public.menus VALUES (7, 'Staff Attendance', '/masters/staff-attendance', 'L1', 3);
INSERT INTO public.menus VALUES (8, 'Designations', '/masters/designations', 'L1', 3);
INSERT INTO public.menus VALUES (9, 'Subjects', '/masters/subjects', 'L1', 3);
INSERT INTO public.menus VALUES (10, 'Subject Categories', '/masters/subject-categories', 'L1', 3);
INSERT INTO public.menus VALUES (11, 'Class Subject Mappings', '/masters/class-subject-mappings', 'L1', 3);
INSERT INTO public.menus VALUES (12, 'Holiday Management', '/masters/holiday-management', 'L1', 3);
INSERT INTO public.menus VALUES (13, 'Holidays', '/masters/holidays', 'L1', 3);
INSERT INTO public.menus VALUES (14, 'Parents', '/masters/parents', 'L1', 3);
INSERT INTO public.menus VALUES (15, 'Timetable Management', '/masters/timetable-management', 'L1', 3);
INSERT INTO public.menus VALUES (1, 'Academic Years', '/masters/academic-years', 'L1', 3);
INSERT INTO public.menus VALUES (17, 'Student Admissions', '/students/admissions', 'L1', 16);
INSERT INTO public.menus VALUES (18, 'Student Attendance', '/students/attendance', 'L1', 16);
INSERT INTO public.menus VALUES (19, 'Student Documents', '/students/documents', 'L1', 16);
INSERT INTO public.menus VALUES (20, 'Student Certificates', '/students/certificates', 'L1', 16);
INSERT INTO public.menus VALUES (21, 'Certificate Types', '/students/certificate-types', 'L1', 16);
INSERT INTO public.menus VALUES (22, 'Student Transport', '/students/transport', 'L1', 16);
INSERT INTO public.menus VALUES (24, 'Fee Categories', '/fees/categories', 'L1', 23);
INSERT INTO public.menus VALUES (25, 'Fee Types', '/fees/types', 'L1', 23);
INSERT INTO public.menus VALUES (26, 'Fee Terms', '/fees/terms', 'L1', 23);
INSERT INTO public.menus VALUES (27, 'Fee Class Mappings', '/fees/class-mappings', 'L1', 23);
INSERT INTO public.menus VALUES (28, 'Fee Student Mappings', '/fees/student-mappings', 'L1', 23);
INSERT INTO public.menus VALUES (29, 'Fee Term Amounts', '/fees/term-amounts', 'L1', 23);
INSERT INTO public.menus VALUES (30, 'Fee Collection', '/fees/transactions', 'L1', 23);
INSERT INTO public.menus VALUES (31, 'Fee Receipts', '/fees/receipts', 'L1', 23);
INSERT INTO public.menus VALUES (32, 'Fee Refunds', '/fees/refunds', 'L1', 23);
INSERT INTO public.menus VALUES (34, 'Routes', '/transport/routes', 'L1', 33);
INSERT INTO public.menus VALUES (35, 'Route Stops', '/transport/route-stops', 'L1', 33);
INSERT INTO public.menus VALUES (36, 'Vehicles', '/transport/vehicles', 'L1', 33);
INSERT INTO public.menus VALUES (37, 'Transport Routes', '/transport/transport-routes', 'L1', 33);
INSERT INTO public.menus VALUES (38, 'Transport Trips', '/transport/trips', 'L1', 33);
INSERT INTO public.menus VALUES (40, 'Student Reports', '/reports/students', 'L1', 39);
INSERT INTO public.menus VALUES (41, 'Fee Reports', '/reports/fees', 'L1', 39);
INSERT INTO public.menus VALUES (42, 'Staff Reports', '/reports/staff', 'L1', 39);
INSERT INTO public.menus VALUES (43, 'Transport Reports', '/reports/transport', 'L1', 39);
INSERT INTO public.menus VALUES (44, 'Academic Reports', '/reports/academic', 'L1', 39);
INSERT INTO public.menus VALUES (46, 'User Management', '/admin/users', 'L1', 45);
INSERT INTO public.menus VALUES (47, 'Role Management', '/admin/roles', 'L1', 45);
INSERT INTO public.menus VALUES (48, 'Permission Management', '/admin/permissions', 'L1', 45);
INSERT INTO public.menus VALUES (49, 'Menu Management', '/admin/menus', 'L1', 45);


--
-- Data for Name: menu_actions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.menu_actions VALUES (1, 1, 'create', 'academic_years', 'Create new academic years', true);
INSERT INTO public.menu_actions VALUES (2, 1, 'read', 'academic_years', 'View academic year details', true);
INSERT INTO public.menu_actions VALUES (3, 1, 'update', 'academic_years', 'Update academic year information', true);
INSERT INTO public.menu_actions VALUES (4, 1, 'delete', 'academic_years', 'Delete academic years', true);
INSERT INTO public.menu_actions VALUES (5, 1, 'list', 'academic_years', 'List all academic years', true);


--
-- Data for Name: plans; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.plans VALUES (1, 'Basic', 'Basic school management features - Academic records, limited fee management', true);
INSERT INTO public.plans VALUES (2, 'Standard', 'Standard school management - Full fee management, basic transport', true);
INSERT INTO public.plans VALUES (3, 'Premium', 'Premium features - Full system access except system administration', true);
INSERT INTO public.plans VALUES (4, 'Enterprise', 'Enterprise features - Complete system access including administration', true);


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: role_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.role_templates VALUES (1, 'Admin', 'System administrator with full access', 'system', true, true);
INSERT INTO public.role_templates VALUES (2, 'Teacher', 'Teaching staff with academic management access', 'academic', true, true);
INSERT INTO public.role_templates VALUES (3, 'Student', 'Student with limited read access', 'academic', true, true);
INSERT INTO public.role_templates VALUES (4, 'Parent', 'Parent with access to child information', 'academic', true, true);
INSERT INTO public.role_templates VALUES (5, 'Staff', 'Administrative staff with operational access', 'administrative', true, true);


--
-- Data for Name: permission_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.permission_templates VALUES (1, 1, 1, true, true, true);
INSERT INTO public.permission_templates VALUES (2, 2, 1, true, false, true);
INSERT INTO public.permission_templates VALUES (3, 3, 1, true, false, true);
INSERT INTO public.permission_templates VALUES (4, 4, 1, true, false, true);
INSERT INTO public.permission_templates VALUES (5, 5, 1, true, false, true);


--
-- Data for Name: plan_menu_access; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.plan_menu_access VALUES (3, 1, 2, true);
INSERT INTO public.plan_menu_access VALUES (4, 1, 16, true);
INSERT INTO public.plan_menu_access VALUES (5, 1, 39, true);
INSERT INTO public.plan_menu_access VALUES (6, 1, 4, true);
INSERT INTO public.plan_menu_access VALUES (7, 1, 1, true);
INSERT INTO public.plan_menu_access VALUES (8, 1, 17, true);
INSERT INTO public.plan_menu_access VALUES (9, 1, 18, true);
INSERT INTO public.plan_menu_access VALUES (10, 1, 40, true);
INSERT INTO public.plan_menu_access VALUES (11, 1, 44, true);
INSERT INTO public.plan_menu_access VALUES (12, 2, 2, true);
INSERT INTO public.plan_menu_access VALUES (13, 2, 3, true);
INSERT INTO public.plan_menu_access VALUES (14, 2, 16, true);
INSERT INTO public.plan_menu_access VALUES (15, 2, 23, true);
INSERT INTO public.plan_menu_access VALUES (16, 2, 39, true);
INSERT INTO public.plan_menu_access VALUES (17, 2, 4, true);
INSERT INTO public.plan_menu_access VALUES (18, 2, 5, true);
INSERT INTO public.plan_menu_access VALUES (19, 2, 6, true);
INSERT INTO public.plan_menu_access VALUES (20, 2, 9, true);
INSERT INTO public.plan_menu_access VALUES (21, 2, 14, true);
INSERT INTO public.plan_menu_access VALUES (22, 2, 1, true);
INSERT INTO public.plan_menu_access VALUES (23, 2, 17, true);
INSERT INTO public.plan_menu_access VALUES (24, 2, 18, true);
INSERT INTO public.plan_menu_access VALUES (25, 2, 19, true);
INSERT INTO public.plan_menu_access VALUES (26, 2, 24, true);
INSERT INTO public.plan_menu_access VALUES (27, 2, 25, true);
INSERT INTO public.plan_menu_access VALUES (28, 2, 26, true);
INSERT INTO public.plan_menu_access VALUES (29, 2, 27, true);
INSERT INTO public.plan_menu_access VALUES (30, 2, 30, true);
INSERT INTO public.plan_menu_access VALUES (31, 2, 31, true);
INSERT INTO public.plan_menu_access VALUES (32, 2, 40, true);
INSERT INTO public.plan_menu_access VALUES (33, 2, 41, true);
INSERT INTO public.plan_menu_access VALUES (34, 2, 44, true);
INSERT INTO public.plan_menu_access VALUES (35, 3, 2, true);
INSERT INTO public.plan_menu_access VALUES (36, 3, 3, true);
INSERT INTO public.plan_menu_access VALUES (37, 3, 16, true);
INSERT INTO public.plan_menu_access VALUES (38, 3, 23, true);
INSERT INTO public.plan_menu_access VALUES (39, 3, 33, true);
INSERT INTO public.plan_menu_access VALUES (40, 3, 39, true);
INSERT INTO public.plan_menu_access VALUES (41, 3, 4, true);
INSERT INTO public.plan_menu_access VALUES (42, 3, 5, true);
INSERT INTO public.plan_menu_access VALUES (43, 3, 6, true);
INSERT INTO public.plan_menu_access VALUES (44, 3, 7, true);
INSERT INTO public.plan_menu_access VALUES (45, 3, 8, true);
INSERT INTO public.plan_menu_access VALUES (46, 3, 9, true);
INSERT INTO public.plan_menu_access VALUES (47, 3, 10, true);
INSERT INTO public.plan_menu_access VALUES (48, 3, 11, true);
INSERT INTO public.plan_menu_access VALUES (49, 3, 12, true);
INSERT INTO public.plan_menu_access VALUES (50, 3, 13, true);
INSERT INTO public.plan_menu_access VALUES (51, 3, 14, true);
INSERT INTO public.plan_menu_access VALUES (52, 3, 15, true);
INSERT INTO public.plan_menu_access VALUES (53, 3, 1, true);
INSERT INTO public.plan_menu_access VALUES (54, 3, 17, true);
INSERT INTO public.plan_menu_access VALUES (55, 3, 18, true);
INSERT INTO public.plan_menu_access VALUES (56, 3, 19, true);
INSERT INTO public.plan_menu_access VALUES (57, 3, 20, true);
INSERT INTO public.plan_menu_access VALUES (58, 3, 21, true);
INSERT INTO public.plan_menu_access VALUES (59, 3, 22, true);
INSERT INTO public.plan_menu_access VALUES (60, 3, 24, true);
INSERT INTO public.plan_menu_access VALUES (61, 3, 25, true);
INSERT INTO public.plan_menu_access VALUES (62, 3, 26, true);
INSERT INTO public.plan_menu_access VALUES (63, 3, 27, true);
INSERT INTO public.plan_menu_access VALUES (64, 3, 28, true);
INSERT INTO public.plan_menu_access VALUES (65, 3, 29, true);
INSERT INTO public.plan_menu_access VALUES (66, 3, 30, true);
INSERT INTO public.plan_menu_access VALUES (67, 3, 31, true);
INSERT INTO public.plan_menu_access VALUES (68, 3, 32, true);
INSERT INTO public.plan_menu_access VALUES (69, 3, 34, true);
INSERT INTO public.plan_menu_access VALUES (70, 3, 35, true);
INSERT INTO public.plan_menu_access VALUES (71, 3, 36, true);
INSERT INTO public.plan_menu_access VALUES (72, 3, 37, true);
INSERT INTO public.plan_menu_access VALUES (73, 3, 38, true);
INSERT INTO public.plan_menu_access VALUES (74, 3, 40, true);
INSERT INTO public.plan_menu_access VALUES (75, 3, 41, true);
INSERT INTO public.plan_menu_access VALUES (76, 3, 42, true);
INSERT INTO public.plan_menu_access VALUES (77, 3, 43, true);
INSERT INTO public.plan_menu_access VALUES (78, 3, 44, true);
INSERT INTO public.plan_menu_access VALUES (79, 4, 2, true);
INSERT INTO public.plan_menu_access VALUES (80, 4, 3, true);
INSERT INTO public.plan_menu_access VALUES (81, 4, 16, true);
INSERT INTO public.plan_menu_access VALUES (82, 4, 23, true);
INSERT INTO public.plan_menu_access VALUES (83, 4, 33, true);
INSERT INTO public.plan_menu_access VALUES (84, 4, 39, true);
INSERT INTO public.plan_menu_access VALUES (85, 4, 45, true);
INSERT INTO public.plan_menu_access VALUES (86, 4, 4, true);
INSERT INTO public.plan_menu_access VALUES (87, 4, 5, true);
INSERT INTO public.plan_menu_access VALUES (88, 4, 6, true);
INSERT INTO public.plan_menu_access VALUES (89, 4, 7, true);
INSERT INTO public.plan_menu_access VALUES (90, 4, 8, true);
INSERT INTO public.plan_menu_access VALUES (91, 4, 9, true);
INSERT INTO public.plan_menu_access VALUES (92, 4, 10, true);
INSERT INTO public.plan_menu_access VALUES (93, 4, 11, true);
INSERT INTO public.plan_menu_access VALUES (94, 4, 12, true);
INSERT INTO public.plan_menu_access VALUES (95, 4, 13, true);
INSERT INTO public.plan_menu_access VALUES (96, 4, 14, true);
INSERT INTO public.plan_menu_access VALUES (97, 4, 15, true);
INSERT INTO public.plan_menu_access VALUES (98, 4, 1, true);
INSERT INTO public.plan_menu_access VALUES (99, 4, 17, true);
INSERT INTO public.plan_menu_access VALUES (100, 4, 18, true);
INSERT INTO public.plan_menu_access VALUES (101, 4, 19, true);
INSERT INTO public.plan_menu_access VALUES (102, 4, 20, true);
INSERT INTO public.plan_menu_access VALUES (103, 4, 21, true);
INSERT INTO public.plan_menu_access VALUES (104, 4, 22, true);
INSERT INTO public.plan_menu_access VALUES (105, 4, 24, true);
INSERT INTO public.plan_menu_access VALUES (106, 4, 25, true);
INSERT INTO public.plan_menu_access VALUES (107, 4, 26, true);
INSERT INTO public.plan_menu_access VALUES (108, 4, 27, true);
INSERT INTO public.plan_menu_access VALUES (109, 4, 28, true);
INSERT INTO public.plan_menu_access VALUES (110, 4, 29, true);
INSERT INTO public.plan_menu_access VALUES (111, 4, 30, true);
INSERT INTO public.plan_menu_access VALUES (112, 4, 31, true);
INSERT INTO public.plan_menu_access VALUES (113, 4, 32, true);
INSERT INTO public.plan_menu_access VALUES (114, 4, 34, true);
INSERT INTO public.plan_menu_access VALUES (115, 4, 35, true);
INSERT INTO public.plan_menu_access VALUES (116, 4, 36, true);
INSERT INTO public.plan_menu_access VALUES (117, 4, 37, true);
INSERT INTO public.plan_menu_access VALUES (118, 4, 38, true);
INSERT INTO public.plan_menu_access VALUES (119, 4, 40, true);
INSERT INTO public.plan_menu_access VALUES (120, 4, 41, true);
INSERT INTO public.plan_menu_access VALUES (121, 4, 42, true);
INSERT INTO public.plan_menu_access VALUES (122, 4, 43, true);
INSERT INTO public.plan_menu_access VALUES (123, 4, 44, true);
INSERT INTO public.plan_menu_access VALUES (124, 4, 46, true);
INSERT INTO public.plan_menu_access VALUES (125, 4, 47, true);
INSERT INTO public.plan_menu_access VALUES (126, 4, 48, true);
INSERT INTO public.plan_menu_access VALUES (127, 4, 49, true);


--
-- Data for Name: plan_resource_access; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.plan_resource_access VALUES (7, 2, 'academic_years', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (8, 2, 'classes', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (9, 2, 'subjects', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (10, 2, 'sections', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (11, 2, 'subject_categories', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (12, 2, 'student_admissions', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (13, 2, 'student_attendance', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (14, 2, 'student_certificates', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (15, 2, 'student_documents', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (16, 2, 'fee_categories', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (17, 2, 'fee_types', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (18, 2, 'fee_terms', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (19, 2, 'fee_class_mappings', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (20, 2, 'fee_student_mappings', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (21, 2, 'transport_routes', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (22, 2, 'transport_vehicles', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (23, 2, 'route_stops', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (24, 2, 'student_transport', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (25, 2, 'holidays', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (26, 2, 'parents', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (27, 3, 'academic_years', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (28, 3, 'classes', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (29, 3, 'subjects', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (30, 3, 'sections', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (31, 3, 'subject_categories', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (32, 3, 'student_admissions', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (33, 3, 'student_attendance', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (34, 3, 'student_certificates', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (35, 3, 'student_documents', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (36, 3, 'fee_categories', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (37, 3, 'fee_types', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (38, 3, 'fee_terms', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (39, 3, 'fee_class_mappings', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (40, 3, 'fee_student_mappings', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (41, 3, 'transport_routes', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (42, 3, 'transport_vehicles', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (43, 3, 'route_stops', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (44, 3, 'student_transport', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (45, 3, 'holidays', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (46, 3, 'parents', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (47, 3, 'transport_trips', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (48, 3, 'fee_term_amounts', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (49, 3, 'timetable_management', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (51, 4, 'classes', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (52, 4, 'subjects', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (53, 4, 'sections', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (54, 4, 'subject_categories', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (55, 4, 'student_admissions', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (56, 4, 'student_attendance', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (57, 4, 'student_certificates', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (58, 4, 'student_documents', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (59, 4, 'fee_categories', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (60, 4, 'fee_types', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (61, 4, 'fee_terms', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (50, 4, 'academic_years', '{create,read,list,update,delete}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (62, 4, 'fee_class_mappings', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (63, 4, 'fee_student_mappings', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (64, 4, 'transport_routes', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (65, 4, 'transport_vehicles', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (66, 4, 'route_stops', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (67, 4, 'student_transport', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (68, 4, 'holidays', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (69, 4, 'parents', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (70, 4, 'transport_trips', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (71, 4, 'fee_term_amounts', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (72, 4, 'timetable_management', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (73, 4, 'role_management', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (74, 4, 'permission_management', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (75, 4, 'menu_management', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (76, 4, 'staff', '{create,read,update,delete,list}', true, '2025-09-07 11:15:46.577243');
INSERT INTO public.plan_resource_access VALUES (77, 1, 'academic_years', '{create,read,update,delete,list}', true, '2025-09-07 21:34:56.48757');
INSERT INTO public.plan_resource_access VALUES (78, 1, 'classes', '{create,read,update,delete,list}', true, '2025-09-07 21:34:56.48757');
INSERT INTO public.plan_resource_access VALUES (79, 1, 'subjects', '{create,read,update,delete,list}', true, '2025-09-07 21:34:56.48757');
INSERT INTO public.plan_resource_access VALUES (80, 1, 'sections', '{create,read,update,delete,list}', true, '2025-09-07 21:34:56.48757');
INSERT INTO public.plan_resource_access VALUES (81, 1, 'subject_categories', '{create,read,update,delete,list}', true, '2025-09-07 21:34:56.48757');
INSERT INTO public.plan_resource_access VALUES (82, 1, 'student_admissions', '{create,read,update,delete,list}', true, '2025-09-07 21:34:56.48757');
INSERT INTO public.plan_resource_access VALUES (83, 1, 'student_attendance', '{create,read,update,delete,list}', true, '2025-09-07 21:34:56.48757');
INSERT INTO public.plan_resource_access VALUES (84, 1, 'student_certificates', '{create,read,update,delete,list}', true, '2025-09-07 21:34:56.48757');
INSERT INTO public.plan_resource_access VALUES (85, 1, 'student_documents', '{create,read,update,delete,list}', true, '2025-09-07 21:34:56.48757');
INSERT INTO public.plan_resource_access VALUES (86, 1, 'fee_categories', '{create,read,update,delete,list}', true, '2025-09-07 21:34:56.48757');
INSERT INTO public.plan_resource_access VALUES (87, 1, 'fee_types', '{create,read,update,delete,list}', true, '2025-09-07 21:34:56.48757');
INSERT INTO public.plan_resource_access VALUES (88, 1, 'fee_terms', '{create,read,update,delete,list}', true, '2025-09-07 21:34:56.48757');
INSERT INTO public.plan_resource_access VALUES (89, 1, 'fee_class_mappings', '{create,read,update,delete,list}', true, '2025-09-07 21:34:56.48757');
INSERT INTO public.plan_resource_access VALUES (90, 1, 'fee_student_mappings', '{create,read,update,delete,list}', true, '2025-09-07 21:34:56.48757');
INSERT INTO public.plan_resource_access VALUES (91, 1, 'transport_routes', '{create,read,update,delete,list}', true, '2025-09-07 21:34:56.48757');
INSERT INTO public.plan_resource_access VALUES (92, 1, 'transport_vehicles', '{create,read,update,delete,list}', true, '2025-09-07 21:34:56.48757');
INSERT INTO public.plan_resource_access VALUES (93, 1, 'route_stops', '{create,read,update,delete,list}', true, '2025-09-07 21:34:56.48757');
INSERT INTO public.plan_resource_access VALUES (94, 1, 'student_transport', '{create,read,update,delete,list}', true, '2025-09-07 21:34:56.48757');
INSERT INTO public.plan_resource_access VALUES (95, 1, 'holidays', '{create,read,update,delete,list}', true, '2025-09-07 21:34:56.48757');
INSERT INTO public.plan_resource_access VALUES (96, 1, 'parents', '{create,read,update,delete,list}', true, '2025-09-07 21:34:56.48757');
INSERT INTO public.plan_resource_access VALUES (97, 1, 'transport_trips', '{create,read,update,delete,list}', true, '2025-09-07 21:34:56.48757');
INSERT INTO public.plan_resource_access VALUES (98, 1, 'fee_term_amounts', '{create,read,update,delete,list}', true, '2025-09-07 21:34:56.48757');
INSERT INTO public.plan_resource_access VALUES (99, 1, 'timetable_management', '{create,read,update,delete,list}', true, '2025-09-07 21:34:56.48757');
INSERT INTO public.plan_resource_access VALUES (100, 1, 'role_management', '{create,read,update,delete,list}', true, '2025-09-07 21:34:56.48757');
INSERT INTO public.plan_resource_access VALUES (101, 1, 'permission_management', '{create,read,update,delete,list}', true, '2025-09-07 21:34:56.48757');
INSERT INTO public.plan_resource_access VALUES (102, 1, 'menu_management', '{create,read,update,delete,list}', true, '2025-09-07 21:34:56.48757');
INSERT INTO public.plan_resource_access VALUES (103, 1, 'staff', '{create,read,update,delete,list}', true, '2025-09-07 21:34:56.48757');
INSERT INTO public.plan_resource_access VALUES (104, 4, 'holiday_management', '{create,read,update,delete,list}', true, '2025-09-07 21:52:50.86718');
INSERT INTO public.plan_resource_access VALUES (105, 4, 'routes', '{create,read,update,delete,list}', true, '2025-09-08 18:18:51.487835');
INSERT INTO public.plan_resource_access VALUES (106, 4, 'vehicles', '{create,read,update,delete,list}', true, '2025-09-08 18:41:20.664924');
INSERT INTO public.plan_resource_access VALUES (108, 4, 'class_subject_mappings', '{create,read,update,delete,list}', true, '2025-09-09 21:57:20.867727');
INSERT INTO public.plan_resource_access VALUES (109, 1, 'certificate_types', '{read,list}', true, '2025-09-10 12:15:35.99657');
INSERT INTO public.plan_resource_access VALUES (110, 2, 'certificate_types', '{create,read,update,delete,list}', true, '2025-09-10 12:15:35.99657');
INSERT INTO public.plan_resource_access VALUES (111, 3, 'certificate_types', '{create,read,update,delete,list}', true, '2025-09-10 12:15:35.99657');
INSERT INTO public.plan_resource_access VALUES (112, 4, 'certificate_types', '{create,read,update,delete,list}', true, '2025-09-10 12:15:35.99657');
INSERT INTO public.plan_resource_access VALUES (113, 1, 'designations', '{read,list}', true, '2025-09-10 12:38:32.587564');
INSERT INTO public.plan_resource_access VALUES (114, 2, 'designations', '{create,read,update,delete,list}', true, '2025-09-10 12:38:32.587564');
INSERT INTO public.plan_resource_access VALUES (115, 3, 'designations', '{create,read,update,delete,list}', true, '2025-09-10 12:38:32.587564');
INSERT INTO public.plan_resource_access VALUES (116, 4, 'designations', '{create,read,update,delete,list}', true, '2025-09-10 12:38:32.587564');
INSERT INTO public.plan_resource_access VALUES (117, 4, 'staff_attendance', '{create,read,update,delete,list}', true, '2025-09-10 15:53:41.171118');
INSERT INTO public.plan_resource_access VALUES (118, 4, 'students', '{create,read,update,delete,list}', true, '2025-09-11 10:37:12.017687');
INSERT INTO public.plan_resource_access VALUES (119, 4, 'fee_transactions', '{create,read,update,delete,list}', true, '2025-09-12 12:40:11.325372');
INSERT INTO public.plan_resource_access VALUES (120, 4, 'fee_receipts', '{create,read,update,delete,list}', true, '2025-09-12 12:40:11.325372');
INSERT INTO public.plan_resource_access VALUES (121, 4, 'fee_refunds', '{create,read,update,delete,list,approve,process}', true, '2025-09-12 12:40:11.325372');
INSERT INTO public.plan_resource_access VALUES (122, 4, 'expense_categories', '{create,read,update,delete,list}', true, '2025-09-15 13:26:27.000652');
INSERT INTO public.plan_resource_access VALUES (123, 4, 'expense_types', '{create,read,update,delete,list}', true, '2025-09-15 13:28:00.189509');
INSERT INTO public.plan_resource_access VALUES (124, 4, 'expense_transactions', '{create,read,update,delete,list}', true, '2025-09-15 13:28:31.140462');
INSERT INTO public.plan_resource_access VALUES (125, 4, 'expense_transaction_items', '{create,read,update,delete,list}', true, '2025-09-15 13:29:06.493937');
INSERT INTO public.plan_resource_access VALUES (126, 4, 'expense_attachments', '{create,read,update,delete,list}', true, '2025-09-15 13:29:38.817687');
INSERT INTO public.plan_resource_access VALUES (127, 4, 'expense_settings', '{create,read,update,delete,list}', true, '2025-09-15 13:30:06.252557');
INSERT INTO public.plan_resource_access VALUES (128, 4, 'expense_audit_logs', '{create,read,list}', true, '2025-09-15 13:30:26.027591');
INSERT INTO public.plan_resource_access VALUES (129, 4, 'expense_reports', '{create,read,update,list,delete}', true, '2025-09-15 13:30:49.435999');


--
-- Data for Name: super_admin_audit; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.super_admin_audit VALUES ('fe4c75eb-0306-4c07-b124-6a086241dc98', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'SYSTEM_SETUP', 'super_admin_user', NULL, NULL, 'Initial Super Admin user created via API', NULL, NULL, '2025-09-13 16:41:51.981781');
INSERT INTO public.super_admin_audit VALUES ('8ed5ce55-4277-48a9-88b6-d8e91ec9263e', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LOGIN', 'authentication', NULL, NULL, '{"ip_address": "127.0.0.1"}', '127.0.0.1', NULL, '2025-09-13 16:42:03.379821');
INSERT INTO public.super_admin_audit VALUES ('5d98324b-0367-408c-91dc-b338b74064ec', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LIST_TENANTS', 'tenant', NULL, NULL, '{"filter_active": null, "count": 3}', '127.0.0.1', NULL, '2025-09-13 16:42:36.276667');
INSERT INTO public.super_admin_audit VALUES ('8391003d-9d6a-41ee-806c-68be77b2b576', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LIST_PLANS', 'plan', NULL, NULL, '{"include_resources": false, "plan_count": 4}', '127.0.0.1', NULL, '2025-09-13 16:42:46.627775');
INSERT INTO public.super_admin_audit VALUES ('c12d6942-33c7-4096-bfa5-f873bd248abe', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LOGIN', 'authentication', NULL, NULL, '{"ip_address": "127.0.0.1"}', '127.0.0.1', NULL, '2025-09-13 21:07:11.48868');
INSERT INTO public.super_admin_audit VALUES ('4289e1d2-c72f-4917-ad36-155090bf1c3f', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'VIEW_PLAN_RESOURCES', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_count": 38}', '127.0.0.1', NULL, '2025-09-13 21:07:13.813569');
INSERT INTO public.super_admin_audit VALUES ('bb7f6f51-ac35-4f1f-b1c8-025d1840b910', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LOGIN', 'authentication', NULL, NULL, '{"ip_address": "127.0.0.1"}', '127.0.0.1', NULL, '2025-09-13 21:11:06.812163');
INSERT INTO public.super_admin_audit VALUES ('c2a2f82c-49da-43d1-bd24-63f4f1d26cea', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'VIEW_PLAN_RESOURCES', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_count": 38}', '127.0.0.1', NULL, '2025-09-13 21:11:09.057062');
INSERT INTO public.super_admin_audit VALUES ('8b443979-6b19-4c48-85f0-5f741e7c661c', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'REMOVE_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "academic_years", "action_name": "update", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-13 21:11:11.343709');
INSERT INTO public.super_admin_audit VALUES ('514d58a8-3761-4a8f-b263-b9a75eecbfdd', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'REMOVE_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "academic_years", "action_name": "delete", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-13 21:11:13.622011');
INSERT INTO public.super_admin_audit VALUES ('a7e7d192-2ef1-4763-bf44-540a21f49cea', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'VIEW_PLAN_RESOURCES', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_count": 38}', '127.0.0.1', NULL, '2025-09-13 21:11:15.86036');
INSERT INTO public.super_admin_audit VALUES ('7d86c7fc-5163-47c4-8944-598b5900708a', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ADD_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "academic_years", "action_name": "update", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-13 21:11:18.159925');
INSERT INTO public.super_admin_audit VALUES ('ad86c14a-80ba-40ce-ac09-d1be13a988d2', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ADD_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "academic_years", "action_name": "delete", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-13 21:11:20.433112');
INSERT INTO public.super_admin_audit VALUES ('8f34c5be-d8c4-4cd2-9e08-bb499093e533', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'VIEW_PLAN_RESOURCES', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_count": 38}', '127.0.0.1', NULL, '2025-09-13 21:11:22.681056');
INSERT INTO public.super_admin_audit VALUES ('0f889ae4-03a2-4580-bee5-1d57ac295aa1', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LOGIN', 'authentication', NULL, NULL, '{"ip_address": "127.0.0.1"}', '127.0.0.1', NULL, '2025-09-13 21:11:25.492059');
INSERT INTO public.super_admin_audit VALUES ('40ffe2d1-cefe-47af-9040-0bb069ad3a16', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'VIEW_PLAN_RESOURCES', 'plan', '1', NULL, '{"plan_name": "Basic", "resource_count": 29}', '127.0.0.1', NULL, '2025-09-13 21:11:27.851264');
INSERT INTO public.super_admin_audit VALUES ('db13ca63-37b7-4cdd-bba0-e97264377f0d', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'VIEW_PLAN_RESOURCES', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_count": 38}', '127.0.0.1', NULL, '2025-09-13 21:11:30.091309');
INSERT INTO public.super_admin_audit VALUES ('f029e4dc-1a46-40c8-9e93-02e2e1081602', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LOGIN', 'authentication', NULL, NULL, '{"ip_address": "127.0.0.1"}', '127.0.0.1', NULL, '2025-09-13 21:17:11.562849');
INSERT INTO public.super_admin_audit VALUES ('5d77a6f4-6b47-429f-851f-6e0e2fa4fff2', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'REMOVE_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "academic_years", "action_name": "update", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-13 21:17:23.744918');
INSERT INTO public.super_admin_audit VALUES ('4f23c182-05c5-4997-85b9-12a2d4dd75aa', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'REMOVE_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "academic_years", "action_name": "delete", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-13 21:17:36.024908');
INSERT INTO public.super_admin_audit VALUES ('bf8e44bb-7ddd-4f2e-b23e-2f828d46a3de', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ADD_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "academic_years", "action_name": "update", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-13 21:17:48.197807');
INSERT INTO public.super_admin_audit VALUES ('7dac1a22-99b7-4ac8-a3e9-9bdd328fe921', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ADD_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "academic_years", "action_name": "delete", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-13 21:17:50.3617');
INSERT INTO public.super_admin_audit VALUES ('4c8f0e6e-d08c-434d-853f-4cb7f837c382', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LOGIN', 'authentication', NULL, NULL, '{"ip_address": "127.0.0.1"}', '127.0.0.1', NULL, '2025-09-13 21:28:10.859781');
INSERT INTO public.super_admin_audit VALUES ('8ed1bf8c-8e7b-4093-a1ae-5c1f178493b6', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LOGIN', 'authentication', NULL, NULL, '{"ip_address": "127.0.0.1"}', '127.0.0.1', NULL, '2025-09-13 21:51:18.35623');
INSERT INTO public.super_admin_audit VALUES ('83a99d80-5c6f-4148-a220-890bf893f3c0', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LIST_TENANTS', 'tenant', NULL, NULL, '{"filter_active": null, "count": 3}', '127.0.0.1', NULL, '2025-09-13 21:51:20.505842');
INSERT INTO public.super_admin_audit VALUES ('3d3fa625-c15e-4b4d-aadc-d9b96fcf38ec', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'CREATE_TENANT', 'tenant', '5', 'test_menu_sync_schema', '{"client_name": "test_menu_sync_tenant", "schema_name": "test_menu_sync_schema"}', '127.0.0.1', NULL, '2025-09-13 21:51:22.730251');
INSERT INTO public.super_admin_audit VALUES ('9fedb27c-9420-4b3b-9431-6bc0752812d9', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LOGIN', 'authentication', NULL, NULL, '{"ip_address": "127.0.0.1"}', '127.0.0.1', NULL, '2025-09-13 21:51:53.535332');
INSERT INTO public.super_admin_audit VALUES ('21cc17d1-e2a0-4216-bd7f-e8c6f586ec11', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LIST_TENANTS', 'tenant', NULL, NULL, '{"filter_active": null, "count": 4}', '127.0.0.1', NULL, '2025-09-13 21:51:55.671332');
INSERT INTO public.super_admin_audit VALUES ('b92ab182-ad8a-41bb-bab8-16c4257fece4', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'CREATE_TENANT', 'tenant', '6', 'test_menu_sync_schema2', '{"client_name": "test_menu_sync_tenant2", "schema_name": "test_menu_sync_schema2"}', '127.0.0.1', NULL, '2025-09-13 21:51:57.861035');
INSERT INTO public.super_admin_audit VALUES ('4214ca1d-00e5-4bfa-8c11-5e515e211d25', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LIST_TENANTS', 'tenant', NULL, NULL, '{"filter_active": null, "count": 5}', '127.0.0.1', NULL, '2025-09-13 21:52:02.135718');
INSERT INTO public.super_admin_audit VALUES ('ea5bbacb-2b9d-4700-b535-8104f61bfedb', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LOGIN', 'authentication', NULL, NULL, '{"ip_address": "127.0.0.1"}', '127.0.0.1', NULL, '2025-09-13 22:13:57.678562');
INSERT INTO public.super_admin_audit VALUES ('f1a5b006-cb6c-4417-a642-07dd84ee0d90', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LIST_TENANTS', 'tenant', NULL, NULL, '{"filter_active": null, "count": 5}', '127.0.0.1', NULL, '2025-09-13 22:13:59.82855');
INSERT INTO public.super_admin_audit VALUES ('25b6252b-497f-42a0-a544-1164d96fef32', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'CREATE_TENANT', 'tenant', '7', 'test_final_menu_schema', '{"client_name": "test_final_menu_sync", "schema_name": "test_final_menu_schema"}', '127.0.0.1', NULL, '2025-09-13 22:14:02.035375');
INSERT INTO public.super_admin_audit VALUES ('d4d4d9be-071d-48d5-9b42-3ee3aeb551a6', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LIST_TENANTS', 'tenant', NULL, NULL, '{"filter_active": null, "count": 6}', '127.0.0.1', NULL, '2025-09-13 22:14:06.223143');
INSERT INTO public.super_admin_audit VALUES ('a1a391f3-1a02-46d7-a5d6-804223af48e7', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LOGIN', 'authentication', NULL, NULL, '{"ip_address": "127.0.0.1"}', '127.0.0.1', NULL, '2025-09-13 22:14:36.780719');
INSERT INTO public.super_admin_audit VALUES ('af8e7e27-44d5-43d0-ad79-7bfe78b762ea', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LIST_PLANS', 'plan', NULL, NULL, '{"include_resources": false, "plan_count": 4}', '127.0.0.1', NULL, '2025-09-13 22:14:38.925535');
INSERT INTO public.super_admin_audit VALUES ('991276e6-7697-4983-a730-aba9d530ebe0', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LOGIN', 'authentication', NULL, NULL, '{"ip_address": "127.0.0.1"}', '127.0.0.1', NULL, '2025-09-13 22:14:56.669392');
INSERT INTO public.super_admin_audit VALUES ('e8caadef-1aed-419e-9580-ea5505ef2540', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LIST_PLANS', 'plan', NULL, NULL, '{"include_resources": false, "plan_count": 4}', '127.0.0.1', NULL, '2025-09-13 22:14:58.815599');
INSERT INTO public.super_admin_audit VALUES ('b574369e-8426-445b-809e-60edf8f086d8', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'VIEW_PLAN_RESOURCES', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_count": 38}', '127.0.0.1', NULL, '2025-09-13 22:15:01.081363');
INSERT INTO public.super_admin_audit VALUES ('c67d7353-beec-4203-97e1-c962a3a6684f', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LOGIN', 'authentication', NULL, NULL, '{"ip_address": "127.0.0.1"}', '127.0.0.1', NULL, '2025-09-13 22:15:18.951159');
INSERT INTO public.super_admin_audit VALUES ('370fac6a-f455-41b2-a56c-7f92579245ac', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LIST_PLANS', 'plan', NULL, NULL, '{"include_resources": false, "plan_count": 4}', '127.0.0.1', NULL, '2025-09-13 22:15:21.113708');
INSERT INTO public.super_admin_audit VALUES ('3ba2b906-44b0-4e3d-ac09-e8c77d227443', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'VIEW_PLAN_RESOURCES', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_count": 38}', '127.0.0.1', NULL, '2025-09-13 22:15:23.264026');
INSERT INTO public.super_admin_audit VALUES ('9eeca20d-fa19-4364-a4d0-3a74b2c92136', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LIST_TENANTS', 'tenant', NULL, NULL, '{"filter_active": null, "count": 6}', '127.0.0.1', NULL, '2025-09-13 22:15:25.409921');
INSERT INTO public.super_admin_audit VALUES ('89cad6ca-93ba-42d4-8dd6-7002b8661c03', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'CREATE_TENANT', 'tenant', '8', 'debug_test_simple_schema', '{"client_name": "debug_test_simple", "schema_name": "debug_test_simple_schema"}', '127.0.0.1', NULL, '2025-09-13 22:15:27.599778');
INSERT INTO public.super_admin_audit VALUES ('f28c86f2-22d2-4556-857e-889558303a90', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'CREATE_TENANT', 'tenant', '9', 'debug_test_with_plan_schema', '{"client_name": "debug_test_with_plan", "schema_name": "debug_test_with_plan_schema"}', '127.0.0.1', NULL, '2025-09-13 22:15:29.781561');
INSERT INTO public.super_admin_audit VALUES ('d6768883-6c99-4592-ad33-80693ac4b209', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LOGIN', 'authentication', NULL, NULL, '{"ip_address": "127.0.0.1"}', '127.0.0.1', NULL, '2025-09-13 22:22:43.84252');
INSERT INTO public.super_admin_audit VALUES ('f06ee7fe-21f8-4ee2-a44d-de7a046915f1', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'CREATE_TENANT', 'tenant', '10', 'test_full_system_schema', '{"client_name": "test_full_system", "schema_name": "test_full_system_schema"}', '127.0.0.1', NULL, '2025-09-13 22:22:46.008413');
INSERT INTO public.super_admin_audit VALUES ('f42b4993-a3c4-4913-9b58-2bea93f3f6a6', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LIST_TENANTS', 'tenant', NULL, NULL, '{"filter_active": null, "count": 9}', '127.0.0.1', NULL, '2025-09-13 22:22:50.20784');
INSERT INTO public.super_admin_audit VALUES ('63ff1e78-3f13-43ca-a432-519f7adca2c5', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LOGIN', 'authentication', NULL, NULL, '{"ip_address": "127.0.0.1"}', '127.0.0.1', NULL, '2025-09-13 22:25:14.625839');
INSERT INTO public.super_admin_audit VALUES ('6d5fc4a1-653a-4d80-a13a-eaf781aa5071', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LOGIN', 'authentication', NULL, NULL, '{"ip_address": "127.0.0.1"}', '127.0.0.1', NULL, '2025-09-13 22:26:01.363273');
INSERT INTO public.super_admin_audit VALUES ('d21725a3-7f06-4d3f-9cee-3538bc70d23b', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'CREATE_TENANT', 'tenant', '11', 'final_test_basic_schema', '{"client_name": "final_test_basic", "schema_name": "final_test_basic_schema"}', '127.0.0.1', NULL, '2025-09-13 22:26:03.530857');
INSERT INTO public.super_admin_audit VALUES ('628e5784-5990-4576-80ae-a2b9ff1fedbb', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'CREATE_TENANT', 'tenant', '12', 'final_test_enterprise_schema', '{"client_name": "final_test_enterprise", "schema_name": "final_test_enterprise_schema"}', '127.0.0.1', NULL, '2025-09-13 22:26:05.815211');
INSERT INTO public.super_admin_audit VALUES ('c42fa909-1461-4a92-b4be-a659f4e41edc', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LIST_TENANTS', 'tenant', NULL, NULL, '{"filter_active": null, "count": 11}', '127.0.0.1', NULL, '2025-09-13 22:26:09.987052');
INSERT INTO public.super_admin_audit VALUES ('c1f61a89-1732-45cf-ab9c-1853ea02dad5', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LOGIN', 'authentication', NULL, NULL, '{"ip_address": "127.0.0.1"}', '127.0.0.1', NULL, '2025-09-13 22:47:51.895604');
INSERT INTO public.super_admin_audit VALUES ('2abf30da-0b08-45c6-8875-4cbfdb658977', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LOGIN', 'authentication', NULL, NULL, '{"ip_address": "127.0.0.1"}', '127.0.0.1', NULL, '2025-09-13 22:49:30.095967');
INSERT INTO public.super_admin_audit VALUES ('f648131c-4b51-47e0-aa14-cde0c6d4259c', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LIST_TENANTS', 'tenant', NULL, NULL, '{"filter_active": null, "count": 11}', '127.0.0.1', NULL, '2025-09-13 22:49:32.236791');
INSERT INTO public.super_admin_audit VALUES ('d8845966-aab7-4feb-aae2-b7ed5e8d0e1f', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LIST_TENANTS', 'tenant', NULL, NULL, '{"filter_active": null, "count": 11}', '127.0.0.1', NULL, '2025-09-13 22:49:40.512013');
INSERT INTO public.super_admin_audit VALUES ('784d010a-6c52-4bd1-badc-d8fefbf9410e', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LOGIN', 'authentication', NULL, NULL, '{"ip_address": "127.0.0.1"}', '127.0.0.1', NULL, '2025-09-13 22:50:37.858063');
INSERT INTO public.super_admin_audit VALUES ('faaf3d9a-38ee-4b5d-80ac-3d7f97cd55fb', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LIST_TENANTS', 'tenant', NULL, NULL, '{"filter_active": null, "count": 11}', '127.0.0.1', NULL, '2025-09-13 22:50:39.995118');
INSERT INTO public.super_admin_audit VALUES ('e8d33cd1-6d63-4b47-9c56-405dbbcd1807', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LOGIN', 'authentication', NULL, NULL, '{"ip_address": "127.0.0.1"}', '127.0.0.1', NULL, '2025-09-13 22:51:49.016498');
INSERT INTO public.super_admin_audit VALUES ('0941e37e-082b-466f-977e-c8e634ee5f93', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LIST_TENANTS', 'tenant', NULL, NULL, '{"filter_active": null, "count": 11}', '127.0.0.1', NULL, '2025-09-13 22:51:51.153187');
INSERT INTO public.super_admin_audit VALUES ('9bd502e0-6457-4743-af95-075b950e4536', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LIST_TENANTS', 'tenant', NULL, NULL, '{"filter_active": null, "count": 11}', '127.0.0.1', NULL, '2025-09-13 22:51:59.452623');
INSERT INTO public.super_admin_audit VALUES ('0ab23d91-0704-41d5-a5f0-4a774868c507', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LOGIN', 'authentication', NULL, NULL, '{"ip_address": "127.0.0.1"}', '127.0.0.1', NULL, '2025-09-13 22:52:35.622554');
INSERT INTO public.super_admin_audit VALUES ('342fa837-8eeb-4124-a4e5-3700956d3a23', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LIST_TENANTS', 'tenant', NULL, NULL, '{"filter_active": null, "count": 11}', '127.0.0.1', NULL, '2025-09-13 22:52:37.778998');
INSERT INTO public.super_admin_audit VALUES ('0ae39329-82f8-4033-8c93-54a6e0ae56da', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LIST_TENANTS', 'tenant', NULL, NULL, '{"filter_active": null, "count": 11}', '127.0.0.1', NULL, '2025-09-13 22:52:46.469607');
INSERT INTO public.super_admin_audit VALUES ('c3c38e39-3176-439d-a433-d1446b92cc11', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LOGIN', 'authentication', NULL, NULL, '{"ip_address": "127.0.0.1"}', '127.0.0.1', NULL, '2025-09-13 22:55:19.912156');
INSERT INTO public.super_admin_audit VALUES ('ecf9252b-97cb-4d54-b612-580cb62d5735', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LIST_TENANTS', 'tenant', NULL, NULL, '{"filter_active": null, "count": 11}', '127.0.0.1', NULL, '2025-09-13 22:55:22.057417');
INSERT INTO public.super_admin_audit VALUES ('25310730-0eee-4cde-87cf-d49e7184798f', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LIST_TENANTS', 'tenant', NULL, NULL, '{"filter_active": null, "count": 11}', '127.0.0.1', NULL, '2025-09-13 22:55:30.629207');
INSERT INTO public.super_admin_audit VALUES ('57f9dd5d-109a-4662-9206-db7cfe3d2168', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LOGIN', 'authentication', NULL, NULL, '{"ip_address": "127.0.0.1"}', '127.0.0.1', NULL, '2025-09-13 22:55:57.476551');
INSERT INTO public.super_admin_audit VALUES ('bb06e608-66cc-4c79-a8dd-565f7aa6e35c', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LIST_TENANTS', 'tenant', NULL, NULL, '{"filter_active": null, "count": 11}', '127.0.0.1', NULL, '2025-09-13 22:55:59.74586');
INSERT INTO public.super_admin_audit VALUES ('97ffb6e4-50aa-4ffc-928c-90e58918335d', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LIST_TENANTS', 'tenant', NULL, NULL, '{"filter_active": null, "count": 11}', '127.0.0.1', NULL, '2025-09-13 22:56:08.425051');
INSERT INTO public.super_admin_audit VALUES ('2e8f5704-4925-4b97-b4f9-7934f7710c6a', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LOGIN', 'authentication', NULL, NULL, '{"ip_address": "127.0.0.1"}', '127.0.0.1', NULL, '2025-09-13 23:05:54.169611');
INSERT INTO public.super_admin_audit VALUES ('89007812-ca21-4ff3-8c36-c064a9bced37', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LIST_TENANTS', 'tenant', NULL, NULL, '{"filter_active": null, "count": 11}', '127.0.0.1', NULL, '2025-09-13 23:05:56.307969');
INSERT INTO public.super_admin_audit VALUES ('6f58ebf1-c8e9-44a8-a65a-16fe22406e6d', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LIST_TENANTS', 'tenant', NULL, NULL, '{"filter_active": null, "count": 11}', '127.0.0.1', NULL, '2025-09-13 23:06:05.086262');
INSERT INTO public.super_admin_audit VALUES ('6ba3e688-b0c2-4cb8-904b-6ff041c944e3', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LOGIN', 'authentication', NULL, NULL, '{"ip_address": "127.0.0.1"}', '127.0.0.1', NULL, '2025-09-13 23:06:29.232912');
INSERT INTO public.super_admin_audit VALUES ('2564d7da-71c3-44b1-8431-83eb2f5c56bc', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LIST_TENANTS', 'tenant', NULL, NULL, '{"filter_active": null, "count": 11}', '127.0.0.1', NULL, '2025-09-13 23:06:31.390125');
INSERT INTO public.super_admin_audit VALUES ('ac5d4ed8-9bb9-46f2-9df4-da8a46161ca3', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LOGIN', 'authentication', NULL, NULL, '{"ip_address": "127.0.0.1"}', '127.0.0.1', NULL, '2025-09-13 23:07:37.733007');
INSERT INTO public.super_admin_audit VALUES ('006e91cd-2a4a-4380-8a4e-947023e25cd1', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LIST_TENANTS', 'tenant', NULL, NULL, '{"filter_active": null, "count": 11}', '127.0.0.1', NULL, '2025-09-13 23:07:39.868316');
INSERT INTO public.super_admin_audit VALUES ('a6e3bea2-f06f-4647-bd6d-f73de10773a3', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LOGIN', 'authentication', NULL, NULL, '{"ip_address": "127.0.0.1"}', '127.0.0.1', NULL, '2025-09-13 23:09:41.008547');
INSERT INTO public.super_admin_audit VALUES ('a2eec88b-a934-4fd9-8dff-66e166e81d67', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LIST_TENANTS', 'tenant', NULL, NULL, '{"filter_active": null, "count": 11}', '127.0.0.1', NULL, '2025-09-13 23:09:43.145388');
INSERT INTO public.super_admin_audit VALUES ('d8b28b77-fdf8-486c-87c1-325e3600182e', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LOGIN', 'authentication', NULL, NULL, '{"ip_address": "127.0.0.1"}', '127.0.0.1', NULL, '2025-09-13 23:10:21.692739');
INSERT INTO public.super_admin_audit VALUES ('bcf716eb-e34e-4b27-aedd-2b8989738819', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LIST_TENANTS', 'tenant', NULL, NULL, '{"filter_active": null, "count": 11}', '127.0.0.1', NULL, '2025-09-13 23:10:23.828571');
INSERT INTO public.super_admin_audit VALUES ('da3dfbd3-a8d1-4568-8577-42fcf3e9c5f4', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LOGIN', 'authentication', NULL, NULL, '{"ip_address": "127.0.0.1"}', '127.0.0.1', NULL, '2025-09-13 23:11:16.953249');
INSERT INTO public.super_admin_audit VALUES ('21046774-3e90-42a9-b57b-c619eac4bfe6', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LOGIN', 'authentication', NULL, NULL, '{"ip_address": "127.0.0.1"}', '127.0.0.1', NULL, '2025-09-13 23:11:33.306364');
INSERT INTO public.super_admin_audit VALUES ('af1cbbbc-aa73-4688-affe-79f786b091a1', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LIST_TENANTS', 'tenant', NULL, NULL, '{"filter_active": null, "count": 11}', '127.0.0.1', NULL, '2025-09-13 23:11:35.55644');
INSERT INTO public.super_admin_audit VALUES ('7088fb0f-55af-41d5-97b7-65d3e2f89409', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LOGIN', 'authentication', NULL, NULL, '{"ip_address": "127.0.0.1"}', '127.0.0.1', NULL, '2025-09-13 23:12:50.528458');
INSERT INTO public.super_admin_audit VALUES ('64003ab2-95a1-49fc-93ef-3e42c8fe43b5', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LIST_TENANTS', 'tenant', NULL, NULL, '{"filter_active": null, "count": 11}', '127.0.0.1', NULL, '2025-09-13 23:12:52.693927');
INSERT INTO public.super_admin_audit VALUES ('7d06cd51-e8aa-4e1b-80fa-9cca6eb9cd76', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LOGIN', 'authentication', NULL, NULL, '{"ip_address": "127.0.0.1"}', '127.0.0.1', NULL, '2025-09-13 23:14:16.206668');
INSERT INTO public.super_admin_audit VALUES ('814df986-1265-47fe-8793-788aa7b8678d', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LIST_TENANTS', 'tenant', NULL, NULL, '{"filter_active": null, "count": 11}', '127.0.0.1', NULL, '2025-09-13 23:14:18.362678');
INSERT INTO public.super_admin_audit VALUES ('2a2342f2-9223-4c5d-997b-25ebaa91dd0b', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LIST_TENANTS', 'tenant', NULL, NULL, '{"filter_active": null, "count": 11}', '127.0.0.1', NULL, '2025-09-13 23:14:27.358094');
INSERT INTO public.super_admin_audit VALUES ('4c06bf80-db49-4de5-9734-1ac10003e8fb', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LOGIN', 'authentication', NULL, NULL, '{"ip_address": "127.0.0.1"}', '127.0.0.1', NULL, '2025-09-13 23:17:07.741375');
INSERT INTO public.super_admin_audit VALUES ('9e49b3a1-8446-4f71-be6b-387de2273f64', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LIST_TENANTS', 'tenant', NULL, NULL, '{"filter_active": null, "count": 11}', '127.0.0.1', NULL, '2025-09-13 23:17:14.247216');
INSERT INTO public.super_admin_audit VALUES ('d1a79413-558f-42e4-8f9b-86af13af1372', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LOGIN', 'authentication', NULL, NULL, '{"ip_address": "127.0.0.1"}', '127.0.0.1', NULL, '2025-09-13 23:21:38.938249');
INSERT INTO public.super_admin_audit VALUES ('8d3db807-163d-416c-ba24-6e0dc1d84703', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LIST_TENANTS', 'tenant', NULL, NULL, '{"filter_active": null, "count": 11}', '127.0.0.1', NULL, '2025-09-13 23:21:41.080237');
INSERT INTO public.super_admin_audit VALUES ('d986a679-14b1-497b-a9e4-9987850a8162', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LIST_TENANTS', 'tenant', NULL, NULL, '{"filter_active": null, "count": 11}', '127.0.0.1', NULL, '2025-09-13 23:21:49.820772');
INSERT INTO public.super_admin_audit VALUES ('04d9aed8-aacc-4034-8f36-b5501a9a041f', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LOGIN', 'authentication', NULL, NULL, '{"ip_address": "127.0.0.1"}', '127.0.0.1', NULL, '2025-09-13 23:23:12.880862');
INSERT INTO public.super_admin_audit VALUES ('bc065219-30ff-438d-abf6-2b09c83de96c', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ASSIGN_TENANT_PLAN', 'tenant', '12', 'final_test_enterprise_schema', '{"old_plan_id": 4, "new_plan_id": 4, "plan_name": "Enterprise", "menus_synced": 49, "allowed_menu_ids": [2, 3, 16, 23, 33, 39, 45, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 1, 17, 18, 19, 20, 21, 22, 24, 25, 26, 27, 28, 29, 30, 31, 32, 34, 35, 36, 37, 38, 40, 41, 42, 43, 44, 46, 47, 48, 49]}', '127.0.0.1', NULL, '2025-09-13 23:23:15.180897');
INSERT INTO public.super_admin_audit VALUES ('a0329dea-4b30-4523-a5eb-2b0706dee4f6', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LOGIN', 'authentication', NULL, NULL, '{"ip_address": "127.0.0.1"}', '127.0.0.1', NULL, '2025-09-13 23:23:36.85407');
INSERT INTO public.super_admin_audit VALUES ('8bb3949b-73d9-4df9-a953-d466c6d1bcac', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ASSIGN_TENANT_PLAN', 'tenant', '11', 'final_test_basic_schema', '{"old_plan_id": 4, "new_plan_id": 1, "plan_name": "Basic", "menus_synced": 9, "allowed_menu_ids": [2, 16, 39, 4, 1, 17, 18, 40, 44]}', '127.0.0.1', NULL, '2025-09-13 23:23:39.153376');
INSERT INTO public.super_admin_audit VALUES ('548501ad-22b9-4535-ab1e-757ad8219a70', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LOGIN', 'authentication', NULL, NULL, '{"ip_address": "127.0.0.1"}', '127.0.0.1', NULL, '2025-09-14 18:42:25.8516');
INSERT INTO public.super_admin_audit VALUES ('336e81c7-8ead-49b0-8109-e3418e3524d1', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'SYSTEM_SETUP', 'super_admin_user', NULL, NULL, 'Initial Super Admin user created via API', NULL, NULL, '2025-09-14 19:43:22.384991');
INSERT INTO public.super_admin_audit VALUES ('b847c529-4711-4a28-b1a7-c705fbf39a66', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LOGIN', 'authentication', NULL, NULL, '{"ip_address": "127.0.0.1"}', '127.0.0.1', NULL, '2025-09-14 19:43:31.171361');
INSERT INTO public.super_admin_audit VALUES ('1700f268-11c7-4eef-92f8-3f2387524377', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LOGIN', 'authentication', NULL, NULL, '{"ip_address": "127.0.0.1"}', '127.0.0.1', NULL, '2025-09-14 19:45:19.417188');
INSERT INTO public.super_admin_audit VALUES ('4f5da612-9ddb-46c1-8747-d838b677937f', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ASSIGN_TENANT_PLAN', 'tenant', '4', 'test_tenant_schema', '{"old_plan_id": 4, "new_plan_id": 4, "plan_name": "Enterprise", "menus_synced": 49, "allowed_menu_ids": [2, 3, 16, 23, 33, 39, 45, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 1, 17, 18, 19, 20, 21, 22, 24, 25, 26, 27, 28, 29, 30, 31, 32, 34, 35, 36, 37, 38, 40, 41, 42, 43, 44, 46, 47, 48, 49]}', '127.0.0.1', NULL, '2025-09-14 19:45:34.251333');
INSERT INTO public.super_admin_audit VALUES ('71e4c4a4-54ab-4c4b-b3e8-f501c8efa33f', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LOGIN', 'authentication', NULL, NULL, '{"ip_address": "127.0.0.1"}', '127.0.0.1', NULL, '2025-09-14 19:49:02.664176');
INSERT INTO public.super_admin_audit VALUES ('7c3e7f1e-0e74-4293-9287-5fe3067a20b5', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ASSIGN_TENANT_PLAN', 'tenant', '4', 'test_tenant_schema', '{"old_plan_id": 4, "new_plan_id": 4, "plan_name": "Enterprise", "menus_synced": 49, "allowed_menu_ids": [2, 3, 16, 23, 33, 39, 45, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 1, 17, 18, 19, 20, 21, 22, 24, 25, 26, 27, 28, 29, 30, 31, 32, 34, 35, 36, 37, 38, 40, 41, 42, 43, 44, 46, 47, 48, 49]}', '127.0.0.1', NULL, '2025-09-14 19:49:12.537889');
INSERT INTO public.super_admin_audit VALUES ('231b3a8d-f57e-4a28-99ed-5bb9013936a7', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LOGIN', 'authentication', NULL, NULL, '{"ip_address": "127.0.0.1"}', '127.0.0.1', NULL, '2025-09-14 19:50:39.870251');
INSERT INTO public.super_admin_audit VALUES ('4ca72cc7-d8c8-4bdc-bf6c-b642e3f32eb6', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LOGIN', 'authentication', NULL, NULL, '{"ip_address": "127.0.0.1"}', '127.0.0.1', NULL, '2025-09-15 13:24:07.98658');
INSERT INTO public.super_admin_audit VALUES ('0cc87a02-5784-4d86-aa9a-6d83b09b4785', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LIST_PLANS', 'plan', NULL, NULL, '{"include_resources": true, "plan_count": 4}', '127.0.0.1', NULL, '2025-09-15 13:26:06.181792');
INSERT INTO public.super_admin_audit VALUES ('74a0b2d2-a358-4f64-82b0-580adae56205', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ADD_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "expense_categories", "action_name": "create", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-15 13:26:27.026815');
INSERT INTO public.super_admin_audit VALUES ('4b869642-d88c-4c0e-bbd5-b3219aab97ff', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ADD_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "expense_categories", "action_name": "read", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-15 13:27:27.192505');
INSERT INTO public.super_admin_audit VALUES ('a99e9fcf-0a6b-4317-8be6-c877fb6d7b7f', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ADD_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "expense_categories", "action_name": "update", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-15 13:27:28.664424');
INSERT INTO public.super_admin_audit VALUES ('cd28e446-6ffb-4574-8e0f-4e4a884ca356', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ADD_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "expense_categories", "action_name": "delete", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-15 13:27:30.005437');
INSERT INTO public.super_admin_audit VALUES ('b3e56c1d-e149-4530-9846-1d238aa5ce87', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ADD_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "expense_categories", "action_name": "list", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-15 13:27:31.355309');
INSERT INTO public.super_admin_audit VALUES ('0404f8cb-a134-4c9c-b13b-6358fd81fcba', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ADD_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "expense_types", "action_name": "create", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-15 13:28:00.206402');
INSERT INTO public.super_admin_audit VALUES ('f0868313-94b6-4969-85ca-236fef12fee1', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ADD_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "expense_types", "action_name": "read", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-15 13:28:01.577622');
INSERT INTO public.super_admin_audit VALUES ('d8ad674d-e81d-4299-a621-0fc921894bea', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ADD_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "expense_types", "action_name": "update", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-15 13:28:02.944935');
INSERT INTO public.super_admin_audit VALUES ('bd643981-0492-4c99-ba9d-516dd3ebf097', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ADD_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "expense_types", "action_name": "delete", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-15 13:28:04.295519');
INSERT INTO public.super_admin_audit VALUES ('bb3ce1c8-b8dc-42fb-b613-164f647b860b', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ADD_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "expense_types", "action_name": "list", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-15 13:28:05.681198');
INSERT INTO public.super_admin_audit VALUES ('de916cac-707c-4db0-83f2-b07de5b96521', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ADD_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "expense_transactions", "action_name": "create", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-15 13:28:31.157109');
INSERT INTO public.super_admin_audit VALUES ('18417ecb-7863-4375-977a-7d76f9c329ea', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ADD_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "expense_transactions", "action_name": "read", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-15 13:28:32.49447');
INSERT INTO public.super_admin_audit VALUES ('36ce4db1-6456-4e28-a1dc-1b197904f184', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ADD_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "expense_transactions", "action_name": "update", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-15 13:28:33.878193');
INSERT INTO public.super_admin_audit VALUES ('c85f1f65-c46f-48f9-8247-0d792e3116c0', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ADD_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "expense_transactions", "action_name": "delete", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-15 13:28:35.247912');
INSERT INTO public.super_admin_audit VALUES ('a47f243d-7154-4c60-b722-2506443dfced', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ADD_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "expense_transactions", "action_name": "list", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-15 13:28:36.624039');
INSERT INTO public.super_admin_audit VALUES ('ae72c478-a424-44c7-93d7-12e4a63fb77d', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ADD_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "expense_transaction_items", "action_name": "create", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-15 13:29:06.509458');
INSERT INTO public.super_admin_audit VALUES ('660530b9-f6da-467f-965b-03701f3f0553', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ADD_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "expense_transaction_items", "action_name": "read", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-15 13:29:07.895575');
INSERT INTO public.super_admin_audit VALUES ('3200e287-48f2-4ee2-8f92-7569a9c1b416', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ADD_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "expense_transaction_items", "action_name": "update", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-15 13:29:09.314779');
INSERT INTO public.super_admin_audit VALUES ('70fc7cc5-8860-42cc-960c-71a3ab4449ec', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ADD_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "expense_transaction_items", "action_name": "delete", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-15 13:29:10.888832');
INSERT INTO public.super_admin_audit VALUES ('4c265aa5-7e9a-4ad8-81de-23c750a7c9d4', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ADD_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "expense_transaction_items", "action_name": "list", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-15 13:29:12.279744');
INSERT INTO public.super_admin_audit VALUES ('7054f14a-8ca1-4ded-9944-ba77e7875a64', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ADD_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "expense_attachments", "action_name": "create", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-15 13:29:38.833243');
INSERT INTO public.super_admin_audit VALUES ('9df76a7a-a410-4761-8b45-c968f32ee878', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ADD_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "expense_attachments", "action_name": "read", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-15 13:29:40.499342');
INSERT INTO public.super_admin_audit VALUES ('73ab4763-d37b-4b0a-a156-fd6dd596aeb5', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ADD_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "expense_attachments", "action_name": "update", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-15 13:29:41.994298');
INSERT INTO public.super_admin_audit VALUES ('faa8cf14-6a0d-45c4-8309-5cca6882957c', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ADD_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "expense_attachments", "action_name": "delete", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-15 13:29:43.38699');
INSERT INTO public.super_admin_audit VALUES ('05c192b8-15dd-4e0c-b075-9333cc5043c0', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ADD_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "expense_attachments", "action_name": "list", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-15 13:29:44.763026');
INSERT INTO public.super_admin_audit VALUES ('f9a1e383-d7ed-4350-a47f-cf7f5255edb1', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ADD_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "expense_settings", "action_name": "create", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-15 13:30:06.269549');
INSERT INTO public.super_admin_audit VALUES ('3da9cdda-ed2c-432a-99c9-e4dddb16ce41', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ADD_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "expense_settings", "action_name": "read", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-15 13:30:06.646939');
INSERT INTO public.super_admin_audit VALUES ('c61a89d2-e034-483c-a909-6d1c9ecb6031', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ADD_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "expense_settings", "action_name": "update", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-15 13:30:07.056235');
INSERT INTO public.super_admin_audit VALUES ('0eaac51b-c7c4-4abe-bb57-32b2b1fa9eef', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ADD_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "expense_settings", "action_name": "delete", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-15 13:30:07.481862');
INSERT INTO public.super_admin_audit VALUES ('26fe13ed-cac7-4cbd-95f2-5881d1ac6ecd', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ADD_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "expense_settings", "action_name": "list", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-15 13:30:07.868046');
INSERT INTO public.super_admin_audit VALUES ('ec53d477-bfd8-43ca-b161-384f4efabba5', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ADD_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "expense_audit_logs", "action_name": "create", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-15 13:30:26.044566');
INSERT INTO public.super_admin_audit VALUES ('c99016e1-ccf0-4159-a6bf-5333bb931ea1', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ADD_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "expense_audit_logs", "action_name": "read", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-15 13:30:26.44569');
INSERT INTO public.super_admin_audit VALUES ('0af11e32-dbbf-4b22-9e89-f17b0adbf288', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ADD_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "expense_audit_logs", "action_name": "list", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-15 13:30:26.844024');
INSERT INTO public.super_admin_audit VALUES ('82555049-543c-40a1-a9d6-e8d6cf585648', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ADD_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "expense_reports", "action_name": "create", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-15 13:30:49.455583');
INSERT INTO public.super_admin_audit VALUES ('84cf59ff-a9f4-4c75-a13b-6d8601acd814', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ADD_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "expense_reports", "action_name": "read", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-15 13:30:49.863559');
INSERT INTO public.super_admin_audit VALUES ('0060e740-b913-4a6c-8c37-a7b118d9db75', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ADD_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "expense_reports", "action_name": "update", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-15 13:30:50.380336');
INSERT INTO public.super_admin_audit VALUES ('48c85647-c88b-42c9-9157-f61dbdcdf2d0', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ADD_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "expense_reports", "action_name": "list", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-15 13:30:51.062028');
INSERT INTO public.super_admin_audit VALUES ('d10b98ed-fcd5-4789-9e66-7e4186ec7671', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ADD_PLAN_RESOURCE', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_name": "expense_reports", "action_name": "delete", "affected_tenants": 2}', '127.0.0.1', NULL, '2025-09-15 13:31:00.523135');
INSERT INTO public.super_admin_audit VALUES ('927def73-af0d-4e3b-a021-ce4026c1602a', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'VIEW_PLAN_RESOURCES', 'plan', '4', NULL, '{"plan_name": "Enterprise", "resource_count": 46}', '127.0.0.1', NULL, '2025-09-15 13:31:12.619243');
INSERT INTO public.super_admin_audit VALUES ('4d80ad00-b0c8-4dc4-bc3c-75187b61dfdc', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LOGIN', 'authentication', NULL, NULL, '{"ip_address": "127.0.0.1"}', '127.0.0.1', NULL, '2025-09-15 13:35:47.499443');
INSERT INTO public.super_admin_audit VALUES ('c8cc9697-387a-4b1a-a85d-75789e618a40', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LIST_TENANTS', 'tenant', NULL, NULL, '{"filter_active": null, "count": 3}', '127.0.0.1', NULL, '2025-09-15 13:36:09.795702');
INSERT INTO public.super_admin_audit VALUES ('f5fd42d1-4625-4fd3-b95a-d904ca253881', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ASSIGN_TENANT_PLAN', 'tenant', '1', 'cos360_main', '{"old_plan_id": 4, "new_plan_id": 4, "plan_name": "Enterprise", "menus_synced": 49, "permissions_created": 49, "allowed_menu_ids": [2, 3, 16, 23, 33, 39, 45, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 1, 17, 18, 19, 20, 21, 22, 24, 25, 26, 27, 28, 29, 30, 31, 32, 34, 35, 36, 37, 38, 40, 41, 42, 43, 44, 46, 47, 48, 49]}', '127.0.0.1', NULL, '2025-09-15 13:36:24.720291');
INSERT INTO public.super_admin_audit VALUES ('f6410207-886a-463d-9f3c-d0b063dc3962', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'ASSIGN_TENANT_PLAN', 'tenant', '4', 'test_tenant_schema', '{"old_plan_id": 4, "new_plan_id": 4, "plan_name": "Enterprise", "menus_synced": 49, "permissions_created": 49, "allowed_menu_ids": [2, 3, 16, 23, 33, 39, 45, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 1, 17, 18, 19, 20, 21, 22, 24, 25, 26, 27, 28, 29, 30, 31, 32, 34, 35, 36, 37, 38, 40, 41, 42, 43, 44, 46, 47, 48, 49]}', '127.0.0.1', NULL, '2025-09-15 13:36:34.593771');
INSERT INTO public.super_admin_audit VALUES ('ec1900a3-bbfd-4945-91b5-316e04b2feb9', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LOGIN', 'authentication', NULL, NULL, '{"ip_address": "127.0.0.1"}', '127.0.0.1', NULL, '2025-09-15 13:40:19.105869');
INSERT INTO public.super_admin_audit VALUES ('ad92ef6a-350c-4076-b4e7-52ca33b49267', '608ba210-2fd3-4f15-8466-0cbc87392d84', 'LIST_TENANTS', 'tenant', NULL, NULL, '{"filter_active": null, "count": 3}', '127.0.0.1', NULL, '2025-09-15 13:45:26.190916');


--
-- Data for Name: super_admin_users; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.super_admin_users VALUES ('608ba210-2fd3-4f15-8466-0cbc87392d84', 'superadmin', 'superadmin@cos360.com', '$2b$12$rECpvrO4EDhlCGNxQuCN6Ol79aptJLqmTim4/jP8KhBn12NXknYfW', 'System Administrator', true, '2025-09-15 13:40:18.816203', '2025-09-13 16:41:51.981781', '2025-09-13 16:41:51.981781', '2025-09-15 13:40:18.816203', 0, NULL, true);


--
-- Data for Name: tenants; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.tenants VALUES (2, 'test_basic', 'test_basic_schema', true, '2025-09-07 11:20:13.017909', '2025-09-07 11:20:13.017909', 1);
INSERT INTO public.tenants VALUES (1, 'default', 'cos360_main', true, '2025-08-31 22:23:53.360899', '2025-09-15 13:36:24.556593', 4);
INSERT INTO public.tenants VALUES (4, 'test_tenant', 'test_tenant_schema', true, '2025-09-07 21:47:28.007215', '2025-09-15 13:36:34.446498', 4);


--
-- Name: menu_actions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.menu_actions_id_seq', 1, false);


--
-- Name: menus_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.menus_id_seq', 49, true);


--
-- Name: organizations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.organizations_id_seq', 1, false);


--
-- Name: permission_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.permission_templates_id_seq', 1, false);


--
-- Name: plan_menu_access_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.plan_menu_access_id_seq', 127, true);


--
-- Name: plan_resource_access_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.plan_resource_access_id_seq', 129, true);


--
-- Name: plans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.plans_id_seq', 1, false);


--
-- Name: role_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.role_templates_id_seq', 1, false);


--
-- Name: tenants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tenants_id_seq', 12, true);


--
-- PostgreSQL database dump complete
--


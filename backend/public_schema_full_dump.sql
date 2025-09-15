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
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: menu_actions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.menu_actions (
    id integer NOT NULL,
    menu_id integer NOT NULL,
    action_name character varying(30) NOT NULL,
    resource_name character varying(50) NOT NULL,
    description character varying(200),
    is_active boolean
);


ALTER TABLE public.menu_actions OWNER TO postgres;

--
-- Name: menu_actions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.menu_actions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.menu_actions_id_seq OWNER TO postgres;

--
-- Name: menu_actions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.menu_actions_id_seq OWNED BY public.menu_actions.id;


--
-- Name: menus; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.menus (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    url character varying(100),
    level character varying(2) NOT NULL,
    parent_id integer
);


ALTER TABLE public.menus OWNER TO postgres;

--
-- Name: menus_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.menus_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.menus_id_seq OWNER TO postgres;

--
-- Name: menus_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.menus_id_seq OWNED BY public.menus.id;


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.organizations (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    description character varying(150),
    is_active boolean,
    subdomain character varying(50),
    schema_name character varying(50),
    plan_id integer
);


ALTER TABLE public.organizations OWNER TO postgres;

--
-- Name: organizations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.organizations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.organizations_id_seq OWNER TO postgres;

--
-- Name: organizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.organizations_id_seq OWNED BY public.organizations.id;


--
-- Name: permission_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permission_templates (
    id integer NOT NULL,
    role_template_id integer NOT NULL,
    menu_id integer NOT NULL,
    can_view boolean,
    can_edit boolean,
    is_active boolean
);


ALTER TABLE public.permission_templates OWNER TO postgres;

--
-- Name: permission_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.permission_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.permission_templates_id_seq OWNER TO postgres;

--
-- Name: permission_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.permission_templates_id_seq OWNED BY public.permission_templates.id;


--
-- Name: plan_menu_access; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.plan_menu_access (
    id integer NOT NULL,
    plan_id integer NOT NULL,
    menu_id integer NOT NULL,
    is_active boolean
);


ALTER TABLE public.plan_menu_access OWNER TO postgres;

--
-- Name: plan_menu_access_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.plan_menu_access_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.plan_menu_access_id_seq OWNER TO postgres;

--
-- Name: plan_menu_access_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.plan_menu_access_id_seq OWNED BY public.plan_menu_access.id;


--
-- Name: plan_resource_access; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.plan_resource_access (
    id integer NOT NULL,
    plan_id integer NOT NULL,
    resource_name character varying(50) NOT NULL,
    actions text[] NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.plan_resource_access OWNER TO postgres;

--
-- Name: plan_resource_access_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.plan_resource_access_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.plan_resource_access_id_seq OWNER TO postgres;

--
-- Name: plan_resource_access_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.plan_resource_access_id_seq OWNED BY public.plan_resource_access.id;


--
-- Name: plans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.plans (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    description character varying(150),
    is_active boolean
);


ALTER TABLE public.plans OWNER TO postgres;

--
-- Name: plans_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.plans_id_seq OWNER TO postgres;

--
-- Name: plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.plans_id_seq OWNED BY public.plans.id;


--
-- Name: role_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_templates (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    description character varying(200),
    category character varying(30) NOT NULL,
    is_active boolean,
    is_system_role boolean
);


ALTER TABLE public.role_templates OWNER TO postgres;

--
-- Name: role_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.role_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.role_templates_id_seq OWNER TO postgres;

--
-- Name: role_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.role_templates_id_seq OWNED BY public.role_templates.id;


--
-- Name: super_admin_audit; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.super_admin_audit (
    id uuid NOT NULL,
    super_admin_id uuid NOT NULL,
    action character varying(100) NOT NULL,
    resource character varying(100) NOT NULL,
    resource_id character varying(100),
    tenant_id character varying(100),
    details text,
    ip_address character varying(45),
    user_agent text,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.super_admin_audit OWNER TO postgres;

--
-- Name: super_admin_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.super_admin_users (
    id uuid NOT NULL,
    username character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    hashed_password character varying(255) NOT NULL,
    full_name character varying(255) NOT NULL,
    is_active boolean NOT NULL,
    last_login_at timestamp without time zone,
    password_changed_at timestamp without time zone DEFAULT now() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    failed_login_attempts integer NOT NULL,
    account_locked_until timestamp without time zone,
    requires_password_change boolean NOT NULL
);


ALTER TABLE public.super_admin_users OWNER TO postgres;

--
-- Name: tenants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tenants (
    id integer NOT NULL,
    client_name character varying(100) NOT NULL,
    schema_name character varying(100) NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    plan_id integer
);


ALTER TABLE public.tenants OWNER TO postgres;

--
-- Name: tenants_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tenants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tenants_id_seq OWNER TO postgres;

--
-- Name: tenants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tenants_id_seq OWNED BY public.tenants.id;


--
-- Name: menu_actions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_actions ALTER COLUMN id SET DEFAULT nextval('public.menu_actions_id_seq'::regclass);


--
-- Name: menus id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menus ALTER COLUMN id SET DEFAULT nextval('public.menus_id_seq'::regclass);


--
-- Name: organizations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations ALTER COLUMN id SET DEFAULT nextval('public.organizations_id_seq'::regclass);


--
-- Name: permission_templates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permission_templates ALTER COLUMN id SET DEFAULT nextval('public.permission_templates_id_seq'::regclass);


--
-- Name: plan_menu_access id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plan_menu_access ALTER COLUMN id SET DEFAULT nextval('public.plan_menu_access_id_seq'::regclass);


--
-- Name: plan_resource_access id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plan_resource_access ALTER COLUMN id SET DEFAULT nextval('public.plan_resource_access_id_seq'::regclass);


--
-- Name: plans id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plans ALTER COLUMN id SET DEFAULT nextval('public.plans_id_seq'::regclass);


--
-- Name: role_templates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_templates ALTER COLUMN id SET DEFAULT nextval('public.role_templates_id_seq'::regclass);


--
-- Name: tenants id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants ALTER COLUMN id SET DEFAULT nextval('public.tenants_id_seq'::regclass);


--
-- Data for Name: menu_actions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.menu_actions (id, menu_id, action_name, resource_name, description, is_active) FROM stdin;
1	1	create	academic_years	Create new academic years	t
2	1	read	academic_years	View academic year details	t
3	1	update	academic_years	Update academic year information	t
4	1	delete	academic_years	Delete academic years	t
5	1	list	academic_years	List all academic years	t
\.


--
-- Data for Name: menus; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.menus (id, name, url, level, parent_id) FROM stdin;
2	Dashboard	/dashboard	L0	\N
3	Masters	/masters	L0	\N
16	Students	/students	L0	\N
23	Fee Management	/fees	L0	\N
33	Transport	/transport	L0	\N
39	Reports	/reports	L0	\N
45	Administration	/admin	L0	\N
4	Classes	/masters/classes	L1	3
5	Sections	/masters/sections	L1	3
6	Staff Management	/masters/staff	L1	3
7	Staff Attendance	/masters/staff-attendance	L1	3
8	Designations	/masters/designations	L1	3
9	Subjects	/masters/subjects	L1	3
10	Subject Categories	/masters/subject-categories	L1	3
11	Class Subject Mappings	/masters/class-subject-mappings	L1	3
12	Holiday Management	/masters/holiday-management	L1	3
13	Holidays	/masters/holidays	L1	3
14	Parents	/masters/parents	L1	3
15	Timetable Management	/masters/timetable-management	L1	3
1	Academic Years	/masters/academic-years	L1	3
17	Student Admissions	/students/admissions	L1	16
18	Student Attendance	/students/attendance	L1	16
19	Student Documents	/students/documents	L1	16
20	Student Certificates	/students/certificates	L1	16
21	Certificate Types	/students/certificate-types	L1	16
22	Student Transport	/students/transport	L1	16
24	Fee Categories	/fees/categories	L1	23
25	Fee Types	/fees/types	L1	23
26	Fee Terms	/fees/terms	L1	23
27	Fee Class Mappings	/fees/class-mappings	L1	23
28	Fee Student Mappings	/fees/student-mappings	L1	23
29	Fee Term Amounts	/fees/term-amounts	L1	23
30	Fee Collection	/fees/transactions	L1	23
31	Fee Receipts	/fees/receipts	L1	23
32	Fee Refunds	/fees/refunds	L1	23
34	Routes	/transport/routes	L1	33
35	Route Stops	/transport/route-stops	L1	33
36	Vehicles	/transport/vehicles	L1	33
37	Transport Routes	/transport/transport-routes	L1	33
38	Transport Trips	/transport/trips	L1	33
40	Student Reports	/reports/students	L1	39
41	Fee Reports	/reports/fees	L1	39
42	Staff Reports	/reports/staff	L1	39
43	Transport Reports	/reports/transport	L1	39
44	Academic Reports	/reports/academic	L1	39
46	User Management	/admin/users	L1	45
47	Role Management	/admin/roles	L1	45
48	Permission Management	/admin/permissions	L1	45
49	Menu Management	/admin/menus	L1	45
\.


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.organizations (id, name, description, is_active, subdomain, schema_name, plan_id) FROM stdin;
\.


--
-- Data for Name: permission_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.permission_templates (id, role_template_id, menu_id, can_view, can_edit, is_active) FROM stdin;
1	1	1	t	t	t
2	2	1	t	f	t
3	3	1	t	f	t
4	4	1	t	f	t
5	5	1	t	f	t
\.


--
-- Data for Name: plan_menu_access; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.plan_menu_access (id, plan_id, menu_id, is_active) FROM stdin;
3	1	2	t
4	1	16	t
5	1	39	t
6	1	4	t
7	1	1	t
8	1	17	t
9	1	18	t
10	1	40	t
11	1	44	t
12	2	2	t
13	2	3	t
14	2	16	t
15	2	23	t
16	2	39	t
17	2	4	t
18	2	5	t
19	2	6	t
20	2	9	t
21	2	14	t
22	2	1	t
23	2	17	t
24	2	18	t
25	2	19	t
26	2	24	t
27	2	25	t
28	2	26	t
29	2	27	t
30	2	30	t
31	2	31	t
32	2	40	t
33	2	41	t
34	2	44	t
35	3	2	t
36	3	3	t
37	3	16	t
38	3	23	t
39	3	33	t
40	3	39	t
41	3	4	t
42	3	5	t
43	3	6	t
44	3	7	t
45	3	8	t
46	3	9	t
47	3	10	t
48	3	11	t
49	3	12	t
50	3	13	t
51	3	14	t
52	3	15	t
53	3	1	t
54	3	17	t
55	3	18	t
56	3	19	t
57	3	20	t
58	3	21	t
59	3	22	t
60	3	24	t
61	3	25	t
62	3	26	t
63	3	27	t
64	3	28	t
65	3	29	t
66	3	30	t
67	3	31	t
68	3	32	t
69	3	34	t
70	3	35	t
71	3	36	t
72	3	37	t
73	3	38	t
74	3	40	t
75	3	41	t
76	3	42	t
77	3	43	t
78	3	44	t
79	4	2	t
80	4	3	t
81	4	16	t
82	4	23	t
83	4	33	t
84	4	39	t
85	4	45	t
86	4	4	t
87	4	5	t
88	4	6	t
89	4	7	t
90	4	8	t
91	4	9	t
92	4	10	t
93	4	11	t
94	4	12	t
95	4	13	t
96	4	14	t
97	4	15	t
98	4	1	t
99	4	17	t
100	4	18	t
101	4	19	t
102	4	20	t
103	4	21	t
104	4	22	t
105	4	24	t
106	4	25	t
107	4	26	t
108	4	27	t
109	4	28	t
110	4	29	t
111	4	30	t
112	4	31	t
113	4	32	t
114	4	34	t
115	4	35	t
116	4	36	t
117	4	37	t
118	4	38	t
119	4	40	t
120	4	41	t
121	4	42	t
122	4	43	t
123	4	44	t
124	4	46	t
125	4	47	t
126	4	48	t
127	4	49	t
\.


--
-- Data for Name: plan_resource_access; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.plan_resource_access (id, plan_id, resource_name, actions, is_active, created_at) FROM stdin;
7	2	academic_years	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
8	2	classes	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
9	2	subjects	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
10	2	sections	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
11	2	subject_categories	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
12	2	student_admissions	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
13	2	student_attendance	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
14	2	student_certificates	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
15	2	student_documents	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
16	2	fee_categories	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
17	2	fee_types	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
18	2	fee_terms	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
19	2	fee_class_mappings	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
20	2	fee_student_mappings	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
21	2	transport_routes	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
22	2	transport_vehicles	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
23	2	route_stops	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
24	2	student_transport	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
25	2	holidays	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
26	2	parents	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
27	3	academic_years	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
28	3	classes	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
29	3	subjects	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
30	3	sections	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
31	3	subject_categories	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
32	3	student_admissions	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
33	3	student_attendance	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
34	3	student_certificates	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
35	3	student_documents	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
36	3	fee_categories	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
37	3	fee_types	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
38	3	fee_terms	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
39	3	fee_class_mappings	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
40	3	fee_student_mappings	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
41	3	transport_routes	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
42	3	transport_vehicles	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
43	3	route_stops	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
44	3	student_transport	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
45	3	holidays	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
46	3	parents	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
47	3	transport_trips	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
48	3	fee_term_amounts	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
49	3	timetable_management	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
51	4	classes	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
52	4	subjects	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
53	4	sections	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
54	4	subject_categories	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
55	4	student_admissions	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
56	4	student_attendance	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
57	4	student_certificates	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
58	4	student_documents	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
59	4	fee_categories	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
60	4	fee_types	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
61	4	fee_terms	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
50	4	academic_years	{create,read,list,update,delete}	t	2025-09-07 11:15:46.577243
62	4	fee_class_mappings	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
63	4	fee_student_mappings	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
64	4	transport_routes	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
65	4	transport_vehicles	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
66	4	route_stops	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
67	4	student_transport	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
68	4	holidays	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
69	4	parents	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
70	4	transport_trips	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
71	4	fee_term_amounts	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
72	4	timetable_management	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
73	4	role_management	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
74	4	permission_management	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
75	4	menu_management	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
76	4	staff	{create,read,update,delete,list}	t	2025-09-07 11:15:46.577243
77	1	academic_years	{create,read,update,delete,list}	t	2025-09-07 21:34:56.48757
78	1	classes	{create,read,update,delete,list}	t	2025-09-07 21:34:56.48757
79	1	subjects	{create,read,update,delete,list}	t	2025-09-07 21:34:56.48757
80	1	sections	{create,read,update,delete,list}	t	2025-09-07 21:34:56.48757
81	1	subject_categories	{create,read,update,delete,list}	t	2025-09-07 21:34:56.48757
82	1	student_admissions	{create,read,update,delete,list}	t	2025-09-07 21:34:56.48757
83	1	student_attendance	{create,read,update,delete,list}	t	2025-09-07 21:34:56.48757
84	1	student_certificates	{create,read,update,delete,list}	t	2025-09-07 21:34:56.48757
85	1	student_documents	{create,read,update,delete,list}	t	2025-09-07 21:34:56.48757
86	1	fee_categories	{create,read,update,delete,list}	t	2025-09-07 21:34:56.48757
87	1	fee_types	{create,read,update,delete,list}	t	2025-09-07 21:34:56.48757
88	1	fee_terms	{create,read,update,delete,list}	t	2025-09-07 21:34:56.48757
89	1	fee_class_mappings	{create,read,update,delete,list}	t	2025-09-07 21:34:56.48757
90	1	fee_student_mappings	{create,read,update,delete,list}	t	2025-09-07 21:34:56.48757
91	1	transport_routes	{create,read,update,delete,list}	t	2025-09-07 21:34:56.48757
92	1	transport_vehicles	{create,read,update,delete,list}	t	2025-09-07 21:34:56.48757
93	1	route_stops	{create,read,update,delete,list}	t	2025-09-07 21:34:56.48757
94	1	student_transport	{create,read,update,delete,list}	t	2025-09-07 21:34:56.48757
95	1	holidays	{create,read,update,delete,list}	t	2025-09-07 21:34:56.48757
96	1	parents	{create,read,update,delete,list}	t	2025-09-07 21:34:56.48757
97	1	transport_trips	{create,read,update,delete,list}	t	2025-09-07 21:34:56.48757
98	1	fee_term_amounts	{create,read,update,delete,list}	t	2025-09-07 21:34:56.48757
99	1	timetable_management	{create,read,update,delete,list}	t	2025-09-07 21:34:56.48757
100	1	role_management	{create,read,update,delete,list}	t	2025-09-07 21:34:56.48757
101	1	permission_management	{create,read,update,delete,list}	t	2025-09-07 21:34:56.48757
102	1	menu_management	{create,read,update,delete,list}	t	2025-09-07 21:34:56.48757
103	1	staff	{create,read,update,delete,list}	t	2025-09-07 21:34:56.48757
104	4	holiday_management	{create,read,update,delete,list}	t	2025-09-07 21:52:50.86718
105	4	routes	{create,read,update,delete,list}	t	2025-09-08 18:18:51.487835
106	4	vehicles	{create,read,update,delete,list}	t	2025-09-08 18:41:20.664924
108	4	class_subject_mappings	{create,read,update,delete,list}	t	2025-09-09 21:57:20.867727
109	1	certificate_types	{read,list}	t	2025-09-10 12:15:35.99657
110	2	certificate_types	{create,read,update,delete,list}	t	2025-09-10 12:15:35.99657
111	3	certificate_types	{create,read,update,delete,list}	t	2025-09-10 12:15:35.99657
112	4	certificate_types	{create,read,update,delete,list}	t	2025-09-10 12:15:35.99657
113	1	designations	{read,list}	t	2025-09-10 12:38:32.587564
114	2	designations	{create,read,update,delete,list}	t	2025-09-10 12:38:32.587564
115	3	designations	{create,read,update,delete,list}	t	2025-09-10 12:38:32.587564
116	4	designations	{create,read,update,delete,list}	t	2025-09-10 12:38:32.587564
117	4	staff_attendance	{create,read,update,delete,list}	t	2025-09-10 15:53:41.171118
118	4	students	{create,read,update,delete,list}	t	2025-09-11 10:37:12.017687
119	4	fee_transactions	{create,read,update,delete,list}	t	2025-09-12 12:40:11.325372
120	4	fee_receipts	{create,read,update,delete,list}	t	2025-09-12 12:40:11.325372
121	4	fee_refunds	{create,read,update,delete,list,approve,process}	t	2025-09-12 12:40:11.325372
122	4	expense_categories	{create,read,update,delete,list}	t	2025-09-15 13:26:27.000652
123	4	expense_types	{create,read,update,delete,list}	t	2025-09-15 13:28:00.189509
124	4	expense_transactions	{create,read,update,delete,list}	t	2025-09-15 13:28:31.140462
125	4	expense_transaction_items	{create,read,update,delete,list}	t	2025-09-15 13:29:06.493937
126	4	expense_attachments	{create,read,update,delete,list}	t	2025-09-15 13:29:38.817687
127	4	expense_settings	{create,read,update,delete,list}	t	2025-09-15 13:30:06.252557
128	4	expense_audit_logs	{create,read,list}	t	2025-09-15 13:30:26.027591
129	4	expense_reports	{create,read,update,list,delete}	t	2025-09-15 13:30:49.435999
\.


--
-- Data for Name: plans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.plans (id, name, description, is_active) FROM stdin;
1	Basic	Basic school management features - Academic records, limited fee management	t
2	Standard	Standard school management - Full fee management, basic transport	t
3	Premium	Premium features - Full system access except system administration	t
4	Enterprise	Enterprise features - Complete system access including administration	t
\.


--
-- Data for Name: role_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.role_templates (id, name, description, category, is_active, is_system_role) FROM stdin;
1	Admin	System administrator with full access	system	t	t
2	Teacher	Teaching staff with academic management access	academic	t	t
3	Student	Student with limited read access	academic	t	t
4	Parent	Parent with access to child information	academic	t	t
5	Staff	Administrative staff with operational access	administrative	t	t
\.


--
-- Data for Name: super_admin_audit; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.super_admin_audit (id, super_admin_id, action, resource, resource_id, tenant_id, details, ip_address, user_agent, "timestamp") FROM stdin;
fe4c75eb-0306-4c07-b124-6a086241dc98	608ba210-2fd3-4f15-8466-0cbc87392d84	SYSTEM_SETUP	super_admin_user	\N	\N	Initial Super Admin user created via API	\N	\N	2025-09-13 16:41:51.981781
8ed5ce55-4277-48a9-88b6-d8e91ec9263e	608ba210-2fd3-4f15-8466-0cbc87392d84	LOGIN	authentication	\N	\N	{"ip_address": "127.0.0.1"}	127.0.0.1	\N	2025-09-13 16:42:03.379821
5d98324b-0367-408c-91dc-b338b74064ec	608ba210-2fd3-4f15-8466-0cbc87392d84	LIST_TENANTS	tenant	\N	\N	{"filter_active": null, "count": 3}	127.0.0.1	\N	2025-09-13 16:42:36.276667
8391003d-9d6a-41ee-806c-68be77b2b576	608ba210-2fd3-4f15-8466-0cbc87392d84	LIST_PLANS	plan	\N	\N	{"include_resources": false, "plan_count": 4}	127.0.0.1	\N	2025-09-13 16:42:46.627775
c12d6942-33c7-4096-bfa5-f873bd248abe	608ba210-2fd3-4f15-8466-0cbc87392d84	LOGIN	authentication	\N	\N	{"ip_address": "127.0.0.1"}	127.0.0.1	\N	2025-09-13 21:07:11.48868
4289e1d2-c72f-4917-ad36-155090bf1c3f	608ba210-2fd3-4f15-8466-0cbc87392d84	VIEW_PLAN_RESOURCES	plan	4	\N	{"plan_name": "Enterprise", "resource_count": 38}	127.0.0.1	\N	2025-09-13 21:07:13.813569
bb7f6f51-ac35-4f1f-b1c8-025d1840b910	608ba210-2fd3-4f15-8466-0cbc87392d84	LOGIN	authentication	\N	\N	{"ip_address": "127.0.0.1"}	127.0.0.1	\N	2025-09-13 21:11:06.812163
c2a2f82c-49da-43d1-bd24-63f4f1d26cea	608ba210-2fd3-4f15-8466-0cbc87392d84	VIEW_PLAN_RESOURCES	plan	4	\N	{"plan_name": "Enterprise", "resource_count": 38}	127.0.0.1	\N	2025-09-13 21:11:09.057062
8b443979-6b19-4c48-85f0-5f741e7c661c	608ba210-2fd3-4f15-8466-0cbc87392d84	REMOVE_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "academic_years", "action_name": "update", "affected_tenants": 2}	127.0.0.1	\N	2025-09-13 21:11:11.343709
514d58a8-3761-4a8f-b263-b9a75eecbfdd	608ba210-2fd3-4f15-8466-0cbc87392d84	REMOVE_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "academic_years", "action_name": "delete", "affected_tenants": 2}	127.0.0.1	\N	2025-09-13 21:11:13.622011
a7e7d192-2ef1-4763-bf44-540a21f49cea	608ba210-2fd3-4f15-8466-0cbc87392d84	VIEW_PLAN_RESOURCES	plan	4	\N	{"plan_name": "Enterprise", "resource_count": 38}	127.0.0.1	\N	2025-09-13 21:11:15.86036
7d86c7fc-5163-47c4-8944-598b5900708a	608ba210-2fd3-4f15-8466-0cbc87392d84	ADD_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "academic_years", "action_name": "update", "affected_tenants": 2}	127.0.0.1	\N	2025-09-13 21:11:18.159925
ad86c14a-80ba-40ce-ac09-d1be13a988d2	608ba210-2fd3-4f15-8466-0cbc87392d84	ADD_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "academic_years", "action_name": "delete", "affected_tenants": 2}	127.0.0.1	\N	2025-09-13 21:11:20.433112
8f34c5be-d8c4-4cd2-9e08-bb499093e533	608ba210-2fd3-4f15-8466-0cbc87392d84	VIEW_PLAN_RESOURCES	plan	4	\N	{"plan_name": "Enterprise", "resource_count": 38}	127.0.0.1	\N	2025-09-13 21:11:22.681056
0f889ae4-03a2-4580-bee5-1d57ac295aa1	608ba210-2fd3-4f15-8466-0cbc87392d84	LOGIN	authentication	\N	\N	{"ip_address": "127.0.0.1"}	127.0.0.1	\N	2025-09-13 21:11:25.492059
40ffe2d1-cefe-47af-9040-0bb069ad3a16	608ba210-2fd3-4f15-8466-0cbc87392d84	VIEW_PLAN_RESOURCES	plan	1	\N	{"plan_name": "Basic", "resource_count": 29}	127.0.0.1	\N	2025-09-13 21:11:27.851264
db13ca63-37b7-4cdd-bba0-e97264377f0d	608ba210-2fd3-4f15-8466-0cbc87392d84	VIEW_PLAN_RESOURCES	plan	4	\N	{"plan_name": "Enterprise", "resource_count": 38}	127.0.0.1	\N	2025-09-13 21:11:30.091309
f029e4dc-1a46-40c8-9e93-02e2e1081602	608ba210-2fd3-4f15-8466-0cbc87392d84	LOGIN	authentication	\N	\N	{"ip_address": "127.0.0.1"}	127.0.0.1	\N	2025-09-13 21:17:11.562849
5d77a6f4-6b47-429f-851f-6e0e2fa4fff2	608ba210-2fd3-4f15-8466-0cbc87392d84	REMOVE_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "academic_years", "action_name": "update", "affected_tenants": 2}	127.0.0.1	\N	2025-09-13 21:17:23.744918
4f23c182-05c5-4997-85b9-12a2d4dd75aa	608ba210-2fd3-4f15-8466-0cbc87392d84	REMOVE_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "academic_years", "action_name": "delete", "affected_tenants": 2}	127.0.0.1	\N	2025-09-13 21:17:36.024908
bf8e44bb-7ddd-4f2e-b23e-2f828d46a3de	608ba210-2fd3-4f15-8466-0cbc87392d84	ADD_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "academic_years", "action_name": "update", "affected_tenants": 2}	127.0.0.1	\N	2025-09-13 21:17:48.197807
7dac1a22-99b7-4ac8-a3e9-9bdd328fe921	608ba210-2fd3-4f15-8466-0cbc87392d84	ADD_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "academic_years", "action_name": "delete", "affected_tenants": 2}	127.0.0.1	\N	2025-09-13 21:17:50.3617
4c8f0e6e-d08c-434d-853f-4cb7f837c382	608ba210-2fd3-4f15-8466-0cbc87392d84	LOGIN	authentication	\N	\N	{"ip_address": "127.0.0.1"}	127.0.0.1	\N	2025-09-13 21:28:10.859781
8ed1bf8c-8e7b-4093-a1ae-5c1f178493b6	608ba210-2fd3-4f15-8466-0cbc87392d84	LOGIN	authentication	\N	\N	{"ip_address": "127.0.0.1"}	127.0.0.1	\N	2025-09-13 21:51:18.35623
83a99d80-5c6f-4148-a220-890bf893f3c0	608ba210-2fd3-4f15-8466-0cbc87392d84	LIST_TENANTS	tenant	\N	\N	{"filter_active": null, "count": 3}	127.0.0.1	\N	2025-09-13 21:51:20.505842
3d3fa625-c15e-4b4d-aadc-d9b96fcf38ec	608ba210-2fd3-4f15-8466-0cbc87392d84	CREATE_TENANT	tenant	5	test_menu_sync_schema	{"client_name": "test_menu_sync_tenant", "schema_name": "test_menu_sync_schema"}	127.0.0.1	\N	2025-09-13 21:51:22.730251
9fedb27c-9420-4b3b-9431-6bc0752812d9	608ba210-2fd3-4f15-8466-0cbc87392d84	LOGIN	authentication	\N	\N	{"ip_address": "127.0.0.1"}	127.0.0.1	\N	2025-09-13 21:51:53.535332
21cc17d1-e2a0-4216-bd7f-e8c6f586ec11	608ba210-2fd3-4f15-8466-0cbc87392d84	LIST_TENANTS	tenant	\N	\N	{"filter_active": null, "count": 4}	127.0.0.1	\N	2025-09-13 21:51:55.671332
b92ab182-ad8a-41bb-bab8-16c4257fece4	608ba210-2fd3-4f15-8466-0cbc87392d84	CREATE_TENANT	tenant	6	test_menu_sync_schema2	{"client_name": "test_menu_sync_tenant2", "schema_name": "test_menu_sync_schema2"}	127.0.0.1	\N	2025-09-13 21:51:57.861035
4214ca1d-00e5-4bfa-8c11-5e515e211d25	608ba210-2fd3-4f15-8466-0cbc87392d84	LIST_TENANTS	tenant	\N	\N	{"filter_active": null, "count": 5}	127.0.0.1	\N	2025-09-13 21:52:02.135718
ea5bbacb-2b9d-4700-b535-8104f61bfedb	608ba210-2fd3-4f15-8466-0cbc87392d84	LOGIN	authentication	\N	\N	{"ip_address": "127.0.0.1"}	127.0.0.1	\N	2025-09-13 22:13:57.678562
f1a5b006-cb6c-4417-a642-07dd84ee0d90	608ba210-2fd3-4f15-8466-0cbc87392d84	LIST_TENANTS	tenant	\N	\N	{"filter_active": null, "count": 5}	127.0.0.1	\N	2025-09-13 22:13:59.82855
25b6252b-497f-42a0-a544-1164d96fef32	608ba210-2fd3-4f15-8466-0cbc87392d84	CREATE_TENANT	tenant	7	test_final_menu_schema	{"client_name": "test_final_menu_sync", "schema_name": "test_final_menu_schema"}	127.0.0.1	\N	2025-09-13 22:14:02.035375
d4d4d9be-071d-48d5-9b42-3ee3aeb551a6	608ba210-2fd3-4f15-8466-0cbc87392d84	LIST_TENANTS	tenant	\N	\N	{"filter_active": null, "count": 6}	127.0.0.1	\N	2025-09-13 22:14:06.223143
a1a391f3-1a02-46d7-a5d6-804223af48e7	608ba210-2fd3-4f15-8466-0cbc87392d84	LOGIN	authentication	\N	\N	{"ip_address": "127.0.0.1"}	127.0.0.1	\N	2025-09-13 22:14:36.780719
af8e7e27-44d5-43d0-ad79-7bfe78b762ea	608ba210-2fd3-4f15-8466-0cbc87392d84	LIST_PLANS	plan	\N	\N	{"include_resources": false, "plan_count": 4}	127.0.0.1	\N	2025-09-13 22:14:38.925535
991276e6-7697-4983-a730-aba9d530ebe0	608ba210-2fd3-4f15-8466-0cbc87392d84	LOGIN	authentication	\N	\N	{"ip_address": "127.0.0.1"}	127.0.0.1	\N	2025-09-13 22:14:56.669392
e8caadef-1aed-419e-9580-ea5505ef2540	608ba210-2fd3-4f15-8466-0cbc87392d84	LIST_PLANS	plan	\N	\N	{"include_resources": false, "plan_count": 4}	127.0.0.1	\N	2025-09-13 22:14:58.815599
b574369e-8426-445b-809e-60edf8f086d8	608ba210-2fd3-4f15-8466-0cbc87392d84	VIEW_PLAN_RESOURCES	plan	4	\N	{"plan_name": "Enterprise", "resource_count": 38}	127.0.0.1	\N	2025-09-13 22:15:01.081363
c67d7353-beec-4203-97e1-c962a3a6684f	608ba210-2fd3-4f15-8466-0cbc87392d84	LOGIN	authentication	\N	\N	{"ip_address": "127.0.0.1"}	127.0.0.1	\N	2025-09-13 22:15:18.951159
370fac6a-f455-41b2-a56c-7f92579245ac	608ba210-2fd3-4f15-8466-0cbc87392d84	LIST_PLANS	plan	\N	\N	{"include_resources": false, "plan_count": 4}	127.0.0.1	\N	2025-09-13 22:15:21.113708
3ba2b906-44b0-4e3d-ac09-e8c77d227443	608ba210-2fd3-4f15-8466-0cbc87392d84	VIEW_PLAN_RESOURCES	plan	4	\N	{"plan_name": "Enterprise", "resource_count": 38}	127.0.0.1	\N	2025-09-13 22:15:23.264026
9eeca20d-fa19-4364-a4d0-3a74b2c92136	608ba210-2fd3-4f15-8466-0cbc87392d84	LIST_TENANTS	tenant	\N	\N	{"filter_active": null, "count": 6}	127.0.0.1	\N	2025-09-13 22:15:25.409921
89cad6ca-93ba-42d4-8dd6-7002b8661c03	608ba210-2fd3-4f15-8466-0cbc87392d84	CREATE_TENANT	tenant	8	debug_test_simple_schema	{"client_name": "debug_test_simple", "schema_name": "debug_test_simple_schema"}	127.0.0.1	\N	2025-09-13 22:15:27.599778
f28c86f2-22d2-4556-857e-889558303a90	608ba210-2fd3-4f15-8466-0cbc87392d84	CREATE_TENANT	tenant	9	debug_test_with_plan_schema	{"client_name": "debug_test_with_plan", "schema_name": "debug_test_with_plan_schema"}	127.0.0.1	\N	2025-09-13 22:15:29.781561
d6768883-6c99-4592-ad33-80693ac4b209	608ba210-2fd3-4f15-8466-0cbc87392d84	LOGIN	authentication	\N	\N	{"ip_address": "127.0.0.1"}	127.0.0.1	\N	2025-09-13 22:22:43.84252
f06ee7fe-21f8-4ee2-a44d-de7a046915f1	608ba210-2fd3-4f15-8466-0cbc87392d84	CREATE_TENANT	tenant	10	test_full_system_schema	{"client_name": "test_full_system", "schema_name": "test_full_system_schema"}	127.0.0.1	\N	2025-09-13 22:22:46.008413
f42b4993-a3c4-4913-9b58-2bea93f3f6a6	608ba210-2fd3-4f15-8466-0cbc87392d84	LIST_TENANTS	tenant	\N	\N	{"filter_active": null, "count": 9}	127.0.0.1	\N	2025-09-13 22:22:50.20784
63ff1e78-3f13-43ca-a432-519f7adca2c5	608ba210-2fd3-4f15-8466-0cbc87392d84	LOGIN	authentication	\N	\N	{"ip_address": "127.0.0.1"}	127.0.0.1	\N	2025-09-13 22:25:14.625839
6d5fc4a1-653a-4d80-a13a-eaf781aa5071	608ba210-2fd3-4f15-8466-0cbc87392d84	LOGIN	authentication	\N	\N	{"ip_address": "127.0.0.1"}	127.0.0.1	\N	2025-09-13 22:26:01.363273
d21725a3-7f06-4d3f-9cee-3538bc70d23b	608ba210-2fd3-4f15-8466-0cbc87392d84	CREATE_TENANT	tenant	11	final_test_basic_schema	{"client_name": "final_test_basic", "schema_name": "final_test_basic_schema"}	127.0.0.1	\N	2025-09-13 22:26:03.530857
628e5784-5990-4576-80ae-a2b9ff1fedbb	608ba210-2fd3-4f15-8466-0cbc87392d84	CREATE_TENANT	tenant	12	final_test_enterprise_schema	{"client_name": "final_test_enterprise", "schema_name": "final_test_enterprise_schema"}	127.0.0.1	\N	2025-09-13 22:26:05.815211
c42fa909-1461-4a92-b4be-a659f4e41edc	608ba210-2fd3-4f15-8466-0cbc87392d84	LIST_TENANTS	tenant	\N	\N	{"filter_active": null, "count": 11}	127.0.0.1	\N	2025-09-13 22:26:09.987052
c1f61a89-1732-45cf-ab9c-1853ea02dad5	608ba210-2fd3-4f15-8466-0cbc87392d84	LOGIN	authentication	\N	\N	{"ip_address": "127.0.0.1"}	127.0.0.1	\N	2025-09-13 22:47:51.895604
2abf30da-0b08-45c6-8875-4cbfdb658977	608ba210-2fd3-4f15-8466-0cbc87392d84	LOGIN	authentication	\N	\N	{"ip_address": "127.0.0.1"}	127.0.0.1	\N	2025-09-13 22:49:30.095967
f648131c-4b51-47e0-aa14-cde0c6d4259c	608ba210-2fd3-4f15-8466-0cbc87392d84	LIST_TENANTS	tenant	\N	\N	{"filter_active": null, "count": 11}	127.0.0.1	\N	2025-09-13 22:49:32.236791
d8845966-aab7-4feb-aae2-b7ed5e8d0e1f	608ba210-2fd3-4f15-8466-0cbc87392d84	LIST_TENANTS	tenant	\N	\N	{"filter_active": null, "count": 11}	127.0.0.1	\N	2025-09-13 22:49:40.512013
784d010a-6c52-4bd1-badc-d8fefbf9410e	608ba210-2fd3-4f15-8466-0cbc87392d84	LOGIN	authentication	\N	\N	{"ip_address": "127.0.0.1"}	127.0.0.1	\N	2025-09-13 22:50:37.858063
faaf3d9a-38ee-4b5d-80ac-3d7f97cd55fb	608ba210-2fd3-4f15-8466-0cbc87392d84	LIST_TENANTS	tenant	\N	\N	{"filter_active": null, "count": 11}	127.0.0.1	\N	2025-09-13 22:50:39.995118
e8d33cd1-6d63-4b47-9c56-405dbbcd1807	608ba210-2fd3-4f15-8466-0cbc87392d84	LOGIN	authentication	\N	\N	{"ip_address": "127.0.0.1"}	127.0.0.1	\N	2025-09-13 22:51:49.016498
0941e37e-082b-466f-977e-c8e634ee5f93	608ba210-2fd3-4f15-8466-0cbc87392d84	LIST_TENANTS	tenant	\N	\N	{"filter_active": null, "count": 11}	127.0.0.1	\N	2025-09-13 22:51:51.153187
9bd502e0-6457-4743-af95-075b950e4536	608ba210-2fd3-4f15-8466-0cbc87392d84	LIST_TENANTS	tenant	\N	\N	{"filter_active": null, "count": 11}	127.0.0.1	\N	2025-09-13 22:51:59.452623
0ab23d91-0704-41d5-a5f0-4a774868c507	608ba210-2fd3-4f15-8466-0cbc87392d84	LOGIN	authentication	\N	\N	{"ip_address": "127.0.0.1"}	127.0.0.1	\N	2025-09-13 22:52:35.622554
342fa837-8eeb-4124-a4e5-3700956d3a23	608ba210-2fd3-4f15-8466-0cbc87392d84	LIST_TENANTS	tenant	\N	\N	{"filter_active": null, "count": 11}	127.0.0.1	\N	2025-09-13 22:52:37.778998
0ae39329-82f8-4033-8c93-54a6e0ae56da	608ba210-2fd3-4f15-8466-0cbc87392d84	LIST_TENANTS	tenant	\N	\N	{"filter_active": null, "count": 11}	127.0.0.1	\N	2025-09-13 22:52:46.469607
c3c38e39-3176-439d-a433-d1446b92cc11	608ba210-2fd3-4f15-8466-0cbc87392d84	LOGIN	authentication	\N	\N	{"ip_address": "127.0.0.1"}	127.0.0.1	\N	2025-09-13 22:55:19.912156
ecf9252b-97cb-4d54-b612-580cb62d5735	608ba210-2fd3-4f15-8466-0cbc87392d84	LIST_TENANTS	tenant	\N	\N	{"filter_active": null, "count": 11}	127.0.0.1	\N	2025-09-13 22:55:22.057417
25310730-0eee-4cde-87cf-d49e7184798f	608ba210-2fd3-4f15-8466-0cbc87392d84	LIST_TENANTS	tenant	\N	\N	{"filter_active": null, "count": 11}	127.0.0.1	\N	2025-09-13 22:55:30.629207
57f9dd5d-109a-4662-9206-db7cfe3d2168	608ba210-2fd3-4f15-8466-0cbc87392d84	LOGIN	authentication	\N	\N	{"ip_address": "127.0.0.1"}	127.0.0.1	\N	2025-09-13 22:55:57.476551
bb06e608-66cc-4c79-a8dd-565f7aa6e35c	608ba210-2fd3-4f15-8466-0cbc87392d84	LIST_TENANTS	tenant	\N	\N	{"filter_active": null, "count": 11}	127.0.0.1	\N	2025-09-13 22:55:59.74586
97ffb6e4-50aa-4ffc-928c-90e58918335d	608ba210-2fd3-4f15-8466-0cbc87392d84	LIST_TENANTS	tenant	\N	\N	{"filter_active": null, "count": 11}	127.0.0.1	\N	2025-09-13 22:56:08.425051
2e8f5704-4925-4b97-b4f9-7934f7710c6a	608ba210-2fd3-4f15-8466-0cbc87392d84	LOGIN	authentication	\N	\N	{"ip_address": "127.0.0.1"}	127.0.0.1	\N	2025-09-13 23:05:54.169611
89007812-ca21-4ff3-8c36-c064a9bced37	608ba210-2fd3-4f15-8466-0cbc87392d84	LIST_TENANTS	tenant	\N	\N	{"filter_active": null, "count": 11}	127.0.0.1	\N	2025-09-13 23:05:56.307969
6f58ebf1-c8e9-44a8-a65a-16fe22406e6d	608ba210-2fd3-4f15-8466-0cbc87392d84	LIST_TENANTS	tenant	\N	\N	{"filter_active": null, "count": 11}	127.0.0.1	\N	2025-09-13 23:06:05.086262
6ba3e688-b0c2-4cb8-904b-6ff041c944e3	608ba210-2fd3-4f15-8466-0cbc87392d84	LOGIN	authentication	\N	\N	{"ip_address": "127.0.0.1"}	127.0.0.1	\N	2025-09-13 23:06:29.232912
2564d7da-71c3-44b1-8431-83eb2f5c56bc	608ba210-2fd3-4f15-8466-0cbc87392d84	LIST_TENANTS	tenant	\N	\N	{"filter_active": null, "count": 11}	127.0.0.1	\N	2025-09-13 23:06:31.390125
ac5d4ed8-9bb9-46f2-9df4-da8a46161ca3	608ba210-2fd3-4f15-8466-0cbc87392d84	LOGIN	authentication	\N	\N	{"ip_address": "127.0.0.1"}	127.0.0.1	\N	2025-09-13 23:07:37.733007
006e91cd-2a4a-4380-8a4e-947023e25cd1	608ba210-2fd3-4f15-8466-0cbc87392d84	LIST_TENANTS	tenant	\N	\N	{"filter_active": null, "count": 11}	127.0.0.1	\N	2025-09-13 23:07:39.868316
a6e3bea2-f06f-4647-bd6d-f73de10773a3	608ba210-2fd3-4f15-8466-0cbc87392d84	LOGIN	authentication	\N	\N	{"ip_address": "127.0.0.1"}	127.0.0.1	\N	2025-09-13 23:09:41.008547
a2eec88b-a934-4fd9-8dff-66e166e81d67	608ba210-2fd3-4f15-8466-0cbc87392d84	LIST_TENANTS	tenant	\N	\N	{"filter_active": null, "count": 11}	127.0.0.1	\N	2025-09-13 23:09:43.145388
d8b28b77-fdf8-486c-87c1-325e3600182e	608ba210-2fd3-4f15-8466-0cbc87392d84	LOGIN	authentication	\N	\N	{"ip_address": "127.0.0.1"}	127.0.0.1	\N	2025-09-13 23:10:21.692739
bcf716eb-e34e-4b27-aedd-2b8989738819	608ba210-2fd3-4f15-8466-0cbc87392d84	LIST_TENANTS	tenant	\N	\N	{"filter_active": null, "count": 11}	127.0.0.1	\N	2025-09-13 23:10:23.828571
da3dfbd3-a8d1-4568-8577-42fcf3e9c5f4	608ba210-2fd3-4f15-8466-0cbc87392d84	LOGIN	authentication	\N	\N	{"ip_address": "127.0.0.1"}	127.0.0.1	\N	2025-09-13 23:11:16.953249
21046774-3e90-42a9-b57b-c619eac4bfe6	608ba210-2fd3-4f15-8466-0cbc87392d84	LOGIN	authentication	\N	\N	{"ip_address": "127.0.0.1"}	127.0.0.1	\N	2025-09-13 23:11:33.306364
af1cbbbc-aa73-4688-affe-79f786b091a1	608ba210-2fd3-4f15-8466-0cbc87392d84	LIST_TENANTS	tenant	\N	\N	{"filter_active": null, "count": 11}	127.0.0.1	\N	2025-09-13 23:11:35.55644
7088fb0f-55af-41d5-97b7-65d3e2f89409	608ba210-2fd3-4f15-8466-0cbc87392d84	LOGIN	authentication	\N	\N	{"ip_address": "127.0.0.1"}	127.0.0.1	\N	2025-09-13 23:12:50.528458
64003ab2-95a1-49fc-93ef-3e42c8fe43b5	608ba210-2fd3-4f15-8466-0cbc87392d84	LIST_TENANTS	tenant	\N	\N	{"filter_active": null, "count": 11}	127.0.0.1	\N	2025-09-13 23:12:52.693927
7d06cd51-e8aa-4e1b-80fa-9cca6eb9cd76	608ba210-2fd3-4f15-8466-0cbc87392d84	LOGIN	authentication	\N	\N	{"ip_address": "127.0.0.1"}	127.0.0.1	\N	2025-09-13 23:14:16.206668
814df986-1265-47fe-8793-788aa7b8678d	608ba210-2fd3-4f15-8466-0cbc87392d84	LIST_TENANTS	tenant	\N	\N	{"filter_active": null, "count": 11}	127.0.0.1	\N	2025-09-13 23:14:18.362678
2a2342f2-9223-4c5d-997b-25ebaa91dd0b	608ba210-2fd3-4f15-8466-0cbc87392d84	LIST_TENANTS	tenant	\N	\N	{"filter_active": null, "count": 11}	127.0.0.1	\N	2025-09-13 23:14:27.358094
4c06bf80-db49-4de5-9734-1ac10003e8fb	608ba210-2fd3-4f15-8466-0cbc87392d84	LOGIN	authentication	\N	\N	{"ip_address": "127.0.0.1"}	127.0.0.1	\N	2025-09-13 23:17:07.741375
9e49b3a1-8446-4f71-be6b-387de2273f64	608ba210-2fd3-4f15-8466-0cbc87392d84	LIST_TENANTS	tenant	\N	\N	{"filter_active": null, "count": 11}	127.0.0.1	\N	2025-09-13 23:17:14.247216
d1a79413-558f-42e4-8f9b-86af13af1372	608ba210-2fd3-4f15-8466-0cbc87392d84	LOGIN	authentication	\N	\N	{"ip_address": "127.0.0.1"}	127.0.0.1	\N	2025-09-13 23:21:38.938249
8d3db807-163d-416c-ba24-6e0dc1d84703	608ba210-2fd3-4f15-8466-0cbc87392d84	LIST_TENANTS	tenant	\N	\N	{"filter_active": null, "count": 11}	127.0.0.1	\N	2025-09-13 23:21:41.080237
d986a679-14b1-497b-a9e4-9987850a8162	608ba210-2fd3-4f15-8466-0cbc87392d84	LIST_TENANTS	tenant	\N	\N	{"filter_active": null, "count": 11}	127.0.0.1	\N	2025-09-13 23:21:49.820772
04d9aed8-aacc-4034-8f36-b5501a9a041f	608ba210-2fd3-4f15-8466-0cbc87392d84	LOGIN	authentication	\N	\N	{"ip_address": "127.0.0.1"}	127.0.0.1	\N	2025-09-13 23:23:12.880862
bc065219-30ff-438d-abf6-2b09c83de96c	608ba210-2fd3-4f15-8466-0cbc87392d84	ASSIGN_TENANT_PLAN	tenant	12	final_test_enterprise_schema	{"old_plan_id": 4, "new_plan_id": 4, "plan_name": "Enterprise", "menus_synced": 49, "allowed_menu_ids": [2, 3, 16, 23, 33, 39, 45, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 1, 17, 18, 19, 20, 21, 22, 24, 25, 26, 27, 28, 29, 30, 31, 32, 34, 35, 36, 37, 38, 40, 41, 42, 43, 44, 46, 47, 48, 49]}	127.0.0.1	\N	2025-09-13 23:23:15.180897
a0329dea-4b30-4523-a5eb-2b0706dee4f6	608ba210-2fd3-4f15-8466-0cbc87392d84	LOGIN	authentication	\N	\N	{"ip_address": "127.0.0.1"}	127.0.0.1	\N	2025-09-13 23:23:36.85407
8bb3949b-73d9-4df9-a953-d466c6d1bcac	608ba210-2fd3-4f15-8466-0cbc87392d84	ASSIGN_TENANT_PLAN	tenant	11	final_test_basic_schema	{"old_plan_id": 4, "new_plan_id": 1, "plan_name": "Basic", "menus_synced": 9, "allowed_menu_ids": [2, 16, 39, 4, 1, 17, 18, 40, 44]}	127.0.0.1	\N	2025-09-13 23:23:39.153376
548501ad-22b9-4535-ab1e-757ad8219a70	608ba210-2fd3-4f15-8466-0cbc87392d84	LOGIN	authentication	\N	\N	{"ip_address": "127.0.0.1"}	127.0.0.1	\N	2025-09-14 18:42:25.8516
336e81c7-8ead-49b0-8109-e3418e3524d1	608ba210-2fd3-4f15-8466-0cbc87392d84	SYSTEM_SETUP	super_admin_user	\N	\N	Initial Super Admin user created via API	\N	\N	2025-09-14 19:43:22.384991
b847c529-4711-4a28-b1a7-c705fbf39a66	608ba210-2fd3-4f15-8466-0cbc87392d84	LOGIN	authentication	\N	\N	{"ip_address": "127.0.0.1"}	127.0.0.1	\N	2025-09-14 19:43:31.171361
1700f268-11c7-4eef-92f8-3f2387524377	608ba210-2fd3-4f15-8466-0cbc87392d84	LOGIN	authentication	\N	\N	{"ip_address": "127.0.0.1"}	127.0.0.1	\N	2025-09-14 19:45:19.417188
4f5da612-9ddb-46c1-8747-d838b677937f	608ba210-2fd3-4f15-8466-0cbc87392d84	ASSIGN_TENANT_PLAN	tenant	4	test_tenant_schema	{"old_plan_id": 4, "new_plan_id": 4, "plan_name": "Enterprise", "menus_synced": 49, "allowed_menu_ids": [2, 3, 16, 23, 33, 39, 45, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 1, 17, 18, 19, 20, 21, 22, 24, 25, 26, 27, 28, 29, 30, 31, 32, 34, 35, 36, 37, 38, 40, 41, 42, 43, 44, 46, 47, 48, 49]}	127.0.0.1	\N	2025-09-14 19:45:34.251333
71e4c4a4-54ab-4c4b-b3e8-f501c8efa33f	608ba210-2fd3-4f15-8466-0cbc87392d84	LOGIN	authentication	\N	\N	{"ip_address": "127.0.0.1"}	127.0.0.1	\N	2025-09-14 19:49:02.664176
7c3e7f1e-0e74-4293-9287-5fe3067a20b5	608ba210-2fd3-4f15-8466-0cbc87392d84	ASSIGN_TENANT_PLAN	tenant	4	test_tenant_schema	{"old_plan_id": 4, "new_plan_id": 4, "plan_name": "Enterprise", "menus_synced": 49, "allowed_menu_ids": [2, 3, 16, 23, 33, 39, 45, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 1, 17, 18, 19, 20, 21, 22, 24, 25, 26, 27, 28, 29, 30, 31, 32, 34, 35, 36, 37, 38, 40, 41, 42, 43, 44, 46, 47, 48, 49]}	127.0.0.1	\N	2025-09-14 19:49:12.537889
231b3a8d-f57e-4a28-99ed-5bb9013936a7	608ba210-2fd3-4f15-8466-0cbc87392d84	LOGIN	authentication	\N	\N	{"ip_address": "127.0.0.1"}	127.0.0.1	\N	2025-09-14 19:50:39.870251
4ca72cc7-d8c8-4bdc-bf6c-b642e3f32eb6	608ba210-2fd3-4f15-8466-0cbc87392d84	LOGIN	authentication	\N	\N	{"ip_address": "127.0.0.1"}	127.0.0.1	\N	2025-09-15 13:24:07.98658
0cc87a02-5784-4d86-aa9a-6d83b09b4785	608ba210-2fd3-4f15-8466-0cbc87392d84	LIST_PLANS	plan	\N	\N	{"include_resources": true, "plan_count": 4}	127.0.0.1	\N	2025-09-15 13:26:06.181792
74a0b2d2-a358-4f64-82b0-580adae56205	608ba210-2fd3-4f15-8466-0cbc87392d84	ADD_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "expense_categories", "action_name": "create", "affected_tenants": 2}	127.0.0.1	\N	2025-09-15 13:26:27.026815
4b869642-d88c-4c0e-bbd5-b3219aab97ff	608ba210-2fd3-4f15-8466-0cbc87392d84	ADD_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "expense_categories", "action_name": "read", "affected_tenants": 2}	127.0.0.1	\N	2025-09-15 13:27:27.192505
a99e9fcf-0a6b-4317-8be6-c877fb6d7b7f	608ba210-2fd3-4f15-8466-0cbc87392d84	ADD_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "expense_categories", "action_name": "update", "affected_tenants": 2}	127.0.0.1	\N	2025-09-15 13:27:28.664424
cd28e446-6ffb-4574-8e0f-4e4a884ca356	608ba210-2fd3-4f15-8466-0cbc87392d84	ADD_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "expense_categories", "action_name": "delete", "affected_tenants": 2}	127.0.0.1	\N	2025-09-15 13:27:30.005437
b3e56c1d-e149-4530-9846-1d238aa5ce87	608ba210-2fd3-4f15-8466-0cbc87392d84	ADD_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "expense_categories", "action_name": "list", "affected_tenants": 2}	127.0.0.1	\N	2025-09-15 13:27:31.355309
0404f8cb-a134-4c9c-b13b-6358fd81fcba	608ba210-2fd3-4f15-8466-0cbc87392d84	ADD_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "expense_types", "action_name": "create", "affected_tenants": 2}	127.0.0.1	\N	2025-09-15 13:28:00.206402
f0868313-94b6-4969-85ca-236fef12fee1	608ba210-2fd3-4f15-8466-0cbc87392d84	ADD_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "expense_types", "action_name": "read", "affected_tenants": 2}	127.0.0.1	\N	2025-09-15 13:28:01.577622
d8ad674d-e81d-4299-a621-0fc921894bea	608ba210-2fd3-4f15-8466-0cbc87392d84	ADD_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "expense_types", "action_name": "update", "affected_tenants": 2}	127.0.0.1	\N	2025-09-15 13:28:02.944935
bd643981-0492-4c99-ba9d-516dd3ebf097	608ba210-2fd3-4f15-8466-0cbc87392d84	ADD_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "expense_types", "action_name": "delete", "affected_tenants": 2}	127.0.0.1	\N	2025-09-15 13:28:04.295519
bb3ce1c8-b8dc-42fb-b613-164f647b860b	608ba210-2fd3-4f15-8466-0cbc87392d84	ADD_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "expense_types", "action_name": "list", "affected_tenants": 2}	127.0.0.1	\N	2025-09-15 13:28:05.681198
de916cac-707c-4db0-83f2-b07de5b96521	608ba210-2fd3-4f15-8466-0cbc87392d84	ADD_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "expense_transactions", "action_name": "create", "affected_tenants": 2}	127.0.0.1	\N	2025-09-15 13:28:31.157109
18417ecb-7863-4375-977a-7d76f9c329ea	608ba210-2fd3-4f15-8466-0cbc87392d84	ADD_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "expense_transactions", "action_name": "read", "affected_tenants": 2}	127.0.0.1	\N	2025-09-15 13:28:32.49447
36ce4db1-6456-4e28-a1dc-1b197904f184	608ba210-2fd3-4f15-8466-0cbc87392d84	ADD_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "expense_transactions", "action_name": "update", "affected_tenants": 2}	127.0.0.1	\N	2025-09-15 13:28:33.878193
c85f1f65-c46f-48f9-8247-0d792e3116c0	608ba210-2fd3-4f15-8466-0cbc87392d84	ADD_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "expense_transactions", "action_name": "delete", "affected_tenants": 2}	127.0.0.1	\N	2025-09-15 13:28:35.247912
a47f243d-7154-4c60-b722-2506443dfced	608ba210-2fd3-4f15-8466-0cbc87392d84	ADD_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "expense_transactions", "action_name": "list", "affected_tenants": 2}	127.0.0.1	\N	2025-09-15 13:28:36.624039
ae72c478-a424-44c7-93d7-12e4a63fb77d	608ba210-2fd3-4f15-8466-0cbc87392d84	ADD_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "expense_transaction_items", "action_name": "create", "affected_tenants": 2}	127.0.0.1	\N	2025-09-15 13:29:06.509458
660530b9-f6da-467f-965b-03701f3f0553	608ba210-2fd3-4f15-8466-0cbc87392d84	ADD_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "expense_transaction_items", "action_name": "read", "affected_tenants": 2}	127.0.0.1	\N	2025-09-15 13:29:07.895575
3200e287-48f2-4ee2-8f92-7569a9c1b416	608ba210-2fd3-4f15-8466-0cbc87392d84	ADD_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "expense_transaction_items", "action_name": "update", "affected_tenants": 2}	127.0.0.1	\N	2025-09-15 13:29:09.314779
70fc7cc5-8860-42cc-960c-71a3ab4449ec	608ba210-2fd3-4f15-8466-0cbc87392d84	ADD_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "expense_transaction_items", "action_name": "delete", "affected_tenants": 2}	127.0.0.1	\N	2025-09-15 13:29:10.888832
4c265aa5-7e9a-4ad8-81de-23c750a7c9d4	608ba210-2fd3-4f15-8466-0cbc87392d84	ADD_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "expense_transaction_items", "action_name": "list", "affected_tenants": 2}	127.0.0.1	\N	2025-09-15 13:29:12.279744
7054f14a-8ca1-4ded-9944-ba77e7875a64	608ba210-2fd3-4f15-8466-0cbc87392d84	ADD_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "expense_attachments", "action_name": "create", "affected_tenants": 2}	127.0.0.1	\N	2025-09-15 13:29:38.833243
9df76a7a-a410-4761-8b45-c968f32ee878	608ba210-2fd3-4f15-8466-0cbc87392d84	ADD_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "expense_attachments", "action_name": "read", "affected_tenants": 2}	127.0.0.1	\N	2025-09-15 13:29:40.499342
73ab4763-d37b-4b0a-a156-fd6dd596aeb5	608ba210-2fd3-4f15-8466-0cbc87392d84	ADD_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "expense_attachments", "action_name": "update", "affected_tenants": 2}	127.0.0.1	\N	2025-09-15 13:29:41.994298
faa8cf14-6a0d-45c4-8309-5cca6882957c	608ba210-2fd3-4f15-8466-0cbc87392d84	ADD_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "expense_attachments", "action_name": "delete", "affected_tenants": 2}	127.0.0.1	\N	2025-09-15 13:29:43.38699
05c192b8-15dd-4e0c-b075-9333cc5043c0	608ba210-2fd3-4f15-8466-0cbc87392d84	ADD_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "expense_attachments", "action_name": "list", "affected_tenants": 2}	127.0.0.1	\N	2025-09-15 13:29:44.763026
f9a1e383-d7ed-4350-a47f-cf7f5255edb1	608ba210-2fd3-4f15-8466-0cbc87392d84	ADD_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "expense_settings", "action_name": "create", "affected_tenants": 2}	127.0.0.1	\N	2025-09-15 13:30:06.269549
3da9cdda-ed2c-432a-99c9-e4dddb16ce41	608ba210-2fd3-4f15-8466-0cbc87392d84	ADD_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "expense_settings", "action_name": "read", "affected_tenants": 2}	127.0.0.1	\N	2025-09-15 13:30:06.646939
c61a89d2-e034-483c-a909-6d1c9ecb6031	608ba210-2fd3-4f15-8466-0cbc87392d84	ADD_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "expense_settings", "action_name": "update", "affected_tenants": 2}	127.0.0.1	\N	2025-09-15 13:30:07.056235
0eaac51b-c7c4-4abe-bb57-32b2b1fa9eef	608ba210-2fd3-4f15-8466-0cbc87392d84	ADD_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "expense_settings", "action_name": "delete", "affected_tenants": 2}	127.0.0.1	\N	2025-09-15 13:30:07.481862
26fe13ed-cac7-4cbd-95f2-5881d1ac6ecd	608ba210-2fd3-4f15-8466-0cbc87392d84	ADD_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "expense_settings", "action_name": "list", "affected_tenants": 2}	127.0.0.1	\N	2025-09-15 13:30:07.868046
ec53d477-bfd8-43ca-b161-384f4efabba5	608ba210-2fd3-4f15-8466-0cbc87392d84	ADD_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "expense_audit_logs", "action_name": "create", "affected_tenants": 2}	127.0.0.1	\N	2025-09-15 13:30:26.044566
c99016e1-ccf0-4159-a6bf-5333bb931ea1	608ba210-2fd3-4f15-8466-0cbc87392d84	ADD_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "expense_audit_logs", "action_name": "read", "affected_tenants": 2}	127.0.0.1	\N	2025-09-15 13:30:26.44569
0af11e32-dbbf-4b22-9e89-f17b0adbf288	608ba210-2fd3-4f15-8466-0cbc87392d84	ADD_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "expense_audit_logs", "action_name": "list", "affected_tenants": 2}	127.0.0.1	\N	2025-09-15 13:30:26.844024
82555049-543c-40a1-a9d6-e8d6cf585648	608ba210-2fd3-4f15-8466-0cbc87392d84	ADD_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "expense_reports", "action_name": "create", "affected_tenants": 2}	127.0.0.1	\N	2025-09-15 13:30:49.455583
84cf59ff-a9f4-4c75-a13b-6d8601acd814	608ba210-2fd3-4f15-8466-0cbc87392d84	ADD_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "expense_reports", "action_name": "read", "affected_tenants": 2}	127.0.0.1	\N	2025-09-15 13:30:49.863559
0060e740-b913-4a6c-8c37-a7b118d9db75	608ba210-2fd3-4f15-8466-0cbc87392d84	ADD_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "expense_reports", "action_name": "update", "affected_tenants": 2}	127.0.0.1	\N	2025-09-15 13:30:50.380336
48c85647-c88b-42c9-9157-f61dbdcdf2d0	608ba210-2fd3-4f15-8466-0cbc87392d84	ADD_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "expense_reports", "action_name": "list", "affected_tenants": 2}	127.0.0.1	\N	2025-09-15 13:30:51.062028
d10b98ed-fcd5-4789-9e66-7e4186ec7671	608ba210-2fd3-4f15-8466-0cbc87392d84	ADD_PLAN_RESOURCE	plan	4	\N	{"plan_name": "Enterprise", "resource_name": "expense_reports", "action_name": "delete", "affected_tenants": 2}	127.0.0.1	\N	2025-09-15 13:31:00.523135
927def73-af0d-4e3b-a021-ce4026c1602a	608ba210-2fd3-4f15-8466-0cbc87392d84	VIEW_PLAN_RESOURCES	plan	4	\N	{"plan_name": "Enterprise", "resource_count": 46}	127.0.0.1	\N	2025-09-15 13:31:12.619243
4d80ad00-b0c8-4dc4-bc3c-75187b61dfdc	608ba210-2fd3-4f15-8466-0cbc87392d84	LOGIN	authentication	\N	\N	{"ip_address": "127.0.0.1"}	127.0.0.1	\N	2025-09-15 13:35:47.499443
c8cc9697-387a-4b1a-a85d-75789e618a40	608ba210-2fd3-4f15-8466-0cbc87392d84	LIST_TENANTS	tenant	\N	\N	{"filter_active": null, "count": 3}	127.0.0.1	\N	2025-09-15 13:36:09.795702
f5fd42d1-4625-4fd3-b95a-d904ca253881	608ba210-2fd3-4f15-8466-0cbc87392d84	ASSIGN_TENANT_PLAN	tenant	1	cos360_main	{"old_plan_id": 4, "new_plan_id": 4, "plan_name": "Enterprise", "menus_synced": 49, "permissions_created": 49, "allowed_menu_ids": [2, 3, 16, 23, 33, 39, 45, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 1, 17, 18, 19, 20, 21, 22, 24, 25, 26, 27, 28, 29, 30, 31, 32, 34, 35, 36, 37, 38, 40, 41, 42, 43, 44, 46, 47, 48, 49]}	127.0.0.1	\N	2025-09-15 13:36:24.720291
f6410207-886a-463d-9f3c-d0b063dc3962	608ba210-2fd3-4f15-8466-0cbc87392d84	ASSIGN_TENANT_PLAN	tenant	4	test_tenant_schema	{"old_plan_id": 4, "new_plan_id": 4, "plan_name": "Enterprise", "menus_synced": 49, "permissions_created": 49, "allowed_menu_ids": [2, 3, 16, 23, 33, 39, 45, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 1, 17, 18, 19, 20, 21, 22, 24, 25, 26, 27, 28, 29, 30, 31, 32, 34, 35, 36, 37, 38, 40, 41, 42, 43, 44, 46, 47, 48, 49]}	127.0.0.1	\N	2025-09-15 13:36:34.593771
ec1900a3-bbfd-4945-91b5-316e04b2feb9	608ba210-2fd3-4f15-8466-0cbc87392d84	LOGIN	authentication	\N	\N	{"ip_address": "127.0.0.1"}	127.0.0.1	\N	2025-09-15 13:40:19.105869
ad92ef6a-350c-4076-b4e7-52ca33b49267	608ba210-2fd3-4f15-8466-0cbc87392d84	LIST_TENANTS	tenant	\N	\N	{"filter_active": null, "count": 3}	127.0.0.1	\N	2025-09-15 13:45:26.190916
\.


--
-- Data for Name: super_admin_users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.super_admin_users (id, username, email, hashed_password, full_name, is_active, last_login_at, password_changed_at, created_at, updated_at, failed_login_attempts, account_locked_until, requires_password_change) FROM stdin;
608ba210-2fd3-4f15-8466-0cbc87392d84	superadmin	superadmin@cos360.com	$2b$12$rECpvrO4EDhlCGNxQuCN6Ol79aptJLqmTim4/jP8KhBn12NXknYfW	System Administrator	t	2025-09-15 13:40:18.816203	2025-09-13 16:41:51.981781	2025-09-13 16:41:51.981781	2025-09-15 13:40:18.816203	0	\N	t
\.


--
-- Data for Name: tenants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tenants (id, client_name, schema_name, is_active, created_at, updated_at, plan_id) FROM stdin;
2	test_basic	test_basic_schema	t	2025-09-07 11:20:13.017909	2025-09-07 11:20:13.017909	1
1	default	cos360_main	t	2025-08-31 22:23:53.360899	2025-09-15 13:36:24.556593	4
4	test_tenant	test_tenant_schema	t	2025-09-07 21:47:28.007215	2025-09-15 13:36:34.446498	4
\.


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
-- Name: menu_actions menu_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_actions
    ADD CONSTRAINT menu_actions_pkey PRIMARY KEY (id);


--
-- Name: menus menus_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menus
    ADD CONSTRAINT menus_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: permission_templates permission_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permission_templates
    ADD CONSTRAINT permission_templates_pkey PRIMARY KEY (id);


--
-- Name: plan_menu_access plan_menu_access_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plan_menu_access
    ADD CONSTRAINT plan_menu_access_pkey PRIMARY KEY (id);


--
-- Name: plan_resource_access plan_resource_access_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plan_resource_access
    ADD CONSTRAINT plan_resource_access_pkey PRIMARY KEY (id);


--
-- Name: plan_resource_access plan_resource_access_plan_id_resource_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plan_resource_access
    ADD CONSTRAINT plan_resource_access_plan_id_resource_name_key UNIQUE (plan_id, resource_name);


--
-- Name: plans plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (id);


--
-- Name: role_templates role_templates_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_templates
    ADD CONSTRAINT role_templates_name_key UNIQUE (name);


--
-- Name: role_templates role_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_templates
    ADD CONSTRAINT role_templates_pkey PRIMARY KEY (id);


--
-- Name: super_admin_audit super_admin_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.super_admin_audit
    ADD CONSTRAINT super_admin_audit_pkey PRIMARY KEY (id);


--
-- Name: super_admin_users super_admin_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.super_admin_users
    ADD CONSTRAINT super_admin_users_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: menu_actions unique_menu_action; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_actions
    ADD CONSTRAINT unique_menu_action UNIQUE (menu_id, action_name);


--
-- Name: tenants uq_client_name; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT uq_client_name UNIQUE (client_name);


--
-- Name: tenants uq_schema_name; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT uq_schema_name UNIQUE (schema_name);


--
-- Name: ix_public_menu_actions_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_public_menu_actions_id ON public.menu_actions USING btree (id);


--
-- Name: ix_public_menus_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_public_menus_id ON public.menus USING btree (id);


--
-- Name: ix_public_organizations_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_public_organizations_id ON public.organizations USING btree (id);


--
-- Name: ix_public_permission_templates_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_public_permission_templates_id ON public.permission_templates USING btree (id);


--
-- Name: ix_public_plan_menu_access_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_public_plan_menu_access_id ON public.plan_menu_access USING btree (id);


--
-- Name: ix_public_plans_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_public_plans_id ON public.plans USING btree (id);


--
-- Name: ix_public_role_templates_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_public_role_templates_id ON public.role_templates USING btree (id);


--
-- Name: ix_public_super_admin_audit_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_public_super_admin_audit_action ON public.super_admin_audit USING btree (action);


--
-- Name: ix_public_super_admin_audit_resource; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_public_super_admin_audit_resource ON public.super_admin_audit USING btree (resource);


--
-- Name: ix_public_super_admin_audit_super_admin_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_public_super_admin_audit_super_admin_id ON public.super_admin_audit USING btree (super_admin_id);


--
-- Name: ix_public_super_admin_audit_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_public_super_admin_audit_timestamp ON public.super_admin_audit USING btree ("timestamp");


--
-- Name: ix_public_super_admin_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_public_super_admin_users_email ON public.super_admin_users USING btree (email);


--
-- Name: ix_public_super_admin_users_username; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_public_super_admin_users_username ON public.super_admin_users USING btree (username);


--
-- Name: ix_tenants_client_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_tenants_client_name ON public.tenants USING btree (client_name);


--
-- Name: ix_tenants_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_tenants_is_active ON public.tenants USING btree (is_active);


--
-- Name: ix_tenants_schema_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_tenants_schema_name ON public.tenants USING btree (schema_name);


--
-- Name: menu_actions menu_actions_menu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_actions
    ADD CONSTRAINT menu_actions_menu_id_fkey FOREIGN KEY (menu_id) REFERENCES public.menus(id);


--
-- Name: menus menus_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menus
    ADD CONSTRAINT menus_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.menus(id);


--
-- Name: organizations organizations_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id);


--
-- Name: permission_templates permission_templates_menu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permission_templates
    ADD CONSTRAINT permission_templates_menu_id_fkey FOREIGN KEY (menu_id) REFERENCES public.menus(id);


--
-- Name: permission_templates permission_templates_role_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permission_templates
    ADD CONSTRAINT permission_templates_role_template_id_fkey FOREIGN KEY (role_template_id) REFERENCES public.role_templates(id);


--
-- Name: plan_menu_access plan_menu_access_menu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plan_menu_access
    ADD CONSTRAINT plan_menu_access_menu_id_fkey FOREIGN KEY (menu_id) REFERENCES public.menus(id);


--
-- Name: plan_menu_access plan_menu_access_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plan_menu_access
    ADD CONSTRAINT plan_menu_access_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id);


--
-- Name: plan_resource_access plan_resource_access_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plan_resource_access
    ADD CONSTRAINT plan_resource_access_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id);


--
-- Name: tenants tenants_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id);


--
-- PostgreSQL database dump complete
--


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


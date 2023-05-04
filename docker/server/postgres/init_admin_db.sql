--
-- PostgreSQL database dump
--

-- Dumped from database version 15.2
-- Dumped by pg_dump version 15.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: goadmin_menu_myid_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.goadmin_menu_myid_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 99999999
    CACHE 1;


ALTER TABLE public.goadmin_menu_myid_seq OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: goadmin_menu; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.goadmin_menu (
    id integer DEFAULT nextval('public.goadmin_menu_myid_seq'::regclass) NOT NULL,
    parent_id integer DEFAULT 0 NOT NULL,
    type integer DEFAULT 0,
    "order" integer DEFAULT 0 NOT NULL,
    title character varying(50) NOT NULL,
    header character varying(100),
    plugin_name character varying(100) NOT NULL,
    icon character varying(50) NOT NULL,
    uri character varying(3000) NOT NULL,
    uuid character varying(100),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.goadmin_menu OWNER TO postgres;

--
-- Name: goadmin_operation_log_myid_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.goadmin_operation_log_myid_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 99999999
    CACHE 1;


ALTER TABLE public.goadmin_operation_log_myid_seq OWNER TO postgres;

--
-- Name: goadmin_operation_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.goadmin_operation_log (
    id integer DEFAULT nextval('public.goadmin_operation_log_myid_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    path character varying(255) NOT NULL,
    method character varying(10) NOT NULL,
    ip character varying(15) NOT NULL,
    input text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.goadmin_operation_log OWNER TO postgres;

--
-- Name: goadmin_permissions_myid_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.goadmin_permissions_myid_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 99999999
    CACHE 1;


ALTER TABLE public.goadmin_permissions_myid_seq OWNER TO postgres;

--
-- Name: goadmin_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.goadmin_permissions (
    id integer DEFAULT nextval('public.goadmin_permissions_myid_seq'::regclass) NOT NULL,
    name character varying(50) NOT NULL,
    slug character varying(50) NOT NULL,
    http_method character varying(255),
    http_path text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.goadmin_permissions OWNER TO postgres;

--
-- Name: goadmin_role_menu; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.goadmin_role_menu (
    role_id integer NOT NULL,
    menu_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.goadmin_role_menu OWNER TO postgres;

--
-- Name: goadmin_role_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.goadmin_role_permissions (
    role_id integer NOT NULL,
    permission_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.goadmin_role_permissions OWNER TO postgres;

--
-- Name: goadmin_role_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.goadmin_role_users (
    role_id integer NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.goadmin_role_users OWNER TO postgres;

--
-- Name: goadmin_roles_myid_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.goadmin_roles_myid_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 99999999
    CACHE 1;


ALTER TABLE public.goadmin_roles_myid_seq OWNER TO postgres;

--
-- Name: goadmin_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.goadmin_roles (
    id integer DEFAULT nextval('public.goadmin_roles_myid_seq'::regclass) NOT NULL,
    name character varying NOT NULL,
    slug character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.goadmin_roles OWNER TO postgres;

--
-- Name: goadmin_session_myid_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.goadmin_session_myid_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 99999999
    CACHE 1;


ALTER TABLE public.goadmin_session_myid_seq OWNER TO postgres;

--
-- Name: goadmin_session; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.goadmin_session (
    id integer DEFAULT nextval('public.goadmin_session_myid_seq'::regclass) NOT NULL,
    sid character varying(50) NOT NULL,
    "values" character varying(3000) NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.goadmin_session OWNER TO postgres;

--
-- Name: goadmin_site_myid_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.goadmin_site_myid_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 99999999
    CACHE 1;


ALTER TABLE public.goadmin_site_myid_seq OWNER TO postgres;

--
-- Name: goadmin_site; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.goadmin_site (
    id integer DEFAULT nextval('public.goadmin_site_myid_seq'::regclass) NOT NULL,
    key character varying(100) NOT NULL,
    value text NOT NULL,
    type integer DEFAULT 0,
    description character varying(3000),
    state integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.goadmin_site OWNER TO postgres;

--
-- Name: goadmin_user_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.goadmin_user_permissions (
    user_id integer NOT NULL,
    permission_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.goadmin_user_permissions OWNER TO postgres;

--
-- Name: goadmin_users_myid_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.goadmin_users_myid_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 99999999
    CACHE 1;


ALTER TABLE public.goadmin_users_myid_seq OWNER TO postgres;

--
-- Name: goadmin_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.goadmin_users (
    id integer DEFAULT nextval('public.goadmin_users_myid_seq'::regclass) NOT NULL,
    username character varying(100) NOT NULL,
    password character varying(100) NOT NULL,
    name character varying(100) NOT NULL,
    avatar character varying(255),
    remember_token character varying(100),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.goadmin_users OWNER TO postgres;

--
-- Data for Name: goadmin_menu; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.goadmin_menu VALUES (11, 0, 0, 1, 'Welcome', '', '', 'fa-cubes', '', NULL, '2023-04-19 05:27:20.83973', '2023-04-23 00:19:06');
INSERT INTO public.goadmin_menu VALUES (1, 0, 1, 3, 'Admin', NULL, '', 'fa-tasks', '', NULL, '2019-09-10 00:00:00', '2019-09-10 00:00:00');
INSERT INTO public.goadmin_menu VALUES (2, 1, 1, 3, 'Admin Users', '', '', 'fa-users', '/info/manager', NULL, '2019-09-10 00:00:00', '2023-04-16 18:21:53');
INSERT INTO public.goadmin_menu VALUES (3, 1, 1, 5, 'Roles', NULL, '', 'fa-user', '/info/roles', NULL, '2019-09-10 00:00:00', '2019-09-10 00:00:00');
INSERT INTO public.goadmin_menu VALUES (4, 1, 1, 6, 'Permission', NULL, '', 'fa-ban', '/info/permission', NULL, '2019-09-10 00:00:00', '2019-09-10 00:00:00');
INSERT INTO public.goadmin_menu VALUES (5, 1, 1, 7, 'Menu', NULL, '', 'fa-bars', '/menu', NULL, '2019-09-10 00:00:00', '2019-09-10 00:00:00');
INSERT INTO public.goadmin_menu VALUES (8, 1, 0, 4, 'gbajs3 Users', '', '', 'fa-gamepad', '/info/gbajs3-users', NULL, '2023-04-17 00:44:16.566242', '2023-04-18 22:28:08');
INSERT INTO public.goadmin_menu VALUES (9, 1, 0, 8, 'operation log', '', '', 'fa-sticky-note-o', '/info/op', NULL, '2023-04-17 06:08:34.367356', '2023-04-18 22:29:20');


--
-- Data for Name: goadmin_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.goadmin_permissions VALUES (1, 'All permission', '*', '', '*', '2019-09-10 00:00:00', '2019-09-10 00:00:00');
INSERT INTO public.goadmin_permissions VALUES (2, 'Dashboard', 'dashboard', 'GET,PUT,POST,DELETE', '/', '2019-09-10 00:00:00', '2019-09-10 00:00:00');
INSERT INTO public.goadmin_permissions VALUES (3, 'users Query', 'users_query', 'GET', '/info/users', '2023-04-17 00:07:01.817172', '2023-04-17 00:07:01.817172');
INSERT INTO public.goadmin_permissions VALUES (4, 'users Show Edit Form Page', 'users_show_edit', 'GET', '/info/users/edit', '2023-04-17 00:07:01.831139', '2023-04-17 00:07:01.831139');
INSERT INTO public.goadmin_permissions VALUES (5, 'users Show Create Form Page', 'users_show_create', 'GET', '/info/users/new', '2023-04-17 00:07:01.845991', '2023-04-17 00:07:01.845991');
INSERT INTO public.goadmin_permissions VALUES (6, 'users Edit', 'users_edit', 'POST', '/edit/users', '2023-04-17 00:07:01.855456', '2023-04-17 00:07:01.855456');
INSERT INTO public.goadmin_permissions VALUES (7, 'users Create', 'users_create', 'POST', '/new/users', '2023-04-17 00:07:01.868667', '2023-04-17 00:07:01.868667');
INSERT INTO public.goadmin_permissions VALUES (8, 'users Delete', 'users_delete', 'POST', '/delete/users', '2023-04-17 00:07:01.878458', '2023-04-17 00:07:01.878458');
INSERT INTO public.goadmin_permissions VALUES (9, 'users Export', 'users_export', 'POST', '/export/users', '2023-04-17 00:07:01.888249', '2023-04-17 00:07:01.888249');


--
-- Data for Name: goadmin_role_menu; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.goadmin_role_menu VALUES (1, 1, '2019-09-10 00:00:00', '2019-09-10 00:00:00');
INSERT INTO public.goadmin_role_menu VALUES (1, 8, '2023-04-19 05:28:09.008579', '2023-04-19 05:28:09.008579');
INSERT INTO public.goadmin_role_menu VALUES (1, 9, '2023-04-19 05:29:20.840204', '2023-04-19 05:29:20.840204');
INSERT INTO public.goadmin_role_menu VALUES (1, 11, '2023-04-23 00:19:06.484964', '2023-04-23 00:19:06.484964');
INSERT INTO public.goadmin_role_menu VALUES (2, 11, '2023-04-23 00:19:06.49426', '2023-04-23 00:19:06.49426');


--
-- Data for Name: goadmin_role_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.goadmin_role_permissions VALUES (1, 1, '2019-09-10 00:00:00', '2019-09-10 00:00:00');
INSERT INTO public.goadmin_role_permissions VALUES (1, 2, '2019-09-10 00:00:00', '2019-09-10 00:00:00');
INSERT INTO public.goadmin_role_permissions VALUES (2, 2, '2019-09-10 00:00:00', '2019-09-10 00:00:00');


--
-- Data for Name: goadmin_role_users; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.goadmin_role_users VALUES (1, 1, '2023-04-17 03:01:13.273042', '2023-04-17 03:01:13.273042');


--
-- Data for Name: goadmin_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.goadmin_roles VALUES (1, 'Administrator', 'administrator', '2019-09-10 00:00:00', '2019-09-10 00:00:00');
INSERT INTO public.goadmin_roles VALUES (2, 'Operator', 'operator', '2019-09-10 00:00:00', '2019-09-10 00:00:00');


--
-- Data for Name: goadmin_user_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.goadmin_user_permissions VALUES (1, 1, '2023-04-17 03:01:13.283665', '2023-04-17 03:01:13.283665');


--
-- Data for Name: goadmin_users; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.goadmin_users VALUES (1, 'admin', '$2a$10$OxWYJJGTP2gi00l2x06QuOWqw5VR47MQCJ0vNKnbMYfrutij10Hwe', 'admin', '', NULL, '2019-09-10 00:00:00', '2023-04-16 20:01:13');


--
-- Name: goadmin_menu_myid_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.goadmin_menu_myid_seq', 11, true);


--
-- Name: goadmin_operation_log_myid_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.goadmin_operation_log_myid_seq', 1, true);


--
-- Name: goadmin_permissions_myid_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.goadmin_permissions_myid_seq', 9, true);


--
-- Name: goadmin_roles_myid_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.goadmin_roles_myid_seq', 2, true);


--
-- Name: goadmin_session_myid_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.goadmin_session_myid_seq', 1, true);


--
-- Name: goadmin_site_myid_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.goadmin_site_myid_seq', 1, true);


--
-- Name: goadmin_users_myid_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.goadmin_users_myid_seq', 2, true);


--
-- Name: goadmin_menu goadmin_menu_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.goadmin_menu
    ADD CONSTRAINT goadmin_menu_pkey PRIMARY KEY (id);


--
-- Name: goadmin_operation_log goadmin_operation_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.goadmin_operation_log
    ADD CONSTRAINT goadmin_operation_log_pkey PRIMARY KEY (id);


--
-- Name: goadmin_permissions goadmin_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.goadmin_permissions
    ADD CONSTRAINT goadmin_permissions_pkey PRIMARY KEY (id);


--
-- Name: goadmin_roles goadmin_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.goadmin_roles
    ADD CONSTRAINT goadmin_roles_pkey PRIMARY KEY (id);


--
-- Name: goadmin_session goadmin_session_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.goadmin_session
    ADD CONSTRAINT goadmin_session_pkey PRIMARY KEY (id);


--
-- Name: goadmin_site goadmin_site_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.goadmin_site
    ADD CONSTRAINT goadmin_site_pkey PRIMARY KEY (id);


--
-- Name: goadmin_users goadmin_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.goadmin_users
    ADD CONSTRAINT goadmin_users_pkey PRIMARY KEY (id);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- PostgreSQL database dump complete
--


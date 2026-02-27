from logging.config import fileConfig
import os

from dotenv import load_dotenv
load_dotenv()  # Load .env so DATABASE_URL and SCHEMA_NAME are available to alembic

from sqlalchemy import engine_from_config
from sqlalchemy import pool
from sqlalchemy import event

from alembic import context

# Import your Base and models here
from app.db.base import Base, BasePublic
from app.models.auth import User, Role, Menu, RoleMenuPermission
from app.models.masters import Class, Section
from app.models.masters.academic_year_model import AcademicYear
from app.models.masters.subject_model import Subject
from app.models.fee.fee_category_model import FeeCategory
from app.models.fee.fee_term_model import FeeTerm
from app.models.fee.fee_term_dates_model import FeeTermDates
from app.models.fee.fee_type_model import FeeType
from app.models.fee.fee_class_mapping_model import FeeClassMapping
from app.models.fee.fee_class_map_term_amount_model import FeeClassMappingTermAmount
# Import public schema models
from app.models.public.super_admin_model import SuperAdmin, SuperAdminAudit
from app.models.public.tenant_model import Tenant
from app.models.public.plan_model import Plan
# Import exam module models
from app.models.exam.grading_model import ExamGradeScheme, ExamGradeBand, SubjectGradeScheme, SubjectGradeBand
from app.models.exam.remark_grade_model import RemarkGradeSet, RemarkGradeOption
from app.models.exam.board_pattern_model import BoardExamPattern, BoardPatternExamType
from app.models.exam.exam_settings_model import ExamSettings
from app.models.exam.exam_stream_model import ExamStream
from app.models.exam.exam_model import Exam
from app.models.exam.exam_class_section_model import ExamClassSection
from app.models.exam.exam_subject_config_model import ExamSubjectConfig, ExamSubjectComponent
from app.models.exam.exam_date_model import ExamDate
from app.models.exam.student_marks_model import StudentMark
from app.models.exam.mark_permission_model import ExamMarkEntryPermission
from app.models.exam.audit_log_model import ExamAuditLog
from app.models.exam.student_result_model import StudentExamResult, StudentSubjectResult



# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# Combine metadata from both public and tenant schemas
from sqlalchemy import MetaData
combined_metadata = MetaData()

# Copy tables from both schemas
for table in Base.metadata.tables.values():
    table.tometadata(combined_metadata)

for table in BasePublic.metadata.tables.values():
    table.tometadata(combined_metadata)

target_metadata = combined_metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    # Use DATABASE_URL from environment if available, fallback to config
    url = os.getenv("DATABASE_URL") or config.get_main_option("sqlalchemy.url")
    # Convert asyncpg to psycopg2 for alembic compatibility
    if url and url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql+asyncpg://", "postgresql://")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    # Override database URL from environment if available
    config_section = config.get_section(config.config_ini_section, {})
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        # Convert asyncpg to psycopg2 for alembic compatibility
        if database_url.startswith("postgresql+asyncpg://"):
            database_url = database_url.replace("postgresql+asyncpg://", "postgresql://")
        config_section["sqlalchemy.url"] = database_url
    
    connectable = engine_from_config(
        config_section,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        # Set the search_path for Alembic migrations
        @event.listens_for(connection, "begin")
        def set_search_path(conn):
            import os
            schema_name = os.getenv('SCHEMA_NAME', 'cos360_masters')
            conn.exec_driver_sql(f'SET search_path TO {schema_name}')
            
        context.configure(
            connection=connection, target_metadata=target_metadata, compare_type=True,  # Enable type comparison
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

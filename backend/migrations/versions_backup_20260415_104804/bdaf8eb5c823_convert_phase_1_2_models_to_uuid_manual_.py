"""Convert Phase 1 & 2 models to UUID - manual migration

Revision ID: bdaf8eb5c823
Revises: 65290f247da7
Create Date: 2025-09-05 18:14:20.638650

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bdaf8eb5c823'
down_revision: Union[str, None] = '65290f247da7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - Drop all existing tables and let alembic recreate with UUID."""
    # Drop all existing tables to start fresh
    op.execute("""
        -- Drop all tables in order to avoid foreign key constraints
        DROP TABLE IF EXISTS fee_student_map_term_amounts CASCADE;
        DROP TABLE IF EXISTS fee_student_mappings CASCADE;
        DROP TABLE IF EXISTS fee_class_map_term_amounts CASCADE;
        DROP TABLE IF EXISTS fee_class_mappings CASCADE;
        DROP TABLE IF EXISTS fee_types CASCADE;
        DROP TABLE IF EXISTS fee_term_dates CASCADE;
        DROP TABLE IF EXISTS fee_terms CASCADE;
        DROP TABLE IF EXISTS fee_categories CASCADE;
        DROP TABLE IF EXISTS student_transport_assignments CASCADE;
        DROP TABLE IF EXISTS student_trips CASCADE;
        DROP TABLE IF EXISTS student_homework CASCADE;
        DROP TABLE IF EXISTS student_documents CASCADE;
        DROP TABLE IF EXISTS student_certificates CASCADE;
        DROP TABLE IF EXISTS student_attendance CASCADE;
        DROP TABLE IF EXISTS student_parent_links CASCADE;
        DROP TABLE IF EXISTS student_admissions CASCADE;
        DROP TABLE IF EXISTS students CASCADE;
        DROP TABLE IF EXISTS parents CASCADE;
        DROP TABLE IF EXISTS staff_attendance CASCADE;
        DROP TABLE IF EXISTS staff CASCADE;
        DROP TABLE IF EXISTS designations CASCADE;
        DROP TABLE IF EXISTS class_subject_mappings CASCADE;
        DROP TABLE IF EXISTS subjects CASCADE;
        DROP TABLE IF EXISTS subject_categories CASCADE;
        DROP TABLE IF EXISTS sections CASCADE;
        DROP TABLE IF EXISTS classes CASCADE;
        DROP TABLE IF EXISTS holidays CASCADE;
        DROP TABLE IF EXISTS timetable_subject_options CASCADE;
        DROP TABLE IF EXISTS timetable_slots CASCADE;
        DROP TABLE IF EXISTS routes CASCADE;
        DROP TABLE IF EXISTS vehicles CASCADE;
        DROP TABLE IF EXISTS role_menu_permissions CASCADE;
        DROP TABLE IF EXISTS menus CASCADE;
        DROP TABLE IF EXISTS users CASCADE;
        DROP TABLE IF EXISTS roles CASCADE;
        DROP TABLE IF EXISTS academic_years CASCADE;
        
        -- Enable UUID extension if not exists
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    """)
    
    print("All tables dropped successfully. Alembic will recreate with UUID on next migration.")


def downgrade() -> None:
    """Downgrade schema."""
    pass

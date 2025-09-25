"""Create teacher assignment tables

Revision ID: create_teacher_assignments
Revises: add_user_specific_permissions
Create Date: 2025-01-24 12:15:00.000000

This migration creates teacher assignment tables to support relationship-based access
for teachers and students (teacher-class, teacher-student assignments).
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = 'create_teacher_assignments'
down_revision = 'add_user_specific_permissions'
branch_labels = None
depends_on = None


def upgrade():
    """Create teacher assignment tables for current tenant schema"""

    connection = op.get_bind()

    # Get current schema name from environment or use default
    import os
    schema_name = os.getenv('SCHEMA_NAME', 'test_tenant')

    print(f"Creating teacher assignment tables in schema: {schema_name}")
    create_teacher_tables_in_schema(connection, schema_name)


def create_teacher_tables_in_schema(connection, schema_name: str):
    """Create teacher assignment tables in a specific tenant schema"""

    try:
        # Teacher class assignments table
        connection.execute(text(f"""
            CREATE TABLE IF NOT EXISTS {schema_name}.teacher_class_assignments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                teacher_user_id UUID REFERENCES {schema_name}.users(id) NOT NULL,
                class_id UUID REFERENCES {schema_name}.classes(id) NOT NULL,
                subject_id UUID REFERENCES {schema_name}.subjects(id),
                academic_year_id UUID REFERENCES {schema_name}.academic_years(id) NOT NULL,
                is_class_teacher BOOLEAN DEFAULT false,
                assignment_type VARCHAR(50) DEFAULT 'subject_teacher',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(teacher_user_id, class_id, subject_id, academic_year_id)
            )
        """))

        # Teacher student assignments table
        connection.execute(text(f"""
            CREATE TABLE IF NOT EXISTS {schema_name}.teacher_student_assignments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                teacher_user_id UUID REFERENCES {schema_name}.users(id) NOT NULL,
                student_id UUID REFERENCES {schema_name}.students(id) NOT NULL,
                assignment_type VARCHAR(50) NOT NULL,
                academic_year_id UUID REFERENCES {schema_name}.academic_years(id) NOT NULL,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(teacher_user_id, student_id, assignment_type, academic_year_id)
            )
        """))

        # Create indexes for performance
        connection.execute(text(f"""
            CREATE INDEX IF NOT EXISTS idx_teacher_class_assignments_teacher
            ON {schema_name}.teacher_class_assignments(teacher_user_id)
        """))

        connection.execute(text(f"""
            CREATE INDEX IF NOT EXISTS idx_teacher_class_assignments_class
            ON {schema_name}.teacher_class_assignments(class_id)
        """))

        connection.execute(text(f"""
            CREATE INDEX IF NOT EXISTS idx_teacher_class_assignments_active
            ON {schema_name}.teacher_class_assignments(is_active)
        """))

        connection.execute(text(f"""
            CREATE INDEX IF NOT EXISTS idx_teacher_student_assignments_teacher
            ON {schema_name}.teacher_student_assignments(teacher_user_id)
        """))

        connection.execute(text(f"""
            CREATE INDEX IF NOT EXISTS idx_teacher_student_assignments_student
            ON {schema_name}.teacher_student_assignments(student_id)
        """))

        connection.execute(text(f"""
            CREATE INDEX IF NOT EXISTS idx_teacher_student_assignments_active
            ON {schema_name}.teacher_student_assignments(is_active)
        """))

        print(f"Created teacher assignment tables for schema: {schema_name}")

    except Exception as e:
        print(f"Error creating teacher assignment tables in schema {schema_name}: {e}")


def downgrade():
    """Drop teacher assignment tables"""

    connection = op.get_bind()

    # Get current schema name from environment or use default
    import os
    schema_name = os.getenv('SCHEMA_NAME', 'test_tenant')

    print(f"Dropping teacher assignment tables from schema: {schema_name}")

    try:
        # Drop indexes first
        connection.execute(text(f"DROP INDEX IF EXISTS {schema_name}.idx_teacher_student_assignments_active"))
        connection.execute(text(f"DROP INDEX IF EXISTS {schema_name}.idx_teacher_student_assignments_student"))
        connection.execute(text(f"DROP INDEX IF EXISTS {schema_name}.idx_teacher_student_assignments_teacher"))
        connection.execute(text(f"DROP INDEX IF EXISTS {schema_name}.idx_teacher_class_assignments_active"))
        connection.execute(text(f"DROP INDEX IF EXISTS {schema_name}.idx_teacher_class_assignments_class"))
        connection.execute(text(f"DROP INDEX IF EXISTS {schema_name}.idx_teacher_class_assignments_teacher"))

        # Drop tables
        connection.execute(text(f"DROP TABLE IF EXISTS {schema_name}.teacher_student_assignments"))
        connection.execute(text(f"DROP TABLE IF EXISTS {schema_name}.teacher_class_assignments"))

        print(f"Dropped teacher assignment tables from schema: {schema_name}")

    except Exception as e:
        print(f"Error dropping teacher assignment tables from schema {schema_name}: {e}")
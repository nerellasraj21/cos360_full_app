"""Create user entity association views

Revision ID: create_user_entity_views
Revises: create_teacher_assignments
Create Date: 2025-01-24 12:30:00.000000

This migration creates user entity association views and indexes for performance
optimization of user context resolution.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers
revision = 'create_user_entity_views'
down_revision = 'create_teacher_assignments'
branch_labels = None
depends_on = None


def upgrade():
    """Create user entity association views for current tenant schema"""

    connection = op.get_bind()

    # Get current schema name from environment or use default
    import os
    schema_name = os.getenv('SCHEMA_NAME', 'test_tenant')

    print(f"Creating user entity association views in schema: {schema_name}")
    create_views_in_schema(connection, schema_name)


def create_views_in_schema(connection, schema_name: str):
    """Create user entity association view in a specific tenant schema"""

    try:
        # Create view for quick user-entity lookups (performance optimization)
        connection.execute(text(f"""
            CREATE OR REPLACE VIEW {schema_name}.user_entity_associations AS
            SELECT
                u.id as user_id,
                u.username,
                u.role_id,
                r.name as role_name,
                s.id as student_id,
                st.id as staff_id,
                p.id as parent_id,
                st.department_id as staff_department_id,
                u.is_active as user_active
            FROM {schema_name}.users u
            JOIN {schema_name}.roles r ON r.id = u.role_id
            LEFT JOIN {schema_name}.students s ON s.user_id = u.id
            LEFT JOIN {schema_name}.staff st ON st.user_id = u.id
            LEFT JOIN {schema_name}.parents p ON p.user_id = u.id
            WHERE u.is_active = true
        """))

        # Create index on the underlying table for better view performance
        connection.execute(text(f"""
            CREATE INDEX IF NOT EXISTS idx_users_active_role
            ON {schema_name}.users(id, role_id)
            WHERE is_active = true
        """))

        # Create additional performance indexes for user context resolution
        connection.execute(text(f"""
            CREATE INDEX IF NOT EXISTS idx_students_user_id
            ON {schema_name}.students(user_id)
            WHERE user_id IS NOT NULL
        """))

        connection.execute(text(f"""
            CREATE INDEX IF NOT EXISTS idx_staff_user_id
            ON {schema_name}.staff(user_id)
            WHERE user_id IS NOT NULL
        """))

        connection.execute(text(f"""
            CREATE INDEX IF NOT EXISTS idx_parents_user_id
            ON {schema_name}.parents(user_id)
            WHERE user_id IS NOT NULL
        """))

        # Create index for parent-child relationship queries
        connection.execute(text(f"""
            CREATE INDEX IF NOT EXISTS idx_student_parent_links_parent_id
            ON {schema_name}.student_parent_links(parent_id)
            WHERE parent_id IS NOT NULL
        """))

        print(f"Created user entity association view and indexes for schema: {schema_name}")

    except Exception as e:
        print(f"Error creating user entity views in schema {schema_name}: {e}")


def downgrade():
    """Drop user entity association views and indexes"""

    connection = op.get_bind()

    # Get current schema name from environment or use default
    import os
    schema_name = os.getenv('SCHEMA_NAME', 'test_tenant')

    print(f"Dropping user entity association views from schema: {schema_name}")

    try:
        # Drop the view
        connection.execute(text(f"""
            DROP VIEW IF EXISTS {schema_name}.user_entity_associations
        """))

        # Drop the indexes
        connection.execute(text(f"DROP INDEX IF EXISTS {schema_name}.idx_users_active_role"))
        connection.execute(text(f"DROP INDEX IF EXISTS {schema_name}.idx_students_user_id"))
        connection.execute(text(f"DROP INDEX IF EXISTS {schema_name}.idx_staff_user_id"))
        connection.execute(text(f"DROP INDEX IF EXISTS {schema_name}.idx_parents_user_id"))
        connection.execute(text(f"DROP INDEX IF EXISTS {schema_name}.idx_student_parent_links_parent_id"))

        print(f"Dropped user entity association view and indexes from schema: {schema_name}")

    except Exception as e:
        print(f"Error dropping user entity views from schema {schema_name}: {e}")
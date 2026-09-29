"""Add user-specific permission actions

Revision ID: add_user_specific_permissions
Revises: 51880f32593d
Create Date: 2025-01-24 12:00:00.000000

This migration adds user-specific permission actions (*_own, *_related) to support
proper data isolation for students, parents, and teachers.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers
revision = 'add_user_specific_permissions'
down_revision = '51880f32593d'
branch_labels = None
depends_on = None


def upgrade():
    """Add user-specific permission actions to current tenant schema"""

    connection = op.get_bind()

    # Get current schema name from environment or use default
    import os
    schema_name = os.getenv('SCHEMA_NAME', 'test_tenant')

    print(f"Adding user-specific permissions to schema: {schema_name}")
    add_permissions_to_schema(connection, schema_name)


def add_permissions_to_schema(connection, schema_name: str):
    """Add user-specific permission actions to a specific tenant schema"""

    try:
        # Student role - _own permissions
        student_permissions = [
            ('students', 'read_own'),
            ('students', 'update_own'),
            ('student_admissions', 'read_own'),
            ('student_admissions', 'list_own'),
            ('student_admissions', 'update_own'),
            ('student_certificates', 'read_own'),
            ('student_certificates', 'list_own'),
            ('student_documents', 'read_own'),
            ('student_documents', 'list_own'),
            ('student_attendance', 'read_own'),
            ('student_attendance', 'list_own'),
            ('fee_transactions', 'read_own'),
            ('fee_transactions', 'list_own'),
        ]

        for resource, action in student_permissions:
            try:
                connection.execute(text(f"""
                    INSERT INTO {schema_name}.resource_permissions (role_id, resource, action, is_granted)
                    SELECT
                        r.id as role_id,
                        :resource as resource,
                        :action as action,
                        true as is_granted
                    FROM {schema_name}.roles r
                    WHERE r.name = 'Student'
                    AND NOT EXISTS (
                        SELECT 1 FROM {schema_name}.resource_permissions rp
                        WHERE rp.role_id = r.id
                        AND rp.resource = :resource
                        AND rp.action = :action
                    )
                """), {"resource": resource, "action": action})
                print(f"  Added Student permission: {resource}:{action}")
            except Exception as e:
                print(f"  Warning: Failed to add Student permission {resource}:{action} - {e}")

        # Parent role - _related permissions
        parent_permissions = [
            ('students', 'read_related'),
            ('students', 'list_related'),
            ('student_admissions', 'read_related'),
            ('student_admissions', 'list_related'),
            ('student_certificates', 'read_related'),
            ('student_certificates', 'list_related'),
            ('student_documents', 'read_related'),
            ('student_documents', 'list_related'),
            ('student_attendance', 'read_related'),
            ('student_attendance', 'list_related'),
            ('fee_transactions', 'read_related'),
            ('fee_transactions', 'list_related'),
            ('fee_receipts', 'read_related'),
            ('fee_receipts', 'list_related'),
        ]

        for resource, action in parent_permissions:
            try:
                connection.execute(text(f"""
                    INSERT INTO {schema_name}.resource_permissions (role_id, resource, action, is_granted)
                    SELECT
                        r.id as role_id,
                        :resource as resource,
                        :action as action,
                        true as is_granted
                    FROM {schema_name}.roles r
                    WHERE r.name = 'Parent'
                    AND NOT EXISTS (
                        SELECT 1 FROM {schema_name}.resource_permissions rp
                        WHERE rp.role_id = r.id
                        AND rp.resource = :resource
                        AND rp.action = :action
                    )
                """), {"resource": resource, "action": action})
                print(f"  Added Parent permission: {resource}:{action}")
            except Exception as e:
                print(f"  Warning: Failed to add Parent permission {resource}:{action} - {e}")

        # Teacher/Staff role - _related permissions
        teacher_permissions = [
            ('students', 'read_related'),
            ('students', 'list_related'),
            ('student_admissions', 'read_related'),
            ('student_admissions', 'list_related'),
            ('student_attendance', 'read_related'),
            ('student_attendance', 'list_related'),
            ('student_attendance', 'create_related'),
            ('student_attendance', 'update_related'),
            ('student_certificates', 'read_related'),
            ('student_certificates', 'list_related'),
        ]

        for resource, action in teacher_permissions:
            try:
                connection.execute(text(f"""
                    INSERT INTO {schema_name}.resource_permissions (role_id, resource, action, is_granted)
                    SELECT
                        r.id as role_id,
                        :resource as resource,
                        :action as action,
                        true as is_granted
                    FROM {schema_name}.roles r
                    WHERE r.name IN ('Teacher', 'Staff')
                    AND NOT EXISTS (
                        SELECT 1 FROM {schema_name}.resource_permissions rp
                        WHERE rp.role_id = r.id
                        AND rp.resource = :resource
                        AND rp.action = :action
                    )
                """), {"resource": resource, "action": action})
                print(f"  Added Teacher/Staff permission: {resource}:{action}")
            except Exception as e:
                print(f"  Warning: Failed to add Teacher/Staff permission {resource}:{action} - {e}")

        print(f"Completed adding permissions to schema: {schema_name}")

    except Exception as e:
        print(f"Error processing schema {schema_name}: {e}")


def downgrade():
    """Remove user-specific permission actions"""

    connection = op.get_bind()

    # Get current schema name from environment or use default
    import os
    schema_name = os.getenv('SCHEMA_NAME', 'test_tenant')

    print(f"Removing user-specific permissions from schema: {schema_name}")

    try:
        # Remove all _own and _related permissions
        connection.execute(text(f"""
            DELETE FROM {schema_name}.resource_permissions
            WHERE action LIKE '%_own' OR action LIKE '%_related'
        """))
        print(f"Removed user-specific permissions from schema: {schema_name}")
    except Exception as e:
        print(f"Error removing permissions from schema {schema_name}: {e}")
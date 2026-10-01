"""Add section_id to class_subject_mappings

Revision ID: add_section_id_to_class_subject_mappings
Revises: create_user_entity_views
Create Date: 2025-12-27

This migration:
1. Deletes all existing data from class_subject_mappings table
2. Adds section_id column as required field with foreign key to sections table
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'add_section_id_to_class_subject_mappings'
down_revision: Union[str, None] = 'create_user_entity_views'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Get all tenant schemas
    connection = op.get_bind()
    result = connection.execute(sa.text("SELECT schema_name FROM public.tenants WHERE is_active = true"))
    tenant_schemas = [row[0] for row in result.fetchall()]

    for schema in tenant_schemas:
        # 1. Delete all existing data from class_subject_mappings
        op.execute(f'DELETE FROM "{schema}".class_subject_mappings')

        # 2. Add section_id column
        op.add_column(
            'class_subject_mappings',
            sa.Column('section_id', postgresql.UUID(as_uuid=True), nullable=False),
            schema=schema
        )

        # 3. Add foreign key constraint
        op.create_foreign_key(
            f'fk_class_subject_mappings_section_id_{schema}',
            'class_subject_mappings',
            'sections',
            ['section_id'],
            ['id'],
            source_schema=schema,
            referent_schema=schema
        )

        # 4. Add index for section_id
        op.create_index(
            f'ix_{schema}_class_subject_mappings_section_id',
            'class_subject_mappings',
            ['section_id'],
            schema=schema
        )

        # 5. Add composite unique constraint (class_id, section_id, subject_id, academic_year_id)
        op.create_unique_constraint(
            f'uq_{schema}_class_section_subject_academic_year',
            'class_subject_mappings',
            ['class_id', 'section_id', 'subject_id', 'academic_year_id'],
            schema=schema
        )


def downgrade() -> None:
    # Get all tenant schemas
    connection = op.get_bind()
    result = connection.execute(sa.text("SELECT schema_name FROM public.tenants WHERE is_active = true"))
    tenant_schemas = [row[0] for row in result.fetchall()]

    for schema in tenant_schemas:
        # Remove unique constraint
        op.drop_constraint(
            f'uq_{schema}_class_section_subject_academic_year',
            'class_subject_mappings',
            schema=schema
        )

        # Remove index
        op.drop_index(
            f'ix_{schema}_class_subject_mappings_section_id',
            table_name='class_subject_mappings',
            schema=schema
        )

        # Remove foreign key
        op.drop_constraint(
            f'fk_class_subject_mappings_section_id_{schema}',
            'class_subject_mappings',
            schema=schema
        )

        # Remove column
        op.drop_column('class_subject_mappings', 'section_id', schema=schema)

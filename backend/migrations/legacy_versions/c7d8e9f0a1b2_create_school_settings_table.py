"""create_school_settings_table

Revision ID: c7d8e9f0a1b2
Revises: b6c7d8e9f0a1
Create Date: 2026-06-20

Creates school_settings table for per-tenant school registration data.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = 'c7d8e9f0a1b2'
down_revision: Union[str, None] = 'b6c7d8e9f0a1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    import os
    schema = os.getenv('SCHEMA_NAME', 'cos360_master')
    op.create_table(
        'school_settings',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('school_name', sa.String(255), nullable=True),
        sa.Column('contact_no', sa.String(20), nullable=True),
        sa.Column('alt_contact_no', sa.String(20), nullable=True),
        sa.Column('school_email', sa.String(255), nullable=True),
        sa.Column('address', sa.String(500), nullable=True),
        sa.Column('city', sa.String(100), nullable=True),
        sa.Column('state', sa.String(100), nullable=True),
        sa.Column('district', sa.String(100), nullable=True),
        sa.Column('pin_code', sa.String(10), nullable=True),
        sa.Column('country', sa.String(100), nullable=True),
        sa.Column('academic_year', sa.String(50), nullable=True),
        sa.Column('installation_date', sa.Date(), nullable=True),
        sa.Column('image_url', sa.String(500), nullable=True),
        sa.Column('principal_signature_url', sa.String(500), nullable=True),
        sa.Column('school_board', sa.String(100), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        schema=schema,
    )


def downgrade() -> None:
    import os
    schema = os.getenv('SCHEMA_NAME', 'cos360_master')
    op.drop_table('school_settings', schema=schema)

"""add_location_masters_public_schema

Revision ID: 7cc7e62e4d37
Revises: d61e63284a7f
Create Date: 2026-02-04 11:52:43.017328

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = '7cc7e62e4d37'
down_revision: Union[str, None] = 'd61e63284a7f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Add location masters (State, District, Mandal) to PUBLIC schema.
    Add foreign keys to student_admissions table in tenant schemas.
    """
    # Create states table in PUBLIC schema
    op.create_table('states',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('name', sa.String(100), nullable=False, unique=True, index=True),
        sa.Column('code', sa.String(20), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        schema='public'
    )

    # Create districts table in PUBLIC schema
    op.create_table('districts',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('state_id', UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('name', sa.String(100), nullable=False, index=True),
        sa.Column('code', sa.String(20), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['state_id'], ['public.states.id'], ondelete='CASCADE'),
        schema='public'
    )

    # Create mandals table in PUBLIC schema
    op.create_table('mandals',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('district_id', UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('name', sa.String(100), nullable=False, index=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['district_id'], ['public.districts.id'], ondelete='CASCADE'),
        schema='public'
    )

    # Add location foreign keys to student_admissions table (in tenant schemas)
    op.add_column('student_admissions',
        sa.Column('state_id', UUID(as_uuid=True), nullable=True))
    op.add_column('student_admissions',
        sa.Column('district_id', UUID(as_uuid=True), nullable=True))
    op.add_column('student_admissions',
        sa.Column('mandal_id', UUID(as_uuid=True), nullable=True))

    # Note: Cross-schema foreign keys may not be enforced by PostgreSQL
    # These are conceptual FKs - validation should be done at service layer


def downgrade() -> None:
    """
    Remove location masters from PUBLIC schema.
    Remove foreign keys from student_admissions table in tenant schemas.
    """
    # Remove foreign keys from student_admissions table
    op.drop_column('student_admissions', 'mandal_id')
    op.drop_column('student_admissions', 'district_id')
    op.drop_column('student_admissions', 'state_id')

    # Drop mandals table from PUBLIC schema
    op.drop_table('mandals', schema='public')

    # Drop districts table from PUBLIC schema
    op.drop_table('districts', schema='public')

    # Drop states table from PUBLIC schema
    op.drop_table('states', schema='public')

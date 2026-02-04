"""add_caste_masters

Revision ID: d61e63284a7f
Revises: f37576c3d9bc
Create Date: 2026-02-04 11:48:57.450076

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = 'd61e63284a7f'
down_revision: Union[str, None] = 'f37576c3d9bc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add caste and sub_caste master tables, and link them to students."""
    # Create castes table
    op.create_table('castes',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('name', sa.String(100), nullable=False, unique=True, index=True),
        sa.Column('code', sa.String(20), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('created_by', UUID(as_uuid=True), nullable=True),
        sa.Column('updated_by', UUID(as_uuid=True), nullable=True),
        sa.Column('organization_id', UUID(as_uuid=True), nullable=True)
    )

    # Create sub_castes table
    op.create_table('sub_castes',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('caste_id', UUID(as_uuid=True), sa.ForeignKey('castes.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('name', sa.String(100), nullable=False, index=True),
        sa.Column('code', sa.String(20), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('created_by', UUID(as_uuid=True), nullable=True),
        sa.Column('updated_by', UUID(as_uuid=True), nullable=True),
        sa.Column('organization_id', UUID(as_uuid=True), nullable=True)
    )

    # Add caste_id and sub_caste_id to students table
    op.add_column('students',
        sa.Column('caste_id', UUID(as_uuid=True), sa.ForeignKey('castes.id'), nullable=True))
    op.add_column('students',
        sa.Column('sub_caste_id', UUID(as_uuid=True), sa.ForeignKey('sub_castes.id'), nullable=True))


def downgrade() -> None:
    """Remove caste and sub_caste master tables, and unlink them from students."""
    # Remove foreign keys from students table
    op.drop_column('students', 'sub_caste_id')
    op.drop_column('students', 'caste_id')

    # Drop sub_castes table
    op.drop_table('sub_castes')

    # Drop castes table
    op.drop_table('castes')

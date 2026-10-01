"""add_timestamps_to_designations

Revision ID: 0adb3bb3d5cb
Revises: 2422b873a6dd
Create Date: 2026-02-07 15:41:29.296906

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0adb3bb3d5cb'
down_revision: Union[str, None] = '2422b873a6dd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add created_at and updated_at columns to designations table
    op.add_column('designations', sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('now()'), nullable=False))
    op.add_column('designations', sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('now()'), nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove created_at and updated_at columns from designations table
    op.drop_column('designations', 'updated_at')
    op.drop_column('designations', 'created_at')

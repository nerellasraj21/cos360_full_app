"""restore_driver_name_drop_driver_staff_id

Revision ID: a5b6c7d8e9f0
Revises: z4a5b6c7d8e9
Create Date: 2026-06-16

y3z4a5b6c7d8 mistakenly dropped driver_name and added driver_staff_id.
This migration restores driver_name (plain text) and removes driver_staff_id.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'a5b6c7d8e9f0'
down_revision: Union[str, None] = 'z4a5b6c7d8e9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    import os
    schema = os.getenv('SCHEMA_NAME', 'cos360_master')
    # Remove the FK column added in error
    op.drop_column('vehicles', 'driver_staff_id', schema=schema)
    # Restore the plain-text driver name column
    op.add_column('vehicles', sa.Column('driver_name', sa.String(), nullable=True), schema=schema)


def downgrade() -> None:
    import os
    schema = os.getenv('SCHEMA_NAME', 'cos360_master')
    op.drop_column('vehicles', 'driver_name', schema=schema)

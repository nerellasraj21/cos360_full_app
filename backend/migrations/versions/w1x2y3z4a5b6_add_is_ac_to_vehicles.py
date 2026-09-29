"""add_is_ac_to_vehicles

Revision ID: w1x2y3z4a5b6
Revises: v0w1x2y3z4a5
Create Date: 2026-06-16

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'w1x2y3z4a5b6'
down_revision: Union[str, None] = 'v0w1x2y3z4a5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    import os
    schema = os.getenv('SCHEMA_NAME', 'cos360_master')
    op.add_column('vehicles', sa.Column('is_ac', sa.Boolean(), nullable=True), schema=schema)


def downgrade() -> None:
    import os
    schema = os.getenv('SCHEMA_NAME', 'cos360_master')
    op.drop_column('vehicles', 'is_ac', schema=schema)

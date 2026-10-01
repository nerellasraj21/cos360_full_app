"""add_number_of_trips_to_vehicles

Revision ID: z4a5b6c7d8e9
Revises: y3z4a5b6c7d8
Create Date: 2026-06-16

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'z4a5b6c7d8e9'
down_revision: Union[str, None] = 'y3z4a5b6c7d8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    import os
    schema = os.getenv('SCHEMA_NAME', 'cos360_master')
    op.add_column('vehicles', sa.Column('number_of_trips', sa.Integer(), nullable=True), schema=schema)


def downgrade() -> None:
    import os
    schema = os.getenv('SCHEMA_NAME', 'cos360_master')
    op.drop_column('vehicles', 'number_of_trips', schema=schema)

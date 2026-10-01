"""replace_driver_name_with_driver_staff_id_on_vehicles

Revision ID: y3z4a5b6c7d8
Revises: x2y3z4a5b6c7
Create Date: 2026-06-16

driver_name (free text) is replaced by driver_staff_id (FK → staff.id).
The name is derived at runtime from the staff record.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = 'y3z4a5b6c7d8'
down_revision: Union[str, None] = 'x2y3z4a5b6c7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    import os
    schema = os.getenv('SCHEMA_NAME', 'cos360_master')
    op.drop_column('vehicles', 'driver_name', schema=schema)
    op.add_column(
        'vehicles',
        sa.Column('driver_staff_id', UUID(as_uuid=True), sa.ForeignKey('staff.id'), nullable=True),
        schema=schema,
    )


def downgrade() -> None:
    import os
    schema = os.getenv('SCHEMA_NAME', 'cos360_master')
    op.drop_column('vehicles', 'driver_staff_id', schema=schema)
    op.add_column('vehicles', sa.Column('driver_name', sa.String(), nullable=True), schema=schema)

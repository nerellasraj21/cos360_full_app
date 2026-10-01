"""add_driver_insurance_fields_to_vehicles

Revision ID: v0w1x2y3z4a5
Revises: u9v0w1x2y3z4
Create Date: 2026-06-16

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'v0w1x2y3z4a5'
down_revision: Union[str, None] = 'u9v0w1x2y3z4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    import os
    schema = os.getenv('SCHEMA_NAME', 'cos360_master')
    op.add_column('vehicles', sa.Column('co_driver_name', sa.String(), nullable=True), schema=schema)
    op.add_column('vehicles', sa.Column('driving_licence_no', sa.String(), nullable=True), schema=schema)
    op.add_column('vehicles', sa.Column('driving_licence_exp_date', sa.Date(), nullable=True), schema=schema)
    op.add_column('vehicles', sa.Column('bus_insurance_vendor', sa.String(), nullable=True), schema=schema)
    op.add_column('vehicles', sa.Column('insurance_expiry_date', sa.Date(), nullable=True), schema=schema)


def downgrade() -> None:
    import os
    schema = os.getenv('SCHEMA_NAME', 'cos360_master')
    op.drop_column('vehicles', 'insurance_expiry_date', schema=schema)
    op.drop_column('vehicles', 'bus_insurance_vendor', schema=schema)
    op.drop_column('vehicles', 'driving_licence_exp_date', schema=schema)
    op.drop_column('vehicles', 'driving_licence_no', schema=schema)
    op.drop_column('vehicles', 'co_driver_name', schema=schema)

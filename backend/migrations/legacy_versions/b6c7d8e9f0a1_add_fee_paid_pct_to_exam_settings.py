"""add_fee_paid_pct_to_exam_settings

Revision ID: b6c7d8e9f0a1
Revises: a5b6c7d8e9f0
Create Date: 2026-06-17

Adds hall_ticket_min_fee_paid_pct (NUMERIC 5,2) to exam_settings for
minimum fee payment percentage eligibility as of exam date.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'b6c7d8e9f0a1'
down_revision: Union[str, None] = 'a5b6c7d8e9f0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    import os
    schema = os.getenv('SCHEMA_NAME', 'cos360_master')
    op.add_column('exam_settings', sa.Column('hall_ticket_min_fee_paid_pct', sa.Numeric(5, 2), nullable=True), schema=schema)


def downgrade() -> None:
    import os
    schema = os.getenv('SCHEMA_NAME', 'cos360_master')
    op.drop_column('exam_settings', 'hall_ticket_min_fee_paid_pct', schema=schema)

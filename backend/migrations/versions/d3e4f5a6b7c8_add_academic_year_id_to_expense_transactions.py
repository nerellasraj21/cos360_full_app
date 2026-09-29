"""Add academic_year_id to expense_transactions

Revision ID: d3e4f5a6b7c8
Revises: ea91fcd9d2f8
Create Date: 2026-05-06 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'd3e4f5a6b7c8'
down_revision: Union[str, None] = 'ea91fcd9d2f8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'expense_transactions',
        sa.Column(
            'academic_year_id',
            postgresql.UUID(as_uuid=True),
            nullable=True,
        )
    )
    op.create_index(
        'ix_expense_transactions_academic_year_id',
        'expense_transactions',
        ['academic_year_id'],
    )


def downgrade() -> None:
    op.drop_index('ix_expense_transactions_academic_year_id', table_name='expense_transactions')
    op.drop_column('expense_transactions', 'academic_year_id')

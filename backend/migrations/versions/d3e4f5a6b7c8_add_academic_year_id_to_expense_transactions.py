"""Add academic_year_id to expense_transactions

Revision ID: d3e4f5a6b7c8
Revises: ea91fcd9d2f8
Create Date: 2026-05-06 16:00:00.000000

Idempotent: every schema already got this column from a one-off script.
"""
import os
from typing import Sequence, Union

from alembic import op


revision: str = 'd3e4f5a6b7c8'
down_revision: Union[str, None] = 'ea91fcd9d2f8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    schema = os.getenv('SCHEMA_NAME', 'cos360_master')
    op.execute(f'ALTER TABLE "{schema}".expense_transactions ADD COLUMN IF NOT EXISTS academic_year_id UUID')
    op.execute(
        f'CREATE INDEX IF NOT EXISTS ix_expense_transactions_academic_year_id '
        f'ON "{schema}".expense_transactions (academic_year_id)'
    )


def downgrade() -> None:
    schema = os.getenv('SCHEMA_NAME', 'cos360_master')
    op.execute(f'DROP INDEX IF EXISTS "{schema}".ix_expense_transactions_academic_year_id')
    op.execute(f'ALTER TABLE "{schema}".expense_transactions DROP COLUMN IF EXISTS academic_year_id')

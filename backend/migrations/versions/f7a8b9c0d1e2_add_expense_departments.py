"""add_expense_departments

Revision ID: f7a8b9c0d1e2
Revises: d3e4f5a6b7c8, e0f1a2b3c4d5
Create Date: 2026-09-30

Merges the two heads and creates expense_departments, which had a model but
no table in any schema. Idempotent, so it succeeds on schemas that already
have the table.
"""
import os
from typing import Sequence, Union

from alembic import op

revision: str = 'f7a8b9c0d1e2'
down_revision: Union[str, Sequence[str], None] = ('d3e4f5a6b7c8', 'e0f1a2b3c4d5')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    schema = os.getenv('SCHEMA_NAME', 'cos360_master')
    op.execute(
        f'''
        CREATE TABLE IF NOT EXISTS "{schema}".expense_departments (
            id UUID NOT NULL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            description VARCHAR(300),
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP NOT NULL DEFAULT now(),
            updated_at TIMESTAMP NOT NULL DEFAULT now(),
            org_id UUID NOT NULL
        )
        '''
    )
    op.execute(f'CREATE INDEX IF NOT EXISTS ix_expense_departments_id ON "{schema}".expense_departments (id)')
    op.execute(f'CREATE INDEX IF NOT EXISTS ix_expense_departments_org_id ON "{schema}".expense_departments (org_id)')


def downgrade() -> None:
    schema = os.getenv('SCHEMA_NAME', 'cos360_master')
    op.execute(f'DROP TABLE IF EXISTS "{schema}".expense_departments')

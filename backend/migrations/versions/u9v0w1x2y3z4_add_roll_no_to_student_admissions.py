"""add_roll_no_to_student_admissions

Revision ID: u9v0w1x2y3z4
Revises: t8u9v0w1x2y3
Create Date: 2026-06-15

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'u9v0w1x2y3z4'
down_revision: Union[str, None] = 't8u9v0w1x2y3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    import os
    schema = os.getenv('SCHEMA_NAME', 'cos360_master')
    op.add_column('student_admissions', sa.Column('roll_no', sa.String(length=50), nullable=True), schema=schema)


def downgrade() -> None:
    import os
    schema = os.getenv('SCHEMA_NAME', 'cos360_master')
    op.drop_column('student_admissions', 'roll_no', schema=schema)

"""add_student_type_to_students

Revision ID: t8u9v0w1x2y3
Revises: s7t8u9v0w1x2
Create Date: 2026-06-15

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 't8u9v0w1x2y3'
down_revision: Union[str, None] = 's7t8u9v0w1x2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('students', sa.Column('student_type', sa.String(length=20), nullable=True))


def downgrade() -> None:
    op.drop_column('students', 'student_type')

"""fix_admission_type_check_constraint

Revision ID: f6a7b8c9d0e1
Revises: c7d8e9f0a1b2
Create Date: 2026-07-01

admission_type values were renamed from primary/non_primary to
pre_primary/regular. The ck_admission_type check constraint still
referenced the old values, blocking any insert/update with the new ones.
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'f6a7b8c9d0e1'
down_revision: Union[str, None] = 'c7d8e9f0a1b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint('ck_admission_type', 'student_admissions', type_='check')
    op.create_check_constraint(
        'ck_admission_type',
        'student_admissions',
        "admission_type IN ('pre_primary', 'regular')"
    )


def downgrade() -> None:
    op.drop_constraint('ck_admission_type', 'student_admissions', type_='check')
    op.create_check_constraint(
        'ck_admission_type',
        'student_admissions',
        "admission_type IN ('primary', 'non_primary')"
    )

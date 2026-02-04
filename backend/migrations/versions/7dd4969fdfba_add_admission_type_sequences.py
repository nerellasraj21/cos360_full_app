"""add_admission_type_sequences

Revision ID: 7dd4969fdfba
Revises: 5fdf7640453e
Create Date: 2026-02-04 11:28:10.851850

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7dd4969fdfba'
down_revision: Union[str, None] = '5fdf7640453e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add admission_type field to student_admissions for separate sequences."""
    # Add admission_type column to student_admissions
    op.add_column('student_admissions',
        sa.Column('admission_type', sa.String(20), nullable=True))

    # Add check constraint for valid admission types
    op.create_check_constraint(
        'ck_admission_type',
        'student_admissions',
        "admission_type IN ('primary', 'non_primary')"
    )


def downgrade() -> None:
    """Remove admission_type field from student_admissions."""
    # Drop check constraint first
    op.drop_constraint('ck_admission_type', 'student_admissions', type_='check')

    # Drop admission_type column
    op.drop_column('student_admissions', 'admission_type')

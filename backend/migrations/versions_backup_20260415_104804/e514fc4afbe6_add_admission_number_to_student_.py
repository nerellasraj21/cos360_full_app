"""add_admission_number_to_student_admissions

Revision ID: e514fc4afbe6
Revises: 1f17f10c03ae
Create Date: 2025-08-31 11:33:46.558707

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e514fc4afbe6'
down_revision: Union[str, None] = '1f17f10c03ae'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('student_admissions', sa.Column('admission_number', sa.String(50), nullable=True))
    
    # Create unique constraint for admission_number
    op.create_unique_constraint('uq_admission_number', 'student_admissions', ['admission_number'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('uq_admission_number', 'student_admissions')
    op.drop_column('student_admissions', 'admission_number')

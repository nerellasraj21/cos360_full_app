"""add_parent_salary_range

Revision ID: f37576c3d9bc
Revises: 7dd4969fdfba
Create Date: 2026-02-04 11:46:57.151878

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f37576c3d9bc'
down_revision: Union[str, None] = '7dd4969fdfba'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add salary_range field to parents table."""
    # Add salary_range column to parents
    op.add_column('parents',
        sa.Column('salary_range', sa.String(20), nullable=True))

    # Add check constraint for valid salary ranges
    op.create_check_constraint(
        'ck_parent_salary_range',
        'parents',
        "salary_range IN ('below_1l', '1l_3l', '3l_5l', '5l_10l', 'above_10l')"
    )


def downgrade() -> None:
    """Remove salary_range field from parents table."""
    # Drop check constraint first
    op.drop_constraint('ck_parent_salary_range', 'parents', type_='check')

    # Drop salary_range column
    op.drop_column('parents', 'salary_range')

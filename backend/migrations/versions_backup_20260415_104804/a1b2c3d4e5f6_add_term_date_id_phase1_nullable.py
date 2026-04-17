"""add_term_date_id_phase1_nullable

Revision ID: a1b2c3d4e5f6
Revises: 51880f32593d
Create Date: 2026-02-07 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '51880f32593d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Phase 1: Add term_date_id columns (nullable) to prepare for migration."""

    # Add to fee_class_map_term_amounts
    op.add_column('fee_class_map_term_amounts',
        sa.Column('term_date_id', sa.UUID(), nullable=True))

    # Add to fee_student_map_term_amounts
    op.add_column('fee_student_map_term_amounts',
        sa.Column('term_date_id', sa.UUID(), nullable=True))

    # Add to fee_transaction_items
    op.add_column('fee_transaction_items',
        sa.Column('term_date_id', sa.UUID(), nullable=True))


def downgrade() -> None:
    """Rollback: Drop term_date_id columns."""
    op.drop_column('fee_transaction_items', 'term_date_id')
    op.drop_column('fee_student_map_term_amounts', 'term_date_id')
    op.drop_column('fee_class_map_term_amounts', 'term_date_id')

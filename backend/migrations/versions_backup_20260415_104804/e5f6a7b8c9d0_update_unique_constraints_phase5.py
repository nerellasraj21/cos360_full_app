"""update_unique_constraints_phase5

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-02-07 16:04:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Phase 5: Update unique constraints to use term_date_id."""

    # Drop old unique constraint on fee_class_map_term_amounts
    op.drop_constraint('uq_fee_class_mapping_term', 'fee_class_map_term_amounts', type_='unique')

    # Add new unique constraint
    op.create_unique_constraint(
        'uq_fee_class_mapping_term_date',
        'fee_class_map_term_amounts',
        ['fee_class_mapping_id', 'term_date_id']
    )

    # Note: fee_student_map_term_amounts and fee_transaction_items don't have unique constraints
    # No changes needed for those tables


def downgrade() -> None:
    """Restore old unique constraint."""
    op.drop_constraint('uq_fee_class_mapping_term_date', 'fee_class_map_term_amounts', type_='unique')
    op.create_unique_constraint('uq_fee_class_mapping_term', 'fee_class_map_term_amounts',
                               ['fee_class_mapping_id', 'term_id'])

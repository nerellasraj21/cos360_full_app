"""add_constraints_phase4

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-02-07 16:03:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Phase 4: Add NOT NULL and foreign key constraints."""

    # Make columns NOT NULL
    op.alter_column('fee_class_map_term_amounts', 'term_date_id', nullable=False)
    op.alter_column('fee_student_map_term_amounts', 'term_date_id', nullable=False)
    op.alter_column('fee_transaction_items', 'term_date_id', nullable=False)

    # Add foreign key constraints
    op.create_foreign_key(
        'fk_fee_class_map_term_amounts_term_date_id',
        'fee_class_map_term_amounts',
        'fee_term_dates',
        ['term_date_id'],
        ['id'],
        ondelete='RESTRICT'
    )

    op.create_foreign_key(
        'fk_fee_student_map_term_amounts_term_date_id',
        'fee_student_map_term_amounts',
        'fee_term_dates',
        ['term_date_id'],
        ['id'],
        ondelete='RESTRICT'
    )

    op.create_foreign_key(
        'fk_fee_transaction_items_term_date_id',
        'fee_transaction_items',
        'fee_term_dates',
        ['term_date_id'],
        ['id'],
        ondelete='RESTRICT'
    )

    # Add indexes for query performance
    op.create_index('idx_fee_class_map_term_amounts_term_date_id',
                   'fee_class_map_term_amounts', ['term_date_id'])
    op.create_index('idx_fee_student_map_term_amounts_term_date_id',
                   'fee_student_map_term_amounts', ['term_date_id'])
    op.create_index('idx_fee_transaction_items_term_date_id',
                   'fee_transaction_items', ['term_date_id'])


def downgrade() -> None:
    """Remove constraints and indexes."""
    op.drop_index('idx_fee_transaction_items_term_date_id', table_name='fee_transaction_items')
    op.drop_index('idx_fee_student_map_term_amounts_term_date_id', table_name='fee_student_map_term_amounts')
    op.drop_index('idx_fee_class_map_term_amounts_term_date_id', table_name='fee_class_map_term_amounts')

    op.drop_constraint('fk_fee_transaction_items_term_date_id', 'fee_transaction_items', type_='foreignkey')
    op.drop_constraint('fk_fee_student_map_term_amounts_term_date_id', 'fee_student_map_term_amounts', type_='foreignkey')
    op.drop_constraint('fk_fee_class_map_term_amounts_term_date_id', 'fee_class_map_term_amounts', type_='foreignkey')

    op.alter_column('fee_transaction_items', 'term_date_id', nullable=True)
    op.alter_column('fee_student_map_term_amounts', 'term_date_id', nullable=True)
    op.alter_column('fee_class_map_term_amounts', 'term_date_id', nullable=True)

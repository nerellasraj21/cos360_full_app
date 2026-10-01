"""add_foreign_keys_to_fee_transactions

Revision ID: 2422b873a6dd
Revises: 0348f274b51a
Create Date: 2026-02-06 12:44:51.329912

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2422b873a6dd'
down_revision: Union[str, None] = '0348f274b51a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: Add foreign key constraints to fee_transactions."""
    # Add foreign key constraint for student_id referencing students table
    op.create_foreign_key(
        'fk_fee_transactions_student_id',
        'fee_transactions',
        'students',
        ['student_id'],
        ['id'],
        ondelete='RESTRICT'
    )

    # Add foreign key constraint for academic_year_id referencing academic_years table
    op.create_foreign_key(
        'fk_fee_transactions_academic_year_id',
        'fee_transactions',
        'academic_years',
        ['academic_year_id'],
        ['id'],
        ondelete='RESTRICT'
    )


def downgrade() -> None:
    """Downgrade schema: Remove foreign key constraints from fee_transactions."""
    # Drop foreign key constraint for academic_year_id
    op.drop_constraint(
        'fk_fee_transactions_academic_year_id',
        'fee_transactions',
        type_='foreignkey'
    )

    # Drop foreign key constraint for student_id
    op.drop_constraint(
        'fk_fee_transactions_student_id',
        'fee_transactions',
        type_='foreignkey'
    )

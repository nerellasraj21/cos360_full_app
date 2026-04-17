"""validate_term_data_phase2

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-02-07 16:01:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Phase 2: Validation queries to check data consistency."""

    # Check 1: Every FeeTerm has matching FeeTermDates count
    result = op.get_bind().execute(sa.text("""
        SELECT ft.id, ft.term_name, ft.number_of_terms, COUNT(ftd.id) as date_count
        FROM fee_terms ft
        LEFT JOIN fee_term_dates ftd ON ftd.term_id = ft.id
        GROUP BY ft.id, ft.term_name, ft.number_of_terms
        HAVING COUNT(ftd.id) != ft.number_of_terms
    """))

    mismatches = result.fetchall()
    if mismatches:
        raise Exception(f"Data validation failed: {len(mismatches)} fee terms have mismatched term date counts: {mismatches}")

    # Check 2: No orphaned term amounts in fee_class_map_term_amounts
    result = op.get_bind().execute(sa.text("""
        SELECT COUNT(*) FROM fee_class_map_term_amounts fcmta
        WHERE NOT EXISTS (SELECT 1 FROM fee_terms ft WHERE ft.id = fcmta.term_id)
    """))

    orphans = result.scalar()
    if orphans > 0:
        raise Exception(f"Data validation failed: {orphans} orphaned fee_class_map_term_amounts records")

    # Check 3: No orphaned term amounts in fee_student_map_term_amounts
    result = op.get_bind().execute(sa.text("""
        SELECT COUNT(*) FROM fee_student_map_term_amounts fsmta
        WHERE NOT EXISTS (SELECT 1 FROM fee_terms ft WHERE ft.id = fsmta.term_id)
    """))

    orphans = result.scalar()
    if orphans > 0:
        raise Exception(f"Data validation failed: {orphans} orphaned fee_student_map_term_amounts records")

    # Check 4: No orphaned term amounts in fee_transaction_items
    result = op.get_bind().execute(sa.text("""
        SELECT COUNT(*) FROM fee_transaction_items fti
        WHERE NOT EXISTS (SELECT 1 FROM fee_terms ft WHERE ft.id = fti.fee_term_id)
    """))

    orphans = result.scalar()
    if orphans > 0:
        raise Exception(f"Data validation failed: {orphans} orphaned fee_transaction_items records")


def downgrade() -> None:
    """No rollback needed for validation."""
    pass

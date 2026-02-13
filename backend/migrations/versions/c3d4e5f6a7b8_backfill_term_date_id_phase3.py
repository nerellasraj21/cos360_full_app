"""backfill_term_date_id_phase3

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-02-07 16:02:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Phase 3: Backfill term_date_id using term_id mapping."""

    # Backfill fee_class_map_term_amounts
    # Strategy: Map to FIRST fee_term_date (ordered by date ASC)
    op.execute(sa.text("""
        UPDATE fee_class_map_term_amounts fcmta
        SET term_date_id = (
            SELECT ftd.id
            FROM fee_term_dates ftd
            WHERE ftd.term_id = fcmta.term_id
            ORDER BY ftd.fee_term_date ASC
            LIMIT 1
        )
        WHERE fcmta.term_date_id IS NULL
    """))

    # Verify backfill for fee_class_map_term_amounts
    result = op.get_bind().execute(sa.text("""
        SELECT COUNT(*) FROM fee_class_map_term_amounts WHERE term_date_id IS NULL
    """))
    null_count = result.scalar()
    if null_count > 0:
        raise Exception(f"Backfill failed for fee_class_map_term_amounts: {null_count} records still have NULL term_date_id")

    # Backfill fee_student_map_term_amounts
    op.execute(sa.text("""
        UPDATE fee_student_map_term_amounts fsmta
        SET term_date_id = (
            SELECT ftd.id
            FROM fee_term_dates ftd
            WHERE ftd.term_id = fsmta.term_id
            ORDER BY ftd.fee_term_date ASC
            LIMIT 1
        )
        WHERE fsmta.term_date_id IS NULL
    """))

    # Verify backfill for fee_student_map_term_amounts
    result = op.get_bind().execute(sa.text("""
        SELECT COUNT(*) FROM fee_student_map_term_amounts WHERE term_date_id IS NULL
    """))
    null_count = result.scalar()
    if null_count > 0:
        raise Exception(f"Backfill failed for fee_student_map_term_amounts: {null_count} records still have NULL term_date_id")

    # Backfill fee_transaction_items
    op.execute(sa.text("""
        UPDATE fee_transaction_items fti
        SET term_date_id = (
            SELECT ftd.id
            FROM fee_term_dates ftd
            WHERE ftd.term_id = fti.fee_term_id
            ORDER BY ftd.fee_term_date ASC
            LIMIT 1
        )
        WHERE fti.term_date_id IS NULL
    """))

    # Verify backfill for fee_transaction_items
    result = op.get_bind().execute(sa.text("""
        SELECT COUNT(*) FROM fee_transaction_items WHERE term_date_id IS NULL
    """))
    null_count = result.scalar()
    if null_count > 0:
        raise Exception(f"Backfill failed for fee_transaction_items: {null_count} records still have NULL term_date_id")


def downgrade() -> None:
    """Clear backfilled data."""
    op.execute(sa.text("UPDATE fee_class_map_term_amounts SET term_date_id = NULL"))
    op.execute(sa.text("UPDATE fee_student_map_term_amounts SET term_date_id = NULL"))
    op.execute(sa.text("UPDATE fee_transaction_items SET term_date_id = NULL"))

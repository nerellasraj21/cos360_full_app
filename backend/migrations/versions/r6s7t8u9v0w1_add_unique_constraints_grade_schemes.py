"""add unique constraints to exam_grade_schemes, subject_grade_schemes, remark_grade_sets

Revision ID: r6s7t8u9v0w1
Revises: q5r6s7t8u9v0
Create Date: 2026-05-21
"""
from alembic import op

revision = "r6s7t8u9v0w1"
down_revision = "q5r6s7t8u9v0"
branch_labels = None
depends_on = None


def upgrade():
    # ── exam_grade_schemes ───────────────────────────────────────────────────
    # Remove duplicate name rows, keeping the earliest created row
    op.execute("""
        DELETE FROM exam_grade_schemes
        WHERE id NOT IN (
            SELECT MIN(id::text)::uuid
            FROM exam_grade_schemes
            GROUP BY name
        )
    """)
    op.create_unique_constraint("uq_exam_grade_scheme_name", "exam_grade_schemes", ["name"])

    # ── subject_grade_schemes ────────────────────────────────────────────────
    # Remove duplicate name rows, keeping the earliest created row
    op.execute("""
        DELETE FROM subject_grade_schemes
        WHERE id NOT IN (
            SELECT MIN(id::text)::uuid
            FROM subject_grade_schemes
            GROUP BY name
        )
    """)
    op.create_unique_constraint("uq_subject_grade_scheme_name", "subject_grade_schemes", ["name"])

    # ── remark_grade_sets ────────────────────────────────────────────────────
    # Remove duplicate name rows, keeping the earliest created row
    op.execute("""
        DELETE FROM remark_grade_sets
        WHERE id NOT IN (
            SELECT MIN(id::text)::uuid
            FROM remark_grade_sets
            GROUP BY name
        )
    """)
    op.create_unique_constraint("uq_remark_grade_set_name", "remark_grade_sets", ["name"])


def downgrade():
    op.drop_constraint("uq_remark_grade_set_name", "remark_grade_sets", type_="unique")
    op.drop_constraint("uq_subject_grade_scheme_name", "subject_grade_schemes", type_="unique")
    op.drop_constraint("uq_exam_grade_scheme_name", "exam_grade_schemes", type_="unique")

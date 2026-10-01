"""exam_config_templates

Create exam_config_templates and exam_config_template_items tables.

Revision ID: k7l8m9n0o1p2
Revises: i5j6k7l8m9n0
Create Date: 2026-03-13 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision: str = "k7l8m9n0o1p2"
down_revision: Union[str, None] = "i5j6k7l8m9n0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "exam_config_templates",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("template_name", sa.String(150), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("board", sa.String(50), nullable=True),
        sa.Column("level", sa.String(30), nullable=True),
        sa.Column("source_exam_id", UUID(as_uuid=True), nullable=True),
        sa.Column("source_class_id", UUID(as_uuid=True), nullable=True),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.TIMESTAMP(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.TIMESTAMP(), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("template_name", name="uq_exam_config_template_name"),
    )
    op.create_index("ix_exam_config_templates_id", "exam_config_templates", ["id"])

    op.create_table(
        "exam_config_template_items",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "template_id",
            UUID(as_uuid=True),
            sa.ForeignKey("exam_config_templates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("subject_id", UUID(as_uuid=True), sa.ForeignKey("subjects.id"), nullable=False),
        sa.Column(
            "subject_grade_scheme_id",
            UUID(as_uuid=True),
            sa.ForeignKey("subject_grade_schemes.id"),
            nullable=True,
        ),
        sa.Column("credit_hours", sa.SmallInteger(), nullable=True),
        sa.Column("has_internal_external_split", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("internal_max_marks", sa.Numeric(8, 2), nullable=True),
        sa.Column("internal_min_pass", sa.Numeric(8, 2), nullable=True),
        sa.Column("external_max_marks", sa.Numeric(8, 2), nullable=True),
        sa.Column("external_min_pass", sa.Numeric(8, 2), nullable=True),
        sa.Column("sort_order", sa.SmallInteger(), nullable=True),
        sa.Column("components_json", JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
    )
    op.create_index("ix_exam_config_template_items_id", "exam_config_template_items", ["id"])
    op.create_index("ix_exam_config_template_items_template_id", "exam_config_template_items", ["template_id"])


def downgrade() -> None:
    op.drop_table("exam_config_template_items")
    op.drop_table("exam_config_templates")

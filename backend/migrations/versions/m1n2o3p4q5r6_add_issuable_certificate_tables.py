"""add_issuable_certificate_tables

Add issuable_certificate_templates and generated_certificates tables
for the certificate generation feature.

Revision ID: m1n2o3p4q5r6
Revises: 80f08c062489
Create Date: 2026-04-18 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "m1n2o3p4q5r6"
down_revision: Union[str, None] = "80f08c062489"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "issuable_certificate_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("html_template", sa.Text(), nullable=False),
        sa.Column("color_theme", sa.String(20), nullable=False, server_default="blue"),
        sa.Column("variables_used", sa.Text(), nullable=True),
        sa.Column("is_active", sa.String(), nullable=False, server_default="True"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("id"),
    )
    op.create_index(
        "ix_issuable_certificate_templates_id",
        "issuable_certificate_templates",
        ["id"],
        unique=True,
    )

    op.create_table(
        "generated_certificates",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("template_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("html_content", sa.Text(), nullable=False),
        sa.Column("pdf_content", sa.LargeBinary(), nullable=True),
        sa.Column("issued_date", sa.DateTime(), nullable=False),
        sa.Column("issued_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("remarks", sa.String(500), nullable=True),
        sa.Column("is_active", sa.String(), nullable=False, server_default="True"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("id"),
        sa.ForeignKeyConstraint(
            ["template_id"],
            ["issuable_certificate_templates.id"],
            name="fk_generated_certificates_template_id",
            ondelete="RESTRICT",
        ),
    )
    op.create_index(
        "ix_generated_certificates_id",
        "generated_certificates",
        ["id"],
        unique=True,
    )
    op.create_index(
        "ix_generated_certificates_student_id",
        "generated_certificates",
        ["student_id"],
    )
    op.create_index(
        "ix_generated_certificates_template_id",
        "generated_certificates",
        ["template_id"],
    )
    op.create_index(
        "ix_generated_certificates_issued_by",
        "generated_certificates",
        ["issued_by"],
    )


def downgrade() -> None:
    op.drop_index("ix_generated_certificates_issued_by", table_name="generated_certificates")
    op.drop_index("ix_generated_certificates_template_id", table_name="generated_certificates")
    op.drop_index("ix_generated_certificates_student_id", table_name="generated_certificates")
    op.drop_index("ix_generated_certificates_id", table_name="generated_certificates")
    op.drop_table("generated_certificates")

    op.drop_index("ix_issuable_certificate_templates_id", table_name="issuable_certificate_templates")
    op.drop_table("issuable_certificate_templates")

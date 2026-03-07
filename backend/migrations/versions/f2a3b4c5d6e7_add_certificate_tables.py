"""add_certificate_tables

Add created_at to certificate_types, created_at/updated_at to student_certificates,
and create stale_file_registry and file_audit_log tables.

Revision ID: f2a3b4c5d6e7
Revises: e3f4a5b6c7d8
Create Date: 2026-03-07 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "f2a3b4c5d6e7"
down_revision: Union[str, None] = "e3f4a5b6c7d8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add created_at to certificate_types (nullable first for existing rows)
    op.add_column(
        "certificate_types",
        sa.Column("created_at", sa.DateTime(), nullable=True)
    )

    # Add created_at and updated_at to student_certificates (nullable first for existing rows)
    op.add_column(
        "student_certificates",
        sa.Column("created_at", sa.DateTime(), nullable=True)
    )
    op.add_column(
        "student_certificates",
        sa.Column("updated_at", sa.DateTime(), nullable=True)
    )

    # Create stale_file_registry table
    op.create_table(
        "stale_file_registry",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("s3_key", sa.String(500), nullable=False),
        sa.Column("tenant_schema", sa.String(100), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("id"),
    )
    op.create_index("ix_stale_file_registry_id", "stale_file_registry", ["id"], unique=True)
    op.create_index("ix_stale_file_registry_tenant_schema", "stale_file_registry", ["tenant_schema"])
    op.create_index("ix_stale_file_registry_expires_at", "stale_file_registry", ["expires_at"])

    # Create file_audit_log table
    op.create_table(
        "file_audit_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("actor_role", sa.String(50), nullable=False),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("certificate_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("s3_key", sa.String(500), nullable=True),
        sa.Column("tenant_schema", sa.String(100), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("id"),
    )
    op.create_index("ix_file_audit_log_id", "file_audit_log", ["id"], unique=True)
    op.create_index("ix_file_audit_log_actor_id", "file_audit_log", ["actor_id"])
    op.create_index("ix_file_audit_log_student_id", "file_audit_log", ["student_id"])
    op.create_index("ix_file_audit_log_certificate_id", "file_audit_log", ["certificate_id"])
    op.create_index("ix_file_audit_log_tenant_schema", "file_audit_log", ["tenant_schema"])


def downgrade() -> None:
    # Drop file_audit_log table
    op.drop_index("ix_file_audit_log_tenant_schema", table_name="file_audit_log")
    op.drop_index("ix_file_audit_log_certificate_id", table_name="file_audit_log")
    op.drop_index("ix_file_audit_log_student_id", table_name="file_audit_log")
    op.drop_index("ix_file_audit_log_actor_id", table_name="file_audit_log")
    op.drop_index("ix_file_audit_log_id", table_name="file_audit_log")
    op.drop_table("file_audit_log")

    # Drop stale_file_registry table
    op.drop_index("ix_stale_file_registry_expires_at", table_name="stale_file_registry")
    op.drop_index("ix_stale_file_registry_tenant_schema", table_name="stale_file_registry")
    op.drop_index("ix_stale_file_registry_id", table_name="stale_file_registry")
    op.drop_table("stale_file_registry")

    # Drop columns from student_certificates
    op.drop_column("student_certificates", "updated_at")
    op.drop_column("student_certificates", "created_at")

    # Drop column from certificate_types
    op.drop_column("certificate_types", "created_at")

"""add_communication_tables

Revision ID: a2b3c4d5e6f7
Revises: f2a3b4c5d6e7
Create Date: 2026-03-07 00:00:00.000000

Creates:
  - message_templates
  - notification_queue
  - notification_log

Enum types:
  - channelenum       (sms, whatsapp, email)
  - queuestatusenum   (queued, processing, done, failed)
  - logstatusenum     (queued, sent, delivered, failed)
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "a2b3c4d5e6f7"
down_revision: Union[str, None] = "f2a3b4c5d6e7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Enum types ────────────────────────────────────────────────────────────
    op.execute(
        "CREATE TYPE channelenum AS ENUM ('sms', 'whatsapp', 'email')"
    )
    op.execute(
        "CREATE TYPE queuestatusenum AS ENUM ('queued', 'processing', 'done', 'failed')"
    )
    op.execute(
        "CREATE TYPE logstatusenum AS ENUM ('queued', 'sent', 'delivered', 'failed')"
    )

    # ── message_templates ─────────────────────────────────────────────────────
    op.create_table(
        "message_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column(
            "channel",
            sa.Enum("sms", "whatsapp", "email", name="channelenum", create_type=False),
            nullable=False,
        ),
        sa.Column("body", sa.Text, nullable=False),
        sa.Column("subject", sa.String(500), nullable=True),
        sa.Column("variables", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.TIMESTAMP, nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMP, nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name", "channel", name="uq_template_name_channel"),
    )
    op.create_index("ix_message_templates_id", "message_templates", ["id"], unique=True)

    # ── notification_queue ────────────────────────────────────────────────────
    op.create_table(
        "notification_queue",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "template_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("message_templates.id"),
            nullable=False,
        ),
        sa.Column("recipient_name", sa.String(200), nullable=True),
        sa.Column("recipient_phone", sa.String(20), nullable=True),
        sa.Column("recipient_email", sa.String(200), nullable=True),
        sa.Column(
            "channel",
            sa.Enum("sms", "whatsapp", "email", name="channelenum", create_type=False),
            nullable=False,
        ),
        sa.Column("rendered_message", sa.Text, nullable=False),
        sa.Column(
            "status",
            sa.Enum("queued", "processing", "done", "failed", name="queuestatusenum", create_type=False),
            nullable=False,
            server_default="queued",
        ),
        sa.Column("triggered_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("target_type", sa.String(50), nullable=False),
        sa.Column("target_ref", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP, nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_notification_queue_id", "notification_queue", ["id"], unique=True)
    op.create_index("ix_notification_queue_status", "notification_queue", ["status"])
    op.create_index("ix_notification_queue_created_at", "notification_queue", ["created_at"])

    # ── notification_log ──────────────────────────────────────────────────────
    op.create_table(
        "notification_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "template_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("message_templates.id"),
            nullable=True,
        ),
        sa.Column("recipient_name", sa.String(200), nullable=True),
        sa.Column("recipient_phone", sa.String(20), nullable=True),
        sa.Column("recipient_email", sa.String(200), nullable=True),
        sa.Column(
            "channel",
            sa.Enum("sms", "whatsapp", "email", name="channelenum", create_type=False),
            nullable=False,
        ),
        sa.Column("message", sa.Text, nullable=False),
        sa.Column(
            "status",
            sa.Enum("queued", "sent", "delivered", "failed", name="logstatusenum", create_type=False),
            nullable=False,
        ),
        sa.Column("provider_message_id", sa.String(200), nullable=True),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("triggered_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("target_type", sa.String(50), nullable=False),
        sa.Column("target_ref", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP, nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_notification_log_id", "notification_log", ["id"], unique=True)
    op.create_index("ix_notification_log_status", "notification_log", ["status"])
    op.create_index("ix_notification_log_channel", "notification_log", ["channel"])
    op.create_index("ix_notification_log_created_at", "notification_log", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_notification_log_created_at", table_name="notification_log")
    op.drop_index("ix_notification_log_channel", table_name="notification_log")
    op.drop_index("ix_notification_log_status", table_name="notification_log")
    op.drop_index("ix_notification_log_id", table_name="notification_log")
    op.drop_table("notification_log")

    op.drop_index("ix_notification_queue_created_at", table_name="notification_queue")
    op.drop_index("ix_notification_queue_status", table_name="notification_queue")
    op.drop_index("ix_notification_queue_id", table_name="notification_queue")
    op.drop_table("notification_queue")

    op.drop_index("ix_message_templates_id", table_name="message_templates")
    op.drop_table("message_templates")

    op.execute("DROP TYPE IF EXISTS logstatusenum")
    op.execute("DROP TYPE IF EXISTS queuestatusenum")
    op.execute("DROP TYPE IF EXISTS channelenum")

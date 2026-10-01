"""make_notification_queue_template_optional

Revision ID: d9e0f1a2b3c4
Revises: c8d9e0f1a2b3
Create Date: 2026-08-26

WhatsApp sends no longer require a saved template (free-text message
compose) — SMS and Email still require one. notification_queue.template_id
was NOT NULL, which would reject template-less WhatsApp queue rows, so it
is relaxed to nullable here. notification_log.template_id was already
nullable, no change needed there.
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'd9e0f1a2b3c4'
down_revision: Union[str, None] = 'c8d9e0f1a2b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE notification_queue ALTER COLUMN template_id DROP NOT NULL")


def downgrade() -> None:
    op.execute("ALTER TABLE notification_queue ALTER COLUMN template_id SET NOT NULL")

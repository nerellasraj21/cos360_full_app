"""add_multi_target_communication_types

Revision ID: b7c8d9e0f1a2
Revises: f6a7b8c9d0e1
Create Date: 2026-08-24

Adds multiple_parents / multiple_students / multiple_staff as new
communication target_type values (Compose > Target Type), each carrying
a list of ids (parent_ids / student_ids / staff_ids) in target_ref.

No DDL change: notification_queue.target_type and notification_log.target_type
are plain VARCHAR(50) columns (no enum/CHECK constraint) and target_ref is
JSON, so the new values and array-shaped refs fit the existing schema. This
revision only records the application-level change in migration history.
"""
from typing import Sequence, Union

# revision identifiers, used by Alembic.
revision: str = 'b7c8d9e0f1a2'
down_revision: Union[str, None] = 'f6a7b8c9d0e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

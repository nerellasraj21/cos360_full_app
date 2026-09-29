"""add_half_day_student_attendance

Revision ID: c8d9e0f1a2b3
Revises: b7c8d9e0f1a2
Create Date: 2026-08-25

Adds "half_day" as a valid student attendance status, matching the
staff attendance module (which already supports half_day).

No DDL change: student_attendance.status is a plain VARCHAR(20) column
with no enum/CHECK constraint, so the new "half_day" value fits the
existing schema without any ALTER TABLE. This revision only records the
application-level change in migration history.
"""
from typing import Sequence, Union

# revision identifiers, used by Alembic.
revision: str = 'c8d9e0f1a2b3'
down_revision: Union[str, None] = 'b7c8d9e0f1a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

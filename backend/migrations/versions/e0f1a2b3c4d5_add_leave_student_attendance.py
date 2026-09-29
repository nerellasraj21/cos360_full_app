"""add_leave_student_attendance

Revision ID: e0f1a2b3c4d5
Revises: d9e0f1a2b3c4
Create Date: 2026-08-29

Adds "leave" as a valid student attendance status, alongside the existing
present/absent/late/half_day values. Also added to the shared
AttendanceStatusEnum (used by staff attendance too) so schema-level
validation stays consistent across both modules.

No DDL change: student_attendance.status (and staff_attendance.status) are
plain VARCHAR(20) columns with no enum/CHECK constraint, so the new
"leave" value fits the existing schema without any ALTER TABLE. This
revision only records the application-level change in migration history.
"""
from typing import Sequence, Union

# revision identifiers, used by Alembic.
revision: str = 'e0f1a2b3c4d5'
down_revision: Union[str, None] = 'd9e0f1a2b3c4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

"""add_admission_type_enum

Revision ID: 0348f274b51a
Revises: 7cc7e62e4d37
Create Date: 2026-02-04 16:42:03.243259

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0348f274b51a'
down_revision: Union[str, None] = '7cc7e62e4d37'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass

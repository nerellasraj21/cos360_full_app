"""Merge migration heads

Revision ID: a7b83ff63a13
Revises: 6632b8389a75, add_fee_type_table
Create Date: 2025-08-28 13:00:58.171579

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a7b83ff63a13'
down_revision: Union[str, None] = ('6632b8389a75', 'add_fee_type_table')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass

"""merge heads

Revision ID: b1a239abde58
Revises: 1d8dec32af1a, b36728ed502f
Create Date: 2025-06-24 23:29:52.736968

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1a239abde58'
down_revision: Union[str, None] = ('1d8dec32af1a', 'b36728ed502f')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass

"""merge_multiple_migration_branches

Revision ID: 80f08c062489
Revises: a2b3c4d5e6f7, k7l8m9n0o1p2, l8m9n0o1p2q3
Create Date: 2026-04-15 10:49:40.259168

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '80f08c062489'
down_revision: Union[str, None] = ('a2b3c4d5e6f7', 'k7l8m9n0o1p2', 'l8m9n0o1p2q3')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass

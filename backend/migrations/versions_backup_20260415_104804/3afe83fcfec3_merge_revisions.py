"""merge revisions

Revision ID: 3afe83fcfec3
Revises: 17ff7e120038, 2397c5a9e78e
Create Date: 2025-07-01 01:21:24.382446

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3afe83fcfec3'
down_revision: Union[str, None] = ('17ff7e120038', '2397c5a9e78e')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass

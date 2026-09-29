"""merge_section_id_migration

Revision ID: 5fdf7640453e
Revises: add_section_id_to_class_subject_mappings, ea5be5ee6de7
Create Date: 2025-12-27 20:28:13.303436

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5fdf7640453e'
down_revision: Union[str, None] = ('add_section_id_to_class_subject_mappings', 'ea5be5ee6de7')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass

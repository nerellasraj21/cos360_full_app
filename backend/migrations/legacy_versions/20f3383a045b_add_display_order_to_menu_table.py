"""add_display_order_to_menu_table

Revision ID: 20f3383a045b
Revises: 12a6b0cbbf6b
Create Date: 2025-08-31 22:10:43.612361

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20f3383a045b'
down_revision: Union[str, None] = '12a6b0cbbf6b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add display_order column to menus table
    op.add_column('menus', sa.Column('display_order', sa.Integer(), nullable=False, default=0))
    
    # Add index for performance when ordering menus
    op.create_index('ix_menus_display_order', 'menus', ['display_order'])
    
    # Update existing menus with sequential display_order based on id
    op.execute("""
        UPDATE menus 
        SET display_order = id 
        WHERE display_order = 0
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_menus_display_order', 'menus')
    op.drop_column('menus', 'display_order')

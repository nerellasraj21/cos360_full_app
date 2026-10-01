"""fix_permission_tables_schema_constraints

Revision ID: 51880f32593d
Revises: c4e0e9cbb892
Create Date: 2025-09-23 10:45:59.219829

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '51880f32593d'
down_revision: Union[str, None] = 'c4e0e9cbb892'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Fix plan_resource_access table - add default UUID generation for id column
    op.execute("""
        ALTER TABLE public.plan_resource_access 
        ALTER COLUMN id SET DEFAULT gen_random_uuid()
    """)
    
    # Fix resource_permissions table - add default UUID generation for id column
    op.execute("""
        ALTER TABLE public.resource_permissions 
        ALTER COLUMN id SET DEFAULT gen_random_uuid()
    """)


def downgrade() -> None:
    """Downgrade schema."""
    # Remove default UUID generation (not recommended for production)
    op.execute("""
        ALTER TABLE public.plan_resource_access 
        ALTER COLUMN id DROP DEFAULT
    """)
    
    op.execute("""
        ALTER TABLE public.resource_permissions 
        ALTER COLUMN id DROP DEFAULT
    """)

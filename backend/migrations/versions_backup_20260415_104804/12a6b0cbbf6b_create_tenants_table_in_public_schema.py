"""create_tenants_table_in_public_schema

Revision ID: 12a6b0cbbf6b
Revises: 099420ea82ee
Create Date: 2025-08-31 22:10:20.655011

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '12a6b0cbbf6b'
down_revision: Union[str, None] = '099420ea82ee'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create tenants table in public schema
    op.create_table(
        'tenants',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('client_name', sa.String(100), nullable=False),
        sa.Column('schema_name', sa.String(100), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.func.now(), nullable=False),
        
        # Create unique constraints
        sa.UniqueConstraint('client_name', name='uq_client_name'),
        sa.UniqueConstraint('schema_name', name='uq_schema_name'),
        
        # Create indexes for performance
        sa.Index('ix_tenants_client_name', 'client_name'),
        sa.Index('ix_tenants_schema_name', 'schema_name'),
        sa.Index('ix_tenants_is_active', 'is_active'),
        
        schema='public'
    )
    
    # Insert default tenant for backward compatibility (cos360_main)
    op.execute("""
        INSERT INTO public.tenants (client_name, schema_name, is_active) 
        VALUES ('default', 'cos360_main', true)
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('tenants', schema='public')

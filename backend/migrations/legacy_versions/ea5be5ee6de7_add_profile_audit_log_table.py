"""Add profile_audit_logs table for profile module

Revision ID: ea5be5ee6de7
Revises: c4e0e9cbb892
Create Date: 2025-10-04 17:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'ea5be5ee6de7'
down_revision: Union[str, None] = '51880f32593d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - Add profile_audit_logs table."""
    # Note: This table will be created in each tenant schema, not in public schema
    # The migration will run for each tenant when they are set up

    op.create_table(
        'profile_audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('profile_type', sa.String(length=50), nullable=False),
        sa.Column('action', sa.String(length=50), nullable=False),
        sa.Column('action_category', sa.String(length=30), nullable=False),
        sa.Column('field_name', sa.String(length=100), nullable=True),
        sa.Column('old_value', sa.Text(), nullable=True),
        sa.Column('new_value', sa.Text(), nullable=True),
        sa.Column('full_record_before', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('full_record_after', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('action_reason', sa.String(length=500), nullable=True),
        sa.Column('action_notes', sa.Text(), nullable=True),
        sa.Column('request_ip_address', sa.String(length=45), nullable=True),
        sa.Column('request_user_agent', sa.String(length=500), nullable=True),
        sa.Column('request_session_id', sa.String(length=100), nullable=True),
        sa.Column('api_endpoint', sa.String(length=200), nullable=True),
        sa.Column('http_method', sa.String(length=10), nullable=True),
        sa.Column('request_id', sa.String(length=100), nullable=True),
        sa.Column('is_sensitive_change', sa.String(length=10), nullable=True),
        sa.Column('requires_verification', sa.String(length=10), nullable=True),
        sa.Column('actor_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('actor_role', sa.String(length=50), nullable=False),
        sa.Column('actor_username', sa.String(length=100), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # Add indexes for performance
    op.create_index('idx_profile_audit_user_id', 'profile_audit_logs', ['user_id'])
    op.create_index('idx_profile_audit_org_id', 'profile_audit_logs', ['org_id'])
    op.create_index('idx_profile_audit_profile_type', 'profile_audit_logs', ['profile_type'])
    op.create_index('idx_profile_audit_action', 'profile_audit_logs', ['action'])
    op.create_index('idx_profile_audit_actor_user_id', 'profile_audit_logs', ['actor_user_id'])
    op.create_index('idx_profile_audit_actor_role', 'profile_audit_logs', ['actor_role'])
    op.create_index('idx_profile_audit_created_at', 'profile_audit_logs', ['created_at'])
    op.create_index('idx_profile_audit_action_category', 'profile_audit_logs', ['action_category'])


def downgrade() -> None:
    """Downgrade schema - Drop profile_audit_logs table."""
    # Drop indexes first
    op.drop_index('idx_profile_audit_action_category', table_name='profile_audit_logs')
    op.drop_index('idx_profile_audit_created_at', table_name='profile_audit_logs')
    op.drop_index('idx_profile_audit_actor_role', table_name='profile_audit_logs')
    op.drop_index('idx_profile_audit_actor_user_id', table_name='profile_audit_logs')
    op.drop_index('idx_profile_audit_action', table_name='profile_audit_logs')
    op.drop_index('idx_profile_audit_profile_type', table_name='profile_audit_logs')
    op.drop_index('idx_profile_audit_org_id', table_name='profile_audit_logs')
    op.drop_index('idx_profile_audit_user_id', table_name='profile_audit_logs')

    # Drop table
    op.drop_table('profile_audit_logs')

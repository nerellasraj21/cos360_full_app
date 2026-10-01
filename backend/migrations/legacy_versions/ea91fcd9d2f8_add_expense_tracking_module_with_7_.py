"""Add expense tracking module with 7 tables and security features

Revision ID: ea91fcd9d2f8
Revises: 20d70455697d
Create Date: 2025-09-15 11:58:39.496142

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid


# revision identifiers, used by Alembic.
revision: str = 'ea91fcd9d2f8'
down_revision: Union[str, None] = '20d70455697d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Create expense_categories table
    op.create_table('expense_categories',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.String(300), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP(), nullable=False, server_default=sa.func.now()),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Index('ix_expense_categories_id', 'id'),
        sa.Index('ix_expense_categories_org_id', 'org_id'),
    )

    # 2. Create expense_types table
    op.create_table('expense_types',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('category_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('expense_categories.id'), nullable=False),
        sa.Column('description', sa.String(300), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP(), nullable=False, server_default=sa.func.now()),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Index('ix_expense_types_id', 'id'),
        sa.Index('ix_expense_types_category_id', 'category_id'),
        sa.Index('ix_expense_types_org_id', 'org_id'),
    )

    # 3. Create expense_transactions table
    op.create_table('expense_transactions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False),
        sa.Column('expense_type_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('expense_types.id'), nullable=False),
        sa.Column('amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('transaction_date', sa.Date(), nullable=False),
        sa.Column('description', sa.String(500), nullable=False),
        sa.Column('reference_number', sa.String(100), nullable=True),
        sa.Column('idempotency_key', sa.String(100), nullable=False),
        sa.Column('payment_method', sa.String(20), nullable=False),
        sa.Column('vendor_name', sa.String(200), nullable=True),
        sa.Column('status', sa.String(20), default='pending', nullable=False),
        sa.Column('requires_approval', sa.Boolean(), default=False),
        sa.Column('requires_approval_override', sa.Boolean(), nullable=True),
        sa.Column('approved_by_user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('approved_by_role', sa.String(50), nullable=True),
        sa.Column('approved_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('approval_comment', sa.String(500), nullable=True),
        sa.Column('department_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('version', sa.Integer(), default=1, nullable=False),
        sa.Column('created_by_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_by_role', sa.String(50), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP(), nullable=False, server_default=sa.func.now()),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.UniqueConstraint('idempotency_key', name='uq_expense_transaction_idempotency'),
        sa.Index('ix_expense_transactions_id', 'id'),
        sa.Index('ix_expense_transactions_expense_type_id', 'expense_type_id'),
        sa.Index('ix_expense_transactions_transaction_date', 'transaction_date'),
        sa.Index('ix_expense_transactions_vendor_name', 'vendor_name'),
        sa.Index('ix_expense_transactions_status', 'status'),
        sa.Index('ix_expense_transactions_department_id', 'department_id'),
        sa.Index('ix_expense_transactions_created_by_user_id', 'created_by_user_id'),
        sa.Index('ix_expense_transactions_org_id', 'org_id'),
    )

    # 4. Create expense_transaction_items table
    op.create_table('expense_transaction_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False),
        sa.Column('transaction_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('expense_transactions.id'), nullable=False),
        sa.Column('item_name', sa.String(200), nullable=False),
        sa.Column('item_description', sa.Text(), nullable=True),
        sa.Column('unit_price', sa.Numeric(10, 2), nullable=False),
        sa.Column('quantity', sa.Numeric(8, 2), nullable=False, default=1),
        sa.Column('total_price', sa.Numeric(10, 2), nullable=False),
        sa.Column('item_category', sa.String(100), nullable=True),
        sa.Column('tax_rate', sa.Numeric(5, 2), nullable=True, default=0),
        sa.Column('tax_amount', sa.Numeric(10, 2), nullable=True, default=0),
        sa.Column('discount_rate', sa.Numeric(5, 2), nullable=True, default=0),
        sa.Column('discount_amount', sa.Numeric(10, 2), nullable=True, default=0),
        sa.Column('final_amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('vendor_item_code', sa.String(100), nullable=True),
        sa.Column('vendor_item_reference', sa.String(100), nullable=True),
        sa.Column('created_by_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_by_role', sa.String(50), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP(), nullable=False, server_default=sa.func.now()),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Index('ix_expense_transaction_items_id', 'id'),
        sa.Index('ix_expense_transaction_items_transaction_id', 'transaction_id'),
        sa.Index('ix_expense_transaction_items_created_by_user_id', 'created_by_user_id'),
        sa.Index('ix_expense_transaction_items_org_id', 'org_id'),
    )

    # 5. Create expense_attachments table
    op.create_table('expense_attachments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False),
        sa.Column('transaction_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('expense_transactions.id'), nullable=False),
        sa.Column('original_filename', sa.String(255), nullable=False),
        sa.Column('stored_filename', sa.String(255), nullable=False, unique=True),
        sa.Column('file_path', sa.String(500), nullable=False),
        sa.Column('file_size', sa.BigInteger(), nullable=False),
        sa.Column('mime_type', sa.String(100), nullable=False),
        sa.Column('file_extension', sa.String(10), nullable=False),
        sa.Column('file_hash_sha256', sa.String(64), nullable=False),
        sa.Column('virus_scan_status', sa.String(20), default='pending', nullable=False),
        sa.Column('virus_scan_result', sa.Text(), nullable=True),
        sa.Column('virus_scanned_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('is_public', sa.Boolean(), default=False),
        sa.Column('is_encrypted', sa.Boolean(), default=False),
        sa.Column('encryption_key_id', sa.String(100), nullable=True),
        sa.Column('document_type', sa.String(50), nullable=False),
        sa.Column('is_verified', sa.Boolean(), default=False),
        sa.Column('verified_by_user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('verified_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('verification_notes', sa.Text(), nullable=True),
        sa.Column('retention_period_months', sa.Integer(), default=84, nullable=False),
        sa.Column('is_archived', sa.Boolean(), default=False),
        sa.Column('archived_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('can_be_deleted', sa.Boolean(), default=True),
        sa.Column('department_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('uploaded_by_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('uploaded_by_role', sa.String(50), nullable=False),
        sa.Column('uploaded_at', sa.TIMESTAMP(), nullable=False, server_default=sa.func.now()),
        sa.Column('last_accessed_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('access_count', sa.Integer(), default=0, nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(), nullable=False, server_default=sa.func.now()),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Index('ix_expense_attachments_id', 'id'),
        sa.Index('ix_expense_attachments_transaction_id', 'transaction_id'),
        sa.Index('ix_expense_attachments_file_hash_sha256', 'file_hash_sha256'),
        sa.Index('ix_expense_attachments_department_id', 'department_id'),
        sa.Index('ix_expense_attachments_uploaded_by_user_id', 'uploaded_by_user_id'),
        sa.Index('ix_expense_attachments_org_id', 'org_id'),
    )

    # 6. Create expense_audit_logs table
    op.create_table('expense_audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False),
        sa.Column('transaction_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('expense_transactions.id'), nullable=False),
        sa.Column('action', sa.String(50), nullable=False),
        sa.Column('action_category', sa.String(30), nullable=False),
        sa.Column('field_name', sa.String(100), nullable=True),
        sa.Column('old_value', sa.Text(), nullable=True),
        sa.Column('new_value', sa.Text(), nullable=True),
        sa.Column('full_record_before', sa.JSON(), nullable=True),
        sa.Column('full_record_after', sa.JSON(), nullable=True),
        sa.Column('action_reason', sa.String(500), nullable=True),
        sa.Column('action_notes', sa.Text(), nullable=True),
        sa.Column('request_ip_address', sa.String(45), nullable=True),
        sa.Column('request_user_agent', sa.String(500), nullable=True),
        sa.Column('request_session_id', sa.String(100), nullable=True),
        sa.Column('api_endpoint', sa.String(200), nullable=True),
        sa.Column('http_method', sa.String(10), nullable=True),
        sa.Column('request_id', sa.String(100), nullable=True),
        sa.Column('workflow_stage', sa.String(50), nullable=True),
        sa.Column('compliance_flags', sa.JSON(), nullable=True),
        sa.Column('department_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('actor_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('actor_role', sa.String(50), nullable=False),
        sa.Column('actor_username', sa.String(100), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=False, server_default=sa.func.now()),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Index('ix_expense_audit_logs_id', 'id'),
        sa.Index('ix_expense_audit_logs_transaction_id', 'transaction_id'),
        sa.Index('ix_expense_audit_logs_action', 'action'),
        sa.Index('ix_expense_audit_logs_action_category', 'action_category'),
        sa.Index('ix_expense_audit_logs_department_id', 'department_id'),
        sa.Index('ix_expense_audit_logs_actor_user_id', 'actor_user_id'),
        sa.Index('ix_expense_audit_logs_actor_role', 'actor_role'),
        sa.Index('ix_expense_audit_logs_created_at', 'created_at'),
        sa.Index('ix_expense_audit_logs_org_id', 'org_id'),
    )

    # 7. Create expense_settings table
    op.create_table('expense_settings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False),
        sa.Column('setting_key', sa.String(100), nullable=False),
        sa.Column('setting_name', sa.String(200), nullable=False),
        sa.Column('setting_description', sa.Text(), nullable=True),
        sa.Column('setting_category', sa.String(50), nullable=False),
        sa.Column('string_value', sa.String(500), nullable=True),
        sa.Column('numeric_value', sa.Numeric(15, 2), nullable=True),
        sa.Column('integer_value', sa.Integer(), nullable=True),
        sa.Column('boolean_value', sa.Boolean(), nullable=True),
        sa.Column('json_value', sa.JSON(), nullable=True),
        sa.Column('default_value', sa.Text(), nullable=True),
        sa.Column('is_system_setting', sa.Boolean(), default=False),
        sa.Column('is_user_configurable', sa.Boolean(), default=True),
        sa.Column('validation_rules', sa.JSON(), nullable=True),
        sa.Column('allowed_values', sa.JSON(), nullable=True),
        sa.Column('requires_approval', sa.Boolean(), default=False),
        sa.Column('approval_threshold', sa.Numeric(10, 2), nullable=True),
        sa.Column('department_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('applies_to_all_departments', sa.Boolean(), default=True),
        sa.Column('is_audit_required', sa.Boolean(), default=True),
        sa.Column('is_sensitive', sa.Boolean(), default=False),
        sa.Column('compliance_level', sa.String(20), default='standard'),
        sa.Column('version', sa.Integer(), default=1, nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('effective_from', sa.TIMESTAMP(), nullable=True),
        sa.Column('effective_until', sa.TIMESTAMP(), nullable=True),
        sa.Column('created_by_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_by_role', sa.String(50), nullable=False),
        sa.Column('last_modified_by_user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('last_modified_by_role', sa.String(50), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP(), nullable=False, server_default=sa.func.now()),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.UniqueConstraint('setting_key', name='uq_expense_setting_key'),
        sa.Index('ix_expense_settings_id', 'id'),
        sa.Index('ix_expense_settings_setting_key', 'setting_key'),
        sa.Index('ix_expense_settings_setting_category', 'setting_category'),
        sa.Index('ix_expense_settings_department_id', 'department_id'),
        sa.Index('ix_expense_settings_created_by_user_id', 'created_by_user_id'),
        sa.Index('ix_expense_settings_org_id', 'org_id'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Drop tables in reverse order (due to foreign keys)
    op.drop_table('expense_settings')
    op.drop_table('expense_audit_logs')
    op.drop_table('expense_attachments')
    op.drop_table('expense_transaction_items')
    op.drop_table('expense_transactions')
    op.drop_table('expense_types')
    op.drop_table('expense_categories')

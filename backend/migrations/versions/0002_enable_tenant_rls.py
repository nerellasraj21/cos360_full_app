"""enable row level security on tenant tables

Revision ID: 0002
Revises: 0001
"""

from alembic import op
import sqlalchemy as sa

from app.db.rls import POLICY_NAME, enable_tenant_rls

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

NOT_TENANT_TABLES = ("report_audit", "super_admin_audit")


def _tenant_tables(connection):
    rows = connection.execute(
        sa.text(
            "SELECT c.table_name FROM information_schema.columns c "
            "JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name "
            "WHERE c.table_schema = 'public' AND c.column_name = 'tenant_id' AND t.table_type = 'BASE TABLE' "
            "AND c.data_type = 'uuid' ORDER BY c.table_name"
        )
    )
    return [r[0] for r in rows if r[0] not in NOT_TENANT_TABLES]


def upgrade() -> None:
    for table in _tenant_tables(op.get_bind()):
        enable_tenant_rls(op, table)


def downgrade() -> None:
    for table in _tenant_tables(op.get_bind()):
        op.execute(f'DROP POLICY IF EXISTS {POLICY_NAME} ON "public"."{table}"')
        op.execute(f'ALTER TABLE "public"."{table}" NO FORCE ROW LEVEL SECURITY')
        op.execute(f'ALTER TABLE "public"."{table}" DISABLE ROW LEVEL SECURITY')

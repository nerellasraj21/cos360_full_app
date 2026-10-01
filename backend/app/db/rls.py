from app.db.base import CURRENT_TENANT_SQL, SHARED_SCHEMA

POLICY_NAME = "tenant_isolation"


def enable_tenant_rls(op, table: str, schema: str = SHARED_SCHEMA) -> None:
    qualified = f'"{schema}"."{table}"'
    op.execute(f"ALTER TABLE {qualified} ENABLE ROW LEVEL SECURITY")
    op.execute(f"ALTER TABLE {qualified} FORCE ROW LEVEL SECURITY")
    op.execute(f"DROP POLICY IF EXISTS {POLICY_NAME} ON {qualified}")
    op.execute(
        f"CREATE POLICY {POLICY_NAME} ON {qualified} "
        f"USING (tenant_id = {CURRENT_TENANT_SQL}) WITH CHECK (tenant_id = {CURRENT_TENANT_SQL})"
    )

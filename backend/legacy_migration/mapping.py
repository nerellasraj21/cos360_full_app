from typing import Any
import uuid

import sqlalchemy as sa
from sqlalchemy import Column, Table


def column_plan(table: Table, source_columns: dict[str, str] | None) -> dict[str, Any]:
    target_columns = [c for c in table.c if c.name != "tenant_id"]
    if source_columns is None:
        return {"status": "missing_in_source", "common": [], "dropped": [], "missing_required": []}
    target_names = {c.name for c in table.c}
    common = [c.name for c in target_columns if c.name in source_columns]
    dropped = sorted(name for name in source_columns if name not in target_names and name != "tenant_id")
    missing_required = [
        c.name
        for c in target_columns
        if c.name not in source_columns and not c.nullable and c.default is None and c.server_default is None
    ]
    return {"status": "ok", "common": common, "dropped": dropped, "missing_required": missing_required}


def coerce(column: Column, value: Any) -> Any:
    if value is None:
        return None
    if isinstance(column.type, sa.Uuid) and isinstance(value, str):
        return uuid.UUID(value)
    return value


def as_key(value: Any) -> str:
    return str(value)

from collections.abc import Iterator
from typing import Any

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

from .db import make_engine, quote_ident


class Source:
    """Read-only access to the legacy database. It never writes: the connection is a read-only transaction."""

    def __init__(self, url: str, engine: Engine | None = None):
        self.engine = engine or make_engine(url)
        self.conn = self.engine.connect().execution_options(postgresql_readonly=True)
        self.conn.execute(text("SET statement_timeout = '600s'"))
        self._inspector = inspect(self.conn)
        self._tables: dict[str, set[str]] = {}
        self._columns: dict[tuple[str, str], dict[str, str]] = {}

    def close(self) -> None:
        self.conn.rollback()
        self.conn.close()

    def schema_exists(self, schema: str) -> bool:
        row = self.conn.execute(
            text("SELECT 1 FROM information_schema.schemata WHERE schema_name = :s"), {"s": schema}
        ).first()
        return row is not None

    def tables(self, schema: str) -> set[str]:
        if schema not in self._tables:
            self._tables[schema] = set(self._inspector.get_table_names(schema=schema))
        return self._tables[schema]

    def columns(self, schema: str, table: str) -> dict[str, str] | None:
        if table not in self.tables(schema):
            return None
        key = (schema, table)
        if key not in self._columns:
            self._columns[key] = {c["name"]: str(c["type"]) for c in self._inspector.get_columns(table, schema=schema)}
        return self._columns[key]

    def count(self, schema: str, table: str) -> int:
        if table not in self.tables(schema):
            return 0
        return self.conn.execute(text(f"SELECT count(*) FROM {quote_ident(schema)}.{quote_ident(table)}")).scalar_one()

    def rows(self, schema: str, table: str, columns: list[str], batch_size: int) -> Iterator[list[dict[str, Any]]]:
        if not columns or table not in self.tables(schema):
            return
        select_list = ", ".join(quote_ident(c) for c in columns)
        statement = text(f"SELECT {select_list} FROM {quote_ident(schema)}.{quote_ident(table)}")
        result = self.conn.execution_options(stream_results=True, yield_per=batch_size).execute(statement)
        for partition in result.mappings().partitions(batch_size):
            yield [dict(row) for row in partition]

    def tenants(self, platform_schema: str) -> list[dict[str, Any]]:
        columns = self.columns(platform_schema, "tenants") or {}
        wanted = [c for c in ("id", "client_name", "schema_name", "plan_id", "is_active") if c in columns]
        if "id" not in wanted or "client_name" not in wanted or "schema_name" not in wanted:
            raise RuntimeError(f"{platform_schema}.tenants is missing id, client_name or schema_name")
        result = self.conn.execute(
            text(
                f"SELECT {', '.join(quote_ident(c) for c in wanted)} FROM {quote_ident(platform_schema)}.tenants "
                "ORDER BY client_name"
            )
        )
        return [dict(row) for row in result.mappings()]

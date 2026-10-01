import re

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.pool import NullPool

_IDENT = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def to_sync_url(url: str) -> str:
    for prefix in ("postgresql+asyncpg://", "postgresql+psycopg://"):
        if url.startswith(prefix):
            return url.replace(prefix, "postgresql+psycopg2://", 1)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return url


def make_engine(url: str) -> Engine:
    return create_engine(to_sync_url(url), poolclass=NullPool)


def identity(url: str) -> tuple[str, int, str]:
    parsed = make_url(to_sync_url(url))
    return (parsed.host or "", parsed.port or 5432, parsed.database or "")


def database_name(url: str) -> str:
    return identity(url)[2]


def quote_ident(name: str) -> str:
    if not _IDENT.match(name or ""):
        raise ValueError(f"Unsafe identifier: {name!r}")
    return f'"{name}"'

from logging.config import fileConfig
import os

from dotenv import load_dotenv

load_dotenv()

from sqlalchemy import engine_from_config, pool

from alembic import context
from app.db.base import metadata
from app.models.load_all import load_all_models

load_all_models()

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = metadata


def get_migration_url() -> str:
    url = os.getenv("MIGRATION_DATABASE_URL")
    if not url:
        raise RuntimeError("MIGRATION_DATABASE_URL is not set. Migrations must run as the owner role, not the app role.")
    for prefix in ("postgresql+asyncpg://", "postgresql+psycopg://"):
        if url.startswith(prefix):
            url = url.replace(prefix, "postgresql://", 1)
    return url.replace("?ssl=", "?sslmode=").replace("&ssl=", "&sslmode=")


def run_migrations_offline() -> None:
    context.configure(
        url=get_migration_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    config_section = config.get_section(config.config_ini_section, {})
    config_section["sqlalchemy.url"] = get_migration_url()

    connectable = engine_from_config(config_section, prefix="sqlalchemy.", poolclass=pool.NullPool)

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

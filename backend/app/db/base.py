from sqlalchemy import Column, ForeignKey, Index, MetaData, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declared_attr, registry

SHARED_SCHEMA = "public"
TENANT_GUC = "app.tenant_id"
CURRENT_TENANT_SQL = f"NULLIF(current_setting('{TENANT_GUC}', true), '')::uuid"

metadata = MetaData(naming_convention={"ix": "ix_%(table_name)s_%(column_0_N_name)s"})
mapper_registry = registry(metadata=metadata)


class TenantScoped:
    """Adds tenant_id to every tenant table. Row-level security filters on it."""

    @declared_attr
    def tenant_id(cls):
        return Column(
            UUID(as_uuid=True),
            ForeignKey("tenants.id"),
            nullable=False,
            index=True,
            server_default=text(CURRENT_TENANT_SQL),
        )


BasePublic = mapper_registry.generate_base()
BaseOrg = mapper_registry.generate_base(cls=TenantScoped)

Base = BaseOrg


def scope_uniques_to_tenant(target: MetaData = metadata) -> None:
    """Make every unique constraint and unique index on a tenant table include tenant_id.

    A natural key such as users.username or fee_receipts.receipt_number is unique per school, not globally.
    Single-column primary-key uniques (id) stay global. Safe to call more than once.
    """
    for table in target.tables.values():
        if "tenant_id" not in table.c or table.info.get("tenant_scoped"):
            continue
        table.info["tenant_scoped"] = True
        pk_names = {c.name for c in table.primary_key.columns}

        for constraint in list(table.constraints):
            if not isinstance(constraint, UniqueConstraint):
                continue
            names = [c.name for c in constraint.columns]
            if "tenant_id" in names or set(names) <= pk_names:
                continue
            table.constraints.discard(constraint)
            table.append_constraint(UniqueConstraint("tenant_id", *names, name=constraint.name))

        for index in list(table.indexes):
            if not index.unique:
                continue
            names = [c.name for c in index.columns]
            if not names or "tenant_id" in names or set(names) <= pk_names:
                continue
            table.indexes.discard(index)
            Index(index.name, table.c.tenant_id, *[table.c[n] for n in names], unique=True)

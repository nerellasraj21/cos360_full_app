from dataclasses import dataclass

from sqlalchemy import Table

from app.db.base import BaseOrg, mapper_registry, metadata
from app.models.load_all import load_all_models

load_all_models()

SKIP_PLATFORM_TABLES = {"token_blacklist"}
SPECIAL_PLATFORM_TABLES = {"menus"}
SCHEMA_NAME_COLUMNS = {"stale_file_registry": "tenant_schema", "file_audit_log": "tenant_schema"}
STRING_TENANT_COLUMNS = {"report_audit": "tenant_id", "super_admin_audit": "tenant_id"}
MENU_REFERENCES = {"role_menu_permissions": "menu_id"}

_LOOSE_CANDIDATES = {
    "expense_transactions": [
        ("department_id", "expense_departments"),
        ("approved_by_user_id", "users"),
        ("created_by_user_id", "users"),
    ],
    "file_audit_log": [("actor_id", "users"), ("student_id", "students")],
    "exam_audit_log": [("exam_id", "exams"), ("student_id", "students"), ("subject_id", "subjects")],
    "exam_settings": [("exam_fee_type_id", "fee_types")],
    "exam_config_templates": [("source_exam_id", "exams"), ("source_class_id", "classes")],
    "generated_certificates": [("student_id", "students")],
}


@dataclass(frozen=True)
class TableSets:
    tenant: list[Table]
    platform: list[Table]


def classify() -> TableSets:
    tenant_names = {m.local_table.name for m in mapper_registry.mappers if issubclass(m.class_, BaseOrg)}
    ordered = list(metadata.sorted_tables)
    return TableSets(
        tenant=[t for t in ordered if t.name in tenant_names],
        platform=[t for t in ordered if t.name not in tenant_names],
    )


def foreign_key_columns() -> dict[str, list[tuple[str, str]]]:
    result: dict[str, list[tuple[str, str]]] = {}
    for table in metadata.tables.values():
        for fk in table.foreign_keys:
            if len(fk.constraint.columns) == 1 and fk.column.name == "id" and fk.parent.name != "tenant_id":
                result.setdefault(table.name, []).append((fk.parent.name, fk.column.table.name))
    return result


def loose_references() -> dict[str, list[tuple[str, str]]]:
    result: dict[str, list[tuple[str, str]]] = {}
    for table_name, refs in _LOOSE_CANDIDATES.items():
        table = metadata.tables.get(table_name)
        if table is None:
            continue
        for column, ref in refs:
            if column in table.c and ref in metadata.tables:
                result.setdefault(table_name, []).append((column, ref))
    return result

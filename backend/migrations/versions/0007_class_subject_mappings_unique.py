"""class subject mappings unique per class, section, subject and year

Revision ID: 0007
Revises: 0006
Create Date: 2026-10-02 10:05:00.000000

"""
from collections.abc import Sequence
from typing import Union

from alembic import op
import sqlalchemy as sa

revision: str = '0007'
down_revision: Union[str, None] = '0006'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEDUPE_SECTION = """
DELETE FROM class_subject_mappings m
USING (
    SELECT id, ROW_NUMBER() OVER (
        PARTITION BY class_id, section_id, subject_id, academic_year_id
        ORDER BY is_active DESC NULLS LAST, created_at, id
    ) AS rn
    FROM class_subject_mappings
    WHERE section_id IS NOT NULL
) d
WHERE m.id = d.id AND d.rn > 1
"""

DEDUPE_CLASS_WIDE = """
DELETE FROM class_subject_mappings m
USING (
    SELECT id, ROW_NUMBER() OVER (
        PARTITION BY class_id, subject_id, academic_year_id
        ORDER BY is_active DESC NULLS LAST, created_at, id
    ) AS rn
    FROM class_subject_mappings
    WHERE section_id IS NULL
) d
WHERE m.id = d.id AND d.rn > 1
"""


def upgrade() -> None:
    bind = op.get_bind()
    tenant_ids = [row[0] for row in bind.execute(sa.text("SELECT id FROM tenants")).fetchall()]
    for tenant_id in tenant_ids:
        bind.execute(sa.text("SELECT set_config('app.tenant_id', :tid, true)"), {"tid": str(tenant_id)})
        bind.execute(sa.text(DEDUPE_SECTION))
        bind.execute(sa.text(DEDUPE_CLASS_WIDE))
    bind.execute(sa.text("SELECT set_config('app.tenant_id', '', true)"))

    op.create_index(
        'uq_class_subject_mappings_section',
        'class_subject_mappings',
        ['tenant_id', 'class_id', 'section_id', 'subject_id', 'academic_year_id'],
        unique=True,
        postgresql_where=sa.text('section_id IS NOT NULL'),
    )
    op.create_index(
        'uq_class_subject_mappings_class_wide',
        'class_subject_mappings',
        ['tenant_id', 'class_id', 'subject_id', 'academic_year_id'],
        unique=True,
        postgresql_where=sa.text('section_id IS NULL'),
    )


def downgrade() -> None:
    op.drop_index('uq_class_subject_mappings_class_wide', table_name='class_subject_mappings')
    op.drop_index('uq_class_subject_mappings_section', table_name='class_subject_mappings')

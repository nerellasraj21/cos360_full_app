"""classes and subjects unique per academic year

Revision ID: 0006
Revises: 0005
Create Date: 2026-10-02 10:00:00.000000

"""
from collections.abc import Sequence
from typing import Union

from alembic import op

revision: str = '0006'
down_revision: Union[str, None] = '0005'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint('classes_tenant_id_name_key', 'classes', type_='unique')
    op.create_unique_constraint(
        'classes_tenant_id_academic_year_id_name_key', 'classes', ['tenant_id', 'academic_year_id', 'name']
    )
    op.drop_constraint('subjects_tenant_id_name_key', 'subjects', type_='unique')
    op.create_unique_constraint(
        'subjects_tenant_id_academic_year_id_name_key', 'subjects', ['tenant_id', 'academic_year_id', 'name']
    )


def downgrade() -> None:
    op.drop_constraint('subjects_tenant_id_academic_year_id_name_key', 'subjects', type_='unique')
    op.create_unique_constraint('subjects_tenant_id_name_key', 'subjects', ['tenant_id', 'name'])
    op.drop_constraint('classes_tenant_id_academic_year_id_name_key', 'classes', type_='unique')
    op.create_unique_constraint('classes_tenant_id_name_key', 'classes', ['tenant_id', 'name'])

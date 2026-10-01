"""sections unique per class

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-01 15:00:00.000000

"""
from collections.abc import Sequence
from typing import Union

from alembic import op

revision: str = '0005'
down_revision: Union[str, None] = '0004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint('sections_tenant_id_name_key', 'sections', type_='unique')
    op.create_unique_constraint('sections_tenant_id_class_id_name_key', 'sections', ['tenant_id', 'class_id', 'name'])


def downgrade() -> None:
    op.drop_constraint('sections_tenant_id_class_id_name_key', 'sections', type_='unique')
    op.create_unique_constraint('sections_tenant_id_name_key', 'sections', ['tenant_id', 'name'])

"""add_staff_work_experience_bank_pf_columns

Revision ID: d2e3f4a5b6c7
Revises: c1d2e3f4a5b6
Create Date: 2026-03-06 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d2e3f4a5b6c7"
down_revision: Union[str, None] = "c1d2e3f4a5b6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Work Experience columns
    op.add_column("staff", sa.Column("work_org", sa.String(255), nullable=True))
    op.add_column("staff", sa.Column("work_from_date", sa.Date(), nullable=True))
    op.add_column("staff", sa.Column("work_to_date", sa.Date(), nullable=True))
    op.add_column("staff", sa.Column("subjects_dealt", sa.Text(), nullable=True))
    op.add_column("staff", sa.Column("work_remarks", sa.Text(), nullable=True))

    # Bank Detail columns
    op.add_column("staff", sa.Column("bank_name", sa.String(200), nullable=True))
    op.add_column("staff", sa.Column("bank_branch", sa.String(200), nullable=True))
    op.add_column("staff", sa.Column("account_number", sa.String(50), nullable=True))
    op.add_column("staff", sa.Column("ifsc_code", sa.String(20), nullable=True))
    op.add_column("staff", sa.Column("account_holder_name", sa.String(200), nullable=True))
    op.add_column("staff", sa.Column("account_type", sa.String(20), nullable=True))

    # Salary & PF columns
    op.add_column("staff", sa.Column("last_drawn_salary", sa.Numeric(10, 2), nullable=True))
    op.add_column("staff", sa.Column("pf_account_number", sa.String(50), nullable=True))
    op.add_column("staff", sa.Column("uan_number", sa.String(20), nullable=True))


def downgrade() -> None:
    op.drop_column("staff", "uan_number")
    op.drop_column("staff", "pf_account_number")
    op.drop_column("staff", "last_drawn_salary")
    op.drop_column("staff", "account_type")
    op.drop_column("staff", "account_holder_name")
    op.drop_column("staff", "ifsc_code")
    op.drop_column("staff", "account_number")
    op.drop_column("staff", "bank_branch")
    op.drop_column("staff", "bank_name")
    op.drop_column("staff", "work_remarks")
    op.drop_column("staff", "subjects_dealt")
    op.drop_column("staff", "work_to_date")
    op.drop_column("staff", "work_from_date")
    op.drop_column("staff", "work_org")

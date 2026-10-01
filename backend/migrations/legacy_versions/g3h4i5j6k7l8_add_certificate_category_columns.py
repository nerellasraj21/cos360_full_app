"""add_certificate_category_columns

Add certificate_category enum column, issued_by_name, and issuer_signature_path
to student_certificates table.

Revision ID: g3h4i5j6k7l8
Revises: f2a3b4c5d6e7
Create Date: 2026-03-09 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "g3h4i5j6k7l8"
down_revision: Union[str, None] = "f2a3b4c5d6e7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create the enum type (idempotent via DO block)
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'certificate_category_enum') THEN
                CREATE TYPE certificate_category_enum AS ENUM ('received', 'issued');
            END IF;
        END $$;
    """)

    # 2. Add certificate_category column (nullable first for existing rows)
    op.add_column(
        "student_certificates",
        sa.Column(
            "certificate_category",
            sa.Enum("received", "issued", name="certificate_category_enum", create_type=False),
            nullable=True,
        ),
    )

    # 3. Backfill existing rows with default 'received'
    op.execute(
        "UPDATE student_certificates SET certificate_category = 'received' "
        "WHERE certificate_category IS NULL"
    )

    # 4. Set NOT NULL constraint
    op.alter_column("student_certificates", "certificate_category", nullable=False)

    # 5. Add issued_by_name column
    op.add_column(
        "student_certificates",
        sa.Column("issued_by_name", sa.String(150), nullable=True),
    )

    # 6. Add issuer_signature_path column
    op.add_column(
        "student_certificates",
        sa.Column("issuer_signature_path", sa.String(500), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("student_certificates", "issuer_signature_path")
    op.drop_column("student_certificates", "issued_by_name")
    op.drop_column("student_certificates", "certificate_category")
    op.execute("DROP TYPE IF EXISTS certificate_category_enum")

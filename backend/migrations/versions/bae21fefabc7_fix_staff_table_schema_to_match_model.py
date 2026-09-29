"""Fix staff table schema to match model

Revision ID: bae21fefabc7
Revises: ea91fcd9d2f8
Create Date: 2025-09-19 22:11:54.297787

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bae21fefabc7'
down_revision: Union[str, None] = 'ea91fcd9d2f8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema to match staff model."""
    from alembic import context
    conn = op.get_bind()

    # Helper function to check if column exists
    def column_exists(table_name, column_name):
        result = conn.execute(sa.text(f"""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = '{table_name}'
                AND column_name = '{column_name}'
            )
        """))
        return result.scalar()

    # Helper function to check if constraint exists
    def constraint_exists(constraint_name):
        result = conn.execute(sa.text(f"""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE constraint_name = '{constraint_name}'
            )
        """))
        return result.scalar()

    # Create GenderEnum type if it doesn't exist
    gender_enum = sa.Enum('Male', 'Female', 'Other', name='genderenum')
    gender_enum.create(conn, checkfirst=True)

    # Add missing columns to staff table (check first)
    if not column_exists('staff', 'gender'):
        op.add_column('staff', sa.Column('gender', gender_enum, nullable=True))

    if not column_exists('staff', 'date_of_birth'):
        op.add_column('staff', sa.Column('date_of_birth', sa.Date(), nullable=True))

    if not column_exists('staff', 'qualification'):
        op.add_column('staff', sa.Column('qualification', sa.String(100), nullable=True))

    if not column_exists('staff', 'experience_years'):
        op.add_column('staff', sa.Column('experience_years', sa.Integer(), nullable=True))

    if not column_exists('staff', 'address'):
        op.add_column('staff', sa.Column('address', sa.String(255), nullable=True))

    if not column_exists('staff', 'user_id'):
        op.add_column('staff', sa.Column('user_id', sa.UUID(), nullable=True))

    # Rename date_of_joining to joining_date if not already renamed
    if column_exists('staff', 'date_of_joining') and not column_exists('staff', 'joining_date'):
        op.alter_column('staff', 'date_of_joining', new_column_name='joining_date')

    # NOTE: Skipping FK and unique constraints due to zero-FK pattern in this system
    # The system was built without PK constraints, so FK constraints cannot be added
    # See migration f1a2b3c4d5e6 comment: "FKs intentionally omitted - zero-FK-constraint pattern"


def downgrade() -> None:
    """Downgrade schema."""

    # Remove unique constraint
    op.drop_constraint('uq_staff_user_id', 'staff', type_='unique')

    # Remove foreign key constraint
    op.drop_constraint('fk_staff_user_id', 'staff', type_='foreignkey')

    # Rename joining_date back to date_of_joining
    op.alter_column('staff', 'joining_date', new_column_name='date_of_joining')

    # Remove added columns
    op.drop_column('staff', 'user_id')
    op.drop_column('staff', 'address')
    op.drop_column('staff', 'experience_years')
    op.drop_column('staff', 'qualification')
    op.drop_column('staff', 'date_of_birth')
    op.drop_column('staff', 'gender')

    # Drop the enum type (only if no other tables use it)
    # op.execute('DROP TYPE IF EXISTS genderenum CASCADE')

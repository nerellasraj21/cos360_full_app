"""add_fee_student_mapping_tables

Revision ID: 099420ea82ee
Revises: e514fc4afbe6
Create Date: 2025-08-31 11:36:00.572137

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '099420ea82ee'
down_revision: Union[str, None] = 'e514fc4afbe6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create fee_student_mappings table
    op.create_table(
        'fee_student_mappings',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('student_admission_num', sa.String(50), nullable=False),
        sa.Column('class_id', sa.Integer(), nullable=False),
        sa.Column('section_id', sa.Integer(), nullable=False),
        sa.Column('fee_type_id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('total_fee', sa.Numeric(10, 2), nullable=False),
        sa.Column('academic_year_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.func.now(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['academic_year_id'], ['academic_years.id'], ),
        sa.ForeignKeyConstraint(['class_id'], ['classes.id'], ),
        sa.ForeignKeyConstraint(['fee_type_id'], ['fee_types.id'], ),
        # sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),  # Disabled - organizations table doesn't exist
        sa.ForeignKeyConstraint(['section_id'], ['sections.id'], ),
        sa.ForeignKeyConstraint(['student_admission_num'], ['student_admissions.admission_number'], ),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('student_id', 'fee_type_id', 'academic_year_id', name='uq_student_fee_type_academic_year')
    )
    op.create_index(op.f('ix_fee_student_mappings_id'), 'fee_student_mappings', ['id'], unique=False)
    
    # Create fee_student_map_term_amounts table
    op.create_table(
        'fee_student_map_term_amounts',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('fee_student_map_id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('term_amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('term_id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.func.now(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['fee_student_map_id'], ['fee_student_mappings.id'], ),
        # sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),  # Disabled - organizations table doesn't exist
        sa.ForeignKeyConstraint(['term_id'], ['fee_terms.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_fee_student_map_term_amounts_id'), 'fee_student_map_term_amounts', ['id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_fee_student_map_term_amounts_id'), table_name='fee_student_map_term_amounts')
    op.drop_table('fee_student_map_term_amounts')
    op.drop_index(op.f('ix_fee_student_mappings_id'), table_name='fee_student_mappings')
    op.drop_table('fee_student_mappings')

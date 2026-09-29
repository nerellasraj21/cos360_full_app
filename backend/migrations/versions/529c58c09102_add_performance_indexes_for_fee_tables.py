"""add_performance_indexes_for_fee_tables

Revision ID: 529c58c09102
Revises: 20f3383a045b
Create Date: 2025-09-01 13:05:33.049134

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '529c58c09102'
down_revision: Union[str, None] = '20f3383a045b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add performance indexes for fee tables."""
    
    # Index for fee_categories table - frequently queried by academic_year_id and status
    op.create_index('idx_fee_categories_academic_year', 'fee_categories', ['academic_year_id'])
    op.create_index('idx_fee_categories_status', 'fee_categories', ['category_status'])
    op.create_index('idx_fee_categories_name', 'fee_categories', ['category_name'])
    
    # Index for fee_types table - frequently queried by category and term
    op.create_index('idx_fee_types_category', 'fee_types', ['fee_category_id'])
    op.create_index('idx_fee_types_term', 'fee_types', ['fee_term_id'])
    op.create_index('idx_fee_types_academic_year', 'fee_types', ['academic_year_id'])
    op.create_index('idx_fee_types_status', 'fee_types', ['fee_status'])
    
    # Index for fee_terms table - frequently queried
    op.create_index('idx_fee_terms_academic_year', 'fee_terms', ['academic_year_id'])
    
    # Index for fee_class_mappings table - frequently queried by class and type
    op.create_index('idx_fee_class_mappings_type', 'fee_class_mappings', ['fee_type_id'])
    op.create_index('idx_fee_class_mappings_class', 'fee_class_mappings', ['class_id'])
    
    # Index for fee_student_mappings table - frequently queried by student and type
    op.create_index('idx_fee_student_mappings_student', 'fee_student_mappings', ['student_id'])
    op.create_index('idx_fee_student_mappings_type', 'fee_student_mappings', ['fee_type_id'])
    
    # Composite indexes for common query patterns
    op.create_index('idx_fee_categories_year_status', 'fee_categories', ['academic_year_id', 'category_status'])
    op.create_index('idx_fee_types_category_status', 'fee_types', ['fee_category_id', 'fee_status'])


def downgrade() -> None:
    """Remove performance indexes for fee tables."""
    
    # Drop composite indexes
    op.drop_index('idx_fee_types_category_status')
    op.drop_index('idx_fee_categories_year_status')
    
    # Drop single column indexes
    op.drop_index('idx_fee_student_mappings_type')
    op.drop_index('idx_fee_student_mappings_student')
    op.drop_index('idx_fee_class_mappings_class')
    op.drop_index('idx_fee_class_mappings_type')
    op.drop_index('idx_fee_terms_academic_year')
    op.drop_index('idx_fee_types_status')
    op.drop_index('idx_fee_types_academic_year')
    op.drop_index('idx_fee_types_term')
    op.drop_index('idx_fee_types_category')
    op.drop_index('idx_fee_categories_name')
    op.drop_index('idx_fee_categories_status')
    op.drop_index('idx_fee_categories_academic_year')

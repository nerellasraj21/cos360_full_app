"""add_strategic_indexes_for_masters_student_tables

Revision ID: 65290f247da7
Revises: 529c58c09102
Create Date: 2025-09-01 14:16:25.638593

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '65290f247da7'
down_revision: Union[str, None] = '529c58c09102'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add strategic indexes for masters and student tables."""
    
    # Index for sections table - frequently queried by class_id for dropdown operations
    op.create_index('idx_sections_class_id', 'sections', ['class_id'])
    
    # Index for classes table - frequently queried by is_active status for dropdowns
    op.create_index('idx_classes_is_active', 'classes', ['is_active'])
    
    # Index for academic_years table - frequently queried by is_active status for dropdowns
    op.create_index('idx_academic_years_is_active', 'academic_years', ['is_active'])
    
    # Index for students table - frequently queried by user_id
    op.create_index('idx_students_user_id', 'students', ['user_id'])
    
    # Index for student_admissions table - frequently queried by current_class_id and current_section_id
    op.create_index('idx_admissions_current_class', 'student_admissions', ['current_class_id'])
    op.create_index('idx_admissions_current_section', 'student_admissions', ['current_section_id'])
    
    # Composite index for common admission queries
    op.create_index('idx_admissions_class_section', 'student_admissions', ['current_class_id', 'current_section_id'])


def downgrade() -> None:
    """Remove strategic indexes for masters and student tables."""
    
    # Drop composite indexes
    op.drop_index('idx_admissions_class_section')
    
    # Drop single column indexes
    op.drop_index('idx_admissions_current_section')
    op.drop_index('idx_admissions_current_class')
    op.drop_index('idx_students_user_id')
    op.drop_index('idx_academic_years_is_active')
    op.drop_index('idx_classes_is_active')
    op.drop_index('idx_sections_class_id')

"""Add performance indexes for reports module

Revision ID: c4e0e9cbb892
Revises: 3e102ce07752
Create Date: 2025-09-22 23:26:17.964600

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4e0e9cbb892'
down_revision: Union[str, None] = '3e102ce07752'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add performance indexes for reports module
    # These indexes will be created in tenant schemas, not public schema
    
    # Note: These indexes need to be created in each tenant schema
    # The actual index creation will be handled by the application
    # when it connects to tenant schemas
    
    # Indexes to be created in tenant schemas:
    # - idx_students_academic_year_class ON students(academic_year_id, class_id) WHERE deleted_at IS NULL
    # - idx_students_admission_no ON students(admission_no, academic_year_id) WHERE deleted_at IS NULL
    # - idx_staff_academic_year_department ON staff(academic_year_id, department_id) WHERE deleted_at IS NULL
    # - idx_staff_employment_no ON staff(employment_no, academic_year_id) WHERE deleted_at IS NULL
    
    # For now, we'll create a placeholder that can be used by the application
    # to create these indexes in tenant schemas
    pass


def downgrade() -> None:
    """Downgrade schema."""
    # Drop performance indexes for reports module
    # These indexes will be dropped from tenant schemas, not public schema
    pass

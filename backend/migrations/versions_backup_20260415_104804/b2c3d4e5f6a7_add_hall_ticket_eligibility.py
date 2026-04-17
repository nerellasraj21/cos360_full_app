"""Add hall_ticket_eligibility table

Revision ID: b2c3d4e5f6a7
Revises: f1a2b3c4d5e6
Create Date: 2026-02-27 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('hall_ticket_eligibility',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  default=uuid.uuid4, nullable=False),
        sa.Column('exam_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('exams.id', ondelete='CASCADE'), nullable=False),
        sa.Column('student_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('class_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('section_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('attendance_percent', sa.Numeric(5, 2), nullable=True),
        sa.Column('attendance_ok', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('fee_paid', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('attendance_override', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('fee_override', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('ineligibility_reason', sa.String(20), nullable=True),
        sa.Column('is_eligible', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('hall_ticket_number', sa.String(30), nullable=True),
        sa.Column('computed_at', sa.TIMESTAMP, nullable=False, server_default=sa.func.now()),
        sa.Column('created_at', sa.TIMESTAMP, nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP, nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('exam_id', 'student_id', name='uq_hall_ticket_exam_student'),
    )
    op.create_index('ix_hall_ticket_eligibility_id', 'hall_ticket_eligibility', ['id'], unique=True)
    op.create_index('ix_hall_ticket_eligibility_exam_id', 'hall_ticket_eligibility', ['exam_id'])
    op.create_index('ix_hall_ticket_eligibility_student_id', 'hall_ticket_eligibility', ['student_id'])


def downgrade() -> None:
    op.drop_table('hall_ticket_eligibility')

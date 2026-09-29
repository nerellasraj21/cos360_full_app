"""Add exam module tables (Sprint 1-5)

Revision ID: f1a2b3c4d5e6
Revises: ea91fcd9d2f8
Create Date: 2026-02-25 00:00:00.000000

Creates 20 tables for the full exam module:
  Sprint 1  : exam_grade_schemes, exam_grade_bands, subject_grade_schemes,
              subject_grade_bands, remark_grade_sets, remark_grade_options,
              board_exam_patterns, board_pattern_exam_types, exam_settings,
              exam_streams
  Sprint 2  : exams, exam_class_sections, exam_subject_config,
              exam_subject_components
  Sprint 3  : exam_dates
  Sprint 4  : student_marks, exam_mark_entry_permissions, exam_audit_log
  Sprint 5  : student_exam_results, student_subject_results

NOTE: FKs to pre-existing tables (academic_years, users, classes, sections,
subjects, students) are intentionally omitted — the DB was built without PKs
on those tables, matching the existing zero-FK-constraint pattern across all
tenant schemas.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid


# revision identifiers
revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, tuple, None] = 'ea91fcd9d2f8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:

    # ── Sprint 1: Exam grade schemes ──────────────────────────────────────────

    op.create_table('exam_grade_schemes',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  default=uuid.uuid4, nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('is_default', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('created_at', sa.TIMESTAMP, nullable=False,
                  server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP, nullable=False,
                  server_default=sa.func.now()),
    )
    op.create_index('ix_exam_grade_schemes_id', 'exam_grade_schemes', ['id'])

    op.create_table('exam_grade_bands',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  default=uuid.uuid4, nullable=False),
        sa.Column('scheme_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('exam_grade_schemes.id', ondelete='CASCADE'),
                  nullable=False),
        sa.Column('from_percent', sa.Numeric(5, 2), nullable=False),
        sa.Column('to_percent', sa.Numeric(5, 2), nullable=False),
        sa.Column('from_marks', sa.Numeric(8, 2), nullable=True),
        sa.Column('to_marks', sa.Numeric(8, 2), nullable=True),
        sa.Column('grade_label', sa.String(10), nullable=False),
        sa.Column('gpa', sa.Numeric(4, 2), nullable=False, server_default='0.00'),
        sa.Column('remarks', sa.String(100), nullable=True),
        sa.Column('is_pass', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('sort_order', sa.SmallInteger, nullable=False, server_default='0'),
    )
    op.create_index('ix_exam_grade_bands_id', 'exam_grade_bands', ['id'])
    op.create_index('ix_exam_grade_bands_scheme_id', 'exam_grade_bands', ['scheme_id'])

    # ── Sprint 1: Subject grade schemes ───────────────────────────────────────

    op.create_table('subject_grade_schemes',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  default=uuid.uuid4, nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('is_default', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('created_at', sa.TIMESTAMP, nullable=False,
                  server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP, nullable=False,
                  server_default=sa.func.now()),
    )
    op.create_index('ix_subject_grade_schemes_id', 'subject_grade_schemes', ['id'])

    op.create_table('subject_grade_bands',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  default=uuid.uuid4, nullable=False),
        sa.Column('scheme_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('subject_grade_schemes.id', ondelete='CASCADE'),
                  nullable=False),
        sa.Column('from_percent', sa.Numeric(5, 2), nullable=False),
        sa.Column('to_percent', sa.Numeric(5, 2), nullable=False),
        sa.Column('from_marks', sa.Numeric(8, 2), nullable=True),
        sa.Column('to_marks', sa.Numeric(8, 2), nullable=True),
        sa.Column('grade_label', sa.String(10), nullable=False),
        sa.Column('gpa', sa.Numeric(4, 2), nullable=False, server_default='0.00'),
        sa.Column('remarks', sa.String(100), nullable=True),
        sa.Column('is_pass', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('sort_order', sa.SmallInteger, nullable=False, server_default='0'),
    )
    op.create_index('ix_subject_grade_bands_id', 'subject_grade_bands', ['id'])
    op.create_index('ix_subject_grade_bands_scheme_id', 'subject_grade_bands', ['scheme_id'])

    # ── Sprint 1: Remark grades ────────────────────────────────────────────────

    op.create_table('remark_grade_sets',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  default=uuid.uuid4, nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP, nullable=False,
                  server_default=sa.func.now()),
    )
    op.create_index('ix_remark_grade_sets_id', 'remark_grade_sets', ['id'])

    op.create_table('remark_grade_options',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  default=uuid.uuid4, nullable=False),
        sa.Column('set_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('remark_grade_sets.id', ondelete='CASCADE'),
                  nullable=False),
        sa.Column('grade_letter', sa.String(5), nullable=False),
        sa.Column('label', sa.String(50), nullable=False),
        sa.Column('sort_order', sa.SmallInteger, nullable=False, server_default='0'),
    )
    op.create_index('ix_remark_grade_options_id', 'remark_grade_options', ['id'])
    op.create_index('ix_remark_grade_options_set_id', 'remark_grade_options', ['set_id'])

    # ── Sprint 1: Board patterns ───────────────────────────────────────────────

    op.create_table('board_exam_patterns',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  default=uuid.uuid4, nullable=False),
        sa.Column('board', sa.String(50), nullable=False),
        sa.Column('custom_board_name', sa.String(100), nullable=True),
        sa.Column('level', sa.String(30), nullable=False),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('created_at', sa.TIMESTAMP, nullable=False,
                  server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP, nullable=False,
                  server_default=sa.func.now()),
        sa.UniqueConstraint('board', 'level', name='uq_board_pattern_board_level'),
    )
    op.create_index('ix_board_exam_patterns_id', 'board_exam_patterns', ['id'])

    op.create_table('board_pattern_exam_types',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  default=uuid.uuid4, nullable=False),
        sa.Column('pattern_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('board_exam_patterns.id', ondelete='CASCADE'),
                  nullable=False),
        sa.Column('exam_type_name', sa.String(50), nullable=False),
        sa.Column('nature', sa.String(20), nullable=False),
        sa.Column('weightage_percent', sa.Numeric(5, 2), nullable=True),
        sa.Column('count_per_year', sa.SmallInteger, nullable=True),
        sa.Column('sort_order', sa.SmallInteger, nullable=False, server_default='0'),
        sa.Column('created_at', sa.TIMESTAMP, nullable=False,
                  server_default=sa.func.now()),
    )
    op.create_index('ix_board_pattern_exam_types_id', 'board_pattern_exam_types', ['id'])
    op.create_index('ix_board_pattern_exam_types_pattern_id', 'board_pattern_exam_types', ['pattern_id'])

    # ── Sprint 1: Exam settings ────────────────────────────────────────────────

    op.create_table('exam_settings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  default=uuid.uuid4, nullable=False),
        sa.Column('default_board', sa.String(50), nullable=True),
        sa.Column('custom_board_name', sa.String(100), nullable=True),
        sa.Column('hall_ticket_min_attendance', sa.Numeric(5, 2), nullable=True,
                  server_default='75.00'),
        sa.Column('exam_fee_type_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('grace_max_per_subject', sa.SmallInteger, nullable=True),
        sa.Column('grace_max_subjects', sa.SmallInteger, nullable=True),
        sa.Column('grace_auto_apply', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('reconduct_max_failed_subjects', sa.SmallInteger, nullable=False,
                  server_default='2'),
        sa.Column('created_at', sa.TIMESTAMP, nullable=False,
                  server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP, nullable=False,
                  server_default=sa.func.now()),
    )
    op.create_index('ix_exam_settings_id', 'exam_settings', ['id'])

    # ── Sprint 1: Exam streams ─────────────────────────────────────────────────

    op.create_table('exam_streams',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  default=uuid.uuid4, nullable=False),
        sa.Column('stream_name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=True,
                  server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=True),
    )
    op.create_index('ix_exam_streams_id', 'exam_streams', ['id'])

    # ── Sprint 2: Exams ────────────────────────────────────────────────────────
    # academic_year_id and created_by are plain UUID — no FK (pre-existing tables
    # have no PK constraints, matching the DB-wide zero-FK pattern)

    op.create_table('exams',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  default=uuid.uuid4, nullable=False),
        sa.Column('exam_name', sa.String(150), nullable=False),
        sa.Column('board', sa.String(50), nullable=False),
        sa.Column('custom_board_name', sa.String(100), nullable=True),
        sa.Column('level', sa.String(30), nullable=False),
        sa.Column('exam_type', sa.String(50), nullable=False),
        sa.Column('nature', sa.String(20), nullable=False, server_default='formative'),
        sa.Column('is_internal', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('weightage_percent', sa.Numeric(5, 2), nullable=True),
        sa.Column('academic_year_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('exam_grade_scheme_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('exam_grade_schemes.id'), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='draft'),
        sa.Column('mark_entry_deadline', sa.Date, nullable=True),
        sa.Column('publish_rank', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('hall_ticket_published', sa.Boolean, nullable=False,
                  server_default='false'),
        sa.Column('hall_ticket_published_at', sa.TIMESTAMP, nullable=True),
        sa.Column('hall_ticket_min_attendance', sa.Numeric(5, 2), nullable=True),
        sa.Column('attendance_from_date', sa.Date, nullable=True),
        sa.Column('attendance_to_date', sa.Date, nullable=True),
        sa.Column('attendance_mode', sa.String(20), nullable=True),
        sa.Column('cloned_from_exam_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('term', sa.String(20), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP, nullable=False,
                  server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP, nullable=False,
                  server_default=sa.func.now()),
        sa.UniqueConstraint('exam_name', 'academic_year_id',
                            name='uq_exam_name_academic_year'),
    )
    op.create_index('ix_exams_id', 'exams', ['id'], unique=True)
    op.create_index('ix_exams_academic_year_id', 'exams', ['academic_year_id'])

    # ── Sprint 2: Exam class sections ──────────────────────────────────────────
    # class_id, section_id: plain UUID (no FK to pre-existing tables)

    op.create_table('exam_class_sections',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  default=uuid.uuid4, nullable=False),
        sa.Column('exam_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('exams.id', ondelete='CASCADE'), nullable=False),
        sa.Column('class_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('section_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('stream_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP, nullable=False,
                  server_default=sa.func.now()),
        sa.UniqueConstraint('exam_id', 'class_id', 'section_id',
                            name='uq_exam_class_section'),
    )
    op.create_index('ix_exam_class_sections_id', 'exam_class_sections', ['id'], unique=True)
    op.create_index('ix_exam_class_sections_exam_id', 'exam_class_sections', ['exam_id'])

    # ── Sprint 2: Exam subject config ──────────────────────────────────────────
    # class_id, section_id, subject_id: plain UUID (no FK to pre-existing tables)

    op.create_table('exam_subject_config',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  default=uuid.uuid4, nullable=False),
        sa.Column('exam_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('exams.id', ondelete='CASCADE'), nullable=False),
        sa.Column('class_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('section_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('subject_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('subject_grade_scheme_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('subject_grade_schemes.id'), nullable=True),
        sa.Column('credit_hours', sa.SmallInteger, nullable=True),
        sa.Column('has_internal_external_split', sa.Boolean, nullable=False,
                  server_default='false'),
        sa.Column('internal_max_marks', sa.Numeric(8, 2), nullable=True),
        sa.Column('internal_min_pass', sa.Numeric(8, 2), nullable=True),
        sa.Column('external_max_marks', sa.Numeric(8, 2), nullable=True),
        sa.Column('external_min_pass', sa.Numeric(8, 2), nullable=True),
        sa.Column('sort_order', sa.SmallInteger, nullable=True),
        sa.Column('created_at', sa.TIMESTAMP, nullable=False,
                  server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP, nullable=False,
                  server_default=sa.func.now()),
        sa.UniqueConstraint('exam_id', 'class_id', 'section_id', 'subject_id',
                            name='uq_exam_subject_config'),
    )
    op.create_index('ix_exam_subject_config_id', 'exam_subject_config', ['id'], unique=True)
    op.create_index('ix_exam_subject_config_exam_id', 'exam_subject_config', ['exam_id'])

    # ── Sprint 2: Exam subject components ─────────────────────────────────────

    op.create_table('exam_subject_components',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  default=uuid.uuid4, nullable=False),
        sa.Column('subject_config_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('exam_subject_config.id', ondelete='CASCADE'),
                  nullable=False),
        sa.Column('component_name', sa.String(100), nullable=False),
        sa.Column('entry_type', sa.String(10), nullable=False, server_default='marks'),
        sa.Column('max_marks', sa.Numeric(8, 2), nullable=True),
        sa.Column('min_pass_marks', sa.Numeric(8, 2), nullable=True),
        sa.Column('include_in_total', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('is_internal', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('remark_grade_set_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('remark_grade_sets.id'), nullable=True),
        sa.Column('sort_order', sa.SmallInteger, nullable=False, server_default='0'),
    )
    op.create_index('ix_exam_subject_components_id', 'exam_subject_components', ['id'], unique=True)
    op.create_index('ix_exam_subject_components_config_id', 'exam_subject_components', ['subject_config_id'])

    # ── Sprint 3: Exam dates ───────────────────────────────────────────────────
    # class_id, section_id, subject_id, created_by, updated_by: plain UUID

    op.create_table('exam_dates',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  default=uuid.uuid4, nullable=False),
        sa.Column('exam_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('exams.id', ondelete='CASCADE'), nullable=False),
        sa.Column('class_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('section_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('subject_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('exam_date', sa.Date, nullable=False),
        sa.Column('start_time', sa.Time, nullable=True),
        sa.Column('end_time', sa.Time, nullable=True),
        sa.Column('venue', sa.String(100), nullable=True),
        sa.Column('notes', sa.String(300), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('updated_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP, nullable=False,
                  server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP, nullable=False,
                  server_default=sa.func.now()),
        sa.UniqueConstraint('exam_id', 'class_id', 'section_id', 'subject_id',
                            name='uq_exam_date_subject'),
    )
    op.create_index('ix_exam_dates_id', 'exam_dates', ['id'], unique=True)
    op.create_index('ix_exam_dates_exam_id', 'exam_dates', ['exam_id'])

    # ── Sprint 4: Student marks ────────────────────────────────────────────────
    # student_id, entered_by, updated_by: plain UUID

    op.create_table('student_marks',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  default=uuid.uuid4, nullable=False),
        sa.Column('exam_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('exams.id'), nullable=False),
        sa.Column('student_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('subject_config_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('exam_subject_config.id'), nullable=False),
        sa.Column('component_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('exam_subject_components.id'), nullable=False),
        sa.Column('marks_obtained', sa.Numeric(8, 2), nullable=True),
        sa.Column('remark_grade', sa.String(5), nullable=True),
        sa.Column('is_absent', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('grace_marks_added', sa.Numeric(8, 2), nullable=True),
        sa.Column('attempt_number', sa.SmallInteger, nullable=False, server_default='1'),
        sa.Column('entry_source', sa.String(10), nullable=False, server_default='manual'),
        sa.Column('entered_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('entered_at', sa.TIMESTAMP, nullable=False,
                  server_default=sa.func.now()),
        sa.Column('updated_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('updated_at', sa.TIMESTAMP, nullable=True),
        sa.UniqueConstraint('exam_id', 'student_id', 'component_id', 'attempt_number',
                            name='uq_student_mark_attempt'),
    )
    op.create_index('ix_student_marks_id', 'student_marks', ['id'], unique=True)
    op.create_index('ix_student_marks_exam_id', 'student_marks', ['exam_id'])
    op.create_index('ix_student_marks_student_id', 'student_marks', ['student_id'])

    # ── Sprint 4: Mark entry permissions ──────────────────────────────────────
    # user_id, granted_by: plain UUID

    op.create_table('exam_mark_entry_permissions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  default=uuid.uuid4, nullable=False),
        sa.Column('exam_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('exams.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('granted_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('scope_note', sa.String(200), nullable=True),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('created_at', sa.TIMESTAMP, nullable=False,
                  server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP, nullable=False,
                  server_default=sa.func.now()),
    )
    op.create_index('ix_exam_mark_entry_permissions_id', 'exam_mark_entry_permissions', ['id'], unique=True)
    op.create_index('ix_exam_mark_entry_permissions_exam_id', 'exam_mark_entry_permissions', ['exam_id'])
    op.create_index('ix_exam_mark_entry_permissions_user_id', 'exam_mark_entry_permissions', ['user_id'])

    # ── Sprint 4: Audit log ────────────────────────────────────────────────────
    # exam_id intentionally no FK (survives exam deletion)
    # performed_by: plain UUID

    op.create_table('exam_audit_log',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  default=uuid.uuid4, nullable=False),
        sa.Column('exam_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('student_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('subject_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('component_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('action', sa.String(50), nullable=False),
        sa.Column('old_value', sa.String(50), nullable=True),
        sa.Column('new_value', sa.String(50), nullable=True),
        sa.Column('entry_source', sa.String(10), nullable=True),
        sa.Column('reason', sa.String(300), nullable=True),
        sa.Column('performed_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('performed_at', sa.TIMESTAMP, nullable=False,
                  server_default=sa.func.now()),
        sa.Column('metadata', postgresql.JSONB, nullable=True),
    )
    op.create_index('ix_exam_audit_log_id', 'exam_audit_log', ['id'], unique=True)
    op.create_index('ix_exam_audit_log_exam_id', 'exam_audit_log', ['exam_id'])

    # ── Sprint 5: Student results ──────────────────────────────────────────────
    # student_id: plain UUID

    op.create_table('student_exam_results',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  default=uuid.uuid4, nullable=False),
        sa.Column('exam_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('exams.id'), nullable=False),
        sa.Column('student_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('total_marks_obtained', sa.Numeric(8, 2), nullable=True),
        sa.Column('total_max_marks', sa.Numeric(8, 2), nullable=True),
        sa.Column('percentage', sa.Numeric(5, 2), nullable=True),
        sa.Column('grade_label', sa.String(10), nullable=True),
        sa.Column('gpa', sa.Numeric(4, 2), nullable=True),
        sa.Column('rank', sa.Integer, nullable=True),
        sa.Column('attempt_number', sa.Integer, nullable=False, server_default='1'),
        sa.Column('is_passed', sa.Boolean, nullable=True),
        sa.Column('computed_at', sa.TIMESTAMP(timezone=True), nullable=True,
                  server_default=sa.func.now()),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=True,
                  server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=True),
    )
    op.create_index('ix_student_exam_results_id', 'student_exam_results', ['id'])
    op.create_index('ix_student_exam_results_exam_id', 'student_exam_results', ['exam_id'])
    op.create_index('ix_student_exam_results_student_id', 'student_exam_results', ['student_id'])

    op.create_table('student_subject_results',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  default=uuid.uuid4, nullable=False),
        sa.Column('exam_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('exams.id'), nullable=False),
        sa.Column('student_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('subject_config_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('exam_subject_config.id'), nullable=False),
        sa.Column('marks_obtained', sa.Numeric(8, 2), nullable=True),
        sa.Column('max_marks', sa.Numeric(8, 2), nullable=True),
        sa.Column('percentage', sa.Numeric(5, 2), nullable=True),
        sa.Column('grade_label', sa.String(10), nullable=True),
        sa.Column('gpa', sa.Numeric(4, 2), nullable=True),
        sa.Column('remark_grade', sa.String(50), nullable=True),
        sa.Column('is_absent', sa.Boolean, nullable=True, server_default='false'),
        sa.Column('is_passed', sa.Boolean, nullable=True),
        sa.Column('attempt_number', sa.Integer, nullable=False, server_default='1'),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=True,
                  server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=True),
    )
    op.create_index('ix_student_subject_results_id', 'student_subject_results', ['id'])
    op.create_index('ix_student_subject_results_exam_id', 'student_subject_results', ['exam_id'])
    op.create_index('ix_student_subject_results_student_id', 'student_subject_results', ['student_id'])


def downgrade() -> None:
    op.drop_table('student_subject_results')
    op.drop_table('student_exam_results')
    op.drop_table('exam_audit_log')
    op.drop_table('exam_mark_entry_permissions')
    op.drop_table('student_marks')
    op.drop_table('exam_dates')
    op.drop_table('exam_subject_components')
    op.drop_table('exam_subject_config')
    op.drop_table('exam_class_sections')
    op.drop_table('exams')
    op.drop_table('exam_streams')
    op.drop_table('exam_settings')
    op.drop_table('board_pattern_exam_types')
    op.drop_table('board_exam_patterns')
    op.drop_table('remark_grade_options')
    op.drop_table('remark_grade_sets')
    op.drop_table('subject_grade_bands')
    op.drop_table('subject_grade_schemes')
    op.drop_table('exam_grade_bands')
    op.drop_table('exam_grade_schemes')

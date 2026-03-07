import uuid

from sqlalchemy import TIMESTAMP, Boolean, Column, ForeignKey, Numeric, SmallInteger, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import BaseOrg


class BoardExamPattern(BaseOrg):
    __tablename__ = "board_exam_patterns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    board = Column(String(50), nullable=False)
    custom_board_name = Column(String(100), nullable=True)
    level = Column(String(30), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())

    __table_args__ = (UniqueConstraint("board", "level", name="uq_board_pattern_board_level"),)

    exam_types = relationship("BoardPatternExamType", back_populates="pattern", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<BoardExamPattern(board='{self.board}', level='{self.level}')>"


class BoardPatternExamType(BaseOrg):
    __tablename__ = "board_pattern_exam_types"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    pattern_id = Column(
        UUID(as_uuid=True), ForeignKey("board_exam_patterns.id", ondelete="CASCADE"), nullable=False, index=True
    )
    exam_type_name = Column(String(50), nullable=False)
    nature = Column(String(20), nullable=False)
    weightage_percent = Column(Numeric(5, 2), nullable=True)
    count_per_year = Column(SmallInteger, nullable=True)
    sort_order = Column(SmallInteger, nullable=False, default=0)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())

    pattern = relationship("BoardExamPattern", back_populates="exam_types")

    def __repr__(self):
        return f"<BoardPatternExamType(name='{self.exam_type_name}', " f"nature='{self.nature}')>"

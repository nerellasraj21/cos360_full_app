from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.exam.enums import ExamBoard, ExamLevel, ExamNature


class BoardPatternExamTypeCreate(BaseModel):
    exam_type_name: str = Field(..., max_length=50)
    nature: ExamNature
    weightage_percent: Decimal | None = None
    count_per_year: int | None = None
    sort_order: int = 0


class BoardPatternExamTypeRead(BoardPatternExamTypeCreate):
    model_config = {"from_attributes": True}
    id: UUID
    pattern_id: UUID


class BoardPatternCreate(BaseModel):
    board: ExamBoard
    custom_board_name: str | None = Field(None, max_length=100)
    level: ExamLevel
    is_active: bool = True
    exam_types: list[BoardPatternExamTypeCreate] = Field(default_factory=list)


class BoardPatternRead(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    board: ExamBoard
    custom_board_name: str | None = None
    level: ExamLevel
    is_active: bool
    exam_types: list[BoardPatternExamTypeRead] = []


class BoardPatternUpdate(BaseModel):
    board: ExamBoard | None = None
    custom_board_name: str | None = Field(None, max_length=100)
    level: ExamLevel | None = None
    is_active: bool | None = None
    exam_types: list[BoardPatternExamTypeCreate] | None = None

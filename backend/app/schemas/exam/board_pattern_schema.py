from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from decimal import Decimal
from app.schemas.exam.enums import ExamNature, ExamLevel, ExamBoard


class BoardPatternExamTypeCreate(BaseModel):
    exam_type_name: str = Field(..., max_length=50)
    nature: ExamNature
    weightage_percent: Optional[Decimal] = None
    count_per_year: Optional[int] = None
    sort_order: int = 0


class BoardPatternExamTypeRead(BoardPatternExamTypeCreate):
    model_config = {"from_attributes": True}
    id: UUID
    pattern_id: UUID


class BoardPatternCreate(BaseModel):
    board: ExamBoard
    custom_board_name: Optional[str] = Field(None, max_length=100)
    level: ExamLevel
    is_active: bool = True
    exam_types: List[BoardPatternExamTypeCreate] = Field(default_factory=list)


class BoardPatternRead(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    board: ExamBoard
    custom_board_name: Optional[str] = None
    level: ExamLevel
    is_active: bool
    exam_types: List[BoardPatternExamTypeRead] = []


class BoardPatternUpdate(BaseModel):
    board: Optional[ExamBoard] = None
    custom_board_name: Optional[str] = Field(None, max_length=100)
    level: Optional[ExamLevel] = None
    is_active: Optional[bool] = None

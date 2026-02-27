from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID


class RemarkGradeOptionCreate(BaseModel):
    grade_letter: str = Field(..., max_length=5)
    label: str = Field(..., max_length=50)
    sort_order: int = 0


class RemarkGradeOptionRead(RemarkGradeOptionCreate):
    model_config = {"from_attributes": True}
    id: UUID
    set_id: UUID


class RemarkGradeSetCreate(BaseModel):
    name: str = Field(..., max_length=100)
    options: List[RemarkGradeOptionCreate] = Field(default_factory=list)


class RemarkGradeSetRead(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    name: str
    options: List[RemarkGradeOptionRead] = []


class RemarkGradeSetUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)

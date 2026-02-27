from pydantic import BaseModel, Field, model_validator
from typing import Optional, List
from uuid import UUID
from decimal import Decimal


class GradeBandBase(BaseModel):
    from_percent: Decimal = Field(..., ge=0, le=100)
    to_percent: Decimal = Field(..., ge=0, le=100)
    from_marks: Optional[Decimal] = None
    to_marks: Optional[Decimal] = None
    grade_label: str = Field(..., max_length=10)
    gpa: Decimal = Field(default=Decimal("0.00"), ge=0)
    remarks: Optional[str] = Field(None, max_length=100)
    is_pass: bool = True
    sort_order: int = 0

    @model_validator(mode='after')
    def validate_percent_range(self):
        if self.from_percent > self.to_percent:
            raise ValueError("from_percent must be <= to_percent")
        return self


class GradeBandCreate(GradeBandBase):
    pass


class GradeBandRead(GradeBandBase):
    model_config = {"from_attributes": True}
    id: UUID
    scheme_id: UUID


class ExamGradeSchemeBase(BaseModel):
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    is_default: bool = False


class ExamGradeSchemeCreate(ExamGradeSchemeBase):
    bands: List[GradeBandCreate] = Field(default_factory=list)


class ExamGradeSchemeUpdate(ExamGradeSchemeBase):
    pass


class ExamGradeSchemeRead(ExamGradeSchemeBase):
    model_config = {"from_attributes": True}
    id: UUID
    bands: List[GradeBandRead] = []


# SubjectGradeScheme uses identical structure — just different table FK
class SubjectGradeBandCreate(GradeBandBase):
    pass


class SubjectGradeBandRead(GradeBandBase):
    model_config = {"from_attributes": True}
    id: UUID
    scheme_id: UUID


class SubjectGradeSchemeCreate(ExamGradeSchemeCreate):
    pass


class SubjectGradeSchemeUpdate(ExamGradeSchemeBase):
    pass


class SubjectGradeSchemeRead(ExamGradeSchemeRead):
    pass

from pydantic import BaseModel, Field, model_validator
from typing import List, Optional
from datetime import time


# ----------------------------
# Subject Option Schema
# ----------------------------

class TimetableSubjectOptionCreate(BaseModel):
    subject_id: int

class TimetableSubjectOptionUpdate(BaseModel):
    subject_ids: Optional[List[int]] = Field(None, description="Updated list of subject IDs")

    class Config:
        from_attributes = True


class TimetableSubjectOptionOut(BaseModel):
    id: int
    subject_id: Optional[int]

    class Config:
        from_attributes = True


# ----------------------------
# Timetable Slot Schemas
# ----------------------------

class TimetableSlotBase(BaseModel):
    day: str = Field(..., description="Day of the week (e.g., Monday)")
    start_time: time
    end_time: time
    is_break: bool = False
    break_label: Optional[str] = Field(None, description="e.g., LUNCH")


class TimetableSlotCreate(TimetableSlotBase):
    section_id: int
    subject_options: Optional[List[TimetableSubjectOptionCreate]] = []

    @model_validator(mode="after")
    def validate_fields(cls, values):
        if values.is_break:
            if not values.break_label:
                raise ValueError("`break_label` is required when `is_break` is True.")
            if values.subject_options:
                raise ValueError("`subject_options` must not be provided when `is_break` is True.")
        else:
            if values.break_label:
                raise ValueError("`break_label` must not be provided when `is_break` is False.")
            if not values.subject_options or len(values.subject_options) == 0:
                raise ValueError("`subject_options` must be provided when `is_break` is False.")
        return values
    
class TimetableSlotUpdate(BaseModel):
    pass


class TimetableSlotPartialUpdate(BaseModel):
    day: Optional[str] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    is_break: Optional[bool] = None
    break_label: Optional[str] = Field(None, description="e.g., LUNCH")
    section_id: Optional[int] = None
    subject_options: Optional[List[TimetableSubjectOptionCreate]] = []

    @model_validator(mode="after")
    def validate_fields(cls, values):
        if values.is_break:
            if not values.break_label:
                raise ValueError("`break_label` is required when `is_break` is True.")
            if values.subject_options:
                raise ValueError("`subject_options` must not be provided when `is_break` is True.")
        else:
            if values.break_label:
                raise ValueError("`break_label` must not be provided when `is_break` is False.")
            if not values.subject_options or len(values.subject_options) == 0:
                raise ValueError("`subject_options` must be provided when `is_break` is False.")
        return values
    
    model_config = {"from_attributes": True}


class TimetableSlotOut(TimetableSlotBase):
    id: int
    section_id: int
    subject_options: List[TimetableSubjectOptionOut]

    class Config:
        from_attributes = True


# ----------------------------
# Bulk Output for a Section's Timetable
# ----------------------------

class SectionTimetableOut(BaseModel):
    section_id: int
    slots: List[TimetableSlotOut]


SectionTimetableOut.model_rebuild()

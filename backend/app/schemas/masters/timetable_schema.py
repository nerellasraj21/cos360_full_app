from pydantic import BaseModel, Field, model_validator
from typing import List, Optional
from datetime import time
from uuid import UUID


# ----------------------------
# Subject Option Schema
# ----------------------------

class TimetableSubjectOptionCreate(BaseModel):
    subject_id: UUID

class TimetableSubjectOptionUpdate(BaseModel):
    subject_ids: Optional[List[UUID]] = Field(None, description="Updated list of subject IDs")

    class Config:
        from_attributes = True


class TimetableSubjectOptionOut(BaseModel):
    id: UUID
    subject_id: Optional[UUID]

    class Config:
        from_attributes = True


# ----------------------------
# Timetable Slot Schemas
# ----------------------------

class TimetableSlotBase(BaseModel):
    day: str = Field(..., description="Day of the week (e.g., Monday)")
    is_break: bool = False
    break_label: Optional[str] = Field(None, description="e.g., LUNCH")


class TimetableSlotCreate(TimetableSlotBase):
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
    
class TimetableSlotCreateGrouped(BaseModel):
    slot_time_id: UUID
    slots: List[TimetableSlotCreate]

    
class FullTimetableCreate(BaseModel):
    section_id: UUID
    slot_time_data: List[TimetableSlotCreateGrouped]
    
class TimetableSlotUpdate(BaseModel):
    pass


class TimetableSlotPartialUpdate(BaseModel):
    day: Optional[str] = None
    is_break: Optional[bool] = None
    break_label: Optional[str] = Field(None, description="e.g., LUNCH")
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
    id: UUID
    subject_options: List[TimetableSubjectOptionOut]

    class Config:
        from_attributes = True

class SlotTimeCreate(BaseModel):
    section_id: UUID
    label: str = Field(..., description="Label like 'Period 1', 'Lunch'")
    start_time: time
    end_time: time

class SlotTimeUpdate(SlotTimeCreate):
    pass

class SlotTimePartialUpdate(BaseModel):
    section_id: Optional[int] = None
    label: Optional[str] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None

class SlotTimeOut(SlotTimeCreate):
    id: UUID

    class Config:
        from_attributes = True

class GroupedSlotOut(BaseModel):
    slot_time_id: UUID
    slots: List[TimetableSlotOut]

class GroupedSectionTimetableOut(BaseModel):
    section_id: UUID
    slot_time_data: List[GroupedSlotOut]



# ----------------------------
# Bulk Output for a Section's Timetable
# ----------------------------

class SectionTimetableOut(BaseModel):
    section_id: UUID
    slots: List[TimetableSlotOut]


SectionTimetableOut.model_rebuild()

class TimetableSlotBulkUpdateItem(BaseModel):
    id: UUID  # Required to identify which slot to update
    day: Optional[str] = None
    is_break: Optional[bool] = None
    break_label: Optional[str] = None
    subject_options: Optional[List[TimetableSubjectOptionCreate]] = None

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

class TimetableSlotBulkUpdateRequest(BaseModel):
    slots: List[TimetableSlotBulkUpdateItem]

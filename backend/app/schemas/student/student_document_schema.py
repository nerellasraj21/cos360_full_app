from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID

class StudentDocumentBase(BaseModel):
    document_type: str = Field(..., max_length=100)
    file_path: str = Field(...)

class StudentDocumentCreate(StudentDocumentBase):
    student_id: UUID

class StudentDocumentUpdate(BaseModel):
    document_type: Optional[str] = Field(None, max_length=100)
    file_path: Optional[str] = None

class StudentDocumentOut(StudentDocumentBase):
    id: UUID
    student_id: UUID
    upload_date: datetime

    model_config = {"from_attributes": True}

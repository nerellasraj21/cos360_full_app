from __future__ import annotations

from datetime import date
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class AdmissionTypeEnum(StrEnum):
    primary = "primary"
    not_primary = "not_primary"


class StudentBase(BaseModel):
    first_name: str
    last_name: str
    date_of_birth: date
    gender: str
    is_primary: str | None = "not_primary"
    aadhar_number: str | None = None
    apaar_number: str | None = None
    caste: str | None = None
    sub_caste: str | None = None
    community: str | None = None
    nationality: str | None = "Indian"
    mother_tongue: str | None = "Telugu"
    identification_marks: str | None = None
    primary_phone: str | None = None

    @field_validator("aadhar_number", "apaar_number")
    @classmethod
    def validate_aadhar(cls, v):
        if v and (not v.isdigit() or len(v) != 12):
            raise ValueError("Must be a 12-digit number")
        return v

    @field_validator("primary_phone")
    @classmethod
    def validate_primary_phone(cls, v):
        if v and (not v.isdigit() or len(v) != 10):
            raise ValueError("Must be a 10-digit number")
        return v


class StudentCreate(StudentBase):
    father: ParentCreate
    mother: ParentCreate
    guardian: ParentCreate | None = None


class StudentDetailsOut(StudentBase):
    id: UUID
    first_name: str
    last_name: str


class StudentOut(StudentBase):
    """
    Student output schema with nested parent information.

    This schema handles serialization of Student ORM objects including dynamically extracted
    parent relationships (father, mother, guardian).

    Parent Extraction Flow:
    1. Admission service loads Student with selectinload(parent_links) relationship
    2. Service iterates parent_links and assigns parents to student._father, student._mother, student._guardian
    3. StudentOut.from_attributes=True attempts to read father/mother/guardian properties
    4. Model validator (extract_father_mother_guardian) ensures proper dict conversion before Pydantic validation
    5. Final output includes all parent details in the response

    Related Documentation:
    - Student model: @property father/mother/guardian (app/models/student/student_model.py)
    - Admission service: get_admission_by_id_with_context (app/service/student/admission_service.py)
    - Admission endpoints: GET /students/admission/id/{student_id} (app/api/v1/student/admission_endpoints.py)
    """
    id: UUID
    first_name: str
    last_name: str
    is_active: bool | None = None
    photo_url: str | None = Field(None, validation_alias="photo")
    father: ParentOut | None = None
    mother: ParentOut | None = None
    guardian: ParentOut | None = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    @model_validator(mode='before')
    @classmethod
    def extract_father_mother_guardian(cls, data):
        """
        Extract father/mother/guardian from SQLAlchemy model properties before Pydantic validation.

        This validator handles the conversion of SQLAlchemy ORM objects to dicts by:
        1. Checking if data is already a dict (early return)
        2. Converting SQLAlchemy __dict__ to plain dict (skipping _sa_* internals)
        3. Extracting _father, _mother, and _guardian attributes set by Student model properties

        This ensures admission detail views properly display parent information.
        Related Issue: Admission form parent/guardian details missing in response
        """
        # Handle case where data is a SQLAlchemy model instance
        if isinstance(data, dict):
            # Already a dict, return as-is
            return data

        # Convert SQLAlchemy model to dict-like structure
        if hasattr(data, '__dict__'):
            result = {}
            # Copy all regular attributes
            for key, value in data.__dict__.items():
                if not key.startswith('_sa_'):  # Skip SQLAlchemy internal attrs
                    result[key] = value

            # Extract father/mother/guardian from properties
            if hasattr(data, '_father'):
                result['father'] = data._father
            if hasattr(data, '_mother'):
                result['mother'] = data._mother
            if hasattr(data, '_guardian'):
                result['guardian'] = data._guardian

            return result

        return data


class StudentDropdown(BaseModel):
    """Student dropdown with display name and admission number"""

    id: str
    display_name: str
    first_name: str
    last_name: str
    admission_number: str


class StudentSimpleDropdown(BaseModel):
    """Simple student dropdown with just ID and name"""

    id: str
    name: str


from app.schemas.masters.parent_schema import ParentCreate  # noqa: E402

StudentCreate.update_forward_refs()

from app.schemas.masters.parent_schema import ParentOut  # noqa: E402

StudentOut.update_forward_refs()

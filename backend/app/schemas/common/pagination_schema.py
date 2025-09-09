from pydantic import BaseModel, Field
from typing import List, TypeVar, Generic, Any

T = TypeVar('T')

class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response schema with has_next and total_count attributes"""
    items: List[T] = Field(..., description="List of items for current page")
    total_count: int = Field(..., description="Total number of records in the table", ge=0)
    has_next: bool = Field(..., description="Flag indicating if there are more records available")
    
    model_config = {"from_attributes": True}
    
    @classmethod
    def __get_validators__(cls):
        yield cls.validate
    
    @classmethod
    def validate(cls, v):
        return v
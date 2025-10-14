"""
Error Schemas for COS360 Multi-Tenant School Management System

This module defines Pydantic schemas for standardized error responses
across all API endpoints.
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum

class ErrorCategory(str, Enum):
    """Standard error categories"""
    VALIDATION_ERROR = "VALIDATION_ERROR"
    AUTHORIZATION_ERROR = "AUTHORIZATION_ERROR"
    PERMISSION_ERROR = "PERMISSION_ERROR"
    NOT_FOUND_ERROR = "NOT_FOUND_ERROR"
    METHOD_NOT_ALLOWED_ERROR = "METHOD_NOT_ALLOWED_ERROR"
    REQUEST_TIMEOUT_ERROR = "REQUEST_TIMEOUT_ERROR"
    CONFLICT_ERROR = "CONFLICT_ERROR"
    PAYLOAD_TOO_LARGE_ERROR = "PAYLOAD_TOO_LARGE_ERROR"
    UNSUPPORTED_MEDIA_TYPE_ERROR = "UNSUPPORTED_MEDIA_TYPE_ERROR"
    RATE_LIMIT_ERROR = "RATE_LIMIT_ERROR"
    BUSINESS_RULE_ERROR = "BUSINESS_RULE_ERROR"
    SERVICE_UNAVAILABLE_ERROR = "SERVICE_UNAVAILABLE_ERROR"
    GATEWAY_TIMEOUT_ERROR = "GATEWAY_TIMEOUT_ERROR"
    SYSTEM_ERROR = "SYSTEM_ERROR"
    DATABASE_ERROR = "DATABASE_ERROR"

class StandardErrorResponse(BaseModel):
    """Standardized error response schema"""
    error_code: str = Field(..., description="Standardized error code")
    message: str = Field(..., description="User-friendly error message")
    details: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional error details")
    timestamp: str = Field(..., description="ISO timestamp when error occurred")
    request_id: str = Field(..., description="Request correlation ID")
    cschema: Optional[str] = Field(None, description="Tenant schema name")

    class Config:
        json_schema_extra = {
            "example": {
                "error_code": "VALIDATION_ERROR",
                "message": "Invalid admission data: missing father name",
                "details": {"field": "father_name"},
                "timestamp": "2025-09-22T09:15:00Z",
                "request_id": "abc123-def456-ghi789",
                "cschema": "tenant_school1"
            }
        }

class ValidationErrorDetails(BaseModel):
    """Details for validation errors"""
    field: Optional[str] = Field(None, description="Field that failed validation")
    value: Optional[Any] = Field(None, description="Value that failed validation")
    constraint: Optional[str] = Field(None, description="Validation constraint that failed")

class PermissionErrorDetails(BaseModel):
    """Details for permission errors"""
    resource: Optional[str] = Field(None, description="Resource that access was denied for")
    action: Optional[str] = Field(None, description="Action that was denied")
    required_permission: Optional[str] = Field(None, description="Required permission")

class NotFoundErrorDetails(BaseModel):
    """Details for not found errors"""
    resource_type: Optional[str] = Field(None, description="Type of resource not found")
    resource_id: Optional[str] = Field(None, description="ID of resource not found")

class BusinessRuleErrorDetails(BaseModel):
    """Details for business rule errors"""
    rule: Optional[str] = Field(None, description="Business rule that was violated")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional context about the rule violation")

class DatabaseErrorDetails(BaseModel):
    """Details for database errors"""
    constraint: Optional[str] = Field(None, description="Database constraint that was violated")
    table: Optional[str] = Field(None, description="Database table involved")
    operation: Optional[str] = Field(None, description="Database operation that failed")

class ErrorResponseExamples:
    """Common error response examples for API documentation"""
    
    VALIDATION_ERROR = {
        "error_code": "VALIDATION_ERROR",
        "message": "Invalid admission data: missing father name",
        "details": {"field": "father_name"},
        "timestamp": "2025-09-22T09:15:00Z",
        "request_id": "abc123-def456-ghi789",
        "cschema": "tenant_school1"
    }
    
    AUTHORIZATION_ERROR = {
        "error_code": "AUTHORIZATION_ERROR",
        "message": "Authentication required",
        "details": {},
        "timestamp": "2025-09-22T09:15:00Z",
        "request_id": "abc123-def456-ghi789",
        "cschema": "tenant_school1"
    }
    
    PERMISSION_ERROR = {
        "error_code": "PERMISSION_ERROR",
        "message": "Access denied",
        "details": {"resource": "student_admissions", "action": "create"},
        "timestamp": "2025-09-22T09:15:00Z",
        "request_id": "abc123-def456-ghi789",
        "cschema": "tenant_school1"
    }
    
    NOT_FOUND_ERROR = {
        "error_code": "NOT_FOUND_ERROR",
        "message": "Student not found",
        "details": {"resource_type": "student", "resource_id": "123e4567-e89b-12d3-a456-426614174000"},
        "timestamp": "2025-09-22T09:15:00Z",
        "request_id": "abc123-def456-ghi789",
        "cschema": "tenant_school1"
    }
    
    BUSINESS_RULE_ERROR = {
        "error_code": "BUSINESS_RULE_ERROR",
        "message": "Attendance already marked for this date",
        "details": {"rule": "unique_attendance_per_date"},
        "timestamp": "2025-09-22T09:15:00Z",
        "request_id": "abc123-def456-ghi789",
        "cschema": "tenant_school1"
    }
    
    DATABASE_ERROR = {
        "error_code": "DATABASE_ERROR",
        "message": "Fee category already exists for this academic year",
        "details": {"constraint": "uq_category_name_academic_year"},
        "timestamp": "2025-09-22T09:15:00Z",
        "request_id": "abc123-def456-ghi789",
        "cschema": "tenant_school1"
    }
    
    SYSTEM_ERROR = {
        "error_code": "SYSTEM_ERROR",
        "message": "An unexpected error occurred",
        "details": {},
        "timestamp": "2025-09-22T09:15:00Z",
        "request_id": "abc123-def456-ghi789",
        "cschema": "tenant_school1"
    }
    
    METHOD_NOT_ALLOWED_ERROR = {
        "error_code": "METHOD_NOT_ALLOWED_ERROR",
        "message": "HTTP method not allowed for this endpoint",
        "details": {"allowed_methods": ["GET", "POST"]},
        "timestamp": "2025-09-22T09:15:00Z",
        "request_id": "abc123-def456-ghi789",
        "cschema": "tenant_school1"
    }
    
    REQUEST_TIMEOUT_ERROR = {
        "error_code": "REQUEST_TIMEOUT_ERROR",
        "message": "Request timeout",
        "details": {"timeout_duration": 30},
        "timestamp": "2025-09-22T09:15:00Z",
        "request_id": "abc123-def456-ghi789",
        "cschema": "tenant_school1"
    }
    
    CONFLICT_ERROR = {
        "error_code": "CONFLICT_ERROR",
        "message": "Resource conflict",
        "details": {"conflicting_resource": "student_id", "conflict_type": "duplicate"},
        "timestamp": "2025-09-22T09:15:00Z",
        "request_id": "abc123-def456-ghi789",
        "cschema": "tenant_school1"
    }
    
    PAYLOAD_TOO_LARGE_ERROR = {
        "error_code": "PAYLOAD_TOO_LARGE_ERROR",
        "message": "Request payload too large",
        "details": {"max_size": 10485760, "actual_size": 15728640},
        "timestamp": "2025-09-22T09:15:00Z",
        "request_id": "abc123-def456-ghi789",
        "cschema": "tenant_school1"
    }
    
    UNSUPPORTED_MEDIA_TYPE_ERROR = {
        "error_code": "UNSUPPORTED_MEDIA_TYPE_ERROR",
        "message": "Unsupported media type",
        "details": {"supported_types": ["application/json"], "provided_type": "text/plain"},
        "timestamp": "2025-09-22T09:15:00Z",
        "request_id": "abc123-def456-ghi789",
        "cschema": "tenant_school1"
    }
    
    RATE_LIMIT_ERROR = {
        "error_code": "RATE_LIMIT_ERROR",
        "message": "Too many requests",
        "details": {"retry_after": 60, "limit": 100},
        "timestamp": "2025-09-22T09:15:00Z",
        "request_id": "abc123-def456-ghi789",
        "cschema": "tenant_school1"
    }
    
    SERVICE_UNAVAILABLE_ERROR = {
        "error_code": "SERVICE_UNAVAILABLE_ERROR",
        "message": "Service temporarily unavailable",
        "details": {"maintenance_mode": True, "estimated_recovery": "2025-09-22T10:00:00Z"},
        "timestamp": "2025-09-22T09:15:00Z",
        "request_id": "abc123-def456-ghi789",
        "cschema": "tenant_school1"
    }
    
    GATEWAY_TIMEOUT_ERROR = {
        "error_code": "GATEWAY_TIMEOUT_ERROR",
        "message": "Gateway timeout",
        "details": {"timeout_duration": 30, "upstream_service": "database"},
        "timestamp": "2025-09-22T09:15:00Z",
        "request_id": "abc123-def456-ghi789",
        "cschema": "tenant_school1"
    }

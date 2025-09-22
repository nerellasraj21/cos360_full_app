"""
Database Error Mapper for COS360 Multi-Tenant School Management System

This module maps raw PostgreSQL constraint violations and database errors
to user-friendly error messages with proper error codes.
"""

from typing import Dict, Any, Optional, Tuple
import re
import logging

logger = logging.getLogger(__name__)

# Database constraint mapping based on analyzed models
DATABASE_CONSTRAINT_MESSAGES = {
    # User and Authentication constraints
    "users_username_key": {
        "message": "Username already exists",
        "error_code": "USER_USERNAME_DUPLICATE",
        "field": "username"
    },
    "users_email_key": {
        "message": "Email address already registered",
        "error_code": "USER_EMAIL_DUPLICATE",
        "field": "email"
    },
    
    # Student constraints
    "students_user_id_key": {
        "message": "Student already has a user account",
        "error_code": "STUDENT_USER_DUPLICATE",
        "field": "user_id"
    },
    
    # Parent constraints
    "parents_user_id_key": {
        "message": "Parent already has a user account",
        "error_code": "PARENT_USER_DUPLICATE",
        "field": "user_id"
    },
    
    # Attendance constraints
    "uq_student_date": {
        "message": "Attendance already marked for this date",
        "error_code": "ATTENDANCE_DUPLICATE_ENTRY",
        "field": "date"
    },
    "uq_staff_date": {
        "message": "Staff attendance already marked for this date",
        "error_code": "STAFF_ATTENDANCE_DUPLICATE_ENTRY",
        "field": "date"
    },
    
    # Fee constraints
    "uq_category_name_academic_year": {
        "message": "Fee category already exists for this academic year",
        "error_code": "FEE_CATEGORY_DUPLICATE",
        "field": "name"
    },
    "uq_fee_type_name_category": {
        "message": "Fee type already exists for this category",
        "error_code": "FEE_TYPE_DUPLICATE",
        "field": "name"
    },
    "uq_fee_class_mapping": {
        "message": "Fee mapping already exists for this class and fee type",
        "error_code": "FEE_CLASS_MAPPING_DUPLICATE",
        "field": "class_id"
    },
    "uq_fee_student_mapping": {
        "message": "Fee mapping already exists for this student and fee type",
        "error_code": "FEE_STUDENT_MAPPING_DUPLICATE",
        "field": "student_id"
    },
    
    # Expense constraints
    "uq_expense_transaction_idempotency": {
        "message": "Transaction with this reference already exists",
        "error_code": "EXPENSE_TRANSACTION_DUPLICATE",
        "field": "idempotency_key"
    },
    "uq_expense_setting_key": {
        "message": "Expense setting already exists for this key",
        "error_code": "EXPENSE_SETTING_DUPLICATE",
        "field": "setting_key"
    },
    "expense_attachments_stored_filename_key": {
        "message": "File with this name already exists",
        "error_code": "EXPENSE_ATTACHMENT_DUPLICATE",
        "field": "stored_filename"
    },
    
    # Permission constraints
    "unique_role_resource_action": {
        "message": "Permission already exists for this role and resource",
        "error_code": "PERMISSION_DUPLICATE",
        "field": "role_id"
    },
    "unique_menu_action": {
        "message": "Menu action already exists for this menu",
        "error_code": "MENU_ACTION_DUPLICATE",
        "field": "menu_id"
    },
    
    # Public schema constraints
    "tenants_client_name_key": {
        "message": "Tenant with this client name already exists",
        "error_code": "TENANT_CLIENT_NAME_DUPLICATE",
        "field": "client_name"
    },
    "tenants_schema_name_key": {
        "message": "Tenant with this schema name already exists",
        "error_code": "TENANT_SCHEMA_NAME_DUPLICATE",
        "field": "schema_name"
    },
    "role_templates_name_key": {
        "message": "Role template with this name already exists",
        "error_code": "ROLE_TEMPLATE_DUPLICATE",
        "field": "name"
    },
    
    # Foreign key constraint patterns
    "fk_users_role_id_roles": {
        "message": "Invalid role selected",
        "error_code": "USER_INVALID_ROLE",
        "field": "role_id"
    },
    "fk_students_user_id_users": {
        "message": "Invalid user account selected",
        "error_code": "STUDENT_INVALID_USER",
        "field": "user_id"
    },
    "fk_parents_user_id_users": {
        "message": "Invalid user account selected",
        "error_code": "PARENT_INVALID_USER",
        "field": "user_id"
    },
    "fk_attendance_student_id_students": {
        "message": "Invalid student selected",
        "error_code": "ATTENDANCE_INVALID_STUDENT",
        "field": "student_id"
    },
    "fk_fee_category_academic_year_id_academic_years": {
        "message": "Invalid academic year selected",
        "error_code": "FEE_CATEGORY_INVALID_ACADEMIC_YEAR",
        "field": "academic_year_id"
    },
    "fk_fee_type_category_id_fee_categories": {
        "message": "Invalid fee category selected",
        "error_code": "FEE_TYPE_INVALID_CATEGORY",
        "field": "category_id"
    },
    "fk_expense_transaction_type_id_expense_types": {
        "message": "Invalid expense type selected",
        "error_code": "EXPENSE_TRANSACTION_INVALID_TYPE",
        "field": "expense_type_id"
    },
    "fk_expense_type_category_id_expense_categories": {
        "message": "Invalid expense category selected",
        "error_code": "EXPENSE_TYPE_INVALID_CATEGORY",
        "field": "category_id"
    }
}

# Common PostgreSQL error patterns
POSTGRES_ERROR_PATTERNS = {
    r"duplicate key value violates unique constraint \"([^\"]+)\"": "unique_violation",
    r"violates foreign key constraint \"([^\"]+)\"": "foreign_key_violation",
    r"violates not-null constraint \"([^\"]+)\"": "not_null_violation",
    r"violates check constraint \"([^\"]+)\"": "check_violation",
    r"relation \"([^\"]+)\" does not exist": "table_not_found",
    r"column \"([^\"]+)\" does not exist": "column_not_found",
    r"permission denied for table \"([^\"]+)\"": "permission_denied",
    r"connection.*refused": "connection_failed",
    r"timeout": "timeout_error",
    r"deadlock detected": "deadlock_error"
}

def extract_constraint_name(error_message: str) -> Optional[str]:
    """
    Extract constraint name from PostgreSQL error message
    
    Args:
        error_message: Raw PostgreSQL error message
        
    Returns:
        Constraint name if found, None otherwise
    """
    # Pattern for unique constraint violations
    unique_pattern = r"duplicate key value violates unique constraint \"([^\"]+)\""
    match = re.search(unique_pattern, error_message, re.IGNORECASE)
    if match:
        return match.group(1)
    
    # Pattern for foreign key constraint violations
    fk_pattern = r"violates foreign key constraint \"([^\"]+)\""
    match = re.search(fk_pattern, error_message, re.IGNORECASE)
    if match:
        return match.group(1)
    
    # Pattern for check constraint violations
    check_pattern = r"violates check constraint \"([^\"]+)\""
    match = re.search(check_pattern, error_message, re.IGNORECASE)
    if match:
        return match.group(1)
    
    return None

def get_error_type(error_message: str) -> str:
    """
    Determine the type of database error from the message
    
    Args:
        error_message: Raw database error message
        
    Returns:
        Error type (unique_violation, foreign_key_violation, etc.)
    """
    error_message_lower = error_message.lower()
    
    for pattern, error_type in POSTGRES_ERROR_PATTERNS.items():
        if re.search(pattern, error_message_lower):
            return error_type
    
    return "unknown_error"

def map_database_error(
    error: Exception,
    context: Optional[Dict[str, Any]] = None
) -> Tuple[str, str, Dict[str, Any]]:
    """
    Map database error to user-friendly message and error code
    
    Args:
        error: Database exception
        context: Additional context about the operation
        
    Returns:
        Tuple of (error_code, message, details)
    """
    error_message = str(error)
    constraint_name = extract_constraint_name(error_message)
    error_type = get_error_type(error_message)
    
    # Try to find specific constraint mapping
    if constraint_name and constraint_name in DATABASE_CONSTRAINT_MESSAGES:
        constraint_info = DATABASE_CONSTRAINT_MESSAGES[constraint_name]
        return (
            constraint_info["error_code"],
            constraint_info["message"],
            {
                "field": constraint_info.get("field"),
                "constraint": constraint_name,
                "error_type": error_type
            }
        )
    
    # Fallback to generic error messages based on error type
    if error_type == "unique_violation":
        return (
            "DATABASE_UNIQUE_VIOLATION",
            "A record with this information already exists",
            {
                "constraint": constraint_name,
                "error_type": error_type
            }
        )
    elif error_type == "foreign_key_violation":
        return (
            "DATABASE_FOREIGN_KEY_VIOLATION",
            "Referenced record does not exist",
            {
                "constraint": constraint_name,
                "error_type": error_type
            }
        )
    elif error_type == "not_null_violation":
        return (
            "DATABASE_NOT_NULL_VIOLATION",
            "Required field cannot be empty",
            {
                "constraint": constraint_name,
                "error_type": error_type
            }
        )
    elif error_type == "check_violation":
        return (
            "DATABASE_CHECK_VIOLATION",
            "Data does not meet validation requirements",
            {
                "constraint": constraint_name,
                "error_type": error_type
            }
        )
    elif error_type == "table_not_found":
        return (
            "DATABASE_TABLE_NOT_FOUND",
            "Database table not found",
            {
                "error_type": error_type
            }
        )
    elif error_type == "column_not_found":
        return (
            "DATABASE_COLUMN_NOT_FOUND",
            "Database column not found",
            {
                "error_type": error_type
            }
        )
    elif error_type == "permission_denied":
        return (
            "DATABASE_PERMISSION_DENIED",
            "Insufficient database permissions",
            {
                "error_type": error_type
            }
        )
    elif error_type == "connection_failed":
        return (
            "DATABASE_CONNECTION_FAILED",
            "Database connection failed",
            {
                "error_type": error_type
            }
        )
    elif error_type == "timeout_error":
        return (
            "DATABASE_TIMEOUT",
            "Database operation timed out",
            {
                "error_type": error_type
            }
        )
    elif error_type == "deadlock_error":
        return (
            "DATABASE_DEADLOCK",
            "Database deadlock detected, please retry",
            {
                "error_type": error_type
            }
        )
    else:
        # Generic database error
        return (
            "DATABASE_ERROR",
            "Database operation failed",
            {
                "error_type": error_type,
                "original_error": error_message[:200]  # Truncate long error messages
            }
        )

def add_constraint_mapping(
    constraint_name: str,
    message: str,
    error_code: str,
    field: Optional[str] = None
) -> None:
    """
    Add a new constraint mapping to the database error mapper
    
    Args:
        constraint_name: Database constraint name
        message: User-friendly error message
        error_code: Standardized error code
        field: Field name that caused the error
    """
    DATABASE_CONSTRAINT_MESSAGES[constraint_name] = {
        "message": message,
        "error_code": error_code,
        "field": field
    }
    logger.info(f"Added constraint mapping: {constraint_name} -> {error_code}")

def get_all_constraint_mappings() -> Dict[str, Dict[str, Any]]:
    """
    Get all available constraint mappings
    
    Returns:
        Dictionary of all constraint mappings
    """
    return DATABASE_CONSTRAINT_MESSAGES.copy()

def validate_constraint_mappings() -> Dict[str, Any]:
    """
    Validate that all constraint mappings have required fields
    
    Returns:
        Validation results
    """
    validation_results = {
        "valid": True,
        "errors": [],
        "warnings": []
    }
    
    for constraint_name, mapping in DATABASE_CONSTRAINT_MESSAGES.items():
        if "message" not in mapping:
            validation_results["errors"].append(f"Missing 'message' for constraint: {constraint_name}")
            validation_results["valid"] = False
        
        if "error_code" not in mapping:
            validation_results["errors"].append(f"Missing 'error_code' for constraint: {constraint_name}")
            validation_results["valid"] = False
        
        if not mapping.get("message", "").strip():
            validation_results["warnings"].append(f"Empty message for constraint: {constraint_name}")
        
        if not mapping.get("error_code", "").strip():
            validation_results["warnings"].append(f"Empty error_code for constraint: {constraint_name}")
    
    return validation_results

"""
Endpoint to Resource Mapping Configuration

Maps API endpoints to resource:action pairs for permission validation.
This configuration is used by the access validation service to determine
which permissions are required for specific endpoints.
"""

from typing import Dict, Tuple, List, Optional
import re

ENDPOINT_RESOURCE_MAPPING: Dict[str, Tuple[str, str]] = {
    # Fee Management Endpoints
    "/api/v1/fee/categories": ("fee_categories", "list"),
    "/api/v1/fee/categories/": ("fee_categories", "list"),
    "/api/v1/fee/categories/dropdown": ("fee_categories", "read"),
    "/api/v1/fee/categories/{id}": ("fee_categories", "read"),
    "/api/v1/fee/categories/export/csv": ("fee_categories", "export"),
    "/api/v1/fee/categories/statistics": ("fee_categories", "read"),

    "/api/v1/fee/types": ("fee_types", "list"),
    "/api/v1/fee/types/": ("fee_types", "list"),
    "/api/v1/fee/types/{id}": ("fee_types", "read"),
    "/api/v1/fee/types/dropdown": ("fee_types", "read"),

    "/api/v1/fee/terms": ("fee_terms", "list"),
    "/api/v1/fee/terms/": ("fee_terms", "list"),
    "/api/v1/fee/terms/{id}": ("fee_terms", "read"),
    "/api/v1/fee/terms/dropdown": ("fee_terms", "read"),

    "/api/v1/fee/class-mappings": ("fee_class_mappings", "list"),
    "/api/v1/fee/class-mappings/": ("fee_class_mappings", "list"),
    "/api/v1/fee/class-mappings/{id}": ("fee_class_mappings", "read"),

    "/api/v1/fee/student-mappings": ("fee_student_mappings", "list"),
    "/api/v1/fee/student-mappings/": ("fee_student_mappings", "list"),
    "/api/v1/fee/student-mappings/{id}": ("fee_student_mappings", "read"),

    "/api/v1/fee/transactions": ("fee_transactions", "list"),
    "/api/v1/fee/transactions/": ("fee_transactions", "list"),
    "/api/v1/fee/transactions/{id}": ("fee_transactions", "read"),

    "/api/v1/fee/receipts": ("fee_receipts", "list"),
    "/api/v1/fee/receipts/": ("fee_receipts", "list"),
    "/api/v1/fee/receipts/{id}": ("fee_receipts", "read"),

    "/api/v1/fee/refunds": ("fee_refunds", "list"),
    "/api/v1/fee/refunds/": ("fee_refunds", "list"),
    "/api/v1/fee/refunds/{id}": ("fee_refunds", "read"),

    # Academic Management Endpoints
    "/api/v1/academic-years": ("academic_years", "list"),
    "/api/v1/academic-years/": ("academic_years", "list"),
    "/api/v1/academic-years/{id}": ("academic_years", "read"),
    "/api/v1/academic-years/dropdown": ("academic_years", "read"),

    "/api/v1/classes": ("classes", "list"),
    "/api/v1/classes/": ("classes", "list"),
    "/api/v1/classes/{id}": ("classes", "read"),
    "/api/v1/classes/dropdown": ("classes", "read"),

    "/api/v1/subjects": ("subjects", "list"),
    "/api/v1/subjects/": ("subjects", "list"),
    "/api/v1/subjects/{id}": ("subjects", "read"),
    "/api/v1/subjects/dropdown": ("subjects", "read"),

    "/api/v1/subject-categories": ("subject_categories", "list"),
    "/api/v1/subject-categories/": ("subject_categories", "list"),
    "/api/v1/subject-categories/{id}": ("subject_categories", "read"),

    # Student Management Endpoints
    "/api/v1/students/admissions": ("student_admissions", "list"),
    "/api/v1/students/admissions/": ("student_admissions", "list"),
    "/api/v1/students/admissions/{id}": ("student_admissions", "read"),

    "/api/v1/students/attendance": ("student_attendance", "list"),
    "/api/v1/students/attendance/": ("student_attendance", "list"),
    "/api/v1/students/attendance/{id}": ("student_attendance", "read"),

    "/api/v1/students/certificates": ("student_certificates", "list"),
    "/api/v1/students/certificates/": ("student_certificates", "list"),
    "/api/v1/students/certificates/{id}": ("student_certificates", "read"),

    "/api/v1/students/documents": ("student_documents", "list"),
    "/api/v1/students/documents/": ("student_documents", "list"),
    "/api/v1/students/documents/{id}": ("student_documents", "read"),

    "/api/v1/students/transport": ("student_transport", "list"),
    "/api/v1/students/transport/": ("student_transport", "list"),
    "/api/v1/students/transport/{id}": ("student_transport", "read"),

    # Staff Management Endpoints
    "/api/v1/staff": ("staff", "list"),
    "/api/v1/staff/": ("staff", "list"),
    "/api/v1/staff/{id}": ("staff", "read"),
    "/api/v1/staff/dropdown": ("staff", "read"),

    # Transport Management Endpoints
    "/api/v1/transport/routes": ("transport_routes", "list"),
    "/api/v1/transport/routes/": ("transport_routes", "list"),
    "/api/v1/transport/routes/{id}": ("transport_routes", "read"),

    "/api/v1/transport/vehicles": ("transport_vehicles", "list"),
    "/api/v1/transport/vehicles/": ("transport_vehicles", "list"),
    "/api/v1/transport/vehicles/{id}": ("transport_vehicles", "read"),

    "/api/v1/transport/trips": ("transport_trips", "list"),
    "/api/v1/transport/trips/": ("transport_trips", "list"),
    "/api/v1/transport/trips/{id}": ("transport_trips", "read"),

    "/api/v1/transport/route-stops": ("route_stops", "list"),
    "/api/v1/transport/route-stops/": ("route_stops", "list"),
    "/api/v1/transport/route-stops/{id}": ("route_stops", "read"),

    # Administrative Endpoints
    "/api/v1/parents": ("parents", "list"),
    "/api/v1/parents/": ("parents", "list"),
    "/api/v1/parents/{id}": ("parents", "read"),

    "/api/v1/holidays": ("holidays", "list"),
    "/api/v1/holidays/": ("holidays", "list"),
    "/api/v1/holidays/{id}": ("holidays", "read"),

    "/api/v1/timetables": ("timetables", "list"),
    "/api/v1/timetables/": ("timetables", "list"),
    "/api/v1/timetables/{id}": ("timetables", "read"),

    # Auth Management Endpoints
    "/api/v1/roles": ("role_management", "list"),
    "/api/v1/roles/": ("role_management", "list"),
    "/api/v1/roles/{id}": ("role_management", "read"),

    "/api/v1/permissions": ("permission_management", "list"),
    "/api/v1/permissions/": ("permission_management", "list"),
    "/api/v1/permissions/{id}": ("permission_management", "read"),

    "/api/v1/menus": ("menu_management", "list"),
    "/api/v1/menus/": ("menu_management", "list"),
    "/api/v1/menus/{id}": ("menu_management", "read"),

    # Expense Management Endpoints
    "/api/v1/expense/categories": ("expense_categories", "list"),
    "/api/v1/expense/categories/": ("expense_categories", "list"),
    "/api/v1/expense/categories/{id}": ("expense_categories", "read"),

    "/api/v1/expense/types": ("expense_types", "list"),
    "/api/v1/expense/types/": ("expense_types", "list"),
    "/api/v1/expense/types/{id}": ("expense_types", "read"),

    "/api/v1/expense/transactions": ("expense_transactions", "list"),
    "/api/v1/expense/transactions/": ("expense_transactions", "list"),
    "/api/v1/expense/transactions/{id}": ("expense_transactions", "read"),
}

# HTTP Method to Action Mapping
HTTP_METHOD_ACTION_MAPPING: Dict[str, str] = {
    "GET": "read",
    "POST": "create",
    "PUT": "update",
    "PATCH": "update",
    "DELETE": "delete"
}

# Special endpoint patterns that override default action mapping
SPECIAL_ENDPOINT_ACTIONS: Dict[str, str] = {
    "/dropdown": "read",
    "/export": "export",
    "/statistics": "read",
    "/search": "read",
    "/bulk": "bulk_delete",
    "/import": "import",
    "/approve": "approve"
}

# Menu item to resource mapping
MENU_RESOURCE_MAPPING: Dict[str, Tuple[str, str]] = {
    "fee_categories": ("fee_categories", "read"),
    "fee_types": ("fee_types", "read"),
    "fee_terms": ("fee_terms", "read"),
    "fee_management": ("fee_categories", "read"),
    "student_admissions": ("student_admissions", "read"),
    "student_attendance": ("student_attendance", "read"),
    "academic_years": ("academic_years", "read"),
    "classes": ("classes", "read"),
    "subjects": ("subjects", "read"),
    "staff_management": ("staff", "read"),
    "transport_routes": ("transport_routes", "read"),
    "transport_vehicles": ("transport_vehicles", "read"),
    "parents": ("parents", "read"),
    "holidays": ("holidays", "read"),
    "timetables": ("timetables", "read"),
    "role_management": ("role_management", "read"),
    "permission_management": ("permission_management", "read"),
    "menu_management": ("menu_management", "read"),
}

def normalize_endpoint(endpoint: str) -> str:
    """
    Normalize endpoint by removing trailing slashes and converting to lowercase.

    Args:
        endpoint: The endpoint path to normalize

    Returns:
        str: Normalized endpoint path
    """
    if not endpoint:
        return ""

    # Remove trailing slash if present (except for root)
    if endpoint != "/" and endpoint.endswith("/"):
        endpoint = endpoint[:-1]

    return endpoint.lower()

def extract_base_endpoint(endpoint: str) -> str:
    """
    Extract base endpoint by replacing path parameters with {id} placeholder.

    Args:
        endpoint: The endpoint path with potential parameters

    Returns:
        str: Base endpoint with {id} placeholders
    """
    # Replace UUID patterns with {id}
    uuid_pattern = r'/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
    endpoint = re.sub(uuid_pattern, '/{id}', endpoint, flags=re.IGNORECASE)

    # Replace numeric IDs with {id}
    numeric_pattern = r'/\d+'
    endpoint = re.sub(numeric_pattern, '/{id}', endpoint)

    return endpoint

def get_resource_from_endpoint(endpoint: str, http_method: str = "GET") -> Optional[Tuple[str, str]]:
    """
    Get resource and action from endpoint path and HTTP method.

    Args:
        endpoint: The API endpoint path
        http_method: The HTTP method (GET, POST, PUT, DELETE)

    Returns:
        Tuple[str, str]: (resource, action) or None if not found
    """
    # Normalize the endpoint
    normalized_endpoint = normalize_endpoint(endpoint)

    # First try exact match
    if normalized_endpoint in ENDPOINT_RESOURCE_MAPPING:
        resource, default_action = ENDPOINT_RESOURCE_MAPPING[normalized_endpoint]

        # Check for special endpoint actions
        for pattern, action in SPECIAL_ENDPOINT_ACTIONS.items():
            if normalized_endpoint.endswith(pattern):
                return (resource, action)

        # Use HTTP method for action mapping if default action is generic
        if default_action == "read" and http_method.upper() in HTTP_METHOD_ACTION_MAPPING:
            action = HTTP_METHOD_ACTION_MAPPING[http_method.upper()]
            # For list endpoints, keep 'list' action for GET requests
            if http_method.upper() == "GET" and (normalized_endpoint.endswith("s") or normalized_endpoint.endswith("ies")):
                action = "list"
        else:
            action = default_action

        return (resource, action)

    # Try base endpoint with {id} placeholder
    base_endpoint = extract_base_endpoint(normalized_endpoint)
    if base_endpoint in ENDPOINT_RESOURCE_MAPPING:
        resource, default_action = ENDPOINT_RESOURCE_MAPPING[base_endpoint]

        # Use HTTP method for action
        action = HTTP_METHOD_ACTION_MAPPING.get(http_method.upper(), "read")

        return (resource, action)

    return None

def get_resource_from_menu(menu_item: str) -> Optional[Tuple[str, str]]:
    """
    Get resource and action from menu item identifier.

    Args:
        menu_item: The menu item identifier

    Returns:
        Tuple[str, str]: (resource, action) or None if not found
    """
    menu_key = menu_item.lower().strip()
    return MENU_RESOURCE_MAPPING.get(menu_key)

def get_all_resources() -> List[str]:
    """
    Get list of all available resources.

    Returns:
        List[str]: List of unique resource names
    """
    resources = set()

    # From endpoint mapping
    for resource, _ in ENDPOINT_RESOURCE_MAPPING.values():
        resources.add(resource)

    # From menu mapping
    for resource, _ in MENU_RESOURCE_MAPPING.values():
        resources.add(resource)

    return sorted(list(resources))

def get_all_actions() -> List[str]:
    """
    Get list of all available actions.

    Returns:
        List[str]: List of unique action names
    """
    actions = set()

    # From endpoint mapping
    for _, action in ENDPOINT_RESOURCE_MAPPING.values():
        actions.add(action)

    # From menu mapping
    for _, action in MENU_RESOURCE_MAPPING.values():
        actions.add(action)

    # From HTTP method mapping
    for action in HTTP_METHOD_ACTION_MAPPING.values():
        actions.add(action)

    # From special endpoint actions
    for action in SPECIAL_ENDPOINT_ACTIONS.values():
        actions.add(action)

    return sorted(list(actions))
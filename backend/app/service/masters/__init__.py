from .academic_year_service import (
    create_academic_year,
    deactivate_academic_year,
    get_academic_year_by_id,
    get_all_academic_years,
    update_academic_year,
)

__all__ = [
    "create_academic_year",
    "get_academic_year_by_id",
    "get_all_academic_years",
    "update_academic_year",
    "deactivate_academic_year",
]

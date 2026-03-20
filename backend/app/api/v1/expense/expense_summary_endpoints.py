from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.middleware.rate_limit_middleware import rate_limit_api
from app.schemas.expense.expense_summary_schema import ExpenseHierarchicalSummary
from app.service.expense.expense_summary_service import ExpenseSummaryService
from app.tools.simple_permissions import check_role_plan_permission_with_error, get_current_user_token

router = APIRouter(prefix="/expense/summary", tags=["Expense/Summary"])


@router.get("/", response_model=ExpenseHierarchicalSummary)
@rate_limit_api()
async def get_expense_hierarchical_summary(
    request: Request,
    academic_year_id: UUID | None = Query(None, description="Filter by academic year ID"),
    start_date: date | None = Query(None, description="Filter from this date (YYYY-MM-DD)"),
    end_date: date | None = Query(None, description="Filter up to this date (YYYY-MM-DD)"),
    status_filter: str | None = Query(
        None,
        description="Filter by transaction status (approved, paid, pending). Default: all except cancelled.",
    ),
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Returns full hierarchical expense summary:
    - All categories
      - Under each category: types (sub-sections) with entries and subtotal
    - Per-category total
    - Grand total across all categories
    - Filterable by academic year and/or date range
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    await check_role_plan_permission_with_error(db, request, role, "expense_transactions", "list")

    service = ExpenseSummaryService(db)
    return await service.get_hierarchical_summary(
        academic_year_id=academic_year_id,
        start_date=start_date,
        end_date=end_date,
        status_filter=status_filter,
    )

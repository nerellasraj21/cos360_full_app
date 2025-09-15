from fastapi import HTTPException, status, APIRouter, Depends, Query, Request
from datetime import date, datetime
from typing import Optional, List
from uuid import UUID
from decimal import Decimal

from app.schemas.expense.expense_report_schema import (
    ExpenseReportFilter,
    ExpenseCategoryReport,
    ExpenseTypeReport,
    ExpenseTrendReport,
    ExpenseReportExport,
    ExpenseReportExportResponse,
    ExportFormat
)
from app.db.tenant_session import get_tenant_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.service.expense.expense_reporting_service import ExpenseReportingService
from app.middleware.rate_limit_middleware import rate_limit_api
from app.tools.simple_permissions import get_current_user_token, check_role_plan_permission_with_error

router = APIRouter(prefix="/expense/reports", tags=["Expense/Reports"])

# Category-based Report
@router.get("/by-category", response_model=ExpenseCategoryReport)
@rate_limit_api("50 per minute")
async def get_category_report_endpoint(
    request: Request,
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    category_ids: Optional[List[UUID]] = Query(None, description="Filter by category IDs"),
    type_ids: Optional[List[UUID]] = Query(None, description="Filter by type IDs"),
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    department_id: Optional[UUID] = Query(None, description="Filter by department"),
    min_amount: Optional[Decimal] = Query(None, ge=0, description="Minimum amount"),
    max_amount: Optional[Decimal] = Query(None, ge=0, description="Maximum amount"),
    db: AsyncSession = Depends(get_tenant_db)
):
    """Generate category-based expense report with filtering options"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    username = current_user.get('username')
    user_department_id = current_user.get('department_id')

    # Multi-layer permission check
    await check_role_plan_permission_with_error(db, request, role, 'expense_reports', 'read')

    # Build filters
    filters = ExpenseReportFilter(
        start_date=start_date,
        end_date=end_date,
        category_ids=category_ids,
        type_ids=type_ids,
        status_filter=status_filter,
        department_id=department_id,
        min_amount=min_amount,
        max_amount=max_amount
    )

    service = ExpenseReportingService(db)
    return await service.generate_category_report(
        filters,
        user_department_id=UUID(user_department_id) if user_department_id else None,
        user_role=role,
        username=username
    )

# Type-based Report
@router.get("/by-type", response_model=ExpenseTypeReport)
@rate_limit_api("50 per minute")
async def get_type_report_endpoint(
    request: Request,
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    category_ids: Optional[List[UUID]] = Query(None, description="Filter by category IDs"),
    type_ids: Optional[List[UUID]] = Query(None, description="Filter by type IDs"),
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    department_id: Optional[UUID] = Query(None, description="Filter by department"),
    min_amount: Optional[Decimal] = Query(None, ge=0, description="Minimum amount"),
    max_amount: Optional[Decimal] = Query(None, ge=0, description="Maximum amount"),
    db: AsyncSession = Depends(get_tenant_db)
):
    """Generate type-based expense report with filtering options"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    username = current_user.get('username')
    user_department_id = current_user.get('department_id')

    # Multi-layer permission check
    await check_role_plan_permission_with_error(db, request, role, 'expense_reports', 'read')

    # Build filters
    filters = ExpenseReportFilter(
        start_date=start_date,
        end_date=end_date,
        category_ids=category_ids,
        type_ids=type_ids,
        status_filter=status_filter,
        department_id=department_id,
        min_amount=min_amount,
        max_amount=max_amount
    )

    service = ExpenseReportingService(db)
    return await service.generate_type_report(
        filters,
        user_department_id=UUID(user_department_id) if user_department_id else None,
        user_role=role,
        username=username
    )

# Trend Report
@router.get("/trend", response_model=ExpenseTrendReport)
@rate_limit_api("30 per minute")
async def get_trend_report_endpoint(
    request: Request,
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    category_ids: Optional[List[UUID]] = Query(None, description="Filter by category IDs"),
    type_ids: Optional[List[UUID]] = Query(None, description="Filter by type IDs"),
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    department_id: Optional[UUID] = Query(None, description="Filter by department"),
    db: AsyncSession = Depends(get_tenant_db)
):
    """Generate time-based trend report showing monthly expense patterns"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    username = current_user.get('username')
    user_department_id = current_user.get('department_id')

    # Multi-layer permission check
    await check_role_plan_permission_with_error(db, request, role, 'expense_reports', 'read')

    # Build filters
    filters = ExpenseReportFilter(
        start_date=start_date,
        end_date=end_date,
        category_ids=category_ids,
        type_ids=type_ids,
        status_filter=status_filter,
        department_id=department_id
    )

    service = ExpenseReportingService(db)
    return await service.generate_trend_report(
        filters,
        user_department_id=UUID(user_department_id) if user_department_id else None,
        user_role=role,
        username=username
    )

# Quick Summary Endpoint
@router.get("/summary")
@rate_limit_api("100 per minute")
async def get_expense_summary_endpoint(
    request: Request,
    period_days: int = Query(30, ge=1, le=365, description="Period in days (1-365)"),
    db: AsyncSession = Depends(get_tenant_db)
):
    """Get quick expense summary for the specified period"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    user_department_id = current_user.get('department_id')

    # Multi-layer permission check
    await check_role_plan_permission_with_error(db, request, role, 'expense_reports', 'read')

    # Calculate date range
    end_date = date.today()
    start_date = date.fromordinal(end_date.toordinal() - period_days + 1)

    # Build filters for the period
    filters = ExpenseReportFilter(
        start_date=start_date,
        end_date=end_date
    )

    service = ExpenseReportingService(db)
    report = await service.generate_category_report(
        filters,
        user_department_id=UUID(user_department_id) if user_department_id else None,
        user_role=role,
        username=current_user.get('username')
    )

    # Return simplified summary
    return {
        "period_days": period_days,
        "total_amount": report.summary.total_amount,
        "total_transactions": report.summary.total_transactions,
        "average_transaction": report.summary.average_transaction,
        "top_categories": report.categories[:5],  # Top 5 categories
        "generated_at": report.generated_at
    }

# Export Request Endpoint
@router.post("/export", response_model=ExpenseReportExportResponse)
@rate_limit_api("10 per minute")
async def export_report_endpoint(
    request: Request,
    export_request: ExpenseReportExport,
    db: AsyncSession = Depends(get_tenant_db)
):
    """Request export of expense report in various formats"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')

    # Multi-layer permission check
    await check_role_plan_permission_with_error(db, request, role, 'expense_reports', 'export')

    # TODO: Implement actual export functionality
    # For now, return a mock response
    export_id = UUID("12345678-1234-5678-9012-123456789012")

    return ExpenseReportExportResponse(
        export_id=export_id,
        report_type=export_request.report_type,
        export_format=export_request.export_format.value,
        status="pending",
        generated_at=datetime.utcnow()
    )

# Export Status Check
@router.get("/export/{export_id}/status", response_model=ExpenseReportExportResponse)
@rate_limit_api("60 per minute")
async def get_export_status_endpoint(
    request: Request,
    export_id: UUID,
    db: AsyncSession = Depends(get_tenant_db)
):
    """Check status of export request"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')

    # Multi-layer permission check
    await check_role_plan_permission_with_error(db, request, role, 'expense_reports', 'read')

    # TODO: Implement actual status checking
    # For now, return a mock response
    return ExpenseReportExportResponse(
        export_id=export_id,
        report_type="category",
        export_format="csv",
        status="completed",
        file_url=f"/api/v1/expense/reports/export/{export_id}/download",
        file_size=1024,
        expires_at=datetime.utcnow().replace(hour=23, minute=59, second=59),
        generated_at=datetime.utcnow()
    )
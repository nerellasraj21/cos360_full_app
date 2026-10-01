"""
API endpoints for financial-related reports
"""

from datetime import date
from decimal import Decimal
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db, get_tenant_id_from_request
from app.schemas.reports.financial_report_schemas import (
    ExpenditureReportFilter,
    FinancialSummary,
    FinancialSummaryFilter,
    LedgerReportFilter,
)
from app.schemas.reports.report_schemas import ExportRequest, ReportResponse
from app.service.reports.financial_report_service import FinancialReportService
from app.tools.simple_permissions import check_role_plan_permission_with_error, get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/expenditure", response_model=ReportResponse)
async def get_expenditure_report(
    request: Request,
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    category_id: UUID | None = Query(None),
    type_id: UUID | None = Query(None),
    amount_min: Decimal | None = Query(None),
    amount_max: Decimal | None = Query(None),
    department: str | None = Query(None),
    month: int | None = Query(None, ge=1, le=12),
    year: int | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=1000),
    sort_by: str | None = Query(None),
    sort_order: str = Query("asc", pattern="^(asc|desc)$"),
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user),
):
    """Get expenditure report with filters and pagination"""
    try:
        # Check permissions - handle SuperAdmin users
        if current_user.get("is_superadmin"):
            # SuperAdmin bypasses permission checks
            pass
        else:
            role = current_user.get("role")
            await check_role_plan_permission_with_error(db, request, role, "financial_reports", "read")

        # Get user info
        user_id_str = current_user.get("sub")
        tenant_id = get_tenant_id_from_request(request)

        # Convert user_id to UUID
        from uuid import UUID as UUIDImport

        user_id = UUIDImport(user_id_str)

        # Create service
        service = FinancialReportService(db, user_id, tenant_id)

        # Create filters
        filters = ExpenditureReportFilter(
            date_from=date_from,
            date_to=date_to,
            category_id=category_id,
            type_id=type_id,
            amount_min=amount_min,
            amount_max=amount_max,
            department=department,
            month=month,
            year=year,
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            sort_order=sort_order,
        )

        # Get data
        data, total_count = await service.get_expenditure_report(filters)

        # Calculate pagination
        total_pages = (total_count + page_size - 1) // page_size

        return ReportResponse(
            data=data, total_count=total_count, page=page, page_size=page_size, total_pages=total_pages
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in expenditure report: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/ledger", response_model=ReportResponse)
async def get_ledger_report(
    request: Request,
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    account_type: str | None = Query(None),
    transaction_type: str | None = Query(None),
    reference_type: str | None = Query(None),
    amount_min: Decimal | None = Query(None),
    amount_max: Decimal | None = Query(None),
    month: int | None = Query(None, ge=1, le=12),
    year: int | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=1000),
    sort_by: str | None = Query(None),
    sort_order: str = Query("asc", pattern="^(asc|desc)$"),
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user),
):
    """Get ledger report with filters and pagination"""
    try:
        # Check permissions - handle SuperAdmin users
        if current_user.get("is_superadmin"):
            # SuperAdmin bypasses permission checks
            pass
        else:
            role = current_user.get("role")
            await check_role_plan_permission_with_error(db, request, role, "financial_reports", "read")

        # Get user info
        user_id_str = current_user.get("sub")
        tenant_id = get_tenant_id_from_request(request)

        # Convert user_id to UUID
        from uuid import UUID as UUIDImport

        user_id = UUIDImport(user_id_str)

        # Create service
        service = FinancialReportService(db, user_id, tenant_id)

        # Create filters
        filters = LedgerReportFilter(
            date_from=date_from,
            date_to=date_to,
            account_type=account_type,
            transaction_type=transaction_type,
            reference_type=reference_type,
            amount_min=amount_min,
            amount_max=amount_max,
            month=month,
            year=year,
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            sort_order=sort_order,
        )

        # Get data
        data, total_count = await service.get_ledger_report(filters)

        # Calculate pagination
        total_pages = (total_count + page_size - 1) // page_size

        return ReportResponse(
            data=data, total_count=total_count, page=page, page_size=page_size, total_pages=total_pages
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in ledger report: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/summary", response_model=FinancialSummary)
async def get_financial_summary(
    request: Request,
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    period_type: str = Query("monthly", pattern="^(monthly|quarterly|yearly)$"),
    include_fees: bool = Query(True),
    include_expenses: bool = Query(True),
    month: int | None = Query(None, ge=1, le=12),
    year: int | None = Query(None),
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user),
):
    """Get financial summary statistics"""
    try:
        # Check permissions - handle SuperAdmin users
        if current_user.get("is_superadmin"):
            # SuperAdmin bypasses permission checks
            pass
        else:
            role = current_user.get("role")
            await check_role_plan_permission_with_error(db, request, role, "financial_reports", "read")

        # Get user info
        user_id_str = current_user.get("sub")
        tenant_id = get_tenant_id_from_request(request)

        # Convert user_id to UUID
        from uuid import UUID as UUIDImport

        user_id = UUIDImport(user_id_str)

        # Create service
        service = FinancialReportService(db, user_id, tenant_id)

        # Create filters
        filters = FinancialSummaryFilter(
            date_from=date_from,
            date_to=date_to,
            period_type=period_type,
            include_fees=include_fees,
            include_expenses=include_expenses,
            month=month,
            year=year,
        )

        # Get summary data
        summary = await service.get_financial_summary(filters)

        return summary

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in financial summary: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/export")
async def export_financial_report(
    export_request: ExportRequest,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user),
):
    """Export financial report in specified format"""
    try:
        # Check permissions
        role = current_user.get("role")
        await check_role_plan_permission_with_error(db, request, role, "financial_reports", "export")

        # Get user info
        user_id_str = current_user.get("sub")
        tenant_id = get_tenant_id_from_request(request)

        # Convert user_id to UUID
        from uuid import UUID as UUIDImport

        user_id = UUIDImport(user_id_str)

        # Create service
        service = FinancialReportService(db, user_id, tenant_id)

        # Support CSV, Excel, and PDF export
        if export_request.format not in ["csv", "xlsx", "pdf"]:
            raise HTTPException(
                status_code=400, detail="Only CSV, Excel (.xlsx), and PDF export are currently supported"
            )

        # Get data based on report type
        data = []
        total_count = 0

        if export_request.report_type == "expenditure":
            filters = ExpenditureReportFilter(**export_request.filters)
            data, total_count = await service.fetch_all_rows(service.get_expenditure_report, filters)
        elif export_request.report_type == "ledger":
            filters = LedgerReportFilter(**export_request.filters)
            data, total_count = await service.fetch_all_rows(service.get_ledger_report, filters)
        else:
            raise HTTPException(status_code=400, detail="Unsupported financial report type")

        base_filename = export_request.filename or f"financial_{export_request.report_type}_{tenant_id}"

        if export_request.format == "csv":
            export_content, filename = await service.generate_csv_export(data, base_filename)
            content_type = "text/csv"
        elif export_request.format == "xlsx":
            export_content, filename = await service.generate_excel_export(
                data, base_filename, sheet_name=f"Financial {export_request.report_type.replace('_', ' ').title()}"
            )
            content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        elif export_request.format == "pdf":
            export_content, filename = await service.generate_pdf_export(
                data,
                base_filename,
                title=f"Financial {export_request.report_type.replace('_', ' ').title()}",
                subtitle=f"Report Type: {export_request.report_type.replace('_', ' ').title()}",
            )
            content_type = "application/pdf"

        # Return file download response
        from fastapi.responses import Response

        return Response(
            content=export_content,
            media_type=content_type,
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Length": str(len(export_content)),
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in financial report export: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

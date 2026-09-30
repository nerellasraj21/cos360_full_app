"""
API endpoints for fee-related reports
"""

from datetime import datetime
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import TenantService, get_tenant_db
from app.schemas.reports.fee_report_schemas import (
    FeeCollectionSummary,
    FeeCollectionSummaryFilter,
    FeeStructureFilter,
    FeeStructureSummary,
    PendingFeesFilter,
    PendingFeesSummary,
)
from app.schemas.reports.report_schemas import ExportRequest, ReportResponse
from app.service.reports.fee_report_service import FeeReportService
from app.tools.simple_permissions import check_role_plan_permission_with_error, get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()


def _parse_date_to(value: str | None) -> datetime | None:
    if not value:
        return None
    parsed = datetime.fromisoformat(value)
    if len(value) == 10:
        return parsed.replace(hour=23, minute=59, second=59, microsecond=999999)
    return parsed


async def _fetch_all_rows(fetch, filters):
    data, total_count = await fetch(filters)
    if total_count > len(data):
        data, total_count = await fetch(filters.model_copy(update={"page": 1, "page_size": total_count}))
    return data, total_count


@router.get("/collection-summary", response_model=ReportResponse)
async def get_fee_collection_summary(
    request: Request,
    academic_year_id: UUID = None,
    fee_category_id: UUID = None,
    fee_type_id: UUID = None,
    payment_method: str = None,
    status: str = None,
    date_from: str = None,
    date_to: str = None,
    class_id: UUID = None,
    section_id: UUID = None,
    page: int = 1,
    page_size: int = 100,
    sort_by: str = None,
    sort_order: str = "desc",
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user),
):
    """Get fee collection summary report"""
    try:
        print(f"DEBUG: Fee collection summary called with user: {current_user.get('username', 'unknown')}")

        # Check permissions - handle SuperAdmin users
        if current_user.get("is_superadmin"):
            # SuperAdmin bypasses permission checks
            print("DEBUG: SuperAdmin detected, bypassing permission checks")
            pass
        else:
            role = current_user.get("role")
            print(f"DEBUG: Checking permissions for role: {role}")
            await check_role_plan_permission_with_error(db, request, role, "fee_reports", "read")
            print("DEBUG: Permission check passed")

        # Get user info
        user_id_str = current_user.get("sub")
        client_name = getattr(request.state, "client_name", None)
        print(f"DEBUG: Client name: {client_name}")
        tenant_id = await TenantService.get_tenant_schema(client_name)
        print(f"DEBUG: Tenant ID: {tenant_id}")

        # Convert user_id to UUID
        from uuid import UUID

        user_id = UUID(user_id_str)

        # Create service
        service = FeeReportService(db, user_id, tenant_id)

        # Parse dates
        from datetime import datetime

        parsed_date_from = datetime.fromisoformat(date_from) if date_from else None
        parsed_date_to = _parse_date_to(date_to)

        # Create filters
        filters = FeeCollectionSummaryFilter(
            academic_year_id=academic_year_id,
            fee_category_id=fee_category_id,
            fee_type_id=fee_type_id,
            payment_method=payment_method,
            status=status,
            date_from=parsed_date_from,
            date_to=parsed_date_to,
            class_id=class_id,
            section_id=section_id,
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            sort_order=sort_order,
        )

        # Get data
        data, total_count = await service.get_fee_collection_summary(filters)

        # Calculate pagination
        total_pages = (total_count + page_size - 1) // page_size

        return ReportResponse(
            data=data, total_count=total_count, page=page, page_size=page_size, total_pages=total_pages
        )

    except HTTPException:
        raise
    except Exception as e:
        import traceback

        logger.error(f"Error in fee collection summary: {str(e)}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/collection-summary/stats", response_model=FeeCollectionSummary)
async def get_fee_collection_summary_stats(
    request: Request,
    academic_year_id: UUID = None,
    fee_category_id: UUID = None,
    fee_type_id: UUID = None,
    payment_method: str = None,
    status: str = None,
    date_from: str = None,
    date_to: str = None,
    class_id: UUID = None,
    section_id: UUID = None,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user),
):
    """Get fee collection summary statistics"""
    try:
        # Check permissions - handle SuperAdmin users
        if current_user.get("is_superadmin"):
            # SuperAdmin bypasses permission checks
            pass
        else:
            role = current_user.get("role")
            await check_role_plan_permission_with_error(db, request, role, "fee_reports", "read")

        # Get user info
        user_id_str = current_user.get("sub")
        client_name = getattr(request.state, "client_name", None)
        tenant_id = await TenantService.get_tenant_schema(client_name)

        # Convert user_id to UUID
        from uuid import UUID

        user_id = UUID(user_id_str)

        # Create service
        service = FeeReportService(db, user_id, tenant_id)

        # Parse dates
        from datetime import datetime

        parsed_date_from = datetime.fromisoformat(date_from) if date_from else None
        parsed_date_to = _parse_date_to(date_to)

        # Create filters
        filters = FeeCollectionSummaryFilter(
            academic_year_id=academic_year_id,
            fee_category_id=fee_category_id,
            fee_type_id=fee_type_id,
            payment_method=payment_method,
            status=status,
            date_from=parsed_date_from,
            date_to=parsed_date_to,
            class_id=class_id,
            section_id=section_id,
        )

        # Get statistics
        stats = await service.get_fee_collection_summary_stats(filters)

        return stats

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in fee collection summary stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/pending-fees", response_model=ReportResponse)
async def get_pending_fees(
    request: Request,
    academic_year_id: UUID = None,
    fee_category_id: UUID = None,
    fee_type_id: UUID = None,
    fee_term_id: UUID = None,
    class_id: UUID = None,
    section_id: UUID = None,
    days_overdue: int = None,
    amount_min: float = None,
    amount_max: float = None,
    page: int = 1,
    page_size: int = 100,
    sort_by: str = None,
    sort_order: str = "asc",
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user),
):
    """Get pending fees report"""
    try:
        # Check permissions - handle SuperAdmin users
        if current_user.get("is_superadmin"):
            # SuperAdmin bypasses permission checks
            pass
        else:
            role = current_user.get("role")
            await check_role_plan_permission_with_error(db, request, role, "fee_reports", "read")

        # Get user info
        user_id_str = current_user.get("sub")
        client_name = getattr(request.state, "client_name", None)
        tenant_id = await TenantService.get_tenant_schema(client_name)

        # Convert user_id to UUID
        from uuid import UUID

        user_id = UUID(user_id_str)

        # Create service
        service = FeeReportService(db, user_id, tenant_id)

        # Create filters
        from decimal import Decimal

        filters = PendingFeesFilter(
            academic_year_id=academic_year_id,
            fee_category_id=fee_category_id,
            fee_type_id=fee_type_id,
            fee_term_id=fee_term_id,
            class_id=class_id,
            section_id=section_id,
            days_overdue=days_overdue,
            amount_min=Decimal(str(amount_min)) if amount_min else None,
            amount_max=Decimal(str(amount_max)) if amount_max else None,
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            sort_order=sort_order,
        )

        # Get data
        data, total_count = await service.get_pending_fees(filters)

        # Calculate pagination
        total_pages = (total_count + page_size - 1) // page_size

        return ReportResponse(
            data=data, total_count=total_count, page=page, page_size=page_size, total_pages=total_pages
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in pending fees: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/pending-fees/stats", response_model=PendingFeesSummary)
async def get_pending_fees_stats(
    request: Request,
    academic_year_id: UUID = None,
    fee_category_id: UUID = None,
    fee_type_id: UUID = None,
    fee_term_id: UUID = None,
    class_id: UUID = None,
    section_id: UUID = None,
    days_overdue: int = None,
    amount_min: float = None,
    amount_max: float = None,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user),
):
    """Get pending fees statistics"""
    try:
        # Check permissions - handle SuperAdmin users
        if current_user.get("is_superadmin"):
            # SuperAdmin bypasses permission checks
            pass
        else:
            role = current_user.get("role")
            await check_role_plan_permission_with_error(db, request, role, "fee_reports", "read")

        # Get user info
        user_id_str = current_user.get("sub")
        client_name = getattr(request.state, "client_name", None)
        tenant_id = await TenantService.get_tenant_schema(client_name)

        # Convert user_id to UUID
        from uuid import UUID

        user_id = UUID(user_id_str)

        # Create service
        service = FeeReportService(db, user_id, tenant_id)

        # Create filters
        from decimal import Decimal

        filters = PendingFeesFilter(
            academic_year_id=academic_year_id,
            fee_category_id=fee_category_id,
            fee_type_id=fee_type_id,
            fee_term_id=fee_term_id,
            class_id=class_id,
            section_id=section_id,
            days_overdue=days_overdue,
            amount_min=Decimal(str(amount_min)) if amount_min else None,
            amount_max=Decimal(str(amount_max)) if amount_max else None,
        )

        # Get statistics
        stats = await service.get_pending_fees_summary_stats(filters)

        return stats

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in pending fees stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/fee-structure", response_model=ReportResponse)
async def get_fee_structure(
    request: Request,
    academic_year_id: UUID = None,
    fee_category_id: UUID = None,
    fee_type_id: UUID = None,
    class_id: UUID = None,
    page: int = 1,
    page_size: int = 100,
    sort_by: str = None,
    sort_order: str = "asc",
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user),
):
    """Get fee structure report"""
    try:
        # Check permissions - handle SuperAdmin users
        if current_user.get("is_superadmin"):
            # SuperAdmin bypasses permission checks
            pass
        else:
            role = current_user.get("role")
            await check_role_plan_permission_with_error(db, request, role, "fee_reports", "read")

        # Get user info
        user_id_str = current_user.get("sub")
        client_name = getattr(request.state, "client_name", None)
        tenant_id = await TenantService.get_tenant_schema(client_name)

        # Convert user_id to UUID
        from uuid import UUID

        user_id = UUID(user_id_str)

        # Create service
        service = FeeReportService(db, user_id, tenant_id)

        # Create filters
        filters = FeeStructureFilter(
            academic_year_id=academic_year_id,
            fee_category_id=fee_category_id,
            fee_type_id=fee_type_id,
            class_id=class_id,
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            sort_order=sort_order,
        )

        # Get data
        data, total_count = await service.get_fee_structure(filters)

        # Calculate pagination
        total_pages = (total_count + page_size - 1) // page_size

        return ReportResponse(
            data=data, total_count=total_count, page=page, page_size=page_size, total_pages=total_pages
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in fee structure: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/fee-structure/stats", response_model=FeeStructureSummary)
async def get_fee_structure_stats(
    request: Request,
    academic_year_id: UUID = None,
    fee_category_id: UUID = None,
    fee_type_id: UUID = None,
    class_id: UUID = None,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user),
):
    """Get fee structure statistics"""
    try:
        # Check permissions - handle SuperAdmin users
        if current_user.get("is_superadmin"):
            # SuperAdmin bypasses permission checks
            pass
        else:
            role = current_user.get("role")
            await check_role_plan_permission_with_error(db, request, role, "fee_reports", "read")

        # Get user info
        user_id_str = current_user.get("sub")
        client_name = getattr(request.state, "client_name", None)
        tenant_id = await TenantService.get_tenant_schema(client_name)

        # Convert user_id to UUID
        from uuid import UUID

        user_id = UUID(user_id_str)

        # Create service
        service = FeeReportService(db, user_id, tenant_id)

        # Create filters
        filters = FeeStructureFilter(
            academic_year_id=academic_year_id,
            fee_category_id=fee_category_id,
            fee_type_id=fee_type_id,
            class_id=class_id,
        )

        # Get statistics
        stats = await service.get_fee_structure_summary_stats(filters)

        return stats

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in fee structure stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/export")
async def export_fee_report(
    export_request: ExportRequest,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user),
):
    """Export fee report in specified format"""
    try:
        # Check permissions
        role = current_user.get("role")
        await check_role_plan_permission_with_error(db, request, role, "fee_reports", "export")

        # Get user info
        user_id_str = current_user.get("sub")
        client_name = getattr(request.state, "client_name", None)
        tenant_id = await TenantService.get_tenant_schema(client_name)

        # Convert user_id to UUID
        from uuid import UUID

        user_id = UUID(user_id_str)

        # Create service
        service = FeeReportService(db, user_id, tenant_id)

        # Support CSV, Excel, and PDF export
        if export_request.format not in ["csv", "xlsx", "pdf"]:
            raise HTTPException(
                status_code=400, detail="Only CSV, Excel (.xlsx), and PDF export are currently supported"
            )

        # Get data based on report type
        data = []
        total_count = 0

        if export_request.report_type == "fee_collection_summary":
            filters = FeeCollectionSummaryFilter(
                **{**export_request.filters, "date_to": _parse_date_to(export_request.filters.get("date_to"))}
            )
            data, total_count = await _fetch_all_rows(service.get_fee_collection_summary, filters)
        elif export_request.report_type == "pending_fees":
            filters = PendingFeesFilter(**export_request.filters)
            data, total_count = await _fetch_all_rows(service.get_pending_fees, filters)
        elif export_request.report_type == "fee_structure":
            filters = FeeStructureFilter(**export_request.filters)
            data, total_count = await _fetch_all_rows(service.get_fee_structure, filters)
        else:
            raise HTTPException(status_code=400, detail="Unsupported fee report type")

        base_filename = export_request.filename or f"fee_{export_request.report_type}_{tenant_id}"

        if export_request.format == "csv":
            export_content, filename = await service.generate_csv_export(data, base_filename)
            content_type = "text/csv"
        elif export_request.format == "xlsx":
            export_content, filename = await service.generate_excel_export(
                data, base_filename, sheet_name=f"Fee {export_request.report_type.replace('_', ' ').title()}"
            )
            content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        elif export_request.format == "pdf":
            export_content, filename = await service.generate_pdf_export(
                data,
                base_filename,
                title=f"Fee {export_request.report_type.replace('_', ' ').title()}",
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
        logger.error(f"Error in fee report export: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

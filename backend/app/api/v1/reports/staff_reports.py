import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db, get_tenant_id_from_request
from app.schemas.reports.report_schemas import ExportRequest, ReportResponse, StaffSummaryFilter
from app.service.reports.staff_report_service import StaffReportService
from app.tools.simple_permissions import (
    check_role_plan_permission_with_error,
    get_current_user,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/summary", response_model=ReportResponse)
async def get_staff_summary(
    request: Request,
    academic_year_id: UUID | None = Query(None),
    department_id: UUID | None = Query(None),
    gender: str | None = Query(None),
    caste: str | None = Query(None),
    employment_type: str | None = Query(None),
    address_city: str | None = Query(None),
    subject_id: UUID | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=1000),
    sort_by: str | None = Query(None),
    sort_order: str = Query("asc", pattern="^(asc|desc)$"),
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user),
):
    """Get staff summary report with filters and pagination"""
    try:
        # Get current user and check permissions
        role = current_user.get("role")
        await check_role_plan_permission_with_error(db, request, role, "staff_reports", "read")

        # Get user info from current_user
        user_id = current_user.get("sub")
        tenant_id = get_tenant_id_from_request(request)

        # Create filters object
        filters = StaffSummaryFilter(
            academic_year_id=academic_year_id,
            department_id=department_id,
            gender=gender,
            caste=caste,
            employment_type=employment_type,
            address_city=address_city,
            subject_id=subject_id,
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            sort_order=sort_order,
        )

        # Create service and get data
        service = StaffReportService(db, user_id, tenant_id)
        data, total_count = await service.get_staff_summary(filters)

        # Calculate total pages
        total_pages = (total_count + page_size - 1) // page_size

        return ReportResponse(
            data=data, total_count=total_count, page=page, page_size=page_size, total_pages=total_pages
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in staff summary report: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/details/{staff_id}")
async def get_staff_details(
    staff_id: UUID,
    academic_year_id: UUID | None = Query(None),
    request: Request = None,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user),
):
    """Get individual staff details"""
    try:
        # Get current user and check permissions
        role = current_user.get("role")
        await check_role_plan_permission_with_error(db, request, role, "staff_reports", "read")

        # Get user info from current_user
        user_id = current_user.get("sub")
        tenant_id = get_tenant_id_from_request(request)

        # Create service and get data
        service = StaffReportService(db, user_id, tenant_id)
        data = await service.get_individual_staff_details(staff_id, academic_year_id)

        if not data:
            raise HTTPException(status_code=404, detail="Staff not found")

        return {"data": data}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in staff details report: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/export")
async def export_staff_report(
    export_request: ExportRequest,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user),
):
    """Export staff report in specified format"""
    try:
        # Get current user and check permissions
        role = current_user.get("role")
        await check_role_plan_permission_with_error(db, request, role, "staff_reports", "export")

        # Get user info from current_user
        user_id_str = current_user.get("sub")
        tenant_id = get_tenant_id_from_request(request)

        # Convert user_id to UUID
        from uuid import UUID

        user_id = UUID(user_id_str)

        # Create service
        service = StaffReportService(db, user_id, tenant_id)

        # Support CSV, Excel, and PDF export
        if export_request.format not in ["csv", "xlsx", "pdf"]:
            raise HTTPException(
                status_code=400, detail="Only CSV, Excel (.xlsx), and PDF export are currently supported"
            )

        # Get data based on report type
        if export_request.report_type == "staff_summary":
            filters = StaffSummaryFilter(**export_request.filters)
            data, total_count = await service.fetch_all_rows(service.get_staff_summary, filters)
        else:
            raise HTTPException(status_code=400, detail="Unsupported report type")

        base_filename = export_request.filename or f"staff_{export_request.report_type}_{tenant_id}"

        if export_request.format == "csv":
            export_content, filename = await service.generate_csv_export(data, base_filename)
            content_type = "text/csv"
        elif export_request.format == "xlsx":
            export_content, filename = await service.generate_excel_export(
                data, base_filename, sheet_name="Staff Report"
            )
            content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        elif export_request.format == "pdf":
            export_content, filename = await service.generate_pdf_export(
                data,
                base_filename,
                title="Staff Report",
                subtitle=f"Report Type: {export_request.report_type.replace('_', ' ').title()}",
            )
            content_type = "application/pdf"

        # Export completed successfully

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
        logger.error(f"Error in staff report export: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

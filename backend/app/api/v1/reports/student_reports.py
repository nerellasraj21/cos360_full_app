import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db, get_tenant_id_from_request
from app.schemas.reports.report_schemas import ExportRequest, ReportResponse, StudentSummaryFilter
from app.service.reports.student_report_service import StudentReportService
from app.tools.simple_permissions import (
    check_role_plan_permission_with_error,
    get_current_user,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/summary", response_model=ReportResponse)
async def get_student_summary(
    request: Request,
    academic_year_id: UUID | None = Query(None),
    class_id: UUID | None = Query(None),
    section_id: UUID | None = Query(None),
    gender: str | None = Query(None),
    caste: str | None = Query(None),
    religion: str | None = Query(None),
    student_type: str | None = Query(None),
    address_city: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=1000),
    sort_by: str | None = Query(None),
    sort_order: str = Query("asc", pattern="^(asc|desc)$"),
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user),
):
    """Get student summary report with filters and pagination"""
    try:
        # Get current user and check permissions
        role = current_user.get("role")
        await check_role_plan_permission_with_error(db, request, role, "student_reports", "read")

        # Get user info from current_user
        user_id = current_user.get("sub")
        tenant_id = get_tenant_id_from_request(request)

        # Create filters object
        filters = StudentSummaryFilter(
            academic_year_id=academic_year_id,
            class_id=class_id,
            section_id=section_id,
            gender=gender,
            caste=caste,
            religion=religion,
            student_type=student_type,
            address_city=address_city,
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            sort_order=sort_order,
        )

        # Create service and get data
        service = StudentReportService(db, user_id, tenant_id)
        data, total_count = await service.get_student_summary(filters)

        # Calculate total pages
        total_pages = (total_count + page_size - 1) // page_size

        return ReportResponse(
            data=data, total_count=total_count, page=page, page_size=page_size, total_pages=total_pages
        )

    except Exception as e:
        logger.error(f"Error in student summary report: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/details/{student_id}")
async def get_student_details(
    student_id: UUID,
    academic_year_id: UUID | None = Query(None),
    request: Request = None,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user),
):
    """Get individual student details"""
    try:
        # Get current user and check permissions
        role = current_user.get("role")
        await check_role_plan_permission_with_error(db, request, role, "student_reports", "read")

        # Get user info from current_user
        user_id = current_user.get("sub")
        tenant_id = get_tenant_id_from_request(request)

        # Create service and get data
        service = StudentReportService(db, user_id, tenant_id)
        data = await service.get_individual_student_details(student_id, academic_year_id)

        if not data:
            raise HTTPException(status_code=404, detail="Student not found")

        return {"data": data}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in student details report: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/export")
async def export_student_report(
    export_request: ExportRequest,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user),
):
    """Export student report in specified format"""
    try:
        # Get current user and check permissions
        role = current_user.get("role")
        await check_role_plan_permission_with_error(db, request, role, "student_reports", "export")

        # Get user info from current_user
        user_id_str = current_user.get("sub")
        tenant_id = get_tenant_id_from_request(request)

        # Convert user_id to UUID
        from uuid import UUID

        user_id = UUID(user_id_str)

        # Create service
        service = StudentReportService(db, user_id, tenant_id)

        # Support CSV, Excel, and PDF export
        if export_request.format not in ["csv", "xlsx", "pdf"]:
            raise HTTPException(
                status_code=400, detail="Only CSV, Excel (.xlsx), and PDF export are currently supported"
            )

        # Get data based on report type
        if export_request.report_type == "student_summary":
            filters = StudentSummaryFilter(**export_request.filters)
            data, total_count = await service.fetch_all_rows(service.get_student_summary, filters)
        else:
            raise HTTPException(status_code=400, detail="Unsupported report type")

        base_filename = export_request.filename or f"student_{export_request.report_type}_{tenant_id}"

        if export_request.format == "csv":
            export_content, filename = await service.generate_csv_export(data, base_filename)
            content_type = "text/csv"
        elif export_request.format == "xlsx":
            export_content, filename = await service.generate_excel_export(
                data, base_filename, sheet_name="Student Report"
            )
            content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        elif export_request.format == "pdf":
            export_content, filename = await service.generate_pdf_export(
                data,
                base_filename,
                title="Student Report",
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
        logger.error(f"Error in student report export: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

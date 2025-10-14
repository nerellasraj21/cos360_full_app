from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, Optional
from uuid import UUID

from app.db.tenant_session import get_tenant_db
from app.service.reports.staff_report_service import StaffReportService
from app.schemas.reports.report_schemas import (
    StaffSummaryFilter,
    ReportResponse,
    ExportRequest,
    ExportResponse
)
from app.tools.simple_permissions import RequireRead, RequireCreate, RequireUpdate, RequireDelete, RequireList, get_current_user, check_role_plan_permission_with_error
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/summary", response_model=ReportResponse)
async def get_staff_summary(
    request: Request,
    academic_year_id: Optional[UUID] = Query(None),
    department_id: Optional[UUID] = Query(None),
    gender: Optional[str] = Query(None),
    caste: Optional[str] = Query(None),
    employment_type: Optional[str] = Query(None),
    address_city: Optional[str] = Query(None),
    subject_id: Optional[UUID] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=1000),
    sort_by: Optional[str] = Query(None),
    sort_order: str = Query("asc", pattern="^(asc|desc)$"),
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user)
):
    """Get staff summary report with filters and pagination"""
    try:
        # Get current user and check permissions
        role = current_user.get('role')
        await check_role_plan_permission_with_error(db, request, role, 'staff_reports', 'read')
        
        # Get user info from current_user
        user_id = current_user.get('sub')
        tenant_id = getattr(request.state, 'schema_name', None)

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
            sort_order=sort_order
        )

        # Create service and get data
        service = StaffReportService(db, user_id, tenant_id)
        data, total_count = await service.get_staff_summary(filters)

        # Calculate total pages
        total_pages = (total_count + page_size - 1) // page_size

        return ReportResponse(
            data=data,
            total_count=total_count,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )

    except Exception as e:
        logger.error(f"Error in staff summary report: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/details/{staff_id}")
async def get_staff_details(
    staff_id: UUID,
    academic_year_id: Optional[UUID] = Query(None),
    request: Request = None,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user)
):
    """Get individual staff details"""
    try:
        # Get current user and check permissions
        role = current_user.get('role')
        await check_role_plan_permission_with_error(db, request, role, 'staff_reports', 'read')
        
        # Get user info from current_user
        user_id = current_user.get('sub')
        tenant_id = getattr(request.state, 'schema_name', None)

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
    current_user: dict = Depends(get_current_user)
):
    """Export staff report in specified format"""
    try:
        # Get current user and check permissions
        role = current_user.get('role')
        await check_role_plan_permission_with_error(db, request, role, 'staff_reports', 'export')
        
        # Get user info from current_user
        user_id_str = current_user.get('sub')
        tenant_id = getattr(request.state, 'schema_name', None)

        # Convert user_id to UUID
        from uuid import UUID
        user_id = UUID(user_id_str)

        # Create service
        service = StaffReportService(db, user_id, tenant_id)

        # Support CSV, Excel, and PDF export
        if export_request.format not in ["csv", "xlsx", "pdf"]:
            raise HTTPException(status_code=400, detail="Only CSV, Excel (.xlsx), and PDF export are currently supported")

        # Get data based on report type
        if export_request.report_type == "staff_summary":
            filters = StaffSummaryFilter(**export_request.filters)
            data, total_count = await service.get_staff_summary(filters)
        else:
            raise HTTPException(status_code=400, detail="Unsupported report type")

        # Check if we should use background job
        if service.should_use_background_job(total_count, export_request.format):
            # Use background job for large exports
            base_filename = export_request.filename or f"staff_{export_request.report_type}_{tenant_id}"
            
            job_id, audit_id = await service.create_background_export_job(
                report_type=export_request.report_type,
                filters=export_request.filters,
                export_format=export_request.format,
                filename=base_filename,
                user_id=user_id,
                tenant_id=tenant_id
            )
            
            return {
                "message": "Export job started",
                "job_id": job_id,
                "audit_id": audit_id,
                "is_background": True,
                "estimated_completion": "5-10 minutes",
                "status_endpoint": f"/api/v1/reports/export-status/{audit_id}"
            }
        
        # Generate export based on format (synchronous for small datasets)
        base_filename = export_request.filename or f"staff_{export_request.report_type}_{tenant_id}"

        if export_request.format == "csv":
            export_content, filename = await service.generate_csv_export(data, base_filename)
            content_type = "text/csv"
        elif export_request.format == "xlsx":
            export_content, filename = await service.generate_excel_export(
                data,
                base_filename,
                sheet_name="Staff Report"
            )
            content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        elif export_request.format == "pdf":
            export_content, filename = await service.generate_pdf_export(
                data,
                base_filename,
                title="Staff Report",
                subtitle=f"Report Type: {export_request.report_type.replace('_', ' ').title()}"
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
                "Content-Length": str(len(export_content))
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in staff report export: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

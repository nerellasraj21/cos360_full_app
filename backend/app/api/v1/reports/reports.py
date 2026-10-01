import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db, get_tenant_id_from_request
from app.schemas.reports.report_schemas import ReportAuditResponse
from app.service.reports.base_report_service import BaseReportService
from app.tools.simple_permissions import (
    check_role_plan_permission_with_error,
    get_current_user,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/audit", response_model=list[ReportAuditResponse])
async def get_export_history(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    status: str | None = Query(None),
    report_type: str | None = Query(None),
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user),
):
    """Get export history for the current user"""
    try:
        # Get current user and check permissions
        role = current_user.get("role")
        await check_role_plan_permission_with_error(db, request, role, "reports", "read")

        # Get user info from current_user
        user_id = current_user.get("sub")
        tenant_id = get_tenant_id_from_request(request)

        # Create service
        service = BaseReportService(db, user_id, tenant_id)

        # Build query
        from sqlalchemy import and_, select

        from app.models.reports.report_audit import ReportAudit

        query = select(ReportAudit).where(and_(ReportAudit.user_id == user_id, ReportAudit.tenant_id == tenant_id))

        if status:
            query = query.where(ReportAudit.status == status)
        if report_type:
            query = query.where(ReportAudit.report_type == report_type)

        # Apply pagination
        query, _ = service.apply_pagination(query, page, page_size)

        # Apply sorting (newest first)
        query = query.order_by(ReportAudit.created_at.desc())

        # Execute query
        result = await db.execute(query)
        audit_records = result.scalars().all()

        # Convert to response format
        response_data = []
        for record in audit_records:
            filters_dict = None
            if record.filters_applied:
                import json

                try:
                    filters_dict = json.loads(record.filters_applied)
                except Exception:
                    filters_dict = None

            response_data.append(
                ReportAuditResponse(
                    id=record.id,
                    user_id=record.user_id,
                    tenant_id=record.tenant_id,
                    report_type=record.report_type,
                    filters_applied=filters_dict,
                    export_format=record.export_format,
                    file_path=record.file_path,
                    file_size=record.file_size,
                    status=record.status,
                    error_message=record.error_message,
                    created_at=record.created_at,
                    updated_at=record.updated_at,
                    completed_at=record.completed_at,
                    is_background_job=record.is_background_job,
                )
            )

        return response_data

    except Exception as e:
        logger.error(f"Error in export history: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/audit/{audit_id}", response_model=ReportAuditResponse)
async def get_export_status(
    audit_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user),
):
    """Get specific export status by audit ID"""
    try:
        # Get current user and check permissions
        role = current_user.get("role")
        await check_role_plan_permission_with_error(db, request, role, "reports", "read")

        # Get user info from current_user
        user_id = current_user.get("sub")
        tenant_id = get_tenant_id_from_request(request)

        # Create service
        BaseReportService(db, user_id, tenant_id)

        # Query for specific audit record
        from sqlalchemy import and_, select

        from app.models.reports.report_audit import ReportAudit

        query = select(ReportAudit).where(
            and_(ReportAudit.id == audit_id, ReportAudit.user_id == user_id, ReportAudit.tenant_id == tenant_id)
        )

        result = await db.execute(query)
        record = result.scalar_one_or_none()

        if not record:
            raise HTTPException(status_code=404, detail="Export record not found")

        # Convert to response format
        filters_dict = None
        if record.filters_applied:
            import json

            try:
                filters_dict = json.loads(record.filters_applied)
            except Exception:
                filters_dict = None

        return ReportAuditResponse(
            id=record.id,
            user_id=record.user_id,
            tenant_id=record.tenant_id,
            report_type=record.report_type,
            filters_applied=filters_dict,
            export_format=record.export_format,
            file_path=record.file_path,
            file_size=record.file_size,
            status=record.status,
            error_message=record.error_message,
            created_at=record.created_at,
            updated_at=record.updated_at,
            completed_at=record.completed_at,
            is_background_job=record.is_background_job,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in export status: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/download/{audit_id}")
async def download_export_file(
    audit_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user),
):
    """Download completed export file"""
    try:
        # Get current user and check permissions
        role = current_user.get("role")
        await check_role_plan_permission_with_error(db, request, role, "reports", "read")

        # Get user info from current_user
        user_id = current_user.get("sub")
        tenant_id = get_tenant_id_from_request(request)

        # Query for specific audit record
        from sqlalchemy import and_, select

        from app.models.reports.report_audit import ReportAudit

        query = select(ReportAudit).where(
            and_(ReportAudit.id == audit_id, ReportAudit.user_id == user_id, ReportAudit.tenant_id == tenant_id)
        )

        result = await db.execute(query)
        record = result.scalar_one_or_none()

        if not record:
            raise HTTPException(status_code=404, detail="Export record not found")

        if record.status != "completed":
            raise HTTPException(status_code=400, detail=f"Export is not completed. Current status: {record.status}")

        if not record.file_path:
            raise HTTPException(status_code=404, detail="Export file not found")

        # Read file and return
        import os

        if not os.path.exists(record.file_path):
            raise HTTPException(status_code=404, detail="Export file not found on disk")

        with open(record.file_path, "rb") as f:
            file_content = f.read()

        # Determine content type
        content_type_map = {
            "csv": "text/csv",
            "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "pdf": "application/pdf",
        }

        file_ext = record.export_format
        content_type = content_type_map.get(file_ext, "application/octet-stream")

        # Get filename from path
        filename = os.path.basename(record.file_path)

        from fastapi.responses import Response

        return Response(
            content=file_content,
            media_type=content_type,
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Length": str(len(file_content)),
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in download export: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

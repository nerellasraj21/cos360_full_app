"""
Background tasks for report generation
"""
import os
import json
import logging
from typing import Dict, Any, List
from datetime import datetime
from uuid import UUID
from celery import current_task

from app.celery_app import celery_app
from app.service.reports.student_report_service import StudentReportService
from app.service.reports.staff_report_service import StaffReportService
from app.schemas.reports.report_schemas import StudentSummaryFilter, StaffSummaryFilter
from app.db.session import get_public_db
from app.models.reports.report_audit import ReportAudit
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="generate_student_report_export")
def generate_student_report_export(
    self,
    audit_id: str,
    user_id: str,
    tenant_id: str,
    report_type: str,
    filters: Dict[str, Any],
    export_format: str,
    filename: str
) -> Dict[str, Any]:
    """
    Background task to generate student report exports
    """
    try:
        # Update task status to processing
        update_audit_status(audit_id, "processing")
        
        # Create database session
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                _generate_student_report_async(
                    audit_id, user_id, tenant_id, report_type, 
                    filters, export_format, filename
                )
            )
            return result
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"Error in student report export task: {str(e)}")
        update_audit_status(audit_id, "failed", error_message=str(e))
        return {"status": "failed", "error": str(e)}


@celery_app.task(bind=True, name="generate_staff_report_export")
def generate_staff_report_export(
    self,
    audit_id: str,
    user_id: str,
    tenant_id: str,
    report_type: str,
    filters: Dict[str, Any],
    export_format: str,
    filename: str
) -> Dict[str, Any]:
    """
    Background task to generate staff report exports
    """
    try:
        # Update task status to processing
        update_audit_status(audit_id, "processing")
        
        # Create database session
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                _generate_staff_report_async(
                    audit_id, user_id, tenant_id, report_type, 
                    filters, export_format, filename
                )
            )
            return result
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"Error in staff report export task: {str(e)}")
        update_audit_status(audit_id, "failed", error_message=str(e))
        return {"status": "failed", "error": str(e)}


async def _generate_student_report_async(
    audit_id: str,
    user_id: str,
    tenant_id: str,
    report_type: str,
    filters: Dict[str, Any],
    export_format: str,
    filename: str
) -> Dict[str, Any]:
    """
    Async function to generate student report
    """
    from app.db.tenant_session import get_tenant_db
    
    async with get_tenant_db(tenant_id) as db:
        # Create service
        service = StudentReportService(db, UUID(user_id), tenant_id)
        
        # Get data based on report type
        if report_type == "student_summary":
            filter_obj = StudentSummaryFilter(**filters)
            data, total_count = await service.get_student_summary(filter_obj)
        else:
            raise ValueError(f"Unsupported report type: {report_type}")
        
        # Generate export
        if export_format == "csv":
            export_content, final_filename = await service.generate_csv_export(data, filename)
        elif export_format == "xlsx":
            export_content, final_filename = await service.generate_excel_export(
                data, filename, sheet_name="Student Report"
            )
        elif export_format == "pdf":
            export_content, final_filename = await service.generate_pdf_export(
                data, filename, 
                title="Student Report",
                subtitle=f"Report Type: {report_type.replace('_', ' ').title()}"
            )
        else:
            raise ValueError(f"Unsupported export format: {export_format}")
        
        # Save file
        file_path = await save_export_file(final_filename, export_content, tenant_id)
        
        # Update audit with success
        await update_audit_status_async(
            audit_id, "completed", 
            file_path=file_path, 
            file_size=len(export_content)
        )
        
        return {
            "status": "completed",
            "file_path": file_path,
            "file_size": len(export_content),
            "filename": final_filename
        }


async def _generate_staff_report_async(
    audit_id: str,
    user_id: str,
    tenant_id: str,
    report_type: str,
    filters: Dict[str, Any],
    export_format: str,
    filename: str
) -> Dict[str, Any]:
    """
    Async function to generate staff report
    """
    from app.db.tenant_session import get_tenant_db
    
    async with get_tenant_db(tenant_id) as db:
        # Create service
        service = StaffReportService(db, UUID(user_id), tenant_id)
        
        # Get data based on report type
        if report_type == "staff_summary":
            filter_obj = StaffSummaryFilter(**filters)
            data, total_count = await service.get_staff_summary(filter_obj)
        else:
            raise ValueError(f"Unsupported report type: {report_type}")
        
        # Generate export
        if export_format == "csv":
            export_content, final_filename = await service.generate_csv_export(data, filename)
        elif export_format == "xlsx":
            export_content, final_filename = await service.generate_excel_export(
                data, filename, sheet_name="Staff Report"
            )
        elif export_format == "pdf":
            export_content, final_filename = await service.generate_pdf_export(
                data, filename, 
                title="Staff Report",
                subtitle=f"Report Type: {report_type.replace('_', ' ').title()}"
            )
        else:
            raise ValueError(f"Unsupported export format: {export_format}")
        
        # Save file
        file_path = await save_export_file(final_filename, export_content, tenant_id)
        
        # Update audit with success
        await update_audit_status_async(
            audit_id, "completed", 
            file_path=file_path, 
            file_size=len(export_content)
        )
        
        return {
            "status": "completed",
            "file_path": file_path,
            "file_size": len(export_content),
            "filename": final_filename
        }


async def save_export_file(filename: str, content: bytes, tenant_id: str) -> str:
    """
    Save export file to disk and return the file path
    """
    # Create tenant-specific export directory
    export_dir = f"exports/{tenant_id}"
    os.makedirs(export_dir, exist_ok=True)
    
    # Generate unique filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    name, ext = os.path.splitext(filename)
    unique_filename = f"{name}_{timestamp}{ext}"
    
    file_path = os.path.join(export_dir, unique_filename)
    
    # Save file
    with open(file_path, "wb") as f:
        f.write(content)
    
    return file_path


def update_audit_status(audit_id: str, status: str, error_message: str = None, 
                       file_path: str = None, file_size: int = None):
    """
    Update audit status (sync version for Celery tasks)
    """
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        loop.run_until_complete(
            update_audit_status_async(audit_id, status, error_message, file_path, file_size)
        )
    finally:
        loop.close()


async def update_audit_status_async(audit_id: str, status: str, error_message: str = None, 
                                   file_path: str = None, file_size: int = None):
    """
    Update audit status in database
    """
    async with get_public_db() as db:
        update_data = {
            "status": status,
            "updated_at": datetime.utcnow()
        }
        
        if error_message:
            update_data["error_message"] = error_message
        
        if file_path:
            update_data["file_path"] = file_path
            
        if file_size:
            update_data["file_size"] = file_size
            
        if status == "completed":
            update_data["completed_at"] = datetime.utcnow()
        
        # Update the audit record
        stmt = (
            update(ReportAudit)
            .where(ReportAudit.id == UUID(audit_id))
            .values(**update_data)
        )
        
        await db.execute(stmt)
        await db.commit()

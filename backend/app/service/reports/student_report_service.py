from typing import Dict, List, Any, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, func
from app.service.reports.base_report_service import BaseReportService
from app.schemas.reports.report_schemas import StudentSummaryFilter, StudentSummaryData
from app.models.masters.admission_model import Admission
from app.models.masters.class_model import Class
from app.models.masters.sections_model import Section
from app.models.masters.academic_year_model import AcademicYear
import logging
from uuid import UUID

logger = logging.getLogger(__name__)


class StudentReportService(BaseReportService):
    def __init__(self, db: AsyncSession, user_id: UUID, tenant_id: str):
        super().__init__(db, user_id, tenant_id)

    async def get_student_summary(
        self,
        filters: StudentSummaryFilter
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Get student summary report data"""
        
        # Build base query
        query = select(
            Admission.id,
            Admission.admission_number,
            Admission.student_id,
            Class.name.label('class_name'),
            Section.name.label('section_name'),
                AcademicYear.title.label('academic_year'),
            Admission.address_line1,
            Admission.city
        ).select_from(
            Admission.__table__
            .join(Class.__table__, Admission.current_class_id == Class.id)
            .join(Section.__table__, Admission.current_section_id == Section.id)
            .join(AcademicYear.__table__, Admission.academic_year_id == AcademicYear.id)
        )

        # Apply filters
        filter_mappings = {
            'academic_year_id': Admission.academic_year_id,
            'class_id': Admission.current_class_id,
            'section_id': Admission.current_section_id,
            'address_city': Admission.city
        }

        query = self.apply_filters(query, filters.dict(exclude_none=True), filter_mappings)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total_count = total_result.scalar()

        # Apply pagination
        query, page_size = self.apply_pagination(query, filters.page, filters.page_size)

        # Apply sorting
        query = self.apply_sorting(query, filters.sort_by, filters.sort_order)

        # Execute query
        result = await self.db.execute(query)
        rows = result.fetchall()

        # Format data
        data = []
        for i, row in enumerate(rows, start=(filters.page - 1) * filters.page_size + 1):
            data.append({
                'sl_no': i,
                'admission_no': row.admission_number,
                'student_id': str(row.student_id),
                'class_section': f"{row.class_name}-{row.section_name}",
                'address': row.address_line1,
                'city': row.city,
                'academic_year': row.academic_year
            })

        return data, total_count

    async def get_individual_student_details(
        self,
        student_id: UUID,
        academic_year_id: Optional[UUID] = None
    ) -> Optional[Dict[str, Any]]:
        """Get individual student details"""
        
        query = select(
            Admission.id,
            Admission.admission_number,
            Admission.student_id,
            Admission.admission_date,
            Admission.address_line1,
            Admission.address_line2,
            Admission.city,
            Admission.state,
            Admission.previous_school_name,
            Admission.previous_class,
            Class.name.label('class_name'),
            Section.name.label('section_name'),
                AcademicYear.title.label('academic_year')
        ).select_from(
            Admission.__table__
            .join(Class.__table__, Admission.current_class_id == Class.id)
            .join(Section.__table__, Admission.current_section_id == Section.id)
            .join(AcademicYear.__table__, Admission.academic_year_id == AcademicYear.id)
        ).where(
            Admission.student_id == student_id
        )

        if academic_year_id:
            query = query.where(Admission.academic_year_id == academic_year_id)

        result = await self.db.execute(query)
        row = result.fetchone()

        if not row:
            return None

        return {
            'id': str(row.id),
            'admission_number': row.admission_number,
            'student_id': str(row.student_id),
            'admission_date': row.admission_date.isoformat() if row.admission_date else None,
            'address_line1': row.address_line1,
            'address_line2': row.address_line2,
            'city': row.city,
            'state': row.state,
            'previous_school_name': row.previous_school_name,
            'previous_class': row.previous_class,
            'class_name': row.class_name,
            'section_name': row.section_name,
            'academic_year': row.academic_year
        }

    async def get_student_attendance_summary(
        self,
        filters: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Get student attendance summary"""
        
        # This would require attendance table implementation
        # For now, return empty list as placeholder
        logger.info("Student attendance summary requested - requires attendance module")
        return []

from typing import Dict, List, Any, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, func
from app.service.reports.base_report_service import BaseReportService
from app.schemas.reports.report_schemas import StaffSummaryFilter, StaffSummaryData
from app.models.masters.staff_model import Staff
from app.models.masters.designations_model import Designation
from app.models.masters.academic_year_model import AcademicYear
import logging
from uuid import UUID

logger = logging.getLogger(__name__)


class StaffReportService(BaseReportService):
    def __init__(self, db: AsyncSession, user_id: UUID, tenant_id: str):
        super().__init__(db, user_id, tenant_id)

    async def get_staff_summary(
        self,
        filters: StaffSummaryFilter
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Get staff summary report data"""
        
        # Build base query
        query = select(
            Staff.id,
            Staff.first_name,
            Staff.last_name,
            Staff.email,
            Staff.phone,
            Staff.address,
            Staff.gender,
            Staff.department,
            Staff.is_active,
            Designation.title.label('designation_name')
        ).select_from(
            Staff.__table__
            .join(Designation.__table__, Staff.designation_id == Designation.id)
        )

        # Apply filters
        filter_mappings = {
            'gender': Staff.gender,
            'department': Staff.department
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
                'staff_id': str(row.id),
                'full_name': f"{row.first_name} {row.last_name}",
                'department': row.department,
                'designation': row.designation_name,
                'email': row.email,
                'phone': row.phone,
                'address': row.address,
                'gender': row.gender,
                'is_active': row.is_active,
                'academic_year': 'N/A'
            })

        return data, total_count

    async def get_individual_staff_details(
        self,
        staff_id: UUID,
        academic_year_id: Optional[UUID] = None
    ) -> Optional[Dict[str, Any]]:
        """Get individual staff details"""
        
        query = select(
            Staff.id,
            Staff.first_name,
            Staff.last_name,
            Staff.email,
            Staff.phone,
            Staff.address,
            Staff.date_of_birth,
            Staff.gender,
            Staff.qualification,
            Staff.experience_years,
            Staff.joining_date,
            Staff.is_active,
            Staff.department,
            Designation.title.label('designation_name')
        ).select_from(
            Staff.__table__
            .join(Designation.__table__, Staff.designation_id == Designation.id)
        ).where(
            Staff.id == staff_id
        )

        result = await self.db.execute(query)
        row = result.fetchone()

        if not row:
            return None

        return {
            'id': str(row.id),
            'full_name': f"{row.first_name} {row.last_name}",
            'first_name': row.first_name,
            'last_name': row.last_name,
            'email': row.email,
            'phone': row.phone,
            'address': row.address,
            'date_of_birth': row.date_of_birth.isoformat() if row.date_of_birth else None,
            'gender': row.gender,
            'qualification': row.qualification,
            'experience_years': row.experience_years,
            'joining_date': row.joining_date.isoformat() if row.joining_date else None,
            'is_active': row.is_active,
            'department': row.department,
            'designation_name': row.designation_name,
            'academic_year': 'N/A'
        }

    async def get_staff_attendance_summary(
        self,
        filters: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Get staff attendance summary"""
        
        # This would require attendance table implementation
        # For now, return empty list as placeholder
        logger.info("Staff attendance summary requested - requires attendance module")
        return []

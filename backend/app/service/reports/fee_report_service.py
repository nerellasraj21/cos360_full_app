"""
Service for generating fee-related reports
"""

from datetime import datetime, timedelta
from decimal import Decimal
import logging
from typing import Any

from sqlalchemy import and_, asc, desc, func, select

from app.models.fee.fee_category_model import FeeCategory
from app.models.fee.fee_class_mapping_model import FeeClassMapping
from app.models.fee.fee_student_map_term_amount_model import FeeStudentMapTermAmount
from app.models.fee.fee_student_mapping_model import FeeStudentMapping
from app.models.fee.fee_term_model import FeeTerm
from app.models.fee.fee_transaction_item_model import FeeTransactionItem
from app.models.fee.fee_transaction_model import FeeTransaction
from app.models.fee.fee_type_model import FeeType
from app.models.masters.academic_year_model import AcademicYear
from app.models.masters.admission_model import Admission
from app.models.masters.class_model import Class
from app.models.masters.sections_model import Section
from app.models.student.student_model import Student
from app.schemas.reports.fee_report_schemas import (
    FeeCollectionSummary,
    FeeCollectionSummaryFilter,
    FeeStructureFilter,
    FeeStructureSummary,
    PendingFeesFilter,
    PendingFeesSummary,
)
from app.service.reports.base_report_service import BaseReportService

logger = logging.getLogger(__name__)


class FeeReportService(BaseReportService):
    """Service for generating fee-related reports"""

    async def get_fee_collection_summary(self, filters: FeeCollectionSummaryFilter) -> tuple[list[dict[str, Any]], int]:
        """Get fee collection summary report data"""
        try:
            # Base query with joins
            query = (
                select(
                    FeeTransaction.id,
                    FeeTransaction.transaction_number,
                    FeeTransaction.student_admission_num,
                    FeeTransaction.total_amount,
                    FeeTransaction.payment_method,
                    FeeTransaction.status,
                    FeeTransaction.created_at,
                    FeeTransaction.collected_by_user_id,
                    FeeTransactionItem.amount_due,
                    FeeTransactionItem.amount_paid,
                    FeeTransactionItem.fee_type_id,
                    FeeTransactionItem.fee_term_id,
                    FeeType.type_name.label("fee_type_name"),
                    FeeCategory.category_name.label("fee_category_name"),
                    FeeTerm.term_name.label("fee_term_name"),
                    func.concat(Student.first_name, " ", Student.last_name).label("student_name"),
                    Class.name.label("class_name"),
                    Section.name.label("section_name"),
                    AcademicYear.title.label("academic_year"),
                )
                .select_from(FeeTransaction)
                .join(FeeTransactionItem, FeeTransaction.id == FeeTransactionItem.fee_transaction_id)
                .join(FeeType, FeeTransactionItem.fee_type_id == FeeType.id)
                .join(FeeCategory, FeeType.fee_category_id == FeeCategory.id)
                .join(FeeTerm, FeeTransactionItem.fee_term_id == FeeTerm.id)
                .join(Student, FeeTransaction.student_id == Student.id)
                .join(Admission, FeeTransaction.student_admission_num == Admission.admission_number)
                .join(Class, Admission.current_class_id == Class.id)
                .outerjoin(Section, Admission.current_section_id == Section.id)
                .join(AcademicYear, FeeTransaction.academic_year_id == AcademicYear.id)
            )

            # Apply filters
            conditions = []

            if filters.academic_year_id:
                conditions.append(FeeTransaction.academic_year_id == filters.academic_year_id)

            if filters.fee_category_id:
                conditions.append(FeeCategory.id == filters.fee_category_id)

            if filters.fee_type_id:
                conditions.append(FeeType.id == filters.fee_type_id)

            if filters.payment_method:
                conditions.append(FeeTransaction.payment_method == filters.payment_method)

            if filters.status:
                conditions.append(FeeTransaction.status == filters.status)

            if filters.date_from:
                conditions.append(FeeTransaction.created_at >= filters.date_from)

            if filters.date_to:
                conditions.append(FeeTransaction.created_at <= filters.date_to)

            if filters.class_id:
                conditions.append(Class.id == filters.class_id)

            if filters.section_id:
                conditions.append(Section.id == filters.section_id)

            if conditions:
                query = query.where(and_(*conditions))

            # Get total count
            count_query = select(func.count()).select_from(query.subquery())
            total_result = await self.db.execute(count_query)
            total_count = total_result.scalar()

            # Apply pagination
            query, _ = self.apply_pagination(query, filters.page, filters.page_size)

            # Apply sorting
            if filters.sort_by:
                sort_column = getattr(FeeTransaction, filters.sort_by, None)
                if sort_column:
                    if filters.sort_order == "desc":
                        query = query.order_by(desc(sort_column))
                    else:
                        query = query.order_by(asc(sort_column))
            else:
                query = query.order_by(desc(FeeTransaction.created_at))

            # Execute query
            result = await self.db.execute(query)
            rows = result.fetchall()

            # Convert to response format
            data = []
            for i, row in enumerate(rows, 1):
                data.append(
                    {
                        "sl_no": (filters.page - 1) * filters.page_size + i,
                        "transaction_number": row.transaction_number,
                        "student_admission_no": row.student_admission_num,
                        "student_name": row.student_name,
                        "class_section": " - ".join(filter(None, [row.class_name, row.section_name])),
                        "fee_category": row.fee_category_name,
                        "fee_type": row.fee_type_name,
                        "fee_term": row.fee_term_name,
                        "amount_due": float(row.amount_due),
                        "amount_paid": float(row.amount_paid),
                        "payment_method": row.payment_method,
                        "payment_status": row.status,
                        "transaction_date": row.created_at,
                        "collected_by": row.collected_by_user_id or "System",
                    }
                )

            return data, total_count

        except Exception as e:
            logger.error(f"Error in fee collection summary: {str(e)}")
            raise

    async def get_pending_fees(self, filters: PendingFeesFilter) -> tuple[list[dict[str, Any]], int]:
        """Get pending fees report data"""
        try:
            # Base query to get student fee mappings with outstanding amounts
            query = (
                select(
                    FeeStudentMapping.id,
                    FeeStudentMapping.student_id,
                    FeeStudentMapping.academic_year_id,
                    FeeStudentMapping.fee_type_id,
                    FeeStudentMapping.student_admission_num,
                    FeeStudentMapping.total_fee,
                    FeeType.type_name.label("fee_type_name"),
                    FeeCategory.category_name.label("fee_category_name"),
                    FeeTerm.term_name.label("fee_term_name"),
                    func.concat(Student.first_name, " ", Student.last_name).label("student_name"),
                    Class.name.label("class_name"),
                    Section.name.label("section_name"),
                    AcademicYear.title.label("academic_year"),
                    FeeStudentMapTermAmount.term_amount,
                    FeeStudentMapTermAmount.term_id,
                )
                .select_from(FeeStudentMapping)
                .join(FeeType, FeeStudentMapping.fee_type_id == FeeType.id)
                .join(FeeCategory, FeeType.fee_category_id == FeeCategory.id)
                .join(Student, FeeStudentMapping.student_id == Student.id)
                .join(Admission, FeeStudentMapping.student_admission_num == Admission.admission_number)
                .join(Class, Admission.current_class_id == Class.id)
                .outerjoin(Section, Admission.current_section_id == Section.id)
                .join(AcademicYear, FeeStudentMapping.academic_year_id == AcademicYear.id)
                .outerjoin(FeeStudentMapTermAmount, FeeStudentMapping.id == FeeStudentMapTermAmount.fee_student_map_id)
                .outerjoin(FeeTerm, FeeStudentMapTermAmount.term_id == FeeTerm.id)
            )

            # Apply filters
            conditions = []

            if filters.academic_year_id:
                conditions.append(FeeStudentMapping.academic_year_id == filters.academic_year_id)

            if filters.fee_category_id:
                conditions.append(FeeCategory.id == filters.fee_category_id)

            if filters.fee_type_id:
                conditions.append(FeeType.id == filters.fee_type_id)

            if filters.fee_term_id:
                conditions.append(FeeStudentMapTermAmount.term_id == filters.fee_term_id)

            if filters.class_id:
                conditions.append(Class.id == filters.class_id)

            if filters.section_id:
                conditions.append(Section.id == filters.section_id)

            if conditions:
                query = query.where(and_(*conditions))

            # Get total count
            count_query = select(func.count()).select_from(query.subquery())
            total_result = await self.db.execute(count_query)
            total_result.scalar()

            # Apply pagination
            query, _ = self.apply_pagination(query, filters.page, filters.page_size)

            # Apply sorting
            if filters.sort_by:
                sort_column = getattr(FeeStudentMapping, filters.sort_by, None)
                if sort_column:
                    if filters.sort_order == "desc":
                        query = query.order_by(desc(sort_column))
                    else:
                        query = query.order_by(asc(sort_column))
            else:
                query = query.order_by(asc(func.concat(Student.first_name, " ", Student.last_name)))

            # Execute query
            result = await self.db.execute(query)
            rows = result.fetchall()

            # Calculate paid amounts and outstanding balances
            data = []
            for _i, row in enumerate(rows, 1):
                # Get paid amount for this student/fee type/term combination
                paid_query = (
                    select(func.coalesce(func.sum(FeeTransactionItem.amount_paid), 0))
                    .select_from(FeeTransactionItem)
                    .join(FeeTransaction, FeeTransactionItem.fee_transaction_id == FeeTransaction.id)
                    .where(
                        and_(
                            FeeTransaction.student_id == row.student_id,
                            FeeTransaction.academic_year_id == row.academic_year_id,
                            FeeTransactionItem.fee_type_id == row.fee_type_id,
                            FeeTransaction.status == "completed",
                        )
                    )
                )

                if row.term_id:
                    paid_query = paid_query.where(FeeTransactionItem.fee_term_id == row.term_id)

                paid_result = await self.db.execute(paid_query)
                amount_paid = float(paid_result.scalar() or 0)

                amount_due = float(row.term_amount or row.total_fee)
                balance_amount = amount_due - amount_paid

                # Only include if there's a balance
                if balance_amount > 0:
                    # Calculate due date and days overdue (simplified logic)
                    due_date = None
                    days_overdue = None

                    if row.term_id:
                        # Get term due date (simplified - would need actual term dates)
                        due_date = datetime.now() + timedelta(days=30)  # Placeholder
                        if due_date < datetime.now():
                            days_overdue = (datetime.now() - due_date).days

                    # Apply amount filters
                    if filters.amount_min and balance_amount < float(filters.amount_min):
                        continue
                    if filters.amount_max and balance_amount > float(filters.amount_max):
                        continue
                    if filters.days_overdue and (days_overdue is None or days_overdue < filters.days_overdue):
                        continue

                    data.append(
                        {
                            "sl_no": len(data) + 1,
                            "student_admission_no": row.student_admission_num,
                            "student_name": row.student_name,
                            "class_section": " - ".join(filter(None, [row.class_name, row.section_name])),
                            "fee_category": row.fee_category_name,
                            "fee_type": row.fee_type_name,
                            "fee_term": row.fee_term_name or "Annual",
                            "amount_due": amount_due,
                            "amount_paid": amount_paid,
                            "balance_amount": balance_amount,
                            "due_date": due_date,
                            "days_overdue": days_overdue,
                        }
                    )

            return data, len(data)

        except Exception as e:
            logger.error(f"Error in pending fees report: {str(e)}")
            raise

    async def get_fee_structure(self, filters: FeeStructureFilter) -> tuple[list[dict[str, Any]], int]:
        """Get fee structure report data"""
        try:
            # Base query for fee structure
            query = (
                select(
                    FeeType.id,
                    FeeType.type_name,
                    FeeCategory.category_name,
                    FeeTerm.term_name,
                    Class.name.label("class_name"),
                    AcademicYear.title.label("year_name"),
                    FeeClassMapping.total_fee,
                    FeeType.fee_status,
                )
                .select_from(FeeType)
                .join(FeeCategory, FeeType.fee_category_id == FeeCategory.id)
                .join(FeeTerm, FeeType.fee_term_id == FeeTerm.id)
                .join(AcademicYear, FeeType.academic_year_id == AcademicYear.id)
                .join(FeeClassMapping, FeeType.id == FeeClassMapping.fee_type_id)
                .join(Class, FeeClassMapping.class_id == Class.id)
            )

            # Apply filters
            conditions = []

            if filters.academic_year_id:
                conditions.append(FeeType.academic_year_id == filters.academic_year_id)

            if filters.fee_category_id:
                conditions.append(FeeCategory.id == filters.fee_category_id)

            if filters.fee_type_id:
                conditions.append(FeeType.id == filters.fee_type_id)

            if filters.class_id:
                conditions.append(Class.id == filters.class_id)

            if conditions:
                query = query.where(and_(*conditions))

            # Get total count
            count_query = select(func.count()).select_from(query.subquery())
            total_result = await self.db.execute(count_query)
            total_count = total_result.scalar()

            # Apply pagination
            query, _ = self.apply_pagination(query, filters.page, filters.page_size)

            # Apply sorting
            if filters.sort_by:
                sort_column = getattr(FeeType, filters.sort_by, None)
                if sort_column:
                    if filters.sort_order == "desc":
                        query = query.order_by(desc(sort_column))
                    else:
                        query = query.order_by(asc(sort_column))
            else:
                query = query.order_by(asc(FeeCategory.category_name), asc(FeeType.type_name))

            # Execute query
            result = await self.db.execute(query)
            rows = result.fetchall()

            # Convert to response format
            data = []
            for i, row in enumerate(rows, 1):
                data.append(
                    {
                        "sl_no": (filters.page - 1) * filters.page_size + i,
                        "fee_category": row.category_name,
                        "fee_type": row.type_name,
                        "fee_term": row.term_name,
                        "class_name": row.class_name,
                        "section_name": None,
                        "fee_amount": float(row.total_fee),
                        "academic_year": row.year_name,
                        "status": row.fee_status,
                    }
                )

            return data, total_count

        except Exception as e:
            logger.error(f"Error in fee structure report: {str(e)}")
            raise

    async def get_fee_collection_summary_stats(self, filters: FeeCollectionSummaryFilter) -> FeeCollectionSummary:
        """Get fee collection summary statistics"""
        try:
            # This would contain aggregation queries for summary statistics
            # For now, returning placeholder data
            return FeeCollectionSummary(
                total_collected=Decimal("0.00"),
                total_due=Decimal("0.00"),
                collection_percentage=0.0,
                payment_methods={},
                fee_categories={},
                monthly_collection={},
            )
        except Exception as e:
            logger.error(f"Error in fee collection summary stats: {str(e)}")
            raise

    async def get_pending_fees_summary_stats(self, filters: PendingFeesFilter) -> PendingFeesSummary:
        """Get pending fees summary statistics"""
        try:
            # This would contain aggregation queries for summary statistics
            # For now, returning placeholder data
            return PendingFeesSummary(
                total_pending_amount=Decimal("0.00"),
                total_overdue_amount=Decimal("0.00"),
                total_students_with_pending=0,
                total_students_overdue=0,
                average_overdue_days=0.0,
                fee_categories_pending={},
                class_wise_pending={},
            )
        except Exception as e:
            logger.error(f"Error in pending fees summary stats: {str(e)}")
            raise

    async def get_fee_structure_summary_stats(self, filters: FeeStructureFilter) -> FeeStructureSummary:
        """Get fee structure summary statistics"""
        try:
            # This would contain aggregation queries for summary statistics
            # For now, returning placeholder data
            return FeeStructureSummary(
                total_fee_types=0,
                total_categories=0,
                total_terms=0,
                average_fee_amount=Decimal("0.00"),
                fee_range={},
                category_wise_breakdown={},
            )
        except Exception as e:
            logger.error(f"Error in fee structure summary stats: {str(e)}")
            raise

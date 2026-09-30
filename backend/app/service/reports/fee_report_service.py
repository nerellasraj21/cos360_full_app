"""
Service for generating fee-related reports
"""

from collections import defaultdict
from datetime import date
from decimal import Decimal
import logging
from typing import Any

from sqlalchemy import and_, asc, desc, distinct, func, literal_column, select

from app.models.fee.fee_category_model import FeeCategory
from app.models.fee.fee_class_mapping_model import FeeClassMapping
from app.models.fee.fee_student_map_term_amount_model import FeeStudentMapTermAmount
from app.models.fee.fee_student_mapping_model import FeeStudentMapping
from app.models.fee.fee_term_dates_model import FeeTermDates
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

    def _collection_query(self, filters: FeeCollectionSummaryFilter):
        query = (
            select(
                FeeTransaction.id,
                FeeTransaction.transaction_number,
                FeeTransaction.student_id,
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
                FeeTransactionItem.term_date_id,
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

        return query

    async def get_fee_collection_summary(self, filters: FeeCollectionSummaryFilter) -> tuple[list[dict[str, Any]], int]:
        """Get fee collection summary report data"""
        try:
            query = self._collection_query(filters)

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

    async def _pending_rows(self, filters: PendingFeesFilter) -> list[tuple[dict[str, Any], str]]:
        """Every instalment with an outstanding balance, as (report row, class name) pairs, unpaginated"""
        query = (
            select(
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
                FeeStudentMapTermAmount.term_amount,
                FeeStudentMapTermAmount.term_date_id,
                FeeTermDates.fee_term_date,
            )
            .select_from(FeeStudentMapping)
            .join(FeeType, FeeStudentMapping.fee_type_id == FeeType.id)
            .join(FeeCategory, FeeType.fee_category_id == FeeCategory.id)
            .join(Student, FeeStudentMapping.student_id == Student.id)
            .join(Admission, FeeStudentMapping.student_admission_num == Admission.admission_number)
            .join(Class, Admission.current_class_id == Class.id)
            .outerjoin(Section, Admission.current_section_id == Section.id)
            .outerjoin(FeeStudentMapTermAmount, FeeStudentMapping.id == FeeStudentMapTermAmount.fee_student_map_id)
            .outerjoin(FeeTerm, FeeStudentMapTermAmount.term_id == FeeTerm.id)
            .outerjoin(FeeTermDates, FeeStudentMapTermAmount.term_date_id == FeeTermDates.id)
        )

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

        result = await self.db.execute(query)
        mapping_rows = result.fetchall()

        paid_query = (
            select(
                FeeTransaction.student_id,
                FeeTransaction.academic_year_id,
                FeeTransactionItem.fee_type_id,
                FeeTransactionItem.term_date_id,
                func.sum(FeeTransactionItem.amount_paid).label("paid"),
            )
            .select_from(FeeTransactionItem)
            .join(FeeTransaction, FeeTransactionItem.fee_transaction_id == FeeTransaction.id)
            .where(FeeTransaction.status == "completed")
            .group_by(
                FeeTransaction.student_id,
                FeeTransaction.academic_year_id,
                FeeTransactionItem.fee_type_id,
                FeeTransactionItem.term_date_id,
            )
        )
        if filters.academic_year_id:
            paid_query = paid_query.where(FeeTransaction.academic_year_id == filters.academic_year_id)

        paid_by_instalment: dict[tuple, Decimal] = {}
        paid_by_fee_type: dict[tuple, Decimal] = defaultdict(Decimal)
        for paid_row in (await self.db.execute(paid_query)).fetchall():
            fee_key = (paid_row.student_id, paid_row.academic_year_id, paid_row.fee_type_id)
            paid = Decimal(str(paid_row.paid or 0))
            paid_by_instalment[(*fee_key, paid_row.term_date_id)] = paid
            paid_by_fee_type[fee_key] += paid

        today = date.today()
        rows: list[tuple[dict[str, Any], str]] = []
        for row in mapping_rows:
            fee_key = (row.student_id, row.academic_year_id, row.fee_type_id)
            if row.term_date_id:
                amount_due = Decimal(str(row.term_amount))
                amount_paid = paid_by_instalment.get((*fee_key, row.term_date_id), Decimal("0"))
            else:
                amount_due = Decimal(str(row.total_fee))
                amount_paid = paid_by_fee_type.get(fee_key, Decimal("0"))

            balance_amount = amount_due - amount_paid
            if balance_amount <= 0:
                continue

            due_date = row.fee_term_date
            days_overdue = (today - due_date).days if due_date and due_date < today else None

            if filters.amount_min and balance_amount < filters.amount_min:
                continue
            if filters.amount_max and balance_amount > filters.amount_max:
                continue
            if filters.days_overdue and (days_overdue is None or days_overdue < filters.days_overdue):
                continue

            rows.append(
                (
                    {
                        "student_admission_no": row.student_admission_num,
                        "student_name": row.student_name,
                        "class_section": " - ".join(filter(None, [row.class_name, row.section_name])),
                        "fee_category": row.fee_category_name,
                        "fee_type": row.fee_type_name,
                        "fee_term": row.fee_term_name or "Annual",
                        "amount_due": float(amount_due),
                        "amount_paid": float(amount_paid),
                        "balance_amount": float(balance_amount),
                        "due_date": due_date,
                        "days_overdue": days_overdue,
                    },
                    row.class_name,
                )
            )

        return rows

    async def get_pending_fees(self, filters: PendingFeesFilter) -> tuple[list[dict[str, Any]], int]:
        """Get pending fees report data"""
        try:
            data = [item for item, _ in await self._pending_rows(filters)]

            if filters.sort_by and data and filters.sort_by in data[0]:
                present = [item for item in data if item[filters.sort_by] is not None]
                missing = [item for item in data if item[filters.sort_by] is None]
                present.sort(key=lambda item: item[filters.sort_by], reverse=filters.sort_order == "desc")
                data = present + missing
            else:
                data.sort(key=lambda item: (item["student_name"], item["due_date"] or date.max))

            total_count = len(data)
            offset = (filters.page - 1) * filters.page_size
            page_data = [
                {"sl_no": offset + i, **item} for i, item in enumerate(data[offset : offset + filters.page_size], 1)
            ]

            return page_data, total_count

        except Exception as e:
            logger.error(f"Error in pending fees report: {str(e)}")
            raise

    def _structure_query(self, filters: FeeStructureFilter):
        query = (
            select(
                FeeType.id,
                FeeType.type_name,
                FeeCategory.id.label("category_id"),
                FeeCategory.category_name,
                FeeTerm.id.label("term_id"),
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

        return query

    async def get_fee_structure(self, filters: FeeStructureFilter) -> tuple[list[dict[str, Any]], int]:
        """Get fee structure report data"""
        try:
            query = self._structure_query(filters)

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
            report = self._collection_query(filters).subquery()
            completed = report.c.status == "completed"

            total_collected = (
                await self.db.execute(select(func.coalesce(func.sum(report.c.amount_paid), 0)).where(completed))
            ).scalar()

            instalment_due = (
                select(func.max(report.c.amount_due).label("amount_due"))
                .where(completed)
                .group_by(report.c.student_id, report.c.fee_type_id, report.c.term_date_id)
                .subquery()
            )
            total_due = (
                await self.db.execute(select(func.coalesce(func.sum(instalment_due.c.amount_due), 0)))
            ).scalar()

            async def collected_by(column) -> dict[str, float]:
                grouped = await self.db.execute(
                    select(column, func.sum(report.c.amount_paid)).where(completed).group_by(column).order_by(column)
                )
                return {str(key): float(amount) for key, amount in grouped.all() if key is not None}

            month = func.to_char(report.c.created_at, literal_column("'YYYY-MM'"))

            return FeeCollectionSummary(
                total_collected=float(total_collected),
                total_due=float(total_due),
                collection_percentage=round(float(total_collected) / float(total_due) * 100, 2) if total_due else 0.0,
                payment_methods=await collected_by(report.c.payment_method),
                fee_categories=await collected_by(report.c.fee_category_name),
                monthly_collection=await collected_by(month),
            )
        except Exception as e:
            logger.error(f"Error in fee collection summary stats: {str(e)}")
            raise

    async def get_pending_fees_summary_stats(self, filters: PendingFeesFilter) -> PendingFeesSummary:
        """Get pending fees summary statistics"""
        try:
            rows = await self._pending_rows(filters)
            overdue = [item for item, _ in rows if item["days_overdue"]]

            categories: dict[str, float] = defaultdict(float)
            classes: dict[str, float] = defaultdict(float)
            for item, class_name in rows:
                categories[item["fee_category"]] += item["balance_amount"]
                classes[class_name] += item["balance_amount"]

            return PendingFeesSummary(
                total_pending_amount=round(sum(item["balance_amount"] for item, _ in rows), 2),
                total_overdue_amount=round(sum(item["balance_amount"] for item in overdue), 2),
                total_students_with_pending=len({item["student_admission_no"] for item, _ in rows}),
                total_students_overdue=len({item["student_admission_no"] for item in overdue}),
                average_overdue_days=(
                    round(sum(item["days_overdue"] for item in overdue) / len(overdue), 1) if overdue else 0.0
                ),
                fee_categories_pending={key: round(value, 2) for key, value in sorted(categories.items())},
                class_wise_pending={key: round(value, 2) for key, value in sorted(classes.items())},
            )
        except Exception as e:
            logger.error(f"Error in pending fees summary stats: {str(e)}")
            raise

    async def get_fee_structure_summary_stats(self, filters: FeeStructureFilter) -> FeeStructureSummary:
        """Get fee structure summary statistics"""
        try:
            structure = self._structure_query(filters).subquery()

            totals = (
                await self.db.execute(
                    select(
                        func.count(distinct(structure.c.id)),
                        func.count(distinct(structure.c.category_id)),
                        func.count(distinct(structure.c.term_id)),
                        func.avg(structure.c.total_fee),
                        func.min(structure.c.total_fee),
                        func.max(structure.c.total_fee),
                    )
                )
            ).one()
            fee_types, categories, terms, average_fee, min_fee, max_fee = totals

            breakdown = await self.db.execute(
                select(structure.c.category_name, func.count(distinct(structure.c.id)))
                .group_by(structure.c.category_name)
                .order_by(structure.c.category_name)
            )

            return FeeStructureSummary(
                total_fee_types=fee_types,
                total_categories=categories,
                total_terms=terms,
                average_fee_amount=round(float(average_fee or 0), 2),
                fee_range={"min": float(min_fee or 0), "max": float(max_fee or 0)},
                category_wise_breakdown=dict(breakdown.all()),
            )
        except Exception as e:
            logger.error(f"Error in fee structure summary stats: {str(e)}")
            raise

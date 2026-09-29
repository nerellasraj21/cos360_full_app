from datetime import datetime
from decimal import Decimal
import logging as log
import secrets
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import and_, desc, func, select, true
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.fee.fee_refund_model import FeeRefund
from app.models.fee.fee_transaction_model import FeeTransaction
from app.schemas.fee import (
    FeeRefundApproval,
    FeeRefundCreate,
    FeeRefundProcessing,
    FeeRefundRead,
    FeeRefundStatistics,
)

log = log.getLogger("fee.refund_service")


class FeeRefundService:
    """Service for handling fee refund workflows"""

    @staticmethod
    async def generate_refund_number(db: AsyncSession) -> str:
        """Generate unique refund number for tenant"""
        while True:
            # Generate refund number: RFD + date + random
            date_str = datetime.now().strftime("%Y%m%d")
            random_suffix = secrets.token_hex(3).upper()
            refund_number = f"RFD{date_str}{random_suffix}"

            # Check uniqueness
            result = await db.execute(select(FeeRefund).where(FeeRefund.refund_number == refund_number))
            if not result.scalar_one_or_none():
                return refund_number

    @staticmethod
    async def validate_refund_eligibility(
        db: AsyncSession, transaction_id: UUID, refund_amount: Decimal
    ) -> FeeTransaction:
        """Validate that refund is eligible and amount is valid"""

        # Get transaction
        result = await db.execute(select(FeeTransaction).where(FeeTransaction.id == transaction_id))
        transaction = result.scalar_one_or_none()

        if not transaction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=f"Transaction with ID {transaction_id} not found"
            )

        if transaction.status != "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Can only refund completed transactions"
            )

        # Check existing refunds for this transaction
        existing_refunds_result = await db.execute(
            select(FeeRefund).where(
                and_(FeeRefund.fee_transaction_id == transaction_id, FeeRefund.status.in_(["approved", "processed"]))
            )
        )
        existing_refunds = existing_refunds_result.scalars().all()

        total_refunded = sum(refund.refund_amount for refund in existing_refunds)
        available_for_refund = transaction.total_amount - total_refunded

        if refund_amount > available_for_refund:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Refund amount {refund_amount} exceeds available amount {available_for_refund}",
            )

        return transaction

    @staticmethod
    async def create_refund_request(db: AsyncSession, refund_data: FeeRefundCreate) -> FeeRefundRead:
        """Create new refund request"""
        try:
            # Validate transaction and refund eligibility
            transaction = await FeeRefundService.validate_refund_eligibility(
                db, refund_data.fee_transaction_id, refund_data.refund_amount
            )

            # Generate refund number
            refund_number = await FeeRefundService.generate_refund_number(db)

            # Create refund request
            db_refund = FeeRefund(
                refund_number=refund_number,
                fee_transaction_id=refund_data.fee_transaction_id,
                student_id=refund_data.student_id,
                student_admission_num=refund_data.student_admission_num,
                academic_year_id=refund_data.academic_year_id,
                refund_amount=refund_data.refund_amount,
                refund_reason=refund_data.refund_reason,
                detailed_reason=refund_data.detailed_reason,
                requested_by_user_id=refund_data.requested_by_user_id,
                status="pending",
            )

            db.add(db_refund)
            await db.commit()
            await db.refresh(db_refund)

            log.info(f"Refund request created: {refund_number} for transaction {transaction.transaction_number}")

            return db_refund

        except HTTPException:
            await db.rollback()
            raise
        except Exception as e:
            await db.rollback()
            log.error(f"Error creating refund request: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while creating refund request",
            )

    @staticmethod
    async def get_refund_by_id(db: AsyncSession, refund_id: UUID) -> FeeRefundRead:
        """Get refund by ID"""
        try:
            result = await db.execute(select(FeeRefund).where(FeeRefund.id == refund_id))
            refund = result.scalar_one_or_none()

            if not refund:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail=f"Refund with ID {refund_id} not found"
                )

            return refund

        except HTTPException:
            raise
        except Exception as e:
            log.error(f"Error getting refund: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred while retrieving refund"
            )

    @staticmethod
    async def approve_refund(db: AsyncSession, approval_data: FeeRefundApproval) -> FeeRefundRead:
        """Approve or reject refund request"""
        try:
            # Get refund
            refund = await FeeRefundService.get_refund_by_id(db, approval_data.refund_id)

            if refund.status != "pending":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Refund is already {refund.status}, cannot change approval status",
                )

            # Update refund status
            refund.status = "approved" if approval_data.action == "approve" else "rejected"
            refund.approved_by_user_id = approval_data.approved_by_user_id
            refund.approval_remarks = approval_data.approval_remarks
            refund.approved_date = datetime.now()

            await db.commit()
            await db.refresh(refund)

            action_text = "approved" if approval_data.action == "approve" else "rejected"
            log.info(f"Refund {refund.refund_number} {action_text} by user {approval_data.approved_by_user_id}")

            return refund

        except HTTPException:
            await db.rollback()
            raise
        except Exception as e:
            await db.rollback()
            log.error(f"Error approving refund: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while processing refund approval",
            )

    @staticmethod
    async def process_refund(db: AsyncSession, processing_data: FeeRefundProcessing) -> FeeRefundRead:
        """Mark refund as processed (payment completed)"""
        try:
            # Get refund
            refund = await FeeRefundService.get_refund_by_id(db, processing_data.refund_id)

            if refund.status != "approved":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, detail="Only approved refunds can be processed"
                )

            # Update refund processing details
            refund.status = "processed"
            refund.processed_by_user_id = processing_data.processed_by_user_id
            refund.refund_method = processing_data.refund_method
            refund.refund_reference = processing_data.refund_reference
            refund.processing_remarks = processing_data.processing_remarks
            refund.processed_date = datetime.now()

            await db.commit()
            await db.refresh(refund)

            log.info(f"Refund {refund.refund_number} processed via {processing_data.refund_method}")

            return refund

        except HTTPException:
            await db.rollback()
            raise
        except Exception as e:
            await db.rollback()
            log.error(f"Error processing refund: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred while processing refund"
            )

    @staticmethod
    async def get_pending_refunds(db: AsyncSession, limit: int = 50, offset: int = 0) -> list[FeeRefundRead]:
        """Get pending refunds for approval"""
        try:
            result = await db.execute(
                select(FeeRefund)
                .where(FeeRefund.status == "pending")
                .order_by(FeeRefund.requested_date)
                .offset(offset)
                .limit(limit)
            )
            refunds = result.scalars().all()

            return refunds

        except Exception as e:
            log.error(f"Error getting pending refunds: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while retrieving pending refunds",
            )

    @staticmethod
    async def get_approved_refunds(db: AsyncSession, limit: int = 50, offset: int = 0) -> list[FeeRefundRead]:
        """Get approved refunds awaiting processing"""
        try:
            result = await db.execute(
                select(FeeRefund)
                .where(FeeRefund.status == "approved")
                .order_by(FeeRefund.approved_date)
                .offset(offset)
                .limit(limit)
            )
            refunds = result.scalars().all()

            return refunds

        except Exception as e:
            log.error(f"Error getting approved refunds: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while retrieving approved refunds",
            )

    @staticmethod
    async def get_refund_statistics(
        db: AsyncSession,
        academic_year_id: UUID | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> FeeRefundStatistics:
        """Refund counts by status, processed amount, counts by reason and monthly totals"""
        try:
            conditions = []
            if academic_year_id:
                conditions.append(FeeRefund.academic_year_id == academic_year_id)
            if date_from:
                conditions.append(FeeRefund.requested_date >= date_from)
            if date_to:
                conditions.append(FeeRefund.requested_date <= date_to)
            where = and_(*conditions) if conditions else true()

            by_status = await db.execute(
                select(FeeRefund.status, func.count(), func.coalesce(func.sum(FeeRefund.refund_amount), 0))
                .where(where)
                .group_by(FeeRefund.status)
            )
            counts, amounts = {}, {}
            for refund_status, count, amount in by_status.all():
                counts[refund_status] = count
                amounts[refund_status] = amount

            by_reason = await db.execute(
                select(FeeRefund.refund_reason, func.count()).where(where).group_by(FeeRefund.refund_reason)
            )

            month = func.to_char(FeeRefund.requested_date, "YYYY-MM")
            by_month = await db.execute(
                select(month, func.count(), func.coalesce(func.sum(FeeRefund.refund_amount), 0))
                .where(where, FeeRefund.status != "rejected")
                .group_by(month)
                .order_by(month)
            )

            return FeeRefundStatistics(
                total_refund_amount=float(amounts.get("processed", 0)),
                total_pending_refunds=counts.get("pending", 0),
                total_approved_refunds=counts.get("approved", 0),
                total_processed_refunds=counts.get("processed", 0),
                total_rejected_refunds=counts.get("rejected", 0),
                refunds_by_reason=dict(by_reason.all()),
                monthly_refunds=[
                    {"month": m, "count": count, "amount": float(amount)} for m, count, amount in by_month.all()
                ],
            )

        except Exception as e:
            log.error(f"Error computing refund statistics: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while computing refund statistics",
            )

    @staticmethod
    async def search_refunds(
        db: AsyncSession,
        student_id: UUID | None = None,
        academic_year_id: UUID | None = None,
        status: str | None = None,
        refund_reason: str | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[FeeRefundRead]:
        """Search refunds with filters"""
        try:
            query = select(FeeRefund)

            conditions = []
            if student_id:
                conditions.append(FeeRefund.student_id == student_id)
            if academic_year_id:
                conditions.append(FeeRefund.academic_year_id == academic_year_id)
            if status:
                conditions.append(FeeRefund.status == status)
            if refund_reason:
                conditions.append(FeeRefund.refund_reason == refund_reason)
            if date_from:
                conditions.append(FeeRefund.requested_date >= date_from)
            if date_to:
                conditions.append(FeeRefund.requested_date <= date_to)

            if conditions:
                query = query.where(and_(*conditions))

            query = query.order_by(desc(FeeRefund.requested_date))
            query = query.offset(offset).limit(limit)

            result = await db.execute(query)
            refunds = result.scalars().all()

            return refunds

        except Exception as e:
            log.error(f"Error searching refunds: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred while searching refunds"
            )

    @staticmethod
    async def get_refund_summary_by_transaction(db: AsyncSession, transaction_id: UUID) -> dict:
        """Get refund summary for a transaction"""
        try:
            result = await db.execute(select(FeeRefund).where(FeeRefund.fee_transaction_id == transaction_id))
            refunds = result.scalars().all()

            total_requested = Decimal("0.00")
            total_approved = Decimal("0.00")
            total_processed = Decimal("0.00")

            status_counts = {"pending": 0, "approved": 0, "rejected": 0, "processed": 0}

            for refund in refunds:
                total_requested += refund.refund_amount
                status_counts[refund.status] = status_counts.get(refund.status, 0) + 1

                if refund.status in ["approved", "processed"]:
                    total_approved += refund.refund_amount

                if refund.status == "processed":
                    total_processed += refund.refund_amount

            return {
                "transaction_id": transaction_id,
                "total_requested": total_requested,
                "total_approved": total_approved,
                "total_processed": total_processed,
                "status_counts": status_counts,
                "refund_count": len(refunds),
            }

        except Exception as e:
            log.error(f"Error getting refund summary: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while getting refund summary",
            )

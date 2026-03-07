from datetime import datetime
import hashlib
import json
import logging as log
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.fee.fee_receipt_model import FeeReceipt
from app.models.fee.fee_term_model import FeeTerm
from app.models.fee.fee_transaction_model import FeeTransaction
from app.models.fee.fee_type_model import FeeType
from app.models.masters.admission_model import Admission
from app.schemas.fee import FeeReceiptRead, ReceiptContent, ReceiptItemDetail

log = log.getLogger("fee.receipt_service")


class FeeReceiptService:
    """Service for handling receipt generation and management"""

    @staticmethod
    async def generate_receipt_number(db: AsyncSession) -> str:
        """Generate unique receipt number for tenant"""
        while True:
            # Generate receipt number: RCP + date + sequence
            date_str = datetime.now().strftime("%Y%m%d")

            # Get today's receipt count
            today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            result = await db.execute(select(func.count(FeeReceipt.id)).where(FeeReceipt.generated_at >= today_start))
            count = result.scalar_one() or 0

            receipt_number = f"RCP{date_str}{count + 1:04d}"

            # Check uniqueness
            result = await db.execute(select(FeeReceipt).where(FeeReceipt.receipt_number == receipt_number))
            if not result.scalar_one_or_none():
                return receipt_number

    @staticmethod
    def generate_content_hash(receipt_content: dict) -> str:
        """Generate SHA-256 hash for receipt content integrity"""
        # Create a normalized string representation
        content_string = json.dumps(receipt_content, sort_keys=True)
        return hashlib.sha256(content_string.encode()).hexdigest()

    @staticmethod
    async def get_receipt_content(db: AsyncSession, transaction_id: UUID) -> ReceiptContent:
        """Get complete receipt content for PDF generation"""
        try:
            # Get transaction with all details
            result = await db.execute(
                select(FeeTransaction)
                .options(selectinload(FeeTransaction.transaction_items))
                .where(FeeTransaction.id == transaction_id)
            )
            transaction = result.scalar_one_or_none()

            if not transaction:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail=f"Transaction with ID {transaction_id} not found"
                )

            # Get student details
            student_result = await db.execute(
                select(Admission).where(
                    and_(
                        Admission.student_id == transaction.student_id,
                        Admission.admission_number == transaction.student_admission_num,
                        Admission.academic_year_id == transaction.academic_year_id,
                    )
                )
            )
            student = student_result.scalar_one_or_none()

            if not student:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student details not found")

            # Build receipt items with fee type and term names
            receipt_items = []
            for item in transaction.transaction_items:
                # Get fee type name
                fee_type_result = await db.execute(select(FeeType.type_name).where(FeeType.id == item.fee_type_id))
                fee_type_name = fee_type_result.scalar_one_or_none() or "Unknown Fee Type"

                # Get fee term name
                fee_term_result = await db.execute(select(FeeTerm.term_name).where(FeeTerm.id == item.fee_term_id))
                fee_term_name = fee_term_result.scalar_one_or_none() or "Unknown Term"

                receipt_items.append(
                    ReceiptItemDetail(
                        fee_type_name=fee_type_name, fee_term_name=fee_term_name, amount_paid=item.amount_paid
                    )
                )

            # Build payment reference based on method
            payment_reference = None
            if transaction.payment_method == "upi":
                payment_reference = transaction.upi_reference
            elif transaction.payment_method == "cheque":
                payment_reference = f"Cheque: {transaction.cheque_number}"
            elif transaction.payment_method == "bank_transfer":
                payment_reference = transaction.bank_reference

            return ReceiptContent(
                receipt_number="",  # Will be set during receipt creation
                transaction_number=transaction.transaction_number,
                student_name=student.student_name,
                student_admission_num=student.admission_number,
                class_section=f"{student.class_name} - {student.section_name}",
                academic_year=student.academic_year_title,
                payment_method=transaction.payment_method,
                payment_reference=payment_reference,
                total_amount=transaction.total_amount,
                transaction_date=transaction.transaction_date,
                collected_by_user="Staff",  # TODO: Get from user service
                receipt_items=receipt_items,
                remarks=transaction.remarks,
                school_name="School Name",  # TODO: Get from tenant settings
                school_address="School Address",  # TODO: Get from tenant settings
            )

        except HTTPException:
            raise
        except Exception as e:
            log.error(f"Error getting receipt content: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while preparing receipt content",
            )

    @staticmethod
    async def create_receipt(db: AsyncSession, transaction_id: UUID, generated_by_user_id: UUID) -> FeeReceiptRead:
        """Create receipt for transaction"""
        try:
            # Check if transaction exists and is completed
            result = await db.execute(select(FeeTransaction).where(FeeTransaction.id == transaction_id))
            transaction = result.scalar_one_or_none()

            if not transaction:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail=f"Transaction with ID {transaction_id} not found"
                )

            if transaction.status != "completed":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot generate receipt for non-completed transaction",
                )

            # Check if receipt already exists
            existing_receipt = await db.execute(
                select(FeeReceipt).where(FeeReceipt.fee_transaction_id == transaction_id)
            )
            if existing_receipt.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, detail="Receipt already exists for this transaction"
                )

            # Get receipt content
            receipt_content = await FeeReceiptService.get_receipt_content(db, transaction_id)

            # Generate receipt number
            receipt_number = await FeeReceiptService.generate_receipt_number(db)
            receipt_content.receipt_number = receipt_number

            # Generate content hash
            content_hash = FeeReceiptService.generate_content_hash(receipt_content.dict())

            # Create receipt record
            db_receipt = FeeReceipt(
                receipt_number=receipt_number,
                fee_transaction_id=transaction_id,
                student_name=receipt_content.student_name,
                student_admission_num=receipt_content.student_admission_num,
                class_section=receipt_content.class_section,
                academic_year=receipt_content.academic_year,
                content_hash=content_hash,
                generated_by_user_id=generated_by_user_id,
            )

            db.add(db_receipt)

            # Update transaction receipt status
            transaction.receipt_generated = True
            transaction.receipt_hash = content_hash

            await db.commit()
            await db.refresh(db_receipt)

            return db_receipt

        except HTTPException:
            await db.rollback()
            raise
        except Exception as e:
            await db.rollback()
            log.error(f"Error creating receipt: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred while creating receipt"
            )

    @staticmethod
    async def get_receipt_by_id(db: AsyncSession, receipt_id: UUID) -> FeeReceiptRead:
        """Get receipt by ID"""
        try:
            result = await db.execute(select(FeeReceipt).where(FeeReceipt.id == receipt_id))
            receipt = result.scalar_one_or_none()

            if not receipt:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail=f"Receipt with ID {receipt_id} not found"
                )

            return receipt

        except HTTPException:
            raise
        except Exception as e:
            log.error(f"Error getting receipt: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred while retrieving receipt"
            )

    @staticmethod
    async def get_receipt_by_number(db: AsyncSession, receipt_number: str) -> FeeReceiptRead:
        """Get receipt by receipt number"""
        try:
            result = await db.execute(select(FeeReceipt).where(FeeReceipt.receipt_number == receipt_number))
            receipt = result.scalar_one_or_none()

            if not receipt:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail=f"Receipt with number {receipt_number} not found"
                )

            return receipt

        except HTTPException:
            raise
        except Exception as e:
            log.error(f"Error getting receipt by number: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred while retrieving receipt"
            )

    @staticmethod
    async def reprint_receipt(db: AsyncSession, receipt_id: UUID, user_id: UUID) -> FeeReceiptRead:
        """Mark receipt as reprinted and increment count"""
        try:
            result = await db.execute(select(FeeReceipt).where(FeeReceipt.id == receipt_id))
            receipt = result.scalar_one_or_none()

            if not receipt:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail=f"Receipt with ID {receipt_id} not found"
                )

            # Update reprint information
            receipt.is_reprinted = True
            current_count = int(receipt.reprint_count) if receipt.reprint_count.isdigit() else 0
            receipt.reprint_count = str(current_count + 1)

            await db.commit()
            await db.refresh(receipt)

            log.info(f"Receipt {receipt.receipt_number} reprinted by user {user_id}")

            return receipt

        except HTTPException:
            await db.rollback()
            raise
        except Exception as e:
            await db.rollback()
            log.error(f"Error reprinting receipt: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred while reprinting receipt"
            )

    @staticmethod
    async def verify_receipt_integrity(db: AsyncSession, receipt_id: UUID) -> dict:
        """Verify receipt content integrity using hash"""
        try:
            receipt = await FeeReceiptService.get_receipt_by_id(db, receipt_id)

            # Get current transaction content
            current_content = await FeeReceiptService.get_receipt_content(db, receipt.fee_transaction_id)
            current_content.receipt_number = receipt.receipt_number

            # Generate current hash
            current_hash = FeeReceiptService.generate_content_hash(current_content.dict())

            is_valid = current_hash == receipt.content_hash

            return {
                "receipt_id": receipt_id,
                "receipt_number": receipt.receipt_number,
                "is_valid": is_valid,
                "stored_hash": receipt.content_hash,
                "current_hash": current_hash,
                "verification_date": datetime.now(),
            }

        except Exception as e:
            log.error(f"Error verifying receipt integrity: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while verifying receipt integrity",
            )

    @staticmethod
    async def search_receipts(
        db: AsyncSession,
        student_id: UUID | None = None,
        receipt_number: str | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[FeeReceiptRead]:
        """Search receipts with filters"""
        try:
            query = select(FeeReceipt)

            conditions = []
            if student_id:
                # Join with transaction to filter by student
                query = query.join(FeeTransaction, FeeReceipt.fee_transaction_id == FeeTransaction.id)
                conditions.append(FeeTransaction.student_id == student_id)

            if receipt_number:
                conditions.append(FeeReceipt.receipt_number.ilike(f"%{receipt_number}%"))

            if date_from:
                conditions.append(FeeReceipt.generated_at >= date_from)

            if date_to:
                conditions.append(FeeReceipt.generated_at <= date_to)

            if conditions:
                query = query.where(and_(*conditions))

            query = query.order_by(FeeReceipt.generated_at.desc())
            query = query.offset(offset).limit(limit)

            result = await db.execute(query)
            receipts = result.scalars().all()

            return receipts

        except Exception as e:
            log.error(f"Error searching receipts: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred while searching receipts"
            )

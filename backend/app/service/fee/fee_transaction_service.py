from datetime import datetime
from decimal import Decimal
import logging as log
import secrets
from typing import Any
from uuid import UUID

from fastapi import HTTPException, Request, status
from sqlalchemy import and_, desc, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.fee.fee_student_map_term_amount_model import FeeStudentMapTermAmount
from app.models.fee.fee_student_mapping_model import FeeStudentMapping
from app.models.fee.fee_transaction_item_model import FeeTransactionItem
from app.models.fee.fee_transaction_model import FeeTransaction
from app.models.fee.fee_type_model import FeeType
from app.models.masters.admission_model import Admission

# Import user context components
from app.schemas.auth.user_context_schema import UserContext
from app.schemas.fee import (
    FeeTransactionCreate,
    FeeTransactionRead,
    FeeTransactionUpdate,
    OutstandingFeeItem,
    OutstandingFeeSummary,
    StudentTransactionHistory,
    TransactionHistoryItem,
)
from app.service.base.user_scoped_service import UserScopedService
from app.tools.database_error_mapper import map_database_error
from app.tools.error_handler import (
    ErrorCategory,
    create_business_rule_error,
    create_database_error,
    create_error_response,
    create_not_found_error,
    create_validation_error,
)

log = log.getLogger("fee.transaction_service")


class FeeTransactionService:
    """Core service for handling fee transactions and related operations"""

    @staticmethod
    async def generate_transaction_number(db: AsyncSession) -> str:
        """Generate unique transaction number for tenant"""
        while True:
            # Generate transaction number: TXN + timestamp + random
            timestamp = datetime.now().strftime("%Y%m%d")
            random_suffix = secrets.token_hex(4).upper()
            transaction_number = f"TXN{timestamp}{random_suffix}"

            # Check uniqueness within tenant
            result = await db.execute(
                select(FeeTransaction).where(FeeTransaction.transaction_number == transaction_number)
            )
            if not result.scalar_one_or_none():
                return transaction_number

    @staticmethod
    async def validate_student_exists(
        db: AsyncSession, student_id: UUID, admission_num: str, academic_year_id: UUID, request: Request | None = None
    ):
        """
        Validate student and admission details with comprehensive error handling

        Args:
            db: Database session
            student_id: Student UUID
            admission_num: Admission number (globally unique)
            academic_year_id: Academic year UUID (for fee structure validation)
            request: FastAPI request object for context

        Returns:
            Admission record if found

        Raises:
            HTTPException: For validation or not found errors
        """
        try:
            # Validate input parameters
            if not student_id:
                raise create_validation_error(message="Student ID is required", field="student_id", request=request)

            if not admission_num or not admission_num.strip():
                raise create_validation_error(
                    message="Admission number is required", field="admission_num", request=request
                )

            if not academic_year_id:
                raise create_validation_error(
                    message="Academic year ID is required", field="academic_year_id", request=request
                )

            # Query for admission record by admission number (globally unique)
            # and verify it belongs to the specified student
            result = await db.execute(
                select(Admission).where(
                    and_(Admission.student_id == student_id, Admission.admission_number == admission_num.strip())
                )
            )
            admission = result.scalar_one_or_none()

            if not admission:
                raise create_not_found_error(
                    message=f"Student with ID {student_id} and admission number {admission_num} not found",
                    resource_type="student_admission",
                    resource_id=f"{student_id}:{admission_num}",
                    request=request,
                )

            # Verify student has fee mappings for the requested academic year
            fee_mapping_result = await db.execute(
                select(FeeStudentMapping)
                .where(
                    and_(
                        FeeStudentMapping.student_id == student_id,
                        FeeStudentMapping.academic_year_id == academic_year_id,
                    )
                )
                .limit(1)
            )
            has_fee_mapping = fee_mapping_result.scalar_one_or_none()

            if not has_fee_mapping:
                raise create_not_found_error(
                    message=f"Student has no fee structure configured for academic year {academic_year_id}",
                    resource_type="fee_student_mapping",
                    resource_id=f"{student_id}:{academic_year_id}",
                    request=request,
                )

            return admission

        except HTTPException:
            raise
        except Exception as e:
            log.error(f"Error validating student existence: {str(e)}")
            raise create_error_response(
                error_code=ErrorCategory.SYSTEM_ERROR,
                message="Failed to validate student existence",
                status_code=500,
                request=request,
            )

    @staticmethod
    async def validate_fee_structure(
        db: AsyncSession,
        student_id: UUID,
        academic_year_id: UUID,
        fee_items: list[dict],
        request: Request | None = None,
    ):
        """
        Validate fee structure and calculate outstanding amounts with comprehensive error handling

        Args:
            db: Database session
            student_id: Student UUID
            academic_year_id: Academic year UUID
            fee_items: List of fee items to validate
            request: FastAPI request object for context

        Returns:
            List of validated fee items

        Raises:
            HTTPException: For validation, not found, or business rule errors
        """
        try:
            # Validate input parameters
            if not student_id:
                raise create_validation_error(message="Student ID is required", field="student_id", request=request)

            if not academic_year_id:
                raise create_validation_error(
                    message="Academic year ID is required", field="academic_year_id", request=request
                )

            if not fee_items or len(fee_items) == 0:
                raise create_validation_error(
                    message="At least one fee item is required", field="fee_items", request=request
                )

            validated_items = []

            for i, item in enumerate(fee_items):
                try:
                    # Validate item structure
                    if not isinstance(item, dict):
                        raise create_validation_error(
                            message=f"Fee item {i+1} must be a dictionary", field=f"fee_items[{i}]", request=request
                        )

                    # Extract and validate required fields
                    fee_type_id = item.get("fee_type_id")
                    term_date_id = item.get("term_date_id")
                    amount_paid = item.get("amount_paid")

                    if not fee_type_id:
                        raise create_validation_error(
                            message=f"Fee type ID is required for item {i+1}",
                            field=f"fee_items[{i}].fee_type_id",
                            request=request,
                        )

                    if not term_date_id:
                        raise create_validation_error(
                            message=f"Term date ID is required for item {i+1}",
                            field=f"fee_items[{i}].term_date_id",
                            request=request,
                        )

                    if amount_paid is None or amount_paid <= 0:
                        raise create_validation_error(
                            message=f"Amount paid must be greater than 0 for item {i+1}",
                            field=f"fee_items[{i}].amount_paid",
                            value=amount_paid,
                            request=request,
                        )

                    # Get student fee mapping
                    result = await db.execute(
                        select(FeeStudentMapping)
                        .options(selectinload(FeeStudentMapping.term_amounts))
                        .where(
                            and_(
                                FeeStudentMapping.student_id == student_id,
                                FeeStudentMapping.fee_type_id == fee_type_id,
                                FeeStudentMapping.academic_year_id == academic_year_id,
                            )
                        )
                    )
                    fee_mapping = result.scalar_one_or_none()

                    if not fee_mapping:
                        raise create_not_found_error(
                            message=f"Fee mapping not found for student and fee type {fee_type_id}",
                            resource_type="fee_student_mapping",
                            resource_id=f"{student_id}:{fee_type_id}:{academic_year_id}",
                            request=request,
                        )

                    # Get term amount
                    term_amount = next((ta for ta in fee_mapping.term_amounts if ta.term_date_id == term_date_id), None)
                    if not term_amount:
                        raise create_not_found_error(
                            message=f"Term amount not found for term date {term_date_id}",
                            resource_type="fee_term_amount",
                            resource_id=f"{fee_type_id}:{term_date_id}",
                            request=request,
                        )

                    # Calculate outstanding amount (amount_due - already_paid)
                    already_paid = await FeeTransactionService.get_student_payments_for_fee_term(
                        db, student_id, fee_type_id, term_date_id, academic_year_id, request
                    )
                    outstanding = term_amount.term_amount - already_paid

                    if amount_paid > outstanding:
                        raise create_business_rule_error(
                            message=f"Payment amount {amount_paid} exceeds outstanding amount {outstanding} for fee term date",
                            rule="payment_amount_exceeds_outstanding",
                            details={
                                "amount_paid": float(amount_paid),
                                "outstanding_amount": float(outstanding),
                                "term_date_id": str(term_date_id),
                            },
                            request=request,
                        )

                    validated_items.append(
                        {
                            "fee_type_id": fee_type_id,
                            "term_date_id": term_date_id,
                            "amount_due": term_amount.term_amount,
                            "amount_paid": amount_paid,
                            "description": item.get("description"),
                        }
                    )

                except HTTPException:
                    raise
                except Exception as e:
                    log.error(f"Error validating fee item {i+1}: {str(e)}")
                    raise create_error_response(
                        error_code=ErrorCategory.SYSTEM_ERROR,
                        message=f"Failed to validate fee item {i+1}",
                        status_code=500,
                        request=request,
                    )

            return validated_items

        except HTTPException:
            raise
        except Exception as e:
            log.error(f"Error validating fee structure: {str(e)}")
            raise create_error_response(
                error_code=ErrorCategory.SYSTEM_ERROR,
                message="Failed to validate fee structure",
                status_code=500,
                request=request,
            )

    @staticmethod
    async def get_student_payments_for_fee_term(
        db: AsyncSession,
        student_id: UUID,
        fee_type_id: UUID,
        term_date_id: UUID,
        academic_year_id: UUID,
        request: Request | None = None,
    ) -> Decimal:
        """
        Get total payments made by student for specific term date with error handling

        Args:
            db: Database session
            student_id: Student UUID
            fee_type_id: Fee type UUID
            term_date_id: Term date UUID
            academic_year_id: Academic year UUID
            request: FastAPI request object for context

        Returns:
            Decimal: Total amount paid for the term date

        Raises:
            HTTPException: For validation or system errors
        """
        try:
            # Validate input parameters
            if not student_id:
                raise create_validation_error(message="Student ID is required", field="student_id", request=request)

            if not fee_type_id:
                raise create_validation_error(message="Fee type ID is required", field="fee_type_id", request=request)

            if not term_date_id:
                raise create_validation_error(message="Term date ID is required", field="term_date_id", request=request)

            if not academic_year_id:
                raise create_validation_error(
                    message="Academic year ID is required", field="academic_year_id", request=request
                )

            result = await db.execute(
                select(func.sum(FeeTransactionItem.amount_paid))
                .select_from(
                    FeeTransactionItem.__table__.join(
                        FeeTransaction.__table__, FeeTransactionItem.fee_transaction_id == FeeTransaction.id
                    )
                )
                .where(
                    and_(
                        FeeTransaction.student_id == student_id,
                        FeeTransaction.academic_year_id == academic_year_id,
                        FeeTransaction.status == "completed",
                        FeeTransactionItem.fee_type_id == fee_type_id,
                        FeeTransactionItem.term_date_id == term_date_id,
                    )
                )
            )
            total_paid = result.scalar_one_or_none()
            return total_paid or Decimal("0.00")

        except HTTPException:
            raise
        except Exception as e:
            log.error(f"Error getting student payments for fee term: {str(e)}")
            raise create_error_response(
                error_code=ErrorCategory.SYSTEM_ERROR,
                message="Failed to get student payments for fee term",
                status_code=500,
                request=request,
            )

    @staticmethod
    async def create_transaction(
        db: AsyncSession,
        transaction_data: FeeTransactionCreate,
        collected_by_user_id: UUID,
        request: Request | None = None,
    ) -> FeeTransactionRead:
        """
        Create new fee transaction with comprehensive validation and business logic

        Args:
            db: Database session
            transaction_data: Transaction creation data
            collected_by_user_id: User ID who collected the payment
            request: FastAPI request object for context

        Returns:
            FeeTransactionRead: Created transaction with items

        Raises:
            HTTPException: For validation, business rule, or system errors
        """
        try:
            # Validate input data
            if not transaction_data:
                raise create_validation_error(
                    message="Transaction data is required", field="transaction_data", request=request
                )

            if not collected_by_user_id:
                raise create_validation_error(
                    message="Collected by user ID is required", field="collected_by_user_id", request=request
                )

            # Validate payment method
            valid_payment_methods = ["cash", "upi", "cheque", "bank_transfer"]
            if transaction_data.payment_method not in valid_payment_methods:
                raise create_validation_error(
                    message=f"Invalid payment method. Must be one of: {', '.join(valid_payment_methods)}",
                    field="payment_method",
                    value=transaction_data.payment_method,
                    request=request,
                )

            # Validate UPI reference if payment method is UPI
            if transaction_data.payment_method == "upi" and not transaction_data.upi_reference:
                raise create_validation_error(
                    message="UPI reference is required for UPI payments", field="upi_reference", request=request
                )

            # Validate cheque details if payment method is cheque
            if transaction_data.payment_method == "cheque":
                if not transaction_data.cheque_number:
                    raise create_validation_error(
                        message="Cheque number is required for cheque payments", field="cheque_number", request=request
                    )
                if not transaction_data.cheque_date:
                    raise create_validation_error(
                        message="Cheque date is required for cheque payments", field="cheque_date", request=request
                    )
                if not transaction_data.cheque_bank:
                    raise create_validation_error(
                        message="Cheque bank is required for cheque payments", field="cheque_bank", request=request
                    )

            # Validate bank details if payment method is bank_transfer
            if transaction_data.payment_method == "bank_transfer":
                if not transaction_data.bank_reference:
                    raise create_validation_error(
                        message="Bank reference is required for bank transfer payments",
                        field="bank_reference",
                        request=request,
                    )
                if not transaction_data.bank_name:
                    raise create_validation_error(
                        message="Bank name is required for bank transfer payments", field="bank_name", request=request
                    )

            # Validate student exists
            await FeeTransactionService.validate_student_exists(
                db,
                transaction_data.student_id,
                transaction_data.student_admission_num,
                transaction_data.academic_year_id,
                request,
            )

            # Validate fee structure and amounts
            validated_items = await FeeTransactionService.validate_fee_structure(
                db,
                transaction_data.student_id,
                transaction_data.academic_year_id,
                [item.dict() for item in transaction_data.transaction_items],
                request,
            )

            # Calculate total amount from validated items
            calculated_total = sum(item["amount_paid"] for item in validated_items)
            if abs(calculated_total - transaction_data.total_amount) > Decimal("0.01"):
                raise create_business_rule_error(
                    message=f"Total amount {transaction_data.total_amount} does not match sum of item amounts {calculated_total}",
                    rule="total_amount_mismatch",
                    details={
                        "provided_total": float(transaction_data.total_amount),
                        "calculated_total": float(calculated_total),
                    },
                    request=request,
                )

            # Generate transaction number
            transaction_number = await FeeTransactionService.generate_transaction_number(db)

            # Create transaction
            db_transaction = FeeTransaction(
                transaction_number=transaction_number,
                student_id=transaction_data.student_id,
                student_admission_num=transaction_data.student_admission_num,
                academic_year_id=transaction_data.academic_year_id,
                total_amount=transaction_data.total_amount,
                payment_method=transaction_data.payment_method,
                status="pending" if transaction_data.payment_method == "cheque" else "completed",
                upi_reference=transaction_data.upi_reference,
                upi_app_name=transaction_data.upi_app_name,
                cheque_number=transaction_data.cheque_number,
                cheque_date=transaction_data.cheque_date,
                cheque_bank=transaction_data.cheque_bank,
                cheque_status="pending" if transaction_data.payment_method == "cheque" else None,
                bank_reference=transaction_data.bank_reference,
                bank_name=transaction_data.bank_name,
                collected_by_user_id=collected_by_user_id,
                remarks=transaction_data.remarks,
            )

            db.add(db_transaction)
            await db.flush()  # Get the transaction ID

            # Create transaction items
            for item_data in validated_items:
                db_item = FeeTransactionItem(
                    fee_transaction_id=db_transaction.id,
                    fee_type_id=item_data["fee_type_id"],
                    term_date_id=item_data["term_date_id"],
                    amount_due=item_data["amount_due"],
                    amount_paid=item_data["amount_paid"],
                    description=item_data.get("description"),
                )
                db.add(db_item)

            await db.flush()  # Get the transaction ID

            # Load with all relationships before commit (proper refresh pattern)
            result = await db.execute(
                select(FeeTransaction)
                .options(
                    selectinload(FeeTransaction.transaction_items),
                    selectinload(FeeTransaction.student),
                    selectinload(FeeTransaction.fee_receipts),
                )
                .where(FeeTransaction.id == db_transaction.id)
            )
            db_transaction = result.scalar_one()

            await db.commit()

            # Populate student name fields
            if db_transaction.student:
                db_transaction.student_first_name = db_transaction.student.first_name
                db_transaction.student_last_name = db_transaction.student.last_name
                db_transaction.student_full_name = (
                    f"{db_transaction.student.first_name} {db_transaction.student.last_name}"
                )

            # Auto-generate receipt for completed transactions
            if db_transaction.status == "completed":
                try:
                    from app.service.fee.fee_receipt_service import FeeReceiptService
                    receipt = await FeeReceiptService.create_receipt(db, db_transaction.id, collected_by_user_id)
                    db_transaction.receipt_number = receipt.receipt_number
                except Exception as _e:
                    log.warning(f"Auto receipt generation failed for {db_transaction.transaction_number}: {_e}")
            elif db_transaction.fee_receipts:
                db_transaction.receipt_number = db_transaction.fee_receipts[0].receipt_number

            log.info(
                f"Successfully created fee transaction: {transaction_number} for student {transaction_data.student_id}"
            )
            return db_transaction

        except HTTPException:
            await db.rollback()
            raise
        except IntegrityError as e:
            await db.rollback()
            log.error(f"Integrity error creating fee transaction: {str(e)}")

            # Handle database-specific errors
            if "constraint" in str(e).lower() or "duplicate" in str(e).lower():
                error_code, message, details = map_database_error(e)
                raise create_database_error(message=message, constraint=details.get("constraint"), request=request)

            raise create_database_error(
                message="Database constraint violation while creating transaction", request=request
            )
        except Exception as e:
            await db.rollback()
            log.error(f"Error creating fee transaction: {str(e)}")
            raise create_error_response(
                error_code=ErrorCategory.SYSTEM_ERROR,
                message="Failed to create fee transaction",
                status_code=500,
                request=request,
            )

    @staticmethod
    async def get_transaction_by_id(
        db: AsyncSession, transaction_id: UUID, request: Request | None = None
    ) -> FeeTransactionRead:
        """
        Get transaction by ID with comprehensive error handling

        Args:
            db: Database session
            transaction_id: Transaction UUID
            request: FastAPI request object for context

        Returns:
            FeeTransactionRead: Transaction with all relationships

        Raises:
            HTTPException: For not found or system errors
        """
        try:
            # Validate input parameters
            if not transaction_id:
                raise create_validation_error(
                    message="Transaction ID is required", field="transaction_id", request=request
                )

            result = await db.execute(
                select(FeeTransaction)
                .options(
                    selectinload(FeeTransaction.transaction_items),
                    selectinload(FeeTransaction.student),
                    selectinload(FeeTransaction.fee_receipts),
                )
                .where(FeeTransaction.id == transaction_id)
            )
            transaction = result.scalar_one_or_none()

            if not transaction:
                raise create_not_found_error(
                    message="Transaction not found",
                    resource_type="fee_transaction",
                    resource_id=str(transaction_id),
                    request=request,
                )

            # Populate student name fields
            if transaction.student:
                transaction.student_first_name = transaction.student.first_name
                transaction.student_last_name = transaction.student.last_name
                transaction.student_full_name = f"{transaction.student.first_name} {transaction.student.last_name}"

            if transaction.fee_receipts:
                transaction.receipt_number = transaction.fee_receipts[0].receipt_number

            return transaction

        except HTTPException:
            raise
        except Exception as e:
            log.error(f"Error getting transaction: {str(e)}")
            raise create_error_response(
                error_code=ErrorCategory.SYSTEM_ERROR,
                message="Failed to retrieve transaction",
                status_code=500,
                request=request,
            )

    @staticmethod
    async def update_transaction_status(
        db: AsyncSession, transaction_id: UUID, update_data: FeeTransactionUpdate, updated_by_user_id: UUID
    ) -> FeeTransactionRead:
        """Update transaction status (for cheque clearance, etc.)"""
        try:
            result = await db.execute(select(FeeTransaction).where(FeeTransaction.id == transaction_id))
            transaction = result.scalar_one_or_none()

            if not transaction:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail=f"Transaction with ID {transaction_id} not found"
                )

            # Update fields
            if update_data.status is not None:
                transaction.status = update_data.status
            if update_data.cheque_status is not None:
                transaction.cheque_status = update_data.cheque_status
            if update_data.approved_by_user_id is not None:
                transaction.approved_by_user_id = update_data.approved_by_user_id
            if update_data.remarks is not None:
                transaction.remarks = update_data.remarks

            await db.commit()
            await db.refresh(transaction)

            return await FeeTransactionService.get_transaction_by_id(db, transaction.id)

        except HTTPException:
            await db.rollback()
            raise
        except Exception as e:
            await db.rollback()
            log.error(f"Error updating transaction: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred while updating transaction"
            )

    @staticmethod
    async def calculate_outstanding_fees(
        db: AsyncSession, student_id: UUID, academic_year_id: UUID
    ) -> OutstandingFeeSummary:
        """Calculate outstanding fees for a student"""
        try:
            # Get all fee mappings for student
            result = await db.execute(
                select(FeeStudentMapping)
                .options(
                    selectinload(FeeStudentMapping.fee_type),
                    selectinload(FeeStudentMapping.term_amounts).selectinload(FeeStudentMapTermAmount.fee_term),
                )
                .where(
                    and_(
                        FeeStudentMapping.student_id == student_id,
                        FeeStudentMapping.academic_year_id == academic_year_id,
                    )
                )
            )
            fee_mappings = result.scalars().all()

            outstanding_items = []
            total_outstanding = Decimal("0.00")

            for mapping in fee_mappings:
                for term_amount in mapping.term_amounts:
                    # Calculate paid amount for this fee type and term
                    paid_amount = await FeeTransactionService.get_student_payments_for_fee_term(
                        db, student_id, mapping.fee_type_id, term_amount.fee_term_id, academic_year_id
                    )

                    outstanding = term_amount.amount - paid_amount

                    if outstanding > 0:
                        outstanding_items.append(
                            OutstandingFeeItem(
                                fee_type_id=mapping.fee_type_id,
                                fee_type_name=mapping.fee_type.type_name,
                                fee_term_id=term_amount.fee_term_id,
                                fee_term_name=term_amount.fee_term.term_name,
                                amount_due=term_amount.amount,
                                amount_paid=paid_amount,
                                outstanding_amount=outstanding,
                            )
                        )
                        total_outstanding += outstanding

            return OutstandingFeeSummary(
                student_id=student_id,
                student_admission_num=next((mapping.student_admission_num for mapping in fee_mappings), ""),
                academic_year_id=academic_year_id,
                total_outstanding=total_outstanding,
                outstanding_items=outstanding_items,
            )

        except Exception as e:
            log.error(f"Error calculating outstanding fees: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while calculating outstanding fees",
            )

    @staticmethod
    async def get_student_transaction_history(
        db: AsyncSession, student_id: UUID, academic_year_id: UUID, limit: int = 50
    ) -> StudentTransactionHistory:
        """Get transaction history for a student"""
        try:
            result = await db.execute(
                select(FeeTransaction)
                .options(selectinload(FeeTransaction.transaction_items))
                .where(
                    and_(FeeTransaction.student_id == student_id, FeeTransaction.academic_year_id == academic_year_id)
                )
                .order_by(desc(FeeTransaction.transaction_date))
                .limit(limit)
            )
            transactions = result.scalars().all()

            # Get admission number
            admission_result = await db.execute(
                select(Admission.admission_number).where(
                    and_(Admission.student_id == student_id, Admission.academic_year_id == academic_year_id)
                )
            )
            admission_num = admission_result.scalar_one_or_none() or ""

            history_items = []
            for transaction in transactions:
                # Get fee type names for this transaction
                fee_type_names = []
                for item in transaction.transaction_items:
                    fee_type_result = await db.execute(select(FeeType.type_name).where(FeeType.id == item.fee_type_id))
                    fee_type_name = fee_type_result.scalar_one_or_none()
                    if fee_type_name and fee_type_name not in fee_type_names:
                        fee_type_names.append(fee_type_name)

                history_items.append(
                    TransactionHistoryItem(
                        transaction_number=transaction.transaction_number,
                        transaction_date=transaction.transaction_date,
                        payment_method=transaction.payment_method,
                        total_amount=transaction.total_amount,
                        status=transaction.status,
                        receipt_generated=transaction.receipt_generated,
                        fee_types_paid=fee_type_names,
                    )
                )

            return StudentTransactionHistory(
                student_id=student_id,
                student_admission_num=admission_num,
                academic_year_id=academic_year_id,
                transactions=history_items,
            )

        except Exception as e:
            log.error(f"Error getting transaction history: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while retrieving transaction history",
            )

    @staticmethod
    async def search_transactions(
        db: AsyncSession,
        student_id: UUID | None = None,
        academic_year_id: UUID | None = None,
        payment_method: str | None = None,
        transaction_status: str | None = None,
        has_receipt: bool | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[FeeTransactionRead]:
        """Search transactions with filters"""
        try:
            query = select(FeeTransaction).options(
                selectinload(FeeTransaction.transaction_items),
                selectinload(FeeTransaction.student),
                selectinload(FeeTransaction.fee_receipts),
            )

            conditions = []
            if student_id:
                conditions.append(FeeTransaction.student_id == student_id)
            if academic_year_id:
                conditions.append(FeeTransaction.academic_year_id == academic_year_id)
            if payment_method:
                conditions.append(FeeTransaction.payment_method == payment_method)
            if transaction_status:
                conditions.append(FeeTransaction.status == transaction_status)
            if has_receipt is not None:
                conditions.append(FeeTransaction.receipt_generated == has_receipt)
            if date_from:
                conditions.append(FeeTransaction.transaction_date >= date_from)
            if date_to:
                conditions.append(FeeTransaction.transaction_date <= date_to)

            if conditions:
                query = query.where(and_(*conditions))

            query = query.order_by(desc(FeeTransaction.transaction_date))
            query = query.offset(offset).limit(limit)

            result = await db.execute(query)
            transactions = result.scalars().all()

            # Populate student name fields for each transaction
            for transaction in transactions:
                if transaction.student:
                    transaction.student_first_name = transaction.student.first_name
                    transaction.student_last_name = transaction.student.last_name
                    transaction.student_full_name = f"{transaction.student.first_name} {transaction.student.last_name}"
                if transaction.fee_receipts:
                    transaction.receipt_number = transaction.fee_receipts[0].receipt_number

            return transactions

        except Exception as e:
            log.error(f"Error searching transactions: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while searching transactions",
            )

    # User-Context Aware Methods for User-Specific Permissions

    @staticmethod
    async def get_student_fee_transactions_with_context(
        db: AsyncSession, student_id: UUID, user_context: UserContext, skip: int = 0, limit: int = 10
    ) -> dict[str, Any]:
        """
        Get fee transactions for a specific student with user access control

        Args:
            db: Database session
            student_id: Student ID to get transactions for
            user_context: User context with access scope
            skip: Number of records to skip (pagination)
            limit: Number of records to return

        Returns:
            Dict with student's fee transactions and pagination info

        Raises:
            HTTPException: If user doesn't have access to student's fee data
        """
        try:
            # Validate user access to this student's fee data
            if user_context.access_scope == "own":
                if user_context.student_id != student_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN, detail="Cannot access other students' fee data"
                    )
            elif user_context.access_scope == "related":
                if student_id not in (user_context.allowed_entity_ids or []):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN, detail="Cannot access unrelated student's fee data"
                    )
            # "all" access scope - no additional validation needed

            # Count total transactions for this student
            count_query = select(func.count(FeeTransaction.id)).where(FeeTransaction.student_id == student_id)
            count_result = await db.execute(count_query)
            total_count = count_result.scalar() or 0

            # Query fee transactions for the student with relationships
            query = (
                select(FeeTransaction)
                .options(
                    selectinload(FeeTransaction.transaction_items),
                    selectinload(FeeTransaction.academic_year),
                    selectinload(FeeTransaction.fee_receipts),
                    selectinload(FeeTransaction.student),
                )
                .where(FeeTransaction.student_id == student_id)
                .offset(skip)
                .limit(limit)
                .order_by(FeeTransaction.created_at.desc())
            )

            result = await db.execute(query)
            transactions = result.scalars().all()

            # Populate student name fields for each transaction
            for transaction in transactions:
                if transaction.student:
                    transaction.student_first_name = transaction.student.first_name
                    transaction.student_last_name = transaction.student.last_name
                    transaction.student_full_name = f"{transaction.student.first_name} {transaction.student.last_name}"
                if transaction.fee_receipts:
                    transaction.receipt_number = transaction.fee_receipts[0].receipt_number

            has_next = (skip + limit) < total_count

            log.info(
                f"User {user_context.username} accessed {len(transactions)} fee transactions for student {student_id} (scope: {user_context.access_scope})"
            )

            return {
                "items": transactions,
                "student_id": str(student_id),
                "total_count": total_count,
                "has_next": has_next,
                "access_scope": user_context.access_scope,
                "user_role": user_context.role,
            }

        except HTTPException:
            raise
        except Exception as e:
            log.error(f"Error fetching fee transactions for student {student_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch fee transactions"
            )

    @staticmethod
    async def get_user_accessible_fee_transactions(
        db: AsyncSession,
        user_context: UserContext,
        skip: int = 0,
        limit: int = 10,
        academic_year_id: UUID | None = None,
        transaction_status: str | None = None,
    ) -> dict[str, Any]:
        """
        Get fee transactions that user has access to based on their context

        Args:
            db: Database session
            user_context: User context with access scope
            skip: Number of records to skip
            limit: Number of records to return
            academic_year_id: Filter by academic year (optional)
            transaction_status: Filter by transaction status (optional)

        Returns:
            Dict with accessible fee transactions and pagination info
        """
        try:
            # Initialize user-scoped service
            scoped_service = UserScopedService(db)

            # Build base query with filters
            base_conditions = []
            if academic_year_id:
                base_conditions.append(FeeTransaction.academic_year_id == academic_year_id)
            if transaction_status:
                base_conditions.append(FeeTransaction.status == transaction_status)

            # Count query with filters
            count_stmt = select(func.count(FeeTransaction.id))
            if base_conditions:
                count_stmt = count_stmt.where(and_(*base_conditions))

            # Apply user scoping to count query
            filtered_count_stmt = await scoped_service.get_user_scoped_query(
                count_stmt, user_context, FeeTransaction, "list"
            )

            count_result = await db.execute(filtered_count_stmt)
            total_count = count_result.scalar() or 0

            # Main query with relationships
            base_stmt = select(FeeTransaction).options(
                selectinload(FeeTransaction.transaction_items),
                selectinload(FeeTransaction.academic_year),
                selectinload(FeeTransaction.fee_receipts),
                selectinload(FeeTransaction.student),
            )

            # Apply filters
            if base_conditions:
                base_stmt = base_stmt.where(and_(*base_conditions))

            # Apply user scoping
            filtered_stmt = await scoped_service.get_user_scoped_query(base_stmt, user_context, FeeTransaction, "list")

            # Apply pagination and ordering
            stmt = filtered_stmt.offset(skip).limit(limit).order_by(FeeTransaction.created_at.desc())

            result = await db.execute(stmt)
            transactions = result.scalars().all()

            # Populate student name fields for each transaction
            for transaction in transactions:
                if transaction.student:
                    transaction.student_first_name = transaction.student.first_name
                    transaction.student_last_name = transaction.student.last_name
                    transaction.student_full_name = f"{transaction.student.first_name} {transaction.student.last_name}"
                if transaction.fee_receipts:
                    transaction.receipt_number = transaction.fee_receipts[0].receipt_number

            has_next = (skip + limit) < total_count

            log.info(
                f"User {user_context.username} accessed {len(transactions)} fee transactions (scope: {user_context.access_scope})"
            )

            return {
                "items": transactions,
                "total_count": total_count,
                "has_next": has_next,
                "filters_applied": {
                    "academic_year_id": str(academic_year_id) if academic_year_id else None,
                    "transaction_status": transaction_status,
                },
                "access_scope": user_context.access_scope,
                "user_role": user_context.role,
            }

        except Exception as e:
            log.error(f"Error fetching user accessible fee transactions: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch fee transactions"
            )

    @staticmethod
    async def get_outstanding_fees_with_context(
        db: AsyncSession, student_id: UUID, user_context: UserContext
    ) -> OutstandingFeeSummary:
        """
        Calculate outstanding fees for a student with user access control

        Args:
            db: Database session
            student_id: Student ID to calculate outstanding fees for
            user_context: User context with access scope

        Returns:
            OutstandingFeeSummary with student's outstanding fee details

        Raises:
            HTTPException: If user doesn't have access to student's fee data
        """
        try:
            # Validate user access to this student's fee data
            if user_context.access_scope == "own":
                if user_context.student_id != student_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN, detail="Cannot access other students' fee data"
                    )
            elif user_context.access_scope == "related":
                if student_id not in (user_context.allowed_entity_ids or []):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN, detail="Cannot access unrelated student's fee data"
                    )
            # "all" access scope - no additional validation needed

            # Get student's current academic year from their admission
            admission_result = await db.execute(
                select(Admission.academic_year_id)
                .where(Admission.student_id == student_id)
                .order_by(Admission.created_at.desc())
                .limit(1)
            )
            academic_year_id = admission_result.scalar_one_or_none()

            if not academic_year_id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="No admission record found for student"
                )

            # Use existing calculate_outstanding_fees method
            outstanding_fees = await FeeTransactionService.calculate_outstanding_fees(db, student_id, academic_year_id)

            log.info(
                f"User {user_context.username} accessed outstanding fees for student {student_id} (scope: {user_context.access_scope})"
            )

            return outstanding_fees

        except HTTPException:
            raise
        except Exception as e:
            log.error(f"Error calculating outstanding fees for student {student_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to calculate outstanding fees"
            )

from fastapi import HTTPException, status
import logging as log
from sqlalchemy import select, and_, func, desc, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError
from app.models.fee.fee_transaction_model import FeeTransaction
from app.models.fee.fee_transaction_item_model import FeeTransactionItem
from app.models.fee.fee_receipt_model import FeeReceipt
from app.models.fee.fee_refund_model import FeeRefund
from app.models.fee.fee_student_mapping_model import FeeStudentMapping
from app.models.fee.fee_student_map_term_amount_model import FeeStudentMapTermAmount
from app.models.fee.fee_type_model import FeeType
from app.models.fee.fee_term_model import FeeTerm
from app.models.masters.academic_year_model import AcademicYear
from app.models.masters.admission_model import Admission
from app.schemas.fee import (
    FeeTransactionCreate, FeeTransactionUpdate, FeeTransactionRead,
    OutstandingFeeSummary, OutstandingFeeItem,
    StudentTransactionHistory, TransactionHistoryItem
)
from typing import List, Optional, Dict, Any
from uuid import UUID
from decimal import Decimal
import secrets
import hashlib
from datetime import datetime

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
                select(FeeTransaction).where(
                    FeeTransaction.transaction_number == transaction_number
                )
            )
            if not result.scalar_one_or_none():
                return transaction_number
    
    @staticmethod
    async def validate_student_exists(db: AsyncSession, student_id: UUID, admission_num: str, academic_year_id: UUID):
        """Validate student and admission details"""
        result = await db.execute(
            select(Admission).where(
                and_(
                    Admission.student_id == student_id,
                    Admission.admission_number == admission_num,
                    Admission.academic_year_id == academic_year_id
                )
            )
        )
        admission = result.scalar_one_or_none()
        if not admission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Student with ID {student_id} and admission number {admission_num} not found for academic year"
            )
        return admission
    
    @staticmethod
    async def validate_fee_structure(db: AsyncSession, student_id: UUID, academic_year_id: UUID, fee_items: List[Dict]):
        """Validate fee structure and calculate outstanding amounts"""
        validated_items = []
        
        for item in fee_items:
            fee_type_id = item['fee_type_id']
            fee_term_id = item['fee_term_id']
            amount_paid = item['amount_paid']
            
            # Get student fee mapping
            result = await db.execute(
                select(FeeStudentMapping)
                .options(selectinload(FeeStudentMapping.term_amounts))
                .where(
                    and_(
                        FeeStudentMapping.student_id == student_id,
                        FeeStudentMapping.fee_type_id == fee_type_id,
                        FeeStudentMapping.academic_year_id == academic_year_id
                    )
                )
            )
            fee_mapping = result.scalar_one_or_none()
            
            if not fee_mapping:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Fee mapping not found for student and fee type {fee_type_id}"
                )
            
            # Get term amount
            term_amount = next((ta for ta in fee_mapping.term_amounts if ta.term_id == fee_term_id), None)
            if not term_amount:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Term amount not found for fee term {fee_term_id}"
                )
            
            # Calculate outstanding amount (amount_due - already_paid)
            already_paid = await FeeTransactionService.get_student_payments_for_fee_term(
                db, student_id, fee_type_id, fee_term_id, academic_year_id
            )
            outstanding = term_amount.term_amount - already_paid
            
            if amount_paid > outstanding:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Payment amount {amount_paid} exceeds outstanding amount {outstanding} for fee term"
                )
            
            validated_items.append({
                'fee_type_id': fee_type_id,
                'fee_term_id': fee_term_id,
                'amount_due': term_amount.term_amount,
                'amount_paid': amount_paid,
                'description': item.get('description')
            })
        
        return validated_items
    
    @staticmethod
    async def get_student_payments_for_fee_term(
        db: AsyncSession, 
        student_id: UUID, 
        fee_type_id: UUID, 
        fee_term_id: UUID, 
        academic_year_id: UUID
    ) -> Decimal:
        """Get total payments made by student for specific fee term"""
        result = await db.execute(
            select(func.sum(FeeTransactionItem.amount_paid))
            .select_from(
                FeeTransactionItem.__table__.join(
                    FeeTransaction.__table__,
                    FeeTransactionItem.fee_transaction_id == FeeTransaction.id
                )
            )
            .where(
                and_(
                    FeeTransaction.student_id == student_id,
                    FeeTransaction.academic_year_id == academic_year_id,
                    FeeTransaction.status == 'completed',
                    FeeTransactionItem.fee_type_id == fee_type_id,
                    FeeTransactionItem.fee_term_id == fee_term_id
                )
            )
        )
        total_paid = result.scalar_one_or_none()
        return total_paid or Decimal('0.00')

    @staticmethod
    async def create_transaction(db: AsyncSession, transaction_data: FeeTransactionCreate, collected_by_user_id: UUID) -> FeeTransactionRead:
        """Create new fee transaction with validation and business logic"""
        try:
            # Validate student exists
            await FeeTransactionService.validate_student_exists(
                db, transaction_data.student_id, 
                transaction_data.student_admission_num, 
                transaction_data.academic_year_id
            )
            
            # Validate fee structure and amounts
            validated_items = await FeeTransactionService.validate_fee_structure(
                db, transaction_data.student_id, transaction_data.academic_year_id,
                [item.dict() for item in transaction_data.transaction_items]
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
                status='pending' if transaction_data.payment_method == 'cheque' else 'completed',
                upi_reference=transaction_data.upi_reference,
                upi_app_name=transaction_data.upi_app_name,
                cheque_number=transaction_data.cheque_number,
                cheque_date=transaction_data.cheque_date,
                cheque_bank=transaction_data.cheque_bank,
                cheque_status='pending' if transaction_data.payment_method == 'cheque' else None,
                bank_reference=transaction_data.bank_reference,
                bank_name=transaction_data.bank_name,
                collected_by_user_id=collected_by_user_id,
                remarks=transaction_data.remarks
            )
            
            db.add(db_transaction)
            await db.flush()  # Get the transaction ID
            
            # Create transaction items
            for item_data in validated_items:
                db_item = FeeTransactionItem(
                    fee_transaction_id=db_transaction.id,
                    fee_type_id=item_data['fee_type_id'],
                    fee_term_id=item_data['fee_term_id'],
                    amount_due=item_data['amount_due'],
                    amount_paid=item_data['amount_paid'],
                    description=item_data.get('description')
                )
                db.add(db_item)
            
            await db.flush()  # Get the transaction ID
            
            # Load with all relationships before commit (proper refresh pattern)
            result = await db.execute(
                select(FeeTransaction)
                .options(selectinload(FeeTransaction.transaction_items))
                .where(FeeTransaction.id == db_transaction.id)
            )
            db_transaction = result.scalar_one()
            
            await db.commit()
            
            # Return complete transaction with items
            return db_transaction
            
        except HTTPException:
            await db.rollback()
            raise
        except Exception as e:
            await db.rollback()
            log.error(f"Error creating fee transaction: {str(e)}")
            log.error(f"Exception type: {type(e).__name__}")
            import traceback
            log.error(f"Traceback: {traceback.format_exc()}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"An error occurred while creating fee transaction: {str(e)}"
            )

    @staticmethod
    async def get_transaction_by_id(db: AsyncSession, transaction_id: UUID) -> FeeTransactionRead:
        """Get transaction by ID with all relationships"""
        try:
            result = await db.execute(
                select(FeeTransaction)
                .options(selectinload(FeeTransaction.transaction_items))
                .where(FeeTransaction.id == transaction_id)
            )
            transaction = result.scalar_one_or_none()
            
            if not transaction:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Transaction with ID {transaction_id} not found"
                )
            
            return transaction
            
        except HTTPException:
            raise
        except Exception as e:
            log.error(f"Error getting transaction: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while retrieving transaction"
            )

    @staticmethod
    async def update_transaction_status(
        db: AsyncSession, 
        transaction_id: UUID, 
        update_data: FeeTransactionUpdate,
        updated_by_user_id: UUID
    ) -> FeeTransactionRead:
        """Update transaction status (for cheque clearance, etc.)"""
        try:
            result = await db.execute(
                select(FeeTransaction).where(FeeTransaction.id == transaction_id)
            )
            transaction = result.scalar_one_or_none()
            
            if not transaction:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Transaction with ID {transaction_id} not found"
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
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while updating transaction"
            )

    @staticmethod
    async def calculate_outstanding_fees(
        db: AsyncSession, 
        student_id: UUID, 
        academic_year_id: UUID
    ) -> OutstandingFeeSummary:
        """Calculate outstanding fees for a student"""
        try:
            # Get all fee mappings for student
            result = await db.execute(
                select(FeeStudentMapping)
                .options(
                    selectinload(FeeStudentMapping.fee_type),
                    selectinload(FeeStudentMapping.term_amounts).selectinload(
                        FeeStudentMapTermAmount.fee_term
                    )
                )
                .where(
                    and_(
                        FeeStudentMapping.student_id == student_id,
                        FeeStudentMapping.academic_year_id == academic_year_id
                    )
                )
            )
            fee_mappings = result.scalars().all()
            
            outstanding_items = []
            total_outstanding = Decimal('0.00')
            
            for mapping in fee_mappings:
                for term_amount in mapping.term_amounts:
                    # Calculate paid amount for this fee type and term
                    paid_amount = await FeeTransactionService.get_student_payments_for_fee_term(
                        db, student_id, mapping.fee_type_id, 
                        term_amount.fee_term_id, academic_year_id
                    )
                    
                    outstanding = term_amount.amount - paid_amount
                    
                    if outstanding > 0:
                        outstanding_items.append(OutstandingFeeItem(
                            fee_type_id=mapping.fee_type_id,
                            fee_type_name=mapping.fee_type.type_name,
                            fee_term_id=term_amount.fee_term_id,
                            fee_term_name=term_amount.fee_term.term_name,
                            amount_due=term_amount.amount,
                            amount_paid=paid_amount,
                            outstanding_amount=outstanding
                        ))
                        total_outstanding += outstanding
            
            return OutstandingFeeSummary(
                student_id=student_id,
                student_admission_num=next((
                    mapping.student_admission_num for mapping in fee_mappings
                ), ""),
                academic_year_id=academic_year_id,
                total_outstanding=total_outstanding,
                outstanding_items=outstanding_items
            )
            
        except Exception as e:
            log.error(f"Error calculating outstanding fees: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while calculating outstanding fees"
            )

    @staticmethod
    async def get_student_transaction_history(
        db: AsyncSession,
        student_id: UUID,
        academic_year_id: UUID,
        limit: int = 50
    ) -> StudentTransactionHistory:
        """Get transaction history for a student"""
        try:
            result = await db.execute(
                select(FeeTransaction)
                .options(selectinload(FeeTransaction.transaction_items))
                .where(
                    and_(
                        FeeTransaction.student_id == student_id,
                        FeeTransaction.academic_year_id == academic_year_id
                    )
                )
                .order_by(desc(FeeTransaction.transaction_date))
                .limit(limit)
            )
            transactions = result.scalars().all()
            
            # Get admission number
            admission_result = await db.execute(
                select(Admission.admission_number).where(
                    and_(
                        Admission.student_id == student_id,
                        Admission.academic_year_id == academic_year_id
                    )
                )
            )
            admission_num = admission_result.scalar_one_or_none() or ""
            
            history_items = []
            for transaction in transactions:
                # Get fee type names for this transaction
                fee_type_names = []
                for item in transaction.transaction_items:
                    fee_type_result = await db.execute(
                        select(FeeType.type_name).where(FeeType.id == item.fee_type_id)
                    )
                    fee_type_name = fee_type_result.scalar_one_or_none()
                    if fee_type_name and fee_type_name not in fee_type_names:
                        fee_type_names.append(fee_type_name)
                
                history_items.append(TransactionHistoryItem(
                    transaction_number=transaction.transaction_number,
                    transaction_date=transaction.transaction_date,
                    payment_method=transaction.payment_method,
                    total_amount=transaction.total_amount,
                    status=transaction.status,
                    receipt_generated=transaction.receipt_generated,
                    fee_types_paid=fee_type_names
                ))
            
            return StudentTransactionHistory(
                student_id=student_id,
                student_admission_num=admission_num,
                academic_year_id=academic_year_id,
                transactions=history_items
            )
            
        except Exception as e:
            log.error(f"Error getting transaction history: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while retrieving transaction history"
            )

    @staticmethod
    async def search_transactions(
        db: AsyncSession,
        student_id: Optional[UUID] = None,
        academic_year_id: Optional[UUID] = None,
        payment_method: Optional[str] = None,
        transaction_status: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[FeeTransactionRead]:
        """Search transactions with filters"""
        try:
            query = select(FeeTransaction).options(
                selectinload(FeeTransaction.transaction_items)
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
            
            return transactions
            
        except Exception as e:
            log.error(f"Error searching transactions: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while searching transactions"
            )
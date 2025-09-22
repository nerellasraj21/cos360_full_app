from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.db.tenant_session import get_tenant_db
from app.tools.simple_permissions import get_current_user_token, check_role_plan_permission_with_error
from app.service.fee.fee_transaction_service import FeeTransactionService
from app.schemas.fee import (
    FeeTransactionCreate, FeeTransactionUpdate, FeeTransactionRead, FeeTransactionSummary,
    OutstandingFeeSummary, StudentTransactionHistory
)

router = APIRouter(prefix="/fee/transactions", tags=["Fee/Fee Transactions"])

# Health check endpoint for transaction module
@router.get("/health", status_code=status.HTTP_200_OK)
async def transaction_health_check():
    """Health check for fee transaction endpoints"""
    return {"status": "healthy", "module": "fee_transactions", "timestamp": datetime.now()}

@router.post("/", response_model=FeeTransactionRead, status_code=status.HTTP_201_CREATED)
async def create_fee_transaction(
    transaction_data: FeeTransactionCreate,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db)
):
    """
    Create a new fee transaction
    
    - **Records fee payment for student** (cash, UPI, cheque, bank transfer)
    - **Validates fee structure** and outstanding amounts
    - **Auto-generates transaction number** unique per tenant
    - **Supports multiple fee types** in single transaction
    
    **Required permissions**: fee_transactions:create
    """
    # Authentication and authorization
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Permission check
    await check_role_plan_permission_with_error(db, request, role, 'fee_transactions', 'create')
    
    # Get current user ID
    collected_by_user_id = UUID(current_user.get('sub'))
    
    # Create transaction via service
    return await FeeTransactionService.create_transaction(db, transaction_data, collected_by_user_id, request)

@router.get("/{transaction_id}", response_model=FeeTransactionRead)
async def get_fee_transaction(
    transaction_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db)
):
    """
    Get fee transaction by ID with all transaction items
    
    **Required permissions**: fee_transactions:read
    """
    # Authentication and authorization
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Permission check
    await check_role_plan_permission_with_error(db, request, role, 'fee_transactions', 'read')
    
    return await FeeTransactionService.get_transaction_by_id(db, transaction_id, request)

@router.put("/{transaction_id}", response_model=FeeTransactionRead)
async def update_fee_transaction_status(
    transaction_id: UUID,
    update_data: FeeTransactionUpdate,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db)
):
    """
    Update fee transaction status
    
    - **Update payment status** (pending → completed, etc.)
    - **Handle cheque status** (pending → cleared/bounced)
    - **Add approval information** for workflow
    
    **Required permissions**: fee_transactions:update
    """
    # Authentication and authorization
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Permission check
    await check_role_plan_permission_with_error(db, request, role, 'fee_transactions', 'update')
    
    # Get current user ID
    updated_by_user_id = UUID(current_user.get('sub'))
    
    return await FeeTransactionService.update_transaction_status(db, transaction_id, update_data, updated_by_user_id)

@router.get("/", response_model=List[FeeTransactionRead])
async def search_fee_transactions(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    student_id: Optional[UUID] = Query(None, description="Filter by student ID"),
    academic_year_id: Optional[UUID] = Query(None, description="Filter by academic year"),
    payment_method: Optional[str] = Query(None, description="Filter by payment method"),
    status: Optional[str] = Query(None, description="Filter by transaction status"),
    date_from: Optional[datetime] = Query(None, description="Filter from date"),
    date_to: Optional[datetime] = Query(None, description="Filter to date"),
    limit: int = Query(100, description="Number of records to return"),
    offset: int = Query(0, description="Number of records to skip")
):
    """
    Search fee transactions with filters
    
    **Required permissions**: fee_transactions:list
    """
    # Authentication and authorization
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Permission check
    await check_role_plan_permission_with_error(db, request, role, 'fee_transactions', 'list')
    
    return await FeeTransactionService.search_transactions(
        db=db,
        student_id=student_id,
        academic_year_id=academic_year_id,
        payment_method=payment_method,
        transaction_status=status,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
        offset=offset
    )

@router.get("/student/{student_id}/outstanding", response_model=OutstandingFeeSummary)
async def get_student_outstanding_fees(
    student_id: UUID,
    academic_year_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db)
):
    """
    Calculate outstanding fees for a student
    
    - **Shows total outstanding amount** across all fee types
    - **Detailed breakdown** by fee type and term
    - **Considers all completed payments** when calculating outstanding
    
    **Required permissions**: fee_transactions:read
    """
    # Authentication and authorization
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Permission check
    await check_role_plan_permission_with_error(db, request, role, 'fee_transactions', 'read')
    
    return await FeeTransactionService.calculate_outstanding_fees(db, student_id, academic_year_id)

@router.get("/student/{student_id}/history", response_model=StudentTransactionHistory)
async def get_student_transaction_history(
    student_id: UUID,
    academic_year_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    limit: int = Query(50, description="Number of transactions to return")
):
    """
    Get payment history for a student
    
    - **Chronological list** of all transactions
    - **Payment method details** and amounts
    - **Receipt generation status** for each transaction
    
    **Required permissions**: fee_transactions:read
    """
    # Authentication and authorization
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Permission check
    await check_role_plan_permission_with_error(db, request, role, 'fee_transactions', 'read')
    
    return await FeeTransactionService.get_student_transaction_history(db, student_id, academic_year_id, limit)

@router.get("/transaction-number/{transaction_number}", response_model=FeeTransactionRead)
async def get_fee_transaction_by_number(
    transaction_number: str,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db)
):
    """
    Get fee transaction by transaction number
    
    **Required permissions**: fee_transactions:read
    """
    # Authentication and authorization
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Permission check
    await check_role_plan_permission_with_error(db, request, role, 'fee_transactions', 'read')
    
    # Search by transaction number (assuming we add this method to service)
    transactions = await FeeTransactionService.search_transactions(
        db=db,
        limit=1,
        offset=0
    )
    
    # Filter by transaction number in Python (or add to service)
    for transaction in transactions:
        if transaction.transaction_number == transaction_number:
            return transaction
    
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Transaction with number {transaction_number} not found"
    )
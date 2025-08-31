from fastapi import HTTPException, status
import logging as log
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError
from app.models.fee.fee_class_map_term_amount_model import FeeClassMappingTermAmount as FeeClassMappingTermAmountModel
from app.models.fee.fee_class_mapping_model import FeeClassMapping
from app.models.fee.fee_term_model import FeeTerm
from app.schemas.fee.fee_class_map_term_amount_schema import (
    FeeClassMappingTermAmountBulkCreate,
    FeeClassMappingTermAmountBulkUpdate,
    FeeClassMappingTermAmountBulkDelete
)
from typing import List, Optional
from uuid import UUID
from decimal import Decimal

log = log.getLogger("fee.class_mapping_term_amount_service")

async def validate_fee_class_mapping_exists(db: AsyncSession, fee_class_mapping_id: str):
    """Validate that fee class mapping exists and get it with fee_type relationship"""
    try:
        mapping_uuid = UUID(fee_class_mapping_id)
        result = await db.execute(
            select(FeeClassMapping)
            .options(selectinload(FeeClassMapping.fee_type))
            .where(FeeClassMapping.id == mapping_uuid)
        )
        mapping = result.scalar_one_or_none()
        if not mapping:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Fee class mapping with id {fee_class_mapping_id} not found"
            )
        return mapping
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid fee class mapping ID format"
        )

async def validate_term_exists(db: AsyncSession, term_id: str):
    """Validate that fee term exists"""
    try:
        term_uuid = UUID(term_id)
        result = await db.execute(select(FeeTerm).where(FeeTerm.id == term_uuid))
        term = result.scalar_one_or_none()
        if not term:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Fee term with id {term_id} not found"
            )
        return term
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid fee term ID format"
        )

async def validate_term_count(db: AsyncSession, fee_class_mapping: FeeClassMapping, term_amounts: List):
    """Validate that the number of term amounts matches the fee term's number_of_terms"""
    # Get the fee term associated with the fee type
    fee_term = None
    if fee_class_mapping.fee_type:
        result = await db.execute(
            select(FeeTerm).where(FeeTerm.id == fee_class_mapping.fee_type.fee_term_id)
        )
        fee_term = result.scalar_one_or_none()
    
    if not fee_term:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Associated fee term not found"
        )
    
    if len(term_amounts) != fee_term.number_of_terms:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Number of term amounts ({len(term_amounts)}) must match number_of_terms ({fee_term.number_of_terms}) in the associated fee term"
        )

async def validate_total_amount_matches(fee_class_mapping: FeeClassMapping, term_amounts: List):
    """Validate that the sum of term amounts equals the total fee in the mapping"""
    total_term_amount = sum(Decimal(str(term_amount.term_amount)) for term_amount in term_amounts)
    if total_term_amount != fee_class_mapping.total_fee:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Sum of term amounts ({total_term_amount}) must equal total fee ({fee_class_mapping.total_fee}) in the fee class mapping"
        )

async def create_fee_class_mapping_term_amounts(db: AsyncSession, bulk_data: FeeClassMappingTermAmountBulkCreate):
    """Create multiple fee class mapping term amounts"""
    try:
        # Validate fee class mapping exists
        fee_class_mapping = await validate_fee_class_mapping_exists(db, bulk_data.fee_class_mapping_id)
        
        # Validate term count matches
        await validate_term_count(db, fee_class_mapping, bulk_data.term_amounts)
        
        # Validate total amount matches
        await validate_total_amount_matches(fee_class_mapping, bulk_data.term_amounts)
        
        # Validate all terms exist and are unique
        term_ids = []
        for term_amount_data in bulk_data.term_amounts:
            await validate_term_exists(db, term_amount_data.term_id)
            if term_amount_data.term_id in term_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Duplicate term_id {term_amount_data.term_id} in request"
                )
            term_ids.append(term_amount_data.term_id)
        
        # Create term amounts
        created_amounts = []
        for term_amount_data in bulk_data.term_amounts:
            db_term_amount = FeeClassMappingTermAmountModel(
                fee_class_mapping_id=UUID(bulk_data.fee_class_mapping_id),
                term_id=UUID(term_amount_data.term_id),
                term_amount=term_amount_data.term_amount
            )
            db.add(db_term_amount)
            created_amounts.append(db_term_amount)
        
        await db.commit()
        
        # Refresh and return with relationships
        result_amounts = []
        for amount in created_amounts:
            await db.refresh(amount)
            # Load with relationships for response
            result = await db.execute(
                select(FeeClassMappingTermAmountModel)
                .options(selectinload(FeeClassMappingTermAmountModel.fee_term))
                .where(FeeClassMappingTermAmountModel.id == amount.id)
            )
            amount_with_relations = result.scalar_one()
            amount_with_relations.term_name = amount_with_relations.fee_term.term_name if amount_with_relations.fee_term else None
            result_amounts.append(amount_with_relations)
        
        return result_amounts
        
    except HTTPException:
        await db.rollback()
        raise
    except IntegrityError as e:
        await db.rollback()
        if "uq_fee_class_mapping_term" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Term amount already exists for this fee class mapping and term combination"
            )
        else:
            log.error(f"Integrity error creating fee class mapping term amounts: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while creating fee class mapping term amounts"
            )
    except Exception as e:
        await db.rollback()
        log.error(f"Error creating fee class mapping term amounts: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while creating fee class mapping term amounts"
        )

async def update_fee_class_mapping_term_amounts(db: AsyncSession, bulk_data: FeeClassMappingTermAmountBulkUpdate):
    """Update multiple fee class mapping term amounts"""
    try:
        # Validate fee class mapping exists
        fee_class_mapping = await validate_fee_class_mapping_exists(db, bulk_data.fee_class_mapping_id)
        
        # Get existing term amounts for this mapping
        result = await db.execute(
            select(FeeClassMappingTermAmountModel)
            .where(FeeClassMappingTermAmountModel.fee_class_mapping_id == UUID(bulk_data.fee_class_mapping_id))
        )
        existing_amounts = result.scalars().all()
        existing_by_id = {str(amount.id): amount for amount in existing_amounts}
        
        # Process updates
        updated_amounts = []
        for term_amount_data in bulk_data.term_amounts:
            # Validate term exists
            await validate_term_exists(db, term_amount_data.term_id)
            
            if term_amount_data.id:
                # Update existing record
                if term_amount_data.id not in existing_by_id:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Term amount with id {term_amount_data.id} not found"
                    )
                
                existing_amount = existing_by_id[term_amount_data.id]
                existing_amount.term_id = UUID(term_amount_data.term_id)
                existing_amount.term_amount = term_amount_data.term_amount
                updated_amounts.append(existing_amount)
            else:
                # Create new record
                new_amount = FeeClassMappingTermAmountModel(
                    fee_class_mapping_id=UUID(bulk_data.fee_class_mapping_id),
                    term_id=UUID(term_amount_data.term_id),
                    term_amount=term_amount_data.term_amount
                )
                db.add(new_amount)
                updated_amounts.append(new_amount)
        
        # Validate business rules after updates
        # Get all term amounts for validation (existing + new/updated)
        all_amounts_for_validation = []
        for amount in updated_amounts:
            class MockAmount:
                def __init__(self, term_amount):
                    self.term_amount = term_amount
            all_amounts_for_validation.append(MockAmount(amount.term_amount))
        
        await validate_term_count(db, fee_class_mapping, all_amounts_for_validation)
        await validate_total_amount_matches(fee_class_mapping, all_amounts_for_validation)
        
        await db.commit()
        
        # Refresh and return with relationships
        result_amounts = []
        for amount in updated_amounts:
            await db.refresh(amount)
            # Load with relationships for response
            result = await db.execute(
                select(FeeClassMappingTermAmountModel)
                .options(selectinload(FeeClassMappingTermAmountModel.fee_term))
                .where(FeeClassMappingTermAmountModel.id == amount.id)
            )
            amount_with_relations = result.scalar_one()
            amount_with_relations.term_name = amount_with_relations.fee_term.term_name if amount_with_relations.fee_term else None
            result_amounts.append(amount_with_relations)
        
        return result_amounts
        
    except HTTPException:
        await db.rollback()
        raise
    except IntegrityError as e:
        await db.rollback()
        if "uq_fee_class_mapping_term" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Term amount already exists for this fee class mapping and term combination"
            )
        else:
            log.error(f"Integrity error updating fee class mapping term amounts: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while updating fee class mapping term amounts"
            )
    except Exception as e:
        await db.rollback()
        log.error(f"Error updating fee class mapping term amounts: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while updating fee class mapping term amounts"
        )

async def delete_fee_class_mapping_term_amounts(db: AsyncSession, bulk_data: FeeClassMappingTermAmountBulkDelete):
    """Delete multiple fee class mapping term amounts"""
    try:
        deleted_count = 0
        for term_amount_id in bulk_data.term_amount_ids:
            try:
                term_amount_uuid = UUID(term_amount_id)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid term amount ID format: {term_amount_id}"
                )
            
            result = await db.execute(
                select(FeeClassMappingTermAmountModel)
                .where(FeeClassMappingTermAmountModel.id == term_amount_uuid)
            )
            term_amount = result.scalar_one_or_none()
            
            if term_amount:
                await db.delete(term_amount)
                deleted_count += 1
        
        await db.commit()
        return {"message": f"Successfully deleted {deleted_count} term amount(s)"}
        
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        log.error(f"Error deleting fee class mapping term amounts: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while deleting fee class mapping term amounts"
        )
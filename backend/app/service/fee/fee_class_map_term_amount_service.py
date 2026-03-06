from decimal import Decimal
import logging as log
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import and_, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.fee.fee_class_map_term_amount_model import FeeClassMappingTermAmount as FeeClassMappingTermAmountModel
from app.models.fee.fee_class_mapping_model import FeeClassMapping
from app.models.fee.fee_term_dates_model import FeeTermDates
from app.models.fee.fee_term_model import FeeTerm
from app.schemas.fee.fee_class_map_term_amount_schema import (
    FeeClassMappingTermAmountBulkCreate,
    FeeClassMappingTermAmountBulkDelete,
    FeeClassMappingTermAmountBulkUpdate,
)

log = log.getLogger("fee.class_mapping_term_amount_service")


async def validate_fee_class_mapping_exists(db: AsyncSession, fee_class_mapping_id: UUID):
    """Validate that fee class mapping exists and get it with fee_type relationship"""
    try:
        mapping_uuid = fee_class_mapping_id
        result = await db.execute(
            select(FeeClassMapping)
            .options(selectinload(FeeClassMapping.fee_type))
            .where(FeeClassMapping.id == mapping_uuid)
        )
        mapping = result.scalar_one_or_none()
        if not mapping:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Fee class mapping with id {fee_class_mapping_id} not found",
            )
        return mapping
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid fee class mapping ID format")


async def validate_term_exists(db: AsyncSession, term_id: UUID):
    """Validate that fee term exists"""
    try:
        term_uuid = term_id
        result = await db.execute(select(FeeTerm).where(FeeTerm.id == term_uuid))
        term = result.scalar_one_or_none()
        if not term:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Fee term with id {term_id} not found")
        return term
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid fee term ID format")


async def validate_term_count(db: AsyncSession, fee_class_mapping: FeeClassMapping, term_amounts: list):
    """Validate that the number of term amounts matches the number of term dates"""
    # Get the fee term associated with the fee type
    fee_term = None
    if fee_class_mapping.fee_type:
        result = await db.execute(select(FeeTerm).where(FeeTerm.id == fee_class_mapping.fee_type.fee_term_id))
        fee_term = result.scalar_one_or_none()

    if not fee_term:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Associated fee term not found")

    # Get actual term dates count
    result = await db.execute(select(func.count(FeeTermDates.id)).where(FeeTermDates.term_id == fee_term.id))
    term_dates_count = result.scalar()

    if len(term_amounts) != term_dates_count:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Number of term amounts ({len(term_amounts)}) must match number of term dates ({term_dates_count})",
        )

    return fee_term


def validate_total_amount_matches(fee_class_mapping: FeeClassMapping, term_amounts: list):
    """Validate that the sum of term amounts equals the total fee in the mapping"""
    total_term_amount = sum(Decimal(str(term_amount.term_amount)) for term_amount in term_amounts)
    if total_term_amount != fee_class_mapping.total_fee:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Sum of term amounts ({total_term_amount}) must equal total fee ({fee_class_mapping.total_fee}) in the fee class mapping",
        )


async def create_fee_class_mapping_term_amounts(db: AsyncSession, bulk_data: FeeClassMappingTermAmountBulkCreate):
    """Create multiple fee class mapping term amounts"""
    try:
        # Validate fee class mapping exists
        fee_class_mapping = await validate_fee_class_mapping_exists(db, bulk_data.fee_class_mapping_id)

        # Validate term count matches
        fee_term = await validate_term_count(db, fee_class_mapping, bulk_data.term_amounts)

        # Validate total amount matches
        validate_total_amount_matches(fee_class_mapping, bulk_data.term_amounts)

        # Validate all term_date_ids exist, belong to correct term, and are unique
        term_date_ids = []
        term_dates_map = {}  # Store term_date objects for reuse
        for term_amount_data in bulk_data.term_amounts:
            # Validate term_date exists and belongs to correct term
            result = await db.execute(
                select(FeeTermDates).where(
                    and_(FeeTermDates.id == term_amount_data.term_date_id, FeeTermDates.term_id == fee_term.id)
                )
            )
            term_date = result.scalar_one_or_none()
            if not term_date:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Term date {term_amount_data.term_date_id} not found or doesn't belong to term {fee_term.term_name}",
                )

            # Store term_date object with term_id for later use
            term_dates_map[term_amount_data.term_date_id] = term_date

            # Check for duplicates in request
            if term_amount_data.term_date_id in term_date_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Duplicate term_date_id {term_amount_data.term_date_id} in request",
                )
            term_date_ids.append(term_amount_data.term_date_id)

        # Create term amounts
        # IMPORTANT: term_id is a required field derived from the FeeTermDates record.
        # Even though term_id can be derived from term_date_id → fee_term_dates.term_id,
        # it is stored directly in the model for query performance (denormalized).
        # DO NOT omit term_id - it has a NOT NULL database constraint.
        created_amounts = []
        for term_amount_data in bulk_data.term_amounts:
            # Get term_id from the stored term_date object
            term_date = term_dates_map[term_amount_data.term_date_id]

            db_term_amount = FeeClassMappingTermAmountModel(
                fee_class_mapping_id=bulk_data.fee_class_mapping_id,
                term_id=term_date.term_id,  # Required: NOT NULL constraint
                term_date_id=term_amount_data.term_date_id,
                term_amount=term_amount_data.term_amount,
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
                .options(selectinload(FeeClassMappingTermAmountModel.fee_term_date).selectinload(FeeTermDates.fee_term))
                .where(FeeClassMappingTermAmountModel.id == amount.id)
            )
            amount_with_relations = result.scalar_one()
            if amount_with_relations.fee_term_date:
                amount_with_relations.term_name = (
                    amount_with_relations.fee_term_date.fee_term.term_name
                    if amount_with_relations.fee_term_date.fee_term
                    else None
                )
                amount_with_relations.term_date = (
                    str(amount_with_relations.fee_term_date.fee_term_date)
                    if amount_with_relations.fee_term_date.fee_term_date
                    else None
                )
            else:
                amount_with_relations.term_name = None
                amount_with_relations.term_date = None
            result_amounts.append(amount_with_relations)

        return result_amounts

    except HTTPException:
        await db.rollback()
        raise
    except IntegrityError as e:
        await db.rollback()
        if "uq_fee_class_mapping_term" in str(e) or "uq_fee_class_mapping_term_date" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Term amount already exists for this fee class mapping and term date combination",
            )
        else:
            log.error(f"Integrity error creating fee class mapping term amounts: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while creating fee class mapping term amounts",
            )
    except Exception as e:
        await db.rollback()
        log.error(f"Error creating fee class mapping term amounts: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while creating fee class mapping term amounts",
        )


async def update_fee_class_mapping_term_amounts(db: AsyncSession, bulk_data: FeeClassMappingTermAmountBulkUpdate):
    """Update multiple fee class mapping term amounts"""
    try:
        # Validate fee class mapping exists
        fee_class_mapping = await validate_fee_class_mapping_exists(db, bulk_data.fee_class_mapping_id)

        # Get existing term amounts for this mapping
        result = await db.execute(
            select(FeeClassMappingTermAmountModel).where(
                FeeClassMappingTermAmountModel.fee_class_mapping_id == bulk_data.fee_class_mapping_id
            )
        )
        existing_amounts = result.scalars().all()
        existing_by_id = {str(amount.id): amount for amount in existing_amounts}

        # Get fee_term for validation
        fee_term = None
        if fee_class_mapping.fee_type:
            result = await db.execute(select(FeeTerm).where(FeeTerm.id == fee_class_mapping.fee_type.fee_term_id))
            fee_term = result.scalar_one_or_none()

        if not fee_term:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Associated fee term not found")

        # Process updates
        updated_amounts = []
        for term_amount_data in bulk_data.term_amounts:
            # Validate term_date exists and belongs to correct term
            result = await db.execute(
                select(FeeTermDates).where(
                    and_(FeeTermDates.id == term_amount_data.term_date_id, FeeTermDates.term_id == fee_term.id)
                )
            )
            term_date = result.scalar_one_or_none()
            if not term_date:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Term date {term_amount_data.term_date_id} not found or doesn't belong to term {fee_term.term_name}",
                )

            if term_amount_data.id:
                # Update existing record
                term_amount_id_str = str(term_amount_data.id)
                if term_amount_id_str not in existing_by_id:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Term amount with id {term_amount_data.id} not found",
                    )

                existing_amount = existing_by_id[term_amount_id_str]
                existing_amount.term_id = term_date.term_id  # Update term_id (maintains consistency)
                existing_amount.term_date_id = term_amount_data.term_date_id
                existing_amount.term_amount = term_amount_data.term_amount
                updated_amounts.append(existing_amount)
            else:
                # Create new record during update operation
                new_amount = FeeClassMappingTermAmountModel(
                    fee_class_mapping_id=bulk_data.fee_class_mapping_id,
                    term_id=term_date.term_id,  # Required: NOT NULL constraint
                    term_date_id=term_amount_data.term_date_id,
                    term_amount=term_amount_data.term_amount,
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
        validate_total_amount_matches(fee_class_mapping, all_amounts_for_validation)

        await db.commit()

        # Refresh and return with relationships
        result_amounts = []
        for amount in updated_amounts:
            await db.refresh(amount)
            # Load with relationships for response
            result = await db.execute(
                select(FeeClassMappingTermAmountModel)
                .options(selectinload(FeeClassMappingTermAmountModel.fee_term_date).selectinload(FeeTermDates.fee_term))
                .where(FeeClassMappingTermAmountModel.id == amount.id)
            )
            amount_with_relations = result.scalar_one()
            if amount_with_relations.fee_term_date:
                amount_with_relations.term_name = (
                    amount_with_relations.fee_term_date.fee_term.term_name
                    if amount_with_relations.fee_term_date.fee_term
                    else None
                )
                amount_with_relations.term_date = (
                    str(amount_with_relations.fee_term_date.fee_term_date)
                    if amount_with_relations.fee_term_date.fee_term_date
                    else None
                )
            else:
                amount_with_relations.term_name = None
                amount_with_relations.term_date = None
            result_amounts.append(amount_with_relations)

        return result_amounts

    except HTTPException:
        await db.rollback()
        raise
    except IntegrityError as e:
        await db.rollback()
        if "uq_fee_class_mapping_term" in str(e) or "uq_fee_class_mapping_term_date" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Term amount already exists for this fee class mapping and term date combination",
            )
        else:
            log.error(f"Integrity error updating fee class mapping term amounts: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while updating fee class mapping term amounts",
            )
    except Exception as e:
        await db.rollback()
        log.error(f"Error updating fee class mapping term amounts: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while updating fee class mapping term amounts",
        )


async def delete_fee_class_mapping_term_amounts(db: AsyncSession, bulk_data: FeeClassMappingTermAmountBulkDelete):
    """Delete multiple fee class mapping term amounts"""
    try:
        deleted_count = 0
        for term_amount_id in bulk_data.term_amount_ids:
            term_amount_uuid = term_amount_id

            result = await db.execute(
                select(FeeClassMappingTermAmountModel).where(FeeClassMappingTermAmountModel.id == term_amount_uuid)
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
            detail="An error occurred while deleting fee class mapping term amounts",
        )


async def get_term_amount_by_id(db: AsyncSession, term_amount_id: UUID):
    """Get single term amount by ID with relationships"""
    try:
        result = await db.execute(
            select(FeeClassMappingTermAmountModel)
            .options(
                selectinload(FeeClassMappingTermAmountModel.fee_term),
                selectinload(FeeClassMappingTermAmountModel.fee_class_mapping),
            )
            .where(FeeClassMappingTermAmountModel.id == term_amount_id)
        )
        term_amount = result.scalar_one_or_none()

        if not term_amount:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=f"Term amount with id {term_amount_id} not found"
            )

        # Add relationship names
        term_amount.term_name = term_amount.fee_term.term_name if term_amount.fee_term else None

        return term_amount
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Error getting term amount: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error retrieving term amount")


async def get_term_amounts_by_class_mapping(db: AsyncSession, class_mapping_id: UUID):
    """Get all term amounts for a specific class mapping"""
    try:
        result = await db.execute(
            select(FeeClassMappingTermAmountModel)
            .options(
                selectinload(FeeClassMappingTermAmountModel.fee_term),
                selectinload(FeeClassMappingTermAmountModel.fee_class_mapping),
            )
            .where(FeeClassMappingTermAmountModel.fee_class_mapping_id == class_mapping_id)
            .order_by(FeeClassMappingTermAmountModel.term_id)
        )
        term_amounts = result.scalars().all()

        # Add relationship names
        for term_amount in term_amounts:
            term_amount.term_name = term_amount.fee_term.term_name if term_amount.fee_term else None

        return term_amounts
    except Exception as e:
        log.error(f"Error getting term amounts by mapping: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error retrieving term amounts")


async def get_all_term_amounts(
    db: AsyncSession,
    class_mapping_id: UUID | None = None,
    fee_term_id: UUID | None = None,
    limit: int = 100,
    offset: int = 0,
):
    """Get all term amounts with optional filters and pagination"""
    try:
        query = select(FeeClassMappingTermAmountModel).options(
            selectinload(FeeClassMappingTermAmountModel.fee_term),
            selectinload(FeeClassMappingTermAmountModel.fee_class_mapping),
        )

        # Apply filters
        if class_mapping_id:
            query = query.where(FeeClassMappingTermAmountModel.fee_class_mapping_id == class_mapping_id)

        if fee_term_id:
            query = query.where(FeeClassMappingTermAmountModel.term_id == fee_term_id)

        # Apply pagination
        query = query.limit(limit).offset(offset)

        result = await db.execute(query)
        term_amounts = result.scalars().all()

        # Add relationship names
        for term_amount in term_amounts:
            term_amount.term_name = term_amount.fee_term.term_name if term_amount.fee_term else None

        return term_amounts
    except Exception as e:
        log.error(f"Error getting all term amounts: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error retrieving term amounts")

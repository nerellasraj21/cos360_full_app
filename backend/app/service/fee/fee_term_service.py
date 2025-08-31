from fastapi import HTTPException, status
import logging as log
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.fee.fee_term_model import FeeTerm as FeeTermModel
from app.models.fee.fee_term_dates_model import FeeTermDates as FeeTermDatesModel
from app.models.masters.academic_year_model import AcademicYear
from app.schemas.fee.fee_term_schema import FeeTermCreate, FeeTermUpdate
from typing import List, Optional
from uuid import UUID

log = log.getLogger("fee.term_service")

async def validate_academic_year_exists(db: AsyncSession, academic_year_id: int):
    result = await db.execute(select(AcademicYear).where(AcademicYear.id == academic_year_id))
    academic_year = result.scalar_one_or_none()
    if not academic_year:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Academic year with id {academic_year_id} not found"
        )
    return academic_year

async def create_fee_term_with_dates(db: AsyncSession, fee_term_data: FeeTermCreate):
    try:
        # Validate academic year exists
        await validate_academic_year_exists(db, fee_term_data.academic_year_id)
        
        # Validate that number of fee term dates matches number_of_terms
        if len(fee_term_data.fee_term_dates) != fee_term_data.number_of_terms:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Number of fee term dates ({len(fee_term_data.fee_term_dates)}) must match number_of_terms ({fee_term_data.number_of_terms})"
            )
        
        # Check for duplicate dates
        dates = [date.fee_term_date for date in fee_term_data.fee_term_dates]
        if len(dates) != len(set(dates)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Duplicate fee term dates are not allowed"
            )
        
        # Create fee term
        db_fee_term = FeeTermModel(
            term_name=fee_term_data.term_name,
            term_status=fee_term_data.term_status,
            number_of_terms=fee_term_data.number_of_terms,
            academic_year_id=fee_term_data.academic_year_id
        )
        db.add(db_fee_term)
        await db.flush()  # Ensure the fee term is created before adding dates and get fee term id
        
        # Create fee term dates
        for fee_date in fee_term_data.fee_term_dates:
            db_fee_term_date = FeeTermDatesModel(
                term_id=db_fee_term.id,
                fee_term_date=fee_date.fee_term_date
            )
            db.add(db_fee_term_date)
        
        await db.commit()
        await db.refresh(db_fee_term)
        
        # Load the fee term with dates for response
        result = await db.execute(
            select(FeeTermModel)
            .options(selectinload(FeeTermModel.fee_term_dates))
            .where(FeeTermModel.id == db_fee_term.id)
        )
        return result.scalar_one()
        
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        log.error(f"Error creating fee term with dates: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while creating fee term with dates"
        )

async def get_fee_term_with_dates(db: AsyncSession, fee_term_id: str):
    try:
        fee_term_uuid = UUID(fee_term_id)
        result = await db.execute(
            select(FeeTermModel)
            .options(selectinload(FeeTermModel.fee_term_dates))
            .where(FeeTermModel.id == fee_term_uuid)
        )
        fee_term = result.scalar_one_or_none()
        if not fee_term:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Fee term with id {fee_term_id} not found"
            )
        return fee_term
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid fee term ID format"
        )
    except Exception as e:
        log.error(f"Error getting fee term with dates: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving fee term"
        )

async def get_all_fee_terms(db: AsyncSession):
    try:
        result = await db.execute(
            select(FeeTermModel)
            .options(selectinload(FeeTermModel.fee_term_dates))
        )
        return result.scalars().all()
    except Exception as e:
        log.error(f"Error getting all fee terms: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving fee terms"
        )

async def update_fee_term_with_dates(db: AsyncSession, fee_term_id: str, fee_term_data: FeeTermUpdate):
    try:
        fee_term_uuid = UUID(fee_term_id)
        
        # Get existing fee term
        result = await db.execute(
            select(FeeTermModel)
            .options(selectinload(FeeTermModel.fee_term_dates))
            .where(FeeTermModel.id == fee_term_uuid)
        )
        db_fee_term = result.scalar_one_or_none()
        if not db_fee_term:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Fee term with id {fee_term_id} not found"
            )
        
        # Validate academic year if provided
        if fee_term_data.academic_year_id is not None:
            await validate_academic_year_exists(db, fee_term_data.academic_year_id)
        
        # Update fee term fields
        if fee_term_data.term_name is not None:
            db_fee_term.term_name = fee_term_data.term_name
        if fee_term_data.term_status is not None:
            db_fee_term.term_status = fee_term_data.term_status
        if fee_term_data.academic_year_id is not None:
            db_fee_term.academic_year_id = fee_term_data.academic_year_id
        
        # Handle number_of_terms and fee_term_dates update
        if fee_term_data.number_of_terms is not None:
            db_fee_term.number_of_terms = fee_term_data.number_of_terms
        
        if fee_term_data.fee_term_dates is not None:
            # Validate that number of fee term dates matches number_of_terms
            expected_count = fee_term_data.number_of_terms if fee_term_data.number_of_terms is not None else db_fee_term.number_of_terms
            if len(fee_term_data.fee_term_dates) != expected_count:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Number of fee term dates ({len(fee_term_data.fee_term_dates)}) must match number_of_terms ({expected_count})"
                )
            
            # Check for duplicate dates
            dates = [date.fee_term_date for date in fee_term_data.fee_term_dates]
            if len(dates) != len(set(dates)):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Duplicate fee term dates are not allowed"
                )
            
            # Delete existing fee term dates (cascade will handle this, but being explicit)
            await db.execute(delete(FeeTermDatesModel).where(FeeTermDatesModel.term_id == fee_term_uuid))
            
            # Create new fee term dates
            for fee_date in fee_term_data.fee_term_dates:
                db_fee_term_date = FeeTermDatesModel(
                    term_id=db_fee_term.id,
                    fee_term_date=fee_date.fee_term_date
                )
                db.add(db_fee_term_date)
        
        await db.commit()
        await db.refresh(db_fee_term)
        
        # Load the updated fee term with dates for response
        result = await db.execute(
            select(FeeTermModel)
            .options(selectinload(FeeTermModel.fee_term_dates))
            .where(FeeTermModel.id == db_fee_term.id)
        )
        return result.scalar_one()
        
    except HTTPException:
        await db.rollback()
        raise
    except ValueError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid fee term ID format"
        )
    except Exception as e:
        await db.rollback()
        log.error(f"Error updating fee term with dates: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while updating fee term"
        )

async def delete_fee_term_date(db: AsyncSession, fee_term_date_id: str):
    try:
        fee_term_date_uuid = UUID(fee_term_date_id)
        
        result = await db.execute(select(FeeTermDatesModel).where(FeeTermDatesModel.id == fee_term_date_uuid))
        db_fee_term_date = result.scalar_one_or_none()
        if not db_fee_term_date:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Fee term date with id {fee_term_date_id} not found"
            )
        
        await db.delete(db_fee_term_date)
        await db.commit()
        return {"message": "Fee term date deleted successfully"}
        
    except HTTPException:
        await db.rollback()
        raise
    except ValueError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid fee term date ID format"
        )
    except Exception as e:
        await db.rollback()
        log.error(f"Error deleting fee term date: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while deleting fee term date"
        )

async def delete_fee_term_with_dates(db: AsyncSession, fee_term_id: str):
    try:
        fee_term_uuid = UUID(fee_term_id)
        
        result = await db.execute(select(FeeTermModel).where(FeeTermModel.id == fee_term_uuid))
        db_fee_term = result.scalar_one_or_none()
        if not db_fee_term:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Fee term with id {fee_term_id} not found"
            )
        
        # Delete fee term (cascade will delete associated dates)
        await db.delete(db_fee_term)
        await db.commit()
        return {"message": "Fee term and associated dates deleted successfully"}
        
    except HTTPException:
        await db.rollback()
        raise
    except ValueError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid fee term ID format"
        )
    except Exception as e:
        await db.rollback()
        log.error(f"Error deleting fee term: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while deleting fee term"
        )
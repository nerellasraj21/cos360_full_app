from fastapi import HTTPException, status
import logging as log
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.fee.fee_term_model import FeeTerm as FeeTermModel
from app.models.fee.fee_term_dates_model import FeeTermDates as FeeTermDatesModel
from app.schemas.fee.fee_term_schema import FeeTermCreate, FeeTermUpdate

log = log.getLogger("fee.term_service")

async def create_fee_term_with_dates(db: AsyncSession, fee_term_data: FeeTermCreate):
    try:
        db_fee_term = FeeTermModel(
            name=fee_term_data.name,
            is_active=fee_term_data.is_active,
            number_of_terms=fee_term_data.number_of_terms,
            academic_year_id=fee_term_data.academic_year_id
        )
        db.add(db_fee_term)
        await db.flush() # Ensure the fee term is created before adding dates and get fee term id
        
        if fee_term_data.fee_term_dates:
            for date in fee_term_data.fee_term_dates:
                new_date = FeeTermDatesModel(
                    term_date = date.fee_term_date,
                    fee_term_id=db_fee_term.id,
                    is_active=date.is_active
                )
                db.add(new_date)
        await db.commit()
        await db.refresh(db_fee_term)
        return db_fee_term
    except Exception as e:
        await db.rollback()
        log.error(f"Error creating fee term: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error creating fee term: {str(e)}")
    
async def get_fee_term_with_dates(db: AsyncSession, fee_term_id: str):
    try:
        result = await db.execute(select(FeeTermModel).where(FeeTermModel.id == fee_term_id))
        db_fee_term = result.scalar_one_or_none()
        if not db_fee_term:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee term not found")

        # Fetch related fee term dates
        fee_term_dates = await db.execute(select(FeeTermDatesModel).where(FeeTermDatesModel.fee_term_id == fee_term_id))
        db_fee_term.fee_term_dates = fee_term_dates.scalars().all()
        return db_fee_term
    except Exception as e:
        log.error(f"Error fetching fee term and dates: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error fetching fee term and dates: {str(e)}")

async def get_all_fee_terms(db: AsyncSession, academic_year_id: int = None):
    try:
        stmt = select(FeeTermModel)
        if academic_year_id: 
            stmt = stmt.where(FeeTermModel.academic_year_id == academic_year_id)
        result = await db.execute(stmt)
        fee_terms = result.unique().scalars().all()
        return fee_terms
    except Exception as e:
        log.error(f"Error fetching all fee terms: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error fetching all fee terms: {str(e)}")
    
async def update_fee_term(db: AsyncSession, fee_term_id: str, fee_term_data: FeeTermUpdate):
    try:
        db_fee_term = await get_fee_term(db, fee_term_id)
        if not db_fee_term:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee term not found")
        
        for key, value in fee_term_data.model_dump(exclude_unset=True).items():
            setattr(db_fee_term, key, value)
        await db.commit()
        await db.refresh(db_fee_term)
        return db_fee_term
    except Exception as e:
        await db.rollback()
        log.error(f"Error updating fee term: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error updating fee term: {str(e)}")
    
async def delete_fee_term(db: AsyncSession, fee_term_id: str):
    try:
        db_fee_term = await get_fee_term(db, fee_term_id)
        if not db_fee_term:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee term not found")
        
        await db.delete(db_fee_term)
        await db.commit()
        return {"detail": "Fee term deleted successfully"}
    except Exception as e:
        await db.rollback()
        log.error(f"Error deleting fee term: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error deleting fee term: {str(e)}")
    
async def get_fee_term_and_dates(db: AsyncSession, fee_term_id: str):
    try:
        result = await db.execute(select(FeeTermModel).where(FeeTermModel.id == fee_term_id))
        db_fee_term = result.scalar_one_or_none()
        if not db_fee_term:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee term not found")
        
        # Fetch related fee term dates
        fee_term_dates = db_fee_term.fee_term_dates
        return FeeTermResponse.from_orm(db_fee_term, dates=fee_term_dates)
    except Exception as e:
        log.error(f"Error fetching fee term and dates: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error fetching fee term and dates: {str(e)}")
    

        
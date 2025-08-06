from fastapi import HTTPException, status, APIRouter, Depends
from app.models.fee.fee_term_model import FeeTerm as FeeTermModel
from app.models.fee.fee_term_dates_model import FeeTermDates as FeeTermDatesModel
from app.schemas.fee.fee_term_schema import FeeTermCreate, FeeTermRead, FeeTermUpdate
from app.db.session import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.service.fee.fee_term_service import create_fee_term_with_dates, get_fee_term_with_dates, get_all_fee_terms, update_fee_term_with_dates, delete_fee_term_with_dates


router = APIRouter(prefix="/fee/terms", tags=["Fee/Fee Terms & Dates"])

# Create Fee Term with Dates
@router.post("/", response_model=FeeTermRead, status_code=status.HTTP_201_CREATED)
async def create_fee_term(fee_term_data: FeeTermModel, db: AsyncSession = Depends(get_db)):
    return await create_fee_term_with_dates(db, fee_term_data)


# Read Single Fee term with Dates
@router.get("/{fee_term_id}", response_model=FeeTermRead)
async def get_fee_term_with_dates(fee_date_id: str, db:AsyncSession = Depends(get_db)):
    db_fee_term = await get_fee_term_with_dates(db, fee_date_id)
    if not db_fee_term:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee term not found")
    return db_fee_term

# Read All Fee Terms with Dates
@router.get("/", response_model=list[FeeTermRead])
async def get_all_fee_terms(academic_year_id: int = None, db: AsyncSession = Depends(get_db)):
    return await get_all_fee_terms(db, academic_year_id)

# Update Fee Term and Replace Dates
@router.put("/{fee_term_id}", response_model=dict)
async def update_fee_term(fee_term_id: str, fee_term_data: FeeTermUpdate, db: AsyncSession = Depends(get_db)):
    db_fee_term = await get_fee_term_with_dates(db, fee_term_id)
    if not db_fee_term:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee term not found")
    return await update_fee_term_with_dates(db, fee_term_id, fee_term_data)

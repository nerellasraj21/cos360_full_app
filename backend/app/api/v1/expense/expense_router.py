from fastapi import APIRouter

from .expense_category_endpoints import router as category_router
from .expense_type_endpoints import router as type_router
from .expense_transaction_endpoints import router as transaction_router

# Main expense router
expense_router = APIRouter(prefix="/expense", tags=["Expense Management"])

# Include all expense sub-routers
expense_router.include_router(category_router, prefix="/categories", tags=["Expense Categories"])
expense_router.include_router(type_router, prefix="/types", tags=["Expense Types"])
expense_router.include_router(transaction_router, prefix="/transactions", tags=["Expense Transactions"])

__all__ = ["expense_router"]
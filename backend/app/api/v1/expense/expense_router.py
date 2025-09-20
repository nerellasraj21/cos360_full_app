from fastapi import APIRouter

from .expense_category_endpoints import router as category_router
from .expense_type_endpoints import router as type_router
from .expense_transaction_endpoints import router as transaction_router
from .expense_attachment_endpoints import router as attachment_router
from .expense_audit_endpoints import router as audit_router
from .expense_settings_endpoints import router as settings_router
from .expense_reporting_endpoints import router as reporting_router

# Main expense router
expense_router = APIRouter(prefix="/expense", tags=["Expense Management"])

# Include all expense sub-routers
expense_router.include_router(category_router, prefix="/categories", tags=["Expense Categories"])
expense_router.include_router(type_router, prefix="/types", tags=["Expense Types"])
expense_router.include_router(transaction_router, prefix="/transactions", tags=["Expense Transactions"])
expense_router.include_router(attachment_router, prefix="/attachments", tags=["Expense Attachments"])
expense_router.include_router(audit_router, prefix="/audit", tags=["Expense Audit Logs"])
expense_router.include_router(settings_router, prefix="/settings", tags=["Expense Settings"])
expense_router.include_router(reporting_router, prefix="/reports", tags=["Expense Reporting"])

__all__ = ["expense_router"]
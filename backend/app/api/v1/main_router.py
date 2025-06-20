from fastapi import APIRouter

from app.api.v1.masters.class_endpoints import router as class_router
from app.api.v1.auth.role_endpoints import router as role_router
from app.api.v1.auth.login_endpoints import router as login_router

router = APIRouter()
router.include_router(class_router)
router.include_router(role_router)
router.include_router(login_router)
from fastapi import APIRouter

from app.api.v1.masters.class_endpoints import router as class_router
from app.api.v1.auth.role_endpoints import router as role_router
from app.api.v1.auth.login_endpoints import router as login_router
from app.api.v1.public.org_routes import router as org_router
from app.api.v1.masters.academic_year_routes import router as academic_year_router
from app.api.v1.masters.subject_routes import router as subject_router

router = APIRouter()
router.include_router(academic_year_router)
router.include_router(class_router)
router.include_router(subject_router)
router.include_router(role_router)
router.include_router(login_router)
router.include_router(org_router)

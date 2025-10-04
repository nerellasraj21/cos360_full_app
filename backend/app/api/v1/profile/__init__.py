from fastapi import APIRouter
from .profile_endpoints import router as profile_router
from .student_profile_endpoints import router as student_profile_router
from .staff_profile_endpoints import router as staff_profile_router
from .parent_profile_endpoints import router as parent_profile_router

router = APIRouter()

router.include_router(profile_router)
router.include_router(student_profile_router)
router.include_router(staff_profile_router)
router.include_router(parent_profile_router)

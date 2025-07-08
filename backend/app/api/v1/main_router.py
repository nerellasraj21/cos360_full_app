from fastapi import APIRouter

from app.api.v1.masters.class_endpoints import router as class_router
from app.api.v1.auth.role_endpoints import router as role_router
from app.api.v1.auth.login_endpoints import router as login_router
from app.api.v1.public.org_routes import router as org_router
from app.api.v1.masters.academic_year_routes import router as academic_year_router
from app.api.v1.masters.subject_routes import router as subject_router
from app.api.v1.masters.holiday_endpoints import router as holiday_router
from app.api.v1.masters.transport.routes_endpoints import router as routes_router
from app.api.v1.masters.transport.route_stop_endpoints import router as route_stop_router
from app.api.v1.masters.transport.student_trip_endpoints import router as student_trip_router
from app.api.v1.masters.transport.trip_endpoints import router as trip_router
from app.api.v1.masters.transport.vehicle_endpoints import router as vehicle_router
from app.api.v1.masters.timetable_routes import router as timetable_router

router = APIRouter()
router.include_router(academic_year_router)
router.include_router(class_router)
router.include_router(subject_router)
router.include_router(holiday_router)
router.include_router(role_router)
router.include_router(login_router)
router.include_router(org_router)
router.include_router(routes_router)
router.include_router(route_stop_router)
router.include_router(student_trip_router)
router.include_router(trip_router)
router.include_router(vehicle_router)
router.include_router(timetable_router)


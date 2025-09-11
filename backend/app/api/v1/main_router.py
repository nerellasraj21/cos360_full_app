from fastapi import APIRouter

from app.api.v1.masters.class_endpoints import router as class_router
from app.api.v1.masters.class_subject_mapping_endpoints import router as class_subject_mapping_router
from app.api.v1.auth.role_endpoints import router as role_router
from app.api.v1.auth.login_endpoints import router as login_router
from app.api.v1.auth.menu_endpoints import router as menu_router
from app.api.v1.auth.permissions_endpoints import router as permissions_router
from app.api.v1.auth.resource_permission_endpoints import router as resource_permission_router
from app.api.v1.public.org_routes import router as org_router
from app.api.v1.masters.academic_year_routes import router as academic_year_router
from app.api.v1.masters.subject_routes import router as subject_router
from app.api.v1.masters.holiday_endpoints import router as holiday_router
from app.api.v1.masters.transport.routes_endpoints import router as routes_router
from app.api.v1.masters.transport.route_stop_endpoints import router as route_stop_router
# from app.api.v1.masters.transport.student_trip_endpoints import router as student_trip_router
from app.api.v1.masters.transport.trip_endpoints import router as trip_router
from app.api.v1.masters.transport.vehicle_endpoints import router as vehicle_router
from app.api.v1.masters.timetable_routes import router as timetable_router
from app.api.v1.student.admission_endpoints import router as admission_router
from app.api.v1.student.attendance_endpoints import router as attendance_router
from app.api.v1.student.certificate_endpoints import router as certificate_router
from app.api.v1.student.certificate_type_endpoints import router as certificate_type_router
from app.api.v1.masters.parent_endpoints import router as parent_router
from app.api.v1.masters.staff_endpoints import router as staff_router
from app.api.v1.student.student_document_endpoints import router as student_document_router
# from app.api.v1.masters.student_homework_endpoints import router as student_homework_router
from app.api.v1.student.student_transport_endpoints import router as student_transport_router
from app.api.v1.masters.subject_category_endpoints import router as subject_category_router
from app.api.v1.fee.fee_term_endpoints import router as fee_term_router
from app.api.v1.fee.fee_category_endpoints import router as fee_category_router
from app.api.v1.fee.fee_type_endpoints import router as fee_type_router
from app.api.v1.fee.fee_class_mapping_endpoints import router as fee_class_mapping_router
from app.api.v1.fee.fee_class_map_term_amount_endpoints import router as fee_class_map_term_amount_router
from app.api.v1.fee.fee_student_mapping_endpoints import router as fee_student_mapping_router
from app.api.v1.auth.seed_endpoints import router as seed_router
from app.api.v1.auth.test_setup_endpoints import router as test_setup_router
from app.api.v1.auth.test_jwt_endpoints import router as test_jwt_router

router = APIRouter()
router.include_router(academic_year_router)
router.include_router(class_router)
router.include_router(class_subject_mapping_router)
router.include_router(subject_router)
router.include_router(holiday_router)
router.include_router(role_router)
router.include_router(login_router)
router.include_router(menu_router)
router.include_router(permissions_router)
router.include_router(resource_permission_router)
router.include_router(org_router)
router.include_router(routes_router)
router.include_router(route_stop_router)
# router.include_router(student_trip_router)
router.include_router(trip_router)
router.include_router(vehicle_router)
router.include_router(timetable_router)
router.include_router(admission_router)
router.include_router(certificate_router)
router.include_router(certificate_type_router)
router.include_router(parent_router)
router.include_router(staff_router)
router.include_router(student_document_router)
# router.include_router(student_homework_router)
router.include_router(student_transport_router)
router.include_router(attendance_router)
router.include_router(subject_category_router)
router.include_router(fee_term_router)
router.include_router(fee_category_router)
router.include_router(fee_type_router)
router.include_router(fee_class_mapping_router)
router.include_router(fee_class_map_term_amount_router)
router.include_router(fee_student_mapping_router)
router.include_router(seed_router)
router.include_router(test_setup_router)
router.include_router(test_jwt_router)

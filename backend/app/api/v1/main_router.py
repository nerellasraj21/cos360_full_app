from fastapi import APIRouter

from app.api.v1.admin.permission_endpoints import router as admin_permission_router
from app.api.v1.admin.user_management_endpoints import router as admin_user_management_router
from app.api.v1.auth.access_validation_endpoints import router as access_validation_router
from app.api.v1.auth.fix_permissions_endpoints import router as fix_permissions_router
from app.api.v1.auth.login_endpoints import router as login_router
from app.api.v1.auth.menu_endpoints import router as menu_router
from app.api.v1.auth.permissions_endpoints import router as permissions_router
from app.api.v1.auth.resource_permission_endpoints import router as resource_permission_router
from app.api.v1.auth.role_endpoints import router as role_router
from app.api.v1.auth.seed_endpoints import router as seed_router
from app.api.v1.auth.test_jwt_endpoints import router as test_jwt_router
from app.api.v1.auth.test_setup_endpoints import router as test_setup_router
from app.api.v1.exam.audit_endpoints import router as exam_audit_router
from app.api.v1.exam.board_pattern_endpoints import router as board_pattern_router
from app.api.v1.exam.exam_date_endpoints import router as exam_date_router
from app.api.v1.exam.exam_endpoints import router as exam_router
from app.api.v1.exam.exam_pattern_endpoints import router as exam_pattern_router
from app.api.v1.exam.exam_settings_endpoints import router as exam_settings_router
from app.api.v1.exam.grading_endpoints import router as grading_router
from app.api.v1.exam.hall_ticket_endpoints import router as hall_ticket_router
from app.api.v1.exam.mark_entry_endpoints import router as mark_entry_router
from app.api.v1.exam.mark_permission_endpoints import router as mark_permission_router
from app.api.v1.exam.notification_endpoints import router as exam_notification_router
from app.api.v1.exam.remark_grade_endpoints import router as remark_grade_router
from app.api.v1.exam.result_endpoints import router as exam_result_router
from app.api.v1.expense.expense_attachment_endpoints import router as expense_attachment_router
from app.api.v1.expense.expense_audit_endpoints import router as expense_audit_router
from app.api.v1.expense.expense_category_endpoints import router as expense_category_router
from app.api.v1.expense.expense_reporting_endpoints import router as expense_reporting_router
from app.api.v1.expense.expense_settings_endpoints import router as expense_settings_router
from app.api.v1.expense.expense_summary_endpoints import router as expense_summary_router
from app.api.v1.expense.expense_transaction_endpoints import router as expense_transaction_router
from app.api.v1.expense.expense_type_endpoints import router as expense_type_router
from app.api.v1.fee.fee_category_endpoints import router as fee_category_router
from app.api.v1.fee.fee_class_map_term_amount_endpoints import router as fee_class_map_term_amount_router
from app.api.v1.fee.fee_class_mapping_endpoints import router as fee_class_mapping_router
from app.api.v1.fee.fee_receipt_endpoints import router as fee_receipt_router
from app.api.v1.fee.fee_refund_endpoints import router as fee_refund_router
from app.api.v1.fee.fee_student_mapping_endpoints import router as fee_student_mapping_router
from app.api.v1.fee.fee_term_endpoints import router as fee_term_router
from app.api.v1.fee.fee_transaction_endpoints import router as fee_transaction_router
from app.api.v1.fee.fee_type_endpoints import router as fee_type_router
from app.api.v1.fee.fee_collection_endpoints import router as fee_collection_router
from app.api.v1.fee.fee_concession_endpoints import router as fee_concession_router
from app.api.v1.fee.fee_old_endpoints import router as fee_old_router
from app.api.v1.masters.academic_year_routes import router as academic_year_router
from app.api.v1.masters.caste_endpoints import router as caste_router
from app.api.v1.masters.class_endpoints import router as class_router
from app.api.v1.masters.class_subject_mapping_endpoints import router as class_subject_mapping_router
from app.api.v1.masters.holiday_endpoints import router as holiday_router
from app.api.v1.masters.location_endpoints import router as location_router
from app.api.v1.masters.parent_endpoints import router as parent_router
from app.api.v1.masters.staff_endpoints import router as staff_router
from app.api.v1.masters.subject_category_endpoints import router as subject_category_router
from app.api.v1.masters.subject_category_endpoints import subject_categories_alias_router
from app.api.v1.masters.subject_routes import router as subject_router
from app.api.v1.masters.timetable_routes import router as timetable_router
from app.api.v1.masters.transport.route_stop_endpoints import router as route_stop_router
from app.api.v1.masters.transport.route_type_endpoints import router as route_type_router
from app.api.v1.masters.transport.routes_endpoints import router as routes_router

# from app.api.v1.masters.transport.student_trip_endpoints import router as student_trip_router
from app.api.v1.masters.transport.trip_endpoints import router as trip_router
from app.api.v1.masters.transport.trip_type_endpoints import router as trip_type_router
from app.api.v1.masters.transport.transport_pricing_endpoints import router as transport_pricing_router
from app.api.v1.masters.transport.vehicle_endpoints import router as vehicle_router
from app.api.v1.profile import router as profile_router
from app.api.v1.public.org_routes import router as org_router
from app.api.v1.reports.attendance_reports import router as attendance_reports_router
from app.api.v1.reports.fee_reports import router as fee_reports_router
from app.api.v1.reports.financial_reports import router as financial_reports_router
from app.api.v1.reports.reports import router as reports_router
from app.api.v1.reports.staff_reports import router as staff_reports_router
from app.api.v1.reports.student_reports import router as student_reports_router
from app.api.v1.student.admission_endpoints import router as admission_router
from app.api.v1.student.attendance_endpoints import router as attendance_router
from app.api.v1.student.certificate_endpoints import router as certificate_router
from app.api.v1.student.certificate_type_endpoints import router as certificate_type_router
from app.api.v1.student.issuable_certificate_endpoints import router as issuable_certificate_router
from app.api.v1.student.student_document_endpoints import router as student_document_router
from app.api.v1.student.student_parent_endpoints import router as student_parent_link_router

# from app.api.v1.masters.student_homework_endpoints import router as student_homework_router
from app.api.v1.student.student_transport_endpoints import router as student_transport_router
from app.api.v1.communication.communication_endpoints import router as communication_router
from app.api.v1.super_admin.auth_endpoints import router as super_admin_auth_router
from app.api.v1.super_admin.plan_endpoints import router as super_admin_plan_router
from app.api.v1.super_admin.setup_endpoints import router as super_admin_setup_router
from app.api.v1.super_admin.system_endpoints import router as super_admin_system_router
from app.api.v1.super_admin.tenant_data_endpoints import router as super_admin_tenant_data_router

router = APIRouter()
router.include_router(academic_year_router)
router.include_router(class_router)
router.include_router(class_subject_mapping_router)
router.include_router(subject_router)
router.include_router(holiday_router)
router.include_router(admin_permission_router)
router.include_router(admin_user_management_router)
router.include_router(role_router)
router.include_router(login_router)
router.include_router(menu_router)
router.include_router(permissions_router)
router.include_router(resource_permission_router)
router.include_router(access_validation_router)
router.include_router(org_router)
router.include_router(routes_router)
router.include_router(route_stop_router)
# router.include_router(student_trip_router)
router.include_router(trip_router)
router.include_router(vehicle_router)
router.include_router(route_type_router)
router.include_router(trip_type_router)
router.include_router(transport_pricing_router)
router.include_router(timetable_router)
router.include_router(admission_router)
router.include_router(certificate_router)
router.include_router(certificate_type_router)
router.include_router(issuable_certificate_router)
router.include_router(parent_router)
router.include_router(staff_router)
router.include_router(caste_router)
router.include_router(location_router)
router.include_router(student_document_router)
# router.include_router(student_homework_router)
router.include_router(student_transport_router)
router.include_router(student_parent_link_router)
router.include_router(attendance_router)
router.include_router(subject_category_router)
router.include_router(subject_categories_alias_router)  # Frontend-compatible alias for inline category creation
router.include_router(fee_term_router)
router.include_router(fee_category_router)
router.include_router(fee_type_router)
router.include_router(fee_class_mapping_router)
router.include_router(fee_class_map_term_amount_router)
router.include_router(fee_student_mapping_router)
router.include_router(fee_transaction_router)
router.include_router(fee_receipt_router)
router.include_router(fee_refund_router)
router.include_router(fee_collection_router)
router.include_router(fee_concession_router)
router.include_router(fee_old_router)
router.include_router(seed_router)
router.include_router(test_setup_router)
router.include_router(test_jwt_router)
router.include_router(fix_permissions_router)
router.include_router(super_admin_auth_router)
router.include_router(super_admin_setup_router)
router.include_router(super_admin_system_router)
router.include_router(super_admin_plan_router)
router.include_router(super_admin_tenant_data_router)
router.include_router(expense_category_router)
router.include_router(expense_type_router)
router.include_router(expense_transaction_router)
router.include_router(expense_summary_router)
router.include_router(expense_reporting_router)
router.include_router(expense_settings_router)
router.include_router(expense_audit_router)
router.include_router(expense_attachment_router)
router.include_router(student_reports_router, prefix="/reports/students", tags=["Student Reports"])
router.include_router(staff_reports_router, prefix="/reports/staff", tags=["Staff Reports"])
router.include_router(fee_reports_router, prefix="/reports/fees", tags=["Fee Reports"])
router.include_router(attendance_reports_router, prefix="/reports/attendance", tags=["Attendance Reports"])
router.include_router(financial_reports_router, prefix="/reports/financial", tags=["Financial Reports"])
router.include_router(reports_router, prefix="/reports", tags=["Reports"])
router.include_router(profile_router)

# ── Exam Module ───────────────────────────────────────────────────────────────
router.include_router(exam_settings_router)
router.include_router(grading_router)
router.include_router(board_pattern_router)
router.include_router(remark_grade_router)
router.include_router(exam_router)
router.include_router(exam_date_router)
router.include_router(mark_permission_router)
router.include_router(mark_entry_router)
router.include_router(exam_result_router)
router.include_router(hall_ticket_router)
router.include_router(exam_audit_router)
router.include_router(exam_notification_router)
router.include_router(exam_pattern_router)

# ── Communication Module ──────────────────────────────────────────────────────
router.include_router(communication_router)

from datetime import datetime
import logging
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_public_db
from app.db.tenant_session import get_tenant_db
from app.models.masters.caste_model import Caste, SubCaste
from app.models.masters.location.district_model import District
from app.models.masters.location.mandal_model import Mandal
from app.models.masters.location.state_model import State
from app.models.public import Menu, MenuAction, PermissionTemplate, Plan, PlanMenuAccess, RoleTemplate
from app.tools.simple_permissions import get_current_user_token

logger = logging.getLogger("seed_endpoints")
router = APIRouter(prefix="/auth/seed", tags=["Auth/Seed Data"])

# ---------------------------------------------------------------------------
# Full permission matrix — used by /all-role-permissions
# ---------------------------------------------------------------------------

_ALL_ADMIN = [
    # Academic
    ("academic_years", "create"),
    ("academic_years", "read"),
    ("academic_years", "update"),
    ("academic_years", "delete"),
    ("academic_years", "list"),
    ("classes", "create"),
    ("classes", "read"),
    ("classes", "update"),
    ("classes", "delete"),
    ("classes", "list"),
    ("subjects", "create"),
    ("subjects", "read"),
    ("subjects", "update"),
    ("subjects", "delete"),
    ("subjects", "list"),
    ("subject_categories", "create"),
    ("subject_categories", "read"),
    ("subject_categories", "update"),
    ("subject_categories", "delete"),
    ("subject_categories", "list"),
    ("class_subject_mappings", "create"),
    ("class_subject_mappings", "read"),
    ("class_subject_mappings", "update"),
    ("class_subject_mappings", "delete"),
    ("class_subject_mappings", "list"),
    # Exam
    ("exams", "create"),
    ("exams", "read"),
    ("exams", "update"),
    ("exams", "delete"),
    ("exams", "list"),
    ("exam_marks", "create"),
    ("exam_marks", "read"),
    ("exam_marks", "list"),
    # Fee
    ("fee_categories", "create"),
    ("fee_categories", "read"),
    ("fee_categories", "update"),
    ("fee_categories", "delete"),
    ("fee_categories", "list"),
    ("fee_types", "create"),
    ("fee_types", "read"),
    ("fee_types", "update"),
    ("fee_types", "delete"),
    ("fee_types", "list"),
    ("fee_terms", "create"),
    ("fee_terms", "read"),
    ("fee_terms", "update"),
    ("fee_terms", "delete"),
    ("fee_terms", "list"),
    ("fee_class_mappings", "create"),
    ("fee_class_mappings", "read"),
    ("fee_class_mappings", "update"),
    ("fee_class_mappings", "delete"),
    ("fee_class_mappings", "list"),
    ("fee_class_mapping_term_amounts", "create"),
    ("fee_class_mapping_term_amounts", "read"),
    ("fee_class_mapping_term_amounts", "update"),
    ("fee_class_mapping_term_amounts", "delete"),
    ("fee_class_mapping_term_amounts", "list"),
    ("fee_student_mappings", "create"),
    ("fee_student_mappings", "read"),
    ("fee_student_mappings", "update"),
    ("fee_student_mappings", "delete"),
    ("fee_student_mappings", "list"),
    ("fee_transactions", "create"),
    ("fee_transactions", "read"),
    ("fee_transactions", "update"),
    ("fee_transactions", "list"),
    ("fee_receipts", "create"),
    ("fee_receipts", "read"),
    ("fee_receipts", "update"),
    ("fee_receipts", "list"),
    ("fee_refunds", "create"),
    ("fee_refunds", "read"),
    ("fee_refunds", "list"),
    ("fee_refunds", "approve"),
    ("fee_refunds", "process"),
    # Students
    ("students", "list"),
    ("student_admissions", "create"),
    ("student_admissions", "read"),
    ("student_admissions", "update"),
    ("student_admissions", "delete"),
    ("student_attendance", "create"),
    ("student_attendance", "read"),
    ("student_attendance", "update"),
    ("student_attendance", "delete"),
    ("student_attendance", "list"),
    ("student_certificates", "create"),
    ("student_certificates", "read"),
    ("student_certificates", "update"),
    ("student_certificates", "delete"),
    ("student_certificates", "list"),
    ("student_documents", "create"),
    ("student_documents", "read"),
    ("student_documents", "update"),
    ("student_documents", "delete"),
    ("student_documents", "list"),
    ("student_transport", "create"),
    ("student_transport", "read"),
    ("student_transport", "update"),
    ("student_transport", "delete"),
    ("student_transport", "list"),
    # Masters / Staff
    ("staff", "create"),
    ("staff", "read"),
    ("staff", "update"),
    ("staff", "delete"),
    ("staff", "list"),
    ("parent_management", "create"),
    ("parent_management", "read"),
    ("parent_management", "update"),
    ("parent_management", "delete"),
    ("parent_management", "list"),
    ("designations", "create"),
    ("designations", "read"),
    ("designations", "update"),
    ("designations", "delete"),
    ("designations", "list"),
    ("locations", "create"),
    ("locations", "read"),
    ("locations", "update"),
    ("locations", "delete"),
    ("locations", "list"),
    ("castes", "create"),
    ("castes", "read"),
    ("castes", "update"),
    ("castes", "delete"),
    ("castes", "list"),
    ("certificate_types", "create"),
    ("certificate_types", "read"),
    ("certificate_types", "update"),
    ("certificate_types", "delete"),
    ("certificate_types", "list"),
    ("holiday_management", "create"),
    ("holiday_management", "read"),
    ("holiday_management", "update"),
    ("holiday_management", "delete"),
    ("holiday_management", "list"),
    # Transport
    ("routes", "create"),
    ("routes", "read"),
    ("routes", "update"),
    ("routes", "delete"),
    ("routes", "list"),
    ("route_types", "create"),
    ("route_types", "read"),
    ("route_types", "update"),
    ("route_types", "delete"),
    ("route_types", "list"),
    ("route_stops", "create"),
    ("route_stops", "read"),
    ("route_stops", "update"),
    ("route_stops", "delete"),
    ("route_stops", "list"),
    ("vehicles", "create"),
    ("vehicles", "read"),
    ("vehicles", "update"),
    ("vehicles", "delete"),
    ("vehicles", "list"),
    ("transport_trips", "create"),
    ("transport_trips", "read"),
    ("transport_trips", "update"),
    ("transport_trips", "delete"),
    ("transport_trips", "list"),
    ("trip_types", "create"),
    ("trip_types", "read"),
    ("trip_types", "update"),
    ("trip_types", "delete"),
    ("trip_types", "list"),
    # Expenses
    ("expense_types", "create"),
    ("expense_types", "read"),
    ("expense_types", "update"),
    ("expense_types", "delete"),
    ("expense_types", "list"),
    ("expense_categories", "create"),
    ("expense_categories", "read"),
    ("expense_categories", "update"),
    ("expense_categories", "delete"),
    ("expense_categories", "list"),
    ("expense_departments", "create"),
    ("expense_departments", "read"),
    ("expense_departments", "update"),
    ("expense_departments", "delete"),
    ("expense_departments", "list"),
    ("expense_settings", "create"),
    ("expense_settings", "read"),
    ("expense_settings", "update"),
    ("expense_settings", "delete"),
    ("expense_settings", "list"),
    ("expense_transactions", "create"),
    ("expense_transactions", "read"),
    ("expense_transactions", "update"),
    ("expense_transactions", "list"),
    ("expense_transactions", "approve"),
    ("expense_attachments", "create"),
    ("expense_attachments", "read"),
    ("expense_attachments", "update"),
    ("expense_attachments", "delete"),
    ("expense_audit_logs", "read"),
    ("expense_audit_logs", "delete"),
    # Reports
    ("fee_reports", "read"),
    ("fee_reports", "export"),
    ("financial_reports", "read"),
    ("financial_reports", "export"),
    ("student_reports", "read"),
    ("student_reports", "export"),
    ("staff_reports", "read"),
    ("staff_reports", "export"),
    ("attendance_reports", "read"),
    ("attendance_reports", "export"),
    ("reports", "read"),
    # Auth / admin
    ("role_management", "create"),
    ("role_management", "read"),
    ("role_management", "update"),
    ("role_management", "delete"),
    ("role_management", "list"),
    ("permission_management", "create"),
    ("permission_management", "list"),
    ("resource_permission_management", "create"),
    ("resource_permission_management", "read"),
    ("resource_permission_management", "update"),
    ("resource_permission_management", "delete"),
    ("resource_permission_management", "list"),
    ("user_management", "read"),
    ("user_management", "update"),
    ("user_management", "list"),
    ("menu_management", "create"),
    ("menu_management", "list"),
    ("organizations", "create"),
    ("organizations", "read"),
    ("organizations", "update"),
    ("organizations", "delete"),
    ("organizations", "list"),
    ("monitoring", "read"),
    ("monitoring", "admin"),
]

_READ_ONLY_ACADEMIC = [
    ("academic_years", "read"),
    ("academic_years", "list"),
    ("classes", "read"),
    ("classes", "list"),
    ("sections", "read"),
    ("sections", "list"),
    ("subjects", "read"),
    ("subjects", "list"),
    ("subject_categories", "read"),
    ("subject_categories", "list"),
    ("class_subject_mappings", "read"),
    ("class_subject_mappings", "list"),
    ("holiday_management", "read"),
    ("holiday_management", "list"),
    ("locations", "read"),
    ("locations", "list"),
    ("castes", "read"),
    ("castes", "list"),
    ("certificate_types", "read"),
    ("certificate_types", "list"),
    ("designations", "read"),
    ("designations", "list"),
]

_ROLE_PERMISSIONS = {
    "Admin": _ALL_ADMIN,
    "Teacher": _READ_ONLY_ACADEMIC
    + [
        # Exam
        ("exams", "read"),
        ("exams", "list"),
        ("exam_marks", "create"),
        ("exam_marks", "read"),
        ("exam_marks", "list"),
        # Students
        ("students", "list"),
        ("student_admissions", "read"),
        ("student_admissions", "list"),
        ("student_attendance", "create"),
        ("student_attendance", "read"),
        ("student_attendance", "update"),
        ("student_attendance", "list"),
        ("student_certificates", "read"),
        ("student_certificates", "list"),
        ("student_documents", "read"),
        ("student_documents", "list"),
        # Transport (read-only)
        ("routes", "read"),
        ("routes", "list"),
        ("route_stops", "read"),
        ("route_stops", "list"),
        ("vehicles", "read"),
        ("vehicles", "list"),
        ("transport_trips", "read"),
        ("transport_trips", "list"),
        ("route_types", "read"),
        ("route_types", "list"),
        ("trip_types", "read"),
        ("trip_types", "list"),
        # Reports
        ("student_reports", "read"),
        ("student_reports", "export"),
        ("attendance_reports", "read"),
        ("attendance_reports", "export"),
        ("reports", "read"),
    ],
    "Student": [
        # Own profile
        ("profile", "read_own"),
        ("profile", "update_own"),
        # Reference data (read-only, not personal)
        ("academic_years", "read"),
        ("academic_years", "list"),
        ("classes", "read"),
        ("classes", "list"),
        ("subjects", "read"),
        ("subjects", "list"),
        ("certificate_types", "read"),
        ("certificate_types", "list"),
        # Exam (own results & hall tickets)
        ("exams", "read"),
        ("exams", "list"),
        ("exam_marks", "read_own"),
        ("exam_marks", "list_own"),
        ("exam_results", "read_own"),
        ("exam_results", "list_own"),
        ("exam_hall_tickets", "read_own"),
        ("exam_hall_tickets", "list_own"),
        # Own student data only
        ("student_admissions", "read_own"),
        ("student_admissions", "list_own"),
        ("student_attendance", "read_own"),
        ("student_attendance", "list_own"),
        ("student_certificates", "read_own"),
        ("student_certificates", "list_own"),
        ("student_documents", "read_own"),
        ("student_documents", "list_own"),
        ("student_transport", "read_own"),
        # Fee (own only)
        ("fee_receipts", "read_own"),
        ("fee_receipts", "list_own"),
        ("fee_transactions", "read_own"),
        ("fee_transactions", "list_own"),
    ],
    "Parent": [
        # Reference data (needed to display class/section names)
        ("academic_years", "read"),
        ("academic_years", "list"),
        ("classes", "read"),
        ("classes", "list"),
        ("subjects", "read"),
        ("subjects", "list"),
        # Children's details (related = only linked children)
        ("student_admissions", "read_related"),
        ("student_admissions", "list_related"),
        ("student_attendance", "read_related"),
        ("student_attendance", "list_related"),
        ("student_certificates", "read_related"),
        ("student_certificates", "list_related"),
        ("student_documents", "read_related"),
        ("student_documents", "list_related"),
        ("student_transport", "read_related"),
        # Marks & Exam results (children only)
        ("exams", "read"),
        ("exams", "list"),
        ("exam_marks", "read_related"),
        ("exam_marks", "list_related"),
        # Hall tickets (children only)
        ("exam_hall_tickets", "read_related"),
        ("exam_hall_tickets", "list_related"),
        # Fee (children only)
        ("fee_transactions", "read_related"),
        ("fee_collection", "read_related"),
        ("fee_receipts", "read_related"),
    ],
    "Staff": _READ_ONLY_ACADEMIC
    + [
        # Exam (read-only)
        ("exams", "read"),
        ("exams", "list"),
        ("exam_marks", "read"),
        ("exam_marks", "list"),
        # Students (create/update, no delete)
        ("students", "list"),
        ("student_admissions", "create"),
        ("student_admissions", "read"),
        ("student_admissions", "update"),
        ("student_admissions", "list"),
        ("student_attendance", "create"),
        ("student_attendance", "read"),
        ("student_attendance", "update"),
        ("student_attendance", "list"),
        ("student_certificates", "create"),
        ("student_certificates", "read"),
        ("student_certificates", "update"),
        ("student_certificates", "list"),
        ("student_documents", "create"),
        ("student_documents", "read"),
        ("student_documents", "update"),
        ("student_documents", "list"),
        ("student_transport", "create"),
        ("student_transport", "read"),
        ("student_transport", "update"),
        ("student_transport", "list"),
        # Fee (full ops except delete/approve)
        ("fee_categories", "read"),
        ("fee_categories", "list"),
        ("fee_types", "read"),
        ("fee_types", "list"),
        ("fee_terms", "read"),
        ("fee_terms", "list"),
        ("fee_class_mappings", "read"),
        ("fee_class_mappings", "list"),
        ("fee_class_mapping_term_amounts", "read"),
        ("fee_class_mapping_term_amounts", "list"),
        ("fee_student_mappings", "create"),
        ("fee_student_mappings", "read"),
        ("fee_student_mappings", "update"),
        ("fee_student_mappings", "list"),
        ("fee_transactions", "create"),
        ("fee_transactions", "read"),
        ("fee_transactions", "update"),
        ("fee_transactions", "list"),
        ("fee_receipts", "create"),
        ("fee_receipts", "read"),
        ("fee_receipts", "list"),
        ("fee_refunds", "create"),
        ("fee_refunds", "read"),
        ("fee_refunds", "list"),
        # Masters
        ("staff", "read"),
        ("staff", "list"),
        ("parent_management", "create"),
        ("parent_management", "read"),
        ("parent_management", "update"),
        ("parent_management", "list"),
        # Transport
        ("routes", "read"),
        ("routes", "list"),
        ("route_types", "read"),
        ("route_types", "list"),
        ("route_stops", "read"),
        ("route_stops", "list"),
        ("vehicles", "read"),
        ("vehicles", "list"),
        ("transport_trips", "create"),
        ("transport_trips", "read"),
        ("transport_trips", "update"),
        ("transport_trips", "list"),
        ("trip_types", "read"),
        ("trip_types", "list"),
        # Expenses (create & read, not approve/delete)
        ("expense_types", "read"),
        ("expense_types", "list"),
        ("expense_categories", "read"),
        ("expense_categories", "list"),
        ("expense_departments", "read"),
        ("expense_departments", "list"),
        ("expense_transactions", "create"),
        ("expense_transactions", "read"),
        ("expense_transactions", "list"),
        ("expense_attachments", "create"),
        ("expense_attachments", "read"),
        # Reports
        ("fee_reports", "read"),
        ("fee_reports", "export"),
        ("student_reports", "read"),
        ("student_reports", "export"),
        ("attendance_reports", "read"),
        ("attendance_reports", "export"),
        ("staff_reports", "read"),
        ("reports", "read"),
    ],
}


@router.post("/all-role-permissions", status_code=status.HTTP_200_OK)
async def seed_all_role_permissions(db: AsyncSession = Depends(get_tenant_db)):
    """
    Seed resource_permissions and role_menu_permissions for ALL roles.

    - Admin  : full access to every resource/action
    - Teacher: academic read, exam marks entry, attendance management, student read
    - Student: read-only view of own academic data, results, and fee receipts
    - Parent : read-only view of child's data and fee history
    - Staff  : student admission/fee/transport operations, expense entry

    Safe to call multiple times — uses ON CONFLICT DO NOTHING.
    """
    try:
        # ------------------------------------------------------------------
        # 1. Ensure all 5 roles exist
        # ------------------------------------------------------------------
        roles_to_ensure = [
            ("Admin", "System administrator with full access"),
            ("Teacher", "Teaching staff with academic management access"),
            ("Student", "Student with limited read access"),
            ("Parent", "Parent with access to child information"),
            ("Staff", "Administrative staff with operational access"),
        ]
        for name, desc in roles_to_ensure:
            await db.execute(
                text("""
                INSERT INTO roles (id, name, description, is_system_role, is_custom_role)
                VALUES (gen_random_uuid(), :name, :desc, true, false)
                ON CONFLICT (name) DO NOTHING
            """),
                {"name": name, "desc": desc},
            )

        await db.flush()

        # ------------------------------------------------------------------
        # 2. Read role IDs
        # ------------------------------------------------------------------
        result = await db.execute(
            text("SELECT id, name FROM roles WHERE name = ANY(:names)"), {"names": list(_ROLE_PERMISSIONS.keys())}
        )
        role_map = {row.name: row.id for row in result}

        # ------------------------------------------------------------------
        # 3. Seed resource_permissions
        # ------------------------------------------------------------------
        resource_perm_counts = {}
        for role_name, perms in _ROLE_PERMISSIONS.items():
            role_id = role_map.get(role_name)
            if not role_id:
                logger.warning(f"Role '{role_name}' not found in DB — skipping")
                continue
            inserted = 0
            for resource, action in perms:
                await db.execute(
                    text("""
                    INSERT INTO resource_permissions (id, role_id, resource, action, is_granted)
                    SELECT gen_random_uuid(), :role_id, :res, :act, true
                    WHERE NOT EXISTS (
                        SELECT 1 FROM resource_permissions
                        WHERE role_id = :role_id2 AND resource = :res2 AND action = :act2
                    )
                """),
                    {
                        "role_id": role_id,
                        "res": resource,
                        "act": action,
                        "role_id2": role_id,
                        "res2": resource,
                        "act2": action,
                    },
                )
                inserted += 1
            resource_perm_counts[role_name] = inserted

        await db.flush()

        # ------------------------------------------------------------------
        # 4. Seed role_menu_permissions — role-specific menu visibility
        #
        # Admin/Staff/Teacher : all menus (can_edit=True for Admin only)
        # Student/Parent      : only student-facing menus (no admin transport,
        #                       fee admin, masters, reports, or administration)
        # ------------------------------------------------------------------
        _STUDENT_PARENT_MENU_URLS = [
            "/dashboard",
            "/students",  # L0 parent
            "/students/admission",  # own / children's profile
            "/students/attendance",
            "/students/studenttransport",  # student-facing transport page
            "/students/studentdocuments",
            "/students/studentcertificates",
            "/fee",           # L0 parent — before Exam Management
            "/fee/my-fees",
            "/fee/my-receipts",
            "/exam",  # L0 parent
            "/exam/exams",
            "/exam/marks",  # view own marks
            "/exam/hall-tickets",
            "/exam/results",
        ]

        # All menus (for Admin / Staff / Teacher)
        menus_result = await db.execute(text("SELECT id FROM menus"))
        all_menu_ids = [row.id for row in menus_result]

        # Restricted menus (for Student / Parent) — look up by URL
        url_placeholders = ", ".join([f":url{i}" for i in range(len(_STUDENT_PARENT_MENU_URLS))])
        url_params = {f"url{i}": url for i, url in enumerate(_STUDENT_PARENT_MENU_URLS)}
        restricted_result = await db.execute(
            text(f"SELECT id FROM menus WHERE url IN ({url_placeholders})"), url_params
        )
        restricted_menu_ids = [row.id for row in restricted_result]

        menu_perm_counts = {}
        for role_name, role_id in role_map.items():
            can_edit = role_name == "Admin"
            menu_ids = restricted_menu_ids if role_name in ("Student", "Parent") else all_menu_ids
            inserted = 0
            for menu_id in menu_ids:
                await db.execute(
                    text("""
                    INSERT INTO role_menu_permissions (id, role_id, menu_id, can_view, can_edit)
                    SELECT gen_random_uuid(), :role_id, :menu_id, true, :can_edit
                    WHERE NOT EXISTS (
                        SELECT 1 FROM role_menu_permissions
                        WHERE role_id = :role_id AND menu_id = :menu_id
                    )
                """),
                    {"role_id": role_id, "menu_id": menu_id, "can_edit": can_edit},
                )
                inserted += 1
            menu_perm_counts[role_name] = inserted

        await db.commit()

        return {
            "message": "All role permissions seeded successfully",
            "resource_permissions": {role: f"{count} permissions" for role, count in resource_perm_counts.items()},
            "menu_permissions": {role: f"{count} menus" for role, count in menu_perm_counts.items()},
        }

    except Exception as e:
        await db.rollback()
        logger.error(f"Error seeding all role permissions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to seed permissions: {str(e)}"
        )


@router.post("/permission-data", status_code=status.HTTP_201_CREATED)
async def seed_permission_data():
    """
    Seed default permission data for the multi-tenant system
    This should only be run once during initial setup
    """
    try:
        async with get_public_db() as public_db:
            # 1. Seed Role Templates
            role_templates_data = [
                {
                    "name": "Admin",
                    "description": "System administrator with full access",
                    "category": "system",
                    "is_system_role": True,
                },
                {
                    "name": "Teacher",
                    "description": "Teaching staff with academic management access",
                    "category": "academic",
                    "is_system_role": True,
                },
                {
                    "name": "Student",
                    "description": "Student with limited read access to own data",
                    "category": "academic",
                    "is_system_role": True,
                },
                {
                    "name": "Parent",
                    "description": "Parent with access to child's academic information",
                    "category": "academic",
                    "is_system_role": True,
                },
                {
                    "name": "Staff",
                    "description": "Administrative staff with operational access",
                    "category": "administrative",
                    "is_system_role": True,
                },
            ]

            role_templates_created = []
            for role_data in role_templates_data:
                # Check if exists
                query = select(RoleTemplate).where(RoleTemplate.name == role_data["name"])
                result = await public_db.execute(query)
                existing = result.scalar_one_or_none()

                if not existing:
                    role_template = RoleTemplate(**role_data)
                    public_db.add(role_template)
                    role_templates_created.append(role_data["name"])

            await public_db.commit()

            # 2. Create or get Academic Years menu
            menu_query = select(Menu).where(Menu.name.ilike("%academic%"))
            result = await public_db.execute(menu_query)
            academic_menu = result.scalar_one_or_none()

            if not academic_menu:
                # Create basic Academic Years menu
                academic_menu = Menu(
                    id=999,  # Temporary ID for seeding
                    name="Academic Years",
                    url="/academic-years",
                    level="L1",
                    parent_id=None,
                )
                public_db.add(academic_menu)
                await public_db.flush()

            # 3. Seed Menu Actions for Academic Years
            actions_data = [
                {
                    "resource_name": "academic_years",
                    "action_name": "create",
                    "description": "Create new academic years",
                },
                {"resource_name": "academic_years", "action_name": "read", "description": "View academic year details"},
                {
                    "resource_name": "academic_years",
                    "action_name": "update",
                    "description": "Update academic year information",
                },
                {"resource_name": "academic_years", "action_name": "delete", "description": "Delete academic years"},
                {"resource_name": "academic_years", "action_name": "list", "description": "List all academic years"},
            ]

            actions_created = []
            for action_data in actions_data:
                # Check if exists
                action_query = select(MenuAction).where(
                    MenuAction.menu_id == academic_menu.id,
                    MenuAction.resource_name == action_data["resource_name"],
                    MenuAction.action_name == action_data["action_name"],
                )
                result = await public_db.execute(action_query)
                existing = result.scalar_one_or_none()

                if not existing:
                    menu_action = MenuAction(menu_id=academic_menu.id, **action_data)
                    public_db.add(menu_action)
                    actions_created.append(f"{action_data['resource_name']}:{action_data['action_name']}")

            # 4. Seed Permission Templates
            # Get all role templates
            roles_query = select(RoleTemplate)
            result = await public_db.execute(roles_query)
            role_templates = result.scalars().all()

            permissions_created = []
            for role_template in role_templates:
                # Check if permission template exists
                perm_query = select(PermissionTemplate).where(
                    PermissionTemplate.role_template_id == role_template.id,
                    PermissionTemplate.menu_id == academic_menu.id,
                )
                result = await public_db.execute(perm_query)
                existing = result.scalar_one_or_none()

                if not existing:
                    # Admin gets full access, others get read-only
                    can_view = True
                    can_edit = True if role_template.name == "Admin" else False

                    permission_template = PermissionTemplate(
                        role_template_id=role_template.id,
                        menu_id=academic_menu.id,
                        can_view=can_view,
                        can_edit=can_edit,
                    )
                    public_db.add(permission_template)
                    permissions_created.append(f"{role_template.name}->AcademicYears(view:{can_view},edit:{can_edit})")

            # 5. Seed Plan-Menu Access
            plans_query = select(Plan).where(Plan.is_active)
            result = await public_db.execute(plans_query)
            plans = result.scalars().all()

            plan_access_created = []
            for plan in plans:
                # Check if access exists
                access_query = select(PlanMenuAccess).where(
                    PlanMenuAccess.plan_id == plan.id, PlanMenuAccess.menu_id == academic_menu.id
                )
                result = await public_db.execute(access_query)
                existing = result.scalar_one_or_none()

                if not existing:
                    plan_access = PlanMenuAccess(plan_id=plan.id, menu_id=academic_menu.id, is_active=True)
                    public_db.add(plan_access)
                    plan_access_created.append(f"{plan.name}->AcademicYears")

            await public_db.commit()

            return {
                "message": "Permission data seeded successfully",
                "details": {
                    "role_templates_created": role_templates_created,
                    "menu_actions_created": actions_created,
                    "permission_templates_created": permissions_created,
                    "plan_access_created": plan_access_created,
                    "academic_menu_id": academic_menu.id,
                },
            }

    except Exception as e:
        logger.error(f"Error seeding permission data: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to seed permission data: {str(e)}"
        )


@router.get("/verify-permission-data")
async def verify_permission_data():
    """
    Verify that permission data has been seeded correctly
    """
    try:
        async with get_public_db() as public_db:
            # Check role templates
            roles_query = select(RoleTemplate)
            result = await public_db.execute(roles_query)
            role_templates = result.scalars().all()

            # Check academic menu
            menu_query = select(Menu).where(Menu.name.ilike("%academic%"))
            result = await public_db.execute(menu_query)
            academic_menu = result.scalar_one_or_none()

            # Check menu actions
            actions_query = select(MenuAction).where(MenuAction.resource_name == "academic_years")
            result = await public_db.execute(actions_query)
            menu_actions = result.scalars().all()

            # Check permission templates
            if academic_menu:
                perms_query = (
                    select(PermissionTemplate, RoleTemplate)
                    .join(RoleTemplate)
                    .where(PermissionTemplate.menu_id == academic_menu.id)
                )
                result = await public_db.execute(perms_query)
                permission_templates = result.all()
            else:
                permission_templates = []

            # Check plan access
            if academic_menu:
                plans_query = select(PlanMenuAccess, Plan).join(Plan).where(PlanMenuAccess.menu_id == academic_menu.id)
                result = await public_db.execute(plans_query)
                plan_access = result.all()
            else:
                plan_access = []

            return {
                "role_templates": [{"id": rt.id, "name": rt.name, "category": rt.category} for rt in role_templates],
                "academic_menu": {"id": academic_menu.id, "name": academic_menu.name} if academic_menu else None,
                "menu_actions": [{"resource": ma.resource_name, "action": ma.action_name} for ma in menu_actions],
                "permission_templates": [
                    {"role": rt.name, "can_view": pt.can_view, "can_edit": pt.can_edit}
                    for pt, rt in permission_templates
                ],
                "plan_access": [{"plan": p.name, "is_active": pma.is_active} for pma, p in plan_access],
            }

    except Exception as e:
        logger.error(f"Error verifying permission data: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to verify permission data: {str(e)}"
        )


@router.post("/caste-data", status_code=status.HTTP_201_CREATED)
async def seed_caste_data(request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """
    Seed default caste and sub-caste data.
    This should only be run once during initial setup.

    **Required Permission**: Admin only
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Only admin can seed data
    if role != "Admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only administrators can seed data")

    try:
        # Common Indian castes with sub-castes
        castes_data = {
            "General": ["General"],
            "OBC": ["OBC-A", "OBC-B", "OBC-C", "OBC-D"],
            "SC": ["Adi Andhra", "Adi Dravida", "Mala", "Madiga", "Chamar", "Pasi"],
            "ST": ["Chenchu", "Konda Reddy", "Koya", "Gond", "Bhil", "Santhal"],
            "EWS": ["EWS"],
        }

        castes_created = []
        sub_castes_created = []

        for caste_name, sub_caste_list in castes_data.items():
            # Check if caste exists
            query = select(Caste).where(Caste.name == caste_name)
            result = await db.execute(query)
            existing_caste = result.scalar_one_or_none()

            if not existing_caste:
                caste = Caste(id=uuid4(), name=caste_name, code=caste_name[:3].upper(), is_active=True)
                db.add(caste)
                await db.flush()  # Flush to get the ID
                castes_created.append(caste_name)
            else:
                caste = existing_caste

            # Add sub-castes
            for sub_caste_name in sub_caste_list:
                # Check if sub-caste exists
                sub_query = select(SubCaste).where(SubCaste.caste_id == caste.id, SubCaste.name == sub_caste_name)
                result = await db.execute(sub_query)
                existing_sub_caste = result.scalar_one_or_none()

                if not existing_sub_caste:
                    sub_caste = SubCaste(
                        id=uuid4(),
                        caste_id=caste.id,
                        name=sub_caste_name,
                        code=sub_caste_name[:3].upper() if len(sub_caste_name) >= 3 else sub_caste_name.upper(),
                        is_active=True,
                    )
                    db.add(sub_caste)
                    sub_castes_created.append(f"{caste_name} -> {sub_caste_name}")

        await db.commit()

        return {
            "message": "Caste data seeded successfully",
            "details": {
                "castes_created": castes_created,
                "sub_castes_created": sub_castes_created,
                "total_castes": len(castes_created),
                "total_sub_castes": len(sub_castes_created),
            },
        }

    except Exception as e:
        await db.rollback()
        logger.error(f"Error seeding caste data: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to seed caste data: {str(e)}"
        )


@router.post("/location-data", status_code=status.HTTP_201_CREATED)
async def seed_location_data():
    """
    Seed default location data (States, Districts, Mandals) to PUBLIC schema.
    This should only be run once during initial setup.

    Note: This endpoint does not require authentication as it seeds PUBLIC schema data.
    """
    try:
        async with get_public_db() as public_db:
            # Major Indian states with districts and mandals
            # For brevity, including Andhra Pradesh and Telangana as primary states
            location_data = {
                "Andhra Pradesh": {
                    "code": "AP",
                    "districts": {
                        "Visakhapatnam": ["Visakhapatnam Urban", "Visakhapatnam Rural", "Bheemunipatnam", "Anakapalli"],
                        "Vijayawada": ["Vijayawada Urban", "Vijayawada Rural", "Gannavaram", "Kankipadu"],
                        "Guntur": ["Guntur Urban", "Guntur Rural", "Tenali", "Mangalagiri"],
                        "Nellore": ["Nellore Urban", "Nellore Rural", "Kavali", "Gudur"],
                        "Kurnool": ["Kurnool Urban", "Kurnool Rural", "Nandyal", "Adoni"],
                    },
                },
                "Telangana": {
                    "code": "TS",
                    "districts": {
                        "Hyderabad": ["Hyderabad Urban", "Secunderabad", "Kukatpally", "LB Nagar"],
                        "Rangareddy": ["Shamshabad", "Rajendranagar", "Serilingampally", "Chevella"],
                        "Warangal": ["Warangal Urban", "Warangal Rural", "Hanamkonda", "Parkal"],
                        "Nizamabad": ["Nizamabad Urban", "Nizamabad Rural", "Bodhan", "Armoor"],
                        "Karimnagar": ["Karimnagar Urban", "Karimnagar Rural", "Jagitial", "Peddapalli"],
                    },
                },
                "Karnataka": {
                    "code": "KA",
                    "districts": {
                        "Bangalore": ["Bangalore North", "Bangalore South", "Bangalore East", "Anekal"],
                        "Mysore": ["Mysore Urban", "Mysore Rural", "K.R. Nagar", "Hunsur"],
                    },
                },
                "Tamil Nadu": {
                    "code": "TN",
                    "districts": {
                        "Chennai": ["Chennai North", "Chennai South", "Chennai Central", "Ambattur"],
                        "Coimbatore": ["Coimbatore North", "Coimbatore South", "Pollachi", "Sulur"],
                    },
                },
                "Maharashtra": {
                    "code": "MH",
                    "districts": {
                        "Mumbai": ["Mumbai City", "Mumbai Suburban", "Kurla", "Andheri"],
                        "Pune": ["Pune City", "Pune Rural", "Haveli", "Bhor"],
                    },
                },
            }

            states_created = []
            districts_created = []
            mandals_created = []

            for state_name, state_info in location_data.items():
                # Check if state exists
                query = select(State).where(State.name == state_name)
                result = await public_db.execute(query)
                existing_state = result.scalar_one_or_none()

                if not existing_state:
                    state = State(
                        id=uuid4(),
                        name=state_name,
                        code=state_info["code"],
                        is_active=True,
                        created_at=datetime.now(),
                        updated_at=datetime.now(),
                    )
                    public_db.add(state)
                    await public_db.flush()
                    states_created.append(state_name)
                else:
                    state = existing_state

                # Add districts
                for district_name, mandal_list in state_info["districts"].items():
                    # Check if district exists
                    dist_query = select(District).where(District.state_id == state.id, District.name == district_name)
                    result = await public_db.execute(dist_query)
                    existing_district = result.scalar_one_or_none()

                    if not existing_district:
                        district = District(
                            id=uuid4(),
                            state_id=state.id,
                            name=district_name,
                            code=district_name[:3].upper(),
                            is_active=True,
                            created_at=datetime.now(),
                            updated_at=datetime.now(),
                        )
                        public_db.add(district)
                        await public_db.flush()
                        districts_created.append(f"{state_name} -> {district_name}")
                    else:
                        district = existing_district

                    # Add mandals
                    for mandal_name in mandal_list:
                        # Check if mandal exists
                        mandal_query = select(Mandal).where(
                            Mandal.district_id == district.id, Mandal.name == mandal_name
                        )
                        result = await public_db.execute(mandal_query)
                        existing_mandal = result.scalar_one_or_none()

                        if not existing_mandal:
                            mandal = Mandal(
                                id=uuid4(),
                                district_id=district.id,
                                name=mandal_name,
                                is_active=True,
                                created_at=datetime.now(),
                                updated_at=datetime.now(),
                            )
                            public_db.add(mandal)
                            mandals_created.append(f"{state_name} -> {district_name} -> {mandal_name}")

            await public_db.commit()

            return {
                "message": "Location data seeded successfully",
                "details": {
                    "states_created": states_created,
                    "districts_created": districts_created,
                    "mandals_created": mandals_created,
                    "total_states": len(states_created),
                    "total_districts": len(districts_created),
                    "total_mandals": len(mandals_created),
                },
            }

    except Exception as e:
        logger.error(f"Error seeding location data: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to seed location data: {str(e)}"
        )

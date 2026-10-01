import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

load_dotenv()

from sqlalchemy import text

from app.db.tenant_session import PublicAsyncSessionLocal, TenantService, open_tenant_session
from app.models.load_all import load_all_models
from app.service.tenant.catalog_service import CatalogService
from app.service.tenant.role_seed_service import RoleSeedService

load_all_models()

SELF_SERVICE_URLS = ["/fee/my-fees", "/fee/my-receipts"]
HIDDEN_URLS = ["/billing-admin"]
ADMIN_SIDE_ROLES = ["Admin", "Staff", "Teacher"]

MODULES = [
    ("Dashboard", "/dashboard", []),
    (
        "Masters",
        "/masters",
        [
            ("Academic Years", "/masters/academicyears"),
            ("Classes and Sections", "/masters/classesandsections"),
            ("Subject Categories", "/masters/subjectcategories"),
            ("Subjects", "/masters/subjects"),
            ("Class Subject Mappings", "/masters/classsubjectmappings"),
            ("Holidays", "/masters/holidays"),
            ("Parents", "/masters/parents"),
            ("Roles and Permissions", "/masters/rolespermissions"),
        ],
    ),
    (
        "Students",
        "/students",
        [
            ("Admission", "/students/admission"),
            ("Attendance", "/students/attendance"),
            ("Student Documents", "/students/studentdocuments"),
            ("Student Certificates", "/students/studentcertificates"),
            ("Certificate Types", "/students/certificatetypes"),
            ("Certificate Templates", "/students/certificatetemplates"),
            ("Student Transport", "/students/studenttransport"),
        ],
    ),
    (
        "Staff",
        "/staff",
        [
            ("Enrollment", "/staff/enrollment"),
            ("Designations", "/staff/designations"),
            ("Staff Attendance", "/staff/attendance"),
        ],
    ),
    (
        "Fee",
        "/fee",
        [
            ("Fee Categories", "/fee/categories"),
            ("Fee Types", "/fee/types"),
            ("Fee Terms", "/fee/terms"),
            ("Fee Mappings", "/fee/mappings"),
            ("Term Amounts", "/fee/term-amounts"),
            ("Fee Collection", "/fee/collection"),
            ("Fee Receipts", "/fee/receipts"),
            ("Fee Transactions", "/fee/transactions"),
            ("Fee Refunds", "/fee/refunds"),
            ("Fee Reports", "/fee/reports"),
            ("My Fees", "/fee/my-fees"),
            ("My Receipts", "/fee/my-receipts"),
        ],
    ),
    (
        "Transport",
        "/transport",
        [
            ("Routes", "/transport/routes"),
            ("Route Stops", "/transport/routeStops"),
            ("Vehicles", "/transport/vehicles"),
            ("Trips", "/transport/trips"),
            ("Pricing", "/transport/pricing"),
        ],
    ),
    (
        "Exam",
        "/exam",
        [
            ("Exams", "/exam/exams"),
            ("Marks", "/exam/marks"),
            ("Hall Tickets", "/exam/hall-tickets"),
            ("Results", "/exam/results"),
            ("Grading", "/exam/grading"),
            ("Board Patterns", "/exam/board-patterns"),
            ("Exam Audit", "/exam/audit"),
            ("Exam Settings", "/exam/settings"),
        ],
    ),
    (
        "Expense",
        "/expense",
        [
            ("Expense Categories", "/expense/categories"),
            ("Expense Departments", "/expense/departments"),
            ("Expense Types", "/expense/types"),
            ("Expense Transactions", "/expense/transactions"),
            ("Expense Approvals", "/expense/approvals"),
            ("Expense Reports", "/expense/reports"),
            ("Expense Summary", "/expense/summary"),
            ("Expense Audit", "/expense/audit"),
            ("Expense Settings", "/expense/settings"),
        ],
    ),
    (
        "Communication",
        "/communication",
        [
            ("Compose", "/communication/compose"),
            ("Templates", "/communication/templates"),
            ("Logs", "/communication/logs"),
        ],
    ),
    ("Timetable", "/TimeTable", []),
    ("Calendar", "/Calender", []),
    ("Reports", "/reports", []),
    (
        "Administration",
        "/admin",
        [
            ("Users", "/admin/users"),
            ("School Settings", "/settings/school"),
        ],
    ),
]


def build_menus():
    menus = []
    for order, (name, url, children) in enumerate(MODULES, start=1):
        menus.append({"name": name, "url": url, "level": "L0", "display_order": order})
        for child_order, (child_name, child_url) in enumerate(children, start=1):
            menus.append(
                {
                    "name": child_name,
                    "url": child_url,
                    "level": "L1",
                    "parent_url": url,
                    "display_order": child_order,
                }
            )
    return menus


async def main(client_name: str):
    menus = build_menus()
    async with PublicAsyncSessionLocal() as session:
        created = await CatalogService.import_menus(session, menus)
        plan = await CatalogService.ensure_full_plan(session, name="Full")
        await session.commit()
    print(f"menus created: {created}, plan: {plan.name}")

    tenant_id = await TenantService.get_tenant_id(client_name)
    if not tenant_id:
        raise SystemExit(f"Tenant '{client_name}' not found or inactive")

    async with open_tenant_session(tenant_id) as session:
        summary = await RoleSeedService.sync_to_plan(session)
        removed = await session.execute(
            text(
                "DELETE FROM role_menu_permissions WHERE menu_id IN "
                "(SELECT id FROM menus WHERE url = ANY(:urls)) AND role_id IN "
                "(SELECT id FROM roles WHERE name = ANY(:roles))"
            ),
            {"urls": SELF_SERVICE_URLS, "roles": ADMIN_SIDE_ROLES},
        )
        hidden = await session.execute(
            text("DELETE FROM role_menu_permissions WHERE menu_id IN (SELECT id FROM menus WHERE url = ANY(:urls))"),
            {"urls": HIDDEN_URLS},
        )
        await session.commit()
    print(summary, "self_service_links_removed:", removed.rowcount, "hidden_links_removed:", hidden.rowcount)


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1] if len(sys.argv) > 1 else "demo_school"))

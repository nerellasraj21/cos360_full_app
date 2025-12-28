"""
Update Menu URLs in test_tenant_schema
Updates menu URLs in tenant schema based on frontend routes
"""
import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

# Database URLs
LOCAL_DB_URL = "postgresql+asyncpg://postgres:Passw0rd!@localhost/postgres"
NEON_DB_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://neondb_owner:npg_3BRCMxJ8aKdN@ep-old-salad-a1x7ae1e-pooler.ap-southeast-1.aws.neon.tech/neondb")

TENANT_SCHEMA = "test_tenant_schema"

# Menu URL mappings from frontend routes
MENU_URL_MAPPINGS = [
    {"name": "Dashboard", "url": "/dashboard"},
    {"name": "Profile", "url": "/profile"},
    {"name": "Super Organization", "url": "/superorg"},
    {"name": "About", "url": "/about"},
    {"name": "Time Table", "url": "/TimeTable"},
    {"name": "Calendar", "url": "/Calender"},
    {"name": "Admin Profile", "url": "/admin/profile"},
    {"name": "Students", "url": "/students"},
    {"name": "Student Documents", "url": "/students/studentdocuments"},
    {"name": "Student Certificates", "url": "/students/studentcertificates"},
    {"name": "Student Profile", "url": "/students/profile"},
    {"name": "My Documents", "url": "/students/mydocuments"},
    {"name": "My Certificates", "url": "/students/mycertificates"},
    {"name": "Documents Upload", "url": "/students/documentsupload"},
    {"name": "Certificate Types", "url": "/students/certificatetypes"},
    {"name": "Certificates Upload", "url": "/students/certificatesupload"},
    {"name": "Student Attendance", "url": "/students/attendance"},
    {"name": "Admission", "url": "/students/admission"},
    {"name": "Fee", "url": "/fee"},
    {"name": "Fee Types", "url": "/fee/types"},
    {"name": "Fee Transactions", "url": "/fee/transactions"},
    {"name": "Fee Terms", "url": "/fee/terms"},
    {"name": "Fee Reports", "url": "/fee/reports"},
    {"name": "Fee Refunds", "url": "/fee/refunds"},
    {"name": "Fee Receipts", "url": "/fee/receipts"},
    {"name": "Fee Mappings", "url": "/fee/mappings"},
    {"name": "Fee Categories", "url": "/fee/categories"},
    {"name": "Expense", "url": "/expense"},
    {"name": "Expense Types", "url": "/expense/types"},
    {"name": "Expense Transactions", "url": "/expense/transactions"},
    {"name": "Expense Settings", "url": "/expense/settings"},
    {"name": "Expense Reports", "url": "/expense/reports"},
    {"name": "Expense Departments", "url": "/expense/departments"},
    {"name": "Expense Categories", "url": "/expense/categories"},
    {"name": "Expense Audit", "url": "/expense/audit"},
    {"name": "Expense Approvals", "url": "/expense/approvals"},
    {"name": "Staff", "url": "/staff"},
    {"name": "Staff Profile", "url": "/staff/profile"},
    {"name": "Staff Enrollment", "url": "/staff/enrollment"},
    {"name": "Staff Designations", "url": "/staff/designations"},
    {"name": "Staff Attendance", "url": "/staff/attendance"},
    {"name": "Vehicles", "url": "/transport/vehicles"},
    {"name": "Trips", "url": "/transport/trips"},
    {"name": "Student Trips", "url": "/transport/studentTrips"},
    {"name": "Student Transport", "url": "/transport/studentTransport"},
    {"name": "Routes", "url": "/transport/routes"},
    {"name": "Route Stops", "url": "/transport/routeStops"},
    {"name": "Masters Vehicles", "url": "/masters/vehicles"},
    {"name": "Masters Trips", "url": "/masters/trips"},
    {"name": "Subjects", "url": "/masters/subjects"},
    {"name": "Subject Categories", "url": "/masters/subjectcategories"},
    {"name": "Masters Routes", "url": "/masters/routes"},
    {"name": "Masters Route Stops", "url": "/masters/routeStops"},
    {"name": "Roles Permissions", "url": "/masters/rolespermissions"},
    {"name": "Parents", "url": "/masters/parents"},
    {"name": "Holidays", "url": "/masters/holidays"},
    {"name": "Class Subject Mappings", "url": "/masters/classsubjectmappings"},
    {"name": "Classes and Sections", "url": "/masters/classesandsections"},
    {"name": "Academic Years", "url": "/masters/academicyears"},
]


async def update_tenant_menu_urls(database_url: str, db_name: str):
    """Update menu URLs in test_tenant_schema"""
    print(f"\n{'='*60}")
    print(f"Updating Menu URLs in {TENANT_SCHEMA}")
    print(f"Database: {db_name}")
    print(f"{'='*60}\n")

    try:
        engine = create_async_engine(database_url, echo=False)
        SessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)

        async with SessionLocal() as session:
            # Set search path to tenant schema
            await session.execute(text(f"SET search_path TO {TENANT_SCHEMA}"))

            # Get all existing menus in tenant schema
            result = await session.execute(text("""
                SELECT id, name, url FROM menus ORDER BY name
            """))
            existing_menus = result.fetchall()

            print(f"Found {len(existing_menus)} existing menus in {TENANT_SCHEMA}\n")

            updated_count = 0
            not_found_count = 0

            # Update URLs based on name matching
            for mapping in MENU_URL_MAPPINGS:
                menu_name = mapping["name"]
                new_url = mapping["url"]

                matched = False
                for menu in existing_menus:
                    menu_id, db_name_val, db_url = menu

                    # Check for exact match or partial match
                    if (menu_name.lower() == db_name_val.lower() or
                        menu_name.lower() in db_name_val.lower() or
                        db_name_val.lower() in menu_name.lower()):

                        # Update the menu URL
                        await session.execute(text("""
                            UPDATE menus
                            SET url = :new_url
                            WHERE id = :menu_id
                        """), {"new_url": new_url, "menu_id": menu_id})

                        print(f"[OK] Updated: '{db_name_val}' -> {new_url}")
                        updated_count += 1
                        matched = True
                        break

                if not matched:
                    print(f"[WARN] Not Found: '{menu_name}' (URL: {new_url})")
                    not_found_count += 1

            await session.commit()

            print(f"\n{'='*60}")
            print(f"Summary for {TENANT_SCHEMA}:")
            print(f"  - Updated: {updated_count} menus")
            print(f"  - Not Found: {not_found_count} menus")
            print(f"{'='*60}\n")

        await engine.dispose()
        return True

    except Exception as e:
        print(f"[ERROR] Error updating {db_name} database: {str(e)}")
        return False


async def verify_tenant_menu_urls(database_url: str, db_name: str):
    """Verify menu URLs in tenant schema"""
    print(f"\n{'='*60}")
    print(f"Verifying Menu URLs in {TENANT_SCHEMA}")
    print(f"Database: {db_name}")
    print(f"{'='*60}\n")

    try:
        engine = create_async_engine(database_url, echo=False)
        SessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)

        async with SessionLocal() as session:
            await session.execute(text(f"SET search_path TO {TENANT_SCHEMA}"))

            result = await session.execute(text("""
                SELECT name, url FROM menus
                WHERE url IS NOT NULL
                ORDER BY name
            """))
            menus = result.fetchall()

            print(f"Total menus with URLs: {len(menus)}\n")
            for name, url in menus:
                print(f"  {name:40} -> {url}")

            print(f"\n{'='*60}\n")

        await engine.dispose()

    except Exception as e:
        print(f"[ERROR] Error verifying {db_name} database: {str(e)}")


async def main():
    """Main function to update tenant schema in both databases"""
    print("\n" + "="*60)
    print("Tenant Schema Menu URL Update Script")
    print(f"Target Schema: {TENANT_SCHEMA}")
    print("="*60)
    print("\nUpdating both Local and Neon databases...\n")

    # Update local first
    print("\n[*] Starting Local Database Update...")
    success_local = await update_tenant_menu_urls(LOCAL_DB_URL, "Local")
    if success_local:
        await verify_tenant_menu_urls(LOCAL_DB_URL, "Local")

    # Then update Neon
    print("\n[*] Starting Neon Database Update...")
    success_neon = await update_tenant_menu_urls(NEON_DB_URL, "Neon")
    if success_neon:
        await verify_tenant_menu_urls(NEON_DB_URL, "Neon")

    print("\n[SUCCESS] Script completed!")


if __name__ == "__main__":
    asyncio.run(main())

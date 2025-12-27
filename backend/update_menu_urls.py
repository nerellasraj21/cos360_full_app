"""
Update Menu URLs Script
Updates menu URLs in both local and Neon databases based on frontend routes
"""
import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database URLs
LOCAL_DB_URL = "postgresql+asyncpg://postgres:Passw0rd!@localhost/postgres"
NEON_DB_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://neondb_owner:npg_3BRCMxJ8aKdN@ep-old-salad-a1x7ae1e-pooler.ap-southeast-1.aws.neon.tech/neondb")

# Menu URL mappings from frontend routes
MENU_URL_MAPPINGS = [
    # Main App Module
    {"name": "Dashboard", "url": "/dashboard"},
    {"name": "Profile", "url": "/profile"},
    {"name": "Super Organization", "url": "/superorg"},
    {"name": "About", "url": "/about"},
    {"name": "Time Table", "url": "/TimeTable"},
    {"name": "Calendar", "url": "/Calender"},
    {"name": "Admin Profile", "url": "/admin/profile"},

    # Students Module
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

    # Fee Module
    {"name": "Fee", "url": "/fee"},
    {"name": "Fee Types", "url": "/fee/types"},
    {"name": "Fee Transactions", "url": "/fee/transactions"},
    {"name": "Fee Terms", "url": "/fee/terms"},
    {"name": "Fee Reports", "url": "/fee/reports"},
    {"name": "Fee Refunds", "url": "/fee/refunds"},
    {"name": "Fee Receipts", "url": "/fee/receipts"},
    {"name": "Fee Mappings", "url": "/fee/mappings"},
    {"name": "Fee Categories", "url": "/fee/categories"},

    # Expense Module
    {"name": "Expense", "url": "/expense"},
    {"name": "Expense Types", "url": "/expense/types"},
    {"name": "Expense Transactions", "url": "/expense/transactions"},
    {"name": "Expense Settings", "url": "/expense/settings"},
    {"name": "Expense Reports", "url": "/expense/reports"},
    {"name": "Expense Departments", "url": "/expense/departments"},
    {"name": "Expense Categories", "url": "/expense/categories"},
    {"name": "Expense Audit", "url": "/expense/audit"},
    {"name": "Expense Approvals", "url": "/expense/approvals"},

    # Staff Module
    {"name": "Staff", "url": "/staff"},
    {"name": "Staff Profile", "url": "/staff/profile"},
    {"name": "Staff Enrollment", "url": "/staff/enrollment"},
    {"name": "Staff Designations", "url": "/staff/designations"},
    {"name": "Staff Attendance", "url": "/staff/attendance"},

    # Transport Module
    {"name": "Vehicles", "url": "/transport/vehicles"},
    {"name": "Trips", "url": "/transport/trips"},
    {"name": "Student Trips", "url": "/transport/studentTrips"},
    {"name": "Student Transport", "url": "/transport/studentTransport"},
    {"name": "Routes", "url": "/transport/routes"},
    {"name": "Route Stops", "url": "/transport/routeStops"},

    # Masters Module
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


async def update_menu_urls(database_url: str, db_name: str):
    """Update menu URLs in the specified database"""
    print(f"\n{'='*60}")
    print(f"Updating Menu URLs in {db_name} Database")
    print(f"{'='*60}\n")

    try:
        # Create engine
        engine = create_async_engine(database_url, echo=False)
        SessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)

        async with SessionLocal() as session:
            # Check if we need to update public schema or tenant schemas
            # First, try public schema
            await session.execute(text("SET search_path TO public"))

            # Get all existing menus
            result = await session.execute(text("""
                SELECT id, name, url FROM menus ORDER BY name
            """))
            existing_menus = result.fetchall()

            print(f"Found {len(existing_menus)} existing menus in public schema\n")

            updated_count = 0
            not_found_count = 0

            # Update URLs based on name matching
            for mapping in MENU_URL_MAPPINGS:
                menu_name = mapping["name"]
                new_url = mapping["url"]

                # Try to find matching menu (case-insensitive, partial match)
                matched = False
                for menu in existing_menus:
                    menu_id, db_name, db_url = menu

                    # Check for exact match or partial match
                    if (menu_name.lower() == db_name.lower() or
                        menu_name.lower() in db_name.lower() or
                        db_name.lower() in menu_name.lower()):

                        # Update the menu URL
                        await session.execute(text("""
                            UPDATE menus
                            SET url = :new_url
                            WHERE id = :menu_id
                        """), {"new_url": new_url, "menu_id": menu_id})

                        print(f"[OK] Updated: '{db_name}' -> {new_url}")
                        updated_count += 1
                        matched = True
                        break

                if not matched:
                    print(f"[WARN] Not Found: '{menu_name}' (URL: {new_url})")
                    not_found_count += 1

            await session.commit()

            print(f"\n{'='*60}")
            print(f"Summary for {db_name}:")
            print(f"  - Updated: {updated_count} menus")
            print(f"  - Not Found: {not_found_count} menus")
            print(f"{'='*60}\n")

        await engine.dispose()
        return True

    except Exception as e:
        print(f"[ERROR] Error updating {db_name} database: {str(e)}")
        return False


async def verify_menu_urls(database_url: str, db_name: str):
    """Verify menu URLs in the database"""
    print(f"\n{'='*60}")
    print(f"Verifying Menu URLs in {db_name} Database")
    print(f"{'='*60}\n")

    try:
        engine = create_async_engine(database_url, echo=False)
        SessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)

        async with SessionLocal() as session:
            await session.execute(text("SET search_path TO public"))

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
    """Main function to update both databases"""
    print("\n" + "="*60)
    print("Menu URL Update Script")
    print("="*60)
    print("\nUpdating both Local and Neon databases...\n")

    # Update local first
    print("\n[*] Starting Local Database Update...")
    success_local = await update_menu_urls(LOCAL_DB_URL, "Local")
    if success_local:
        await verify_menu_urls(LOCAL_DB_URL, "Local")

    # Then update Neon
    print("\n[*] Starting Neon Database Update...")
    success_neon = await update_menu_urls(NEON_DB_URL, "Neon")
    if success_neon:
        await verify_menu_urls(NEON_DB_URL, "Neon")

    print("\n[SUCCESS] Script completed!")


if __name__ == "__main__":
    asyncio.run(main())
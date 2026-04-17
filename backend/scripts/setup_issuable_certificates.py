"""
Complete Issuable Certificates Setup Script

This script:
1. Creates issuable_certificate_templates and generated_certificates tables
2. Seeds three default certificate templates (Bonafide, Transfer, Conduct)
3. Works with all active tenants

Usage:
    python scripts/setup_issuable_certificates.py
    python scripts/setup_issuable_certificates.py test_tenant  # For specific tenant
"""

import asyncio
import os
import sys
import uuid
from datetime import datetime

from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.db.base import BaseOrg
from app.models.student.issuable_certificate_model import (
    IssuableCertificateTemplate,
    GeneratedCertificate,
)

# ============================================================================
# TEMPLATE DEFINITIONS (from seed script)
# ============================================================================

BONAFIDE_HTML = '''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: "Segoe UI", Arial, sans-serif; background: #f5f5f5; padding: 30px 15px; }
    .cert-container { background: white; max-width: 900px; width: 100%; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12); position: relative; overflow: hidden; }
    .top-bar { height: 12px; background: linear-gradient(90deg, #047857 0%, #10b981 50%, #047857 100%); }
    .cert-body { padding: 45px 50px; position: relative; z-index: 1; }
    .header-section { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
    .school-header { display: flex; gap: 15px; flex: 1; }
    .school-logo { font-size: 45px; line-height: 1; flex-shrink: 0; }
    .school-info h2 { font-size: 22px; font-weight: 700; color: #047857; margin-bottom: 3px; }
    .school-info p { font-size: 11px; color: #64748b; line-height: 1.5; margin: 2px 0; }
    .cert-ref { text-align: right; font-size: 12px; color: #64748b; }
    .cert-ref-label { font-weight: 600; color: #047857; }
    .cert-title { text-align: center; margin: 30px 0 25px 0; }
    .cert-title h1 { font-size: 32px; font-weight: 700; letter-spacing: 3px; color: #047857; text-transform: uppercase; text-decoration: underline; text-decoration-color: #10b981; text-underline-offset: 8px; text-decoration-thickness: 3px; }
    .cert-content { margin: 30px 0; font-size: 14px; line-height: 1.8; color: #2d3748; text-align: justify; }
    .info-box { background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 25px 0; border-radius: 4px; font-size: 14px; line-height: 1.7; color: #2d3748; }
    .info-row { margin: 10px 0; }
    .info-row strong { color: #047857; }
    .signature-section { display: flex; justify-content: space-around; margin-top: 70px; padding-top: 30px; text-align: center; }
    .signature-block { flex: 1; }
    .signature-line { border-top: 2px solid #2d3748; width: 160px; margin: 0 auto 8px; }
    .signature-title { font-size: 12px; font-weight: 600; color: #2d3748; text-transform: capitalize; }
    .footer-info { display: flex; justify-content: space-between; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #64748b; }
    .bottom-bar { height: 12px; background: linear-gradient(90deg, #047857 0%, #10b981 50%, #047857 100%); }
    .highlight { font-weight: 700; color: #047857; }
  </style>
</head>
<body>
  <div class="cert-container">
    <div class="top-bar"></div>
    <div class="cert-body">
      <div class="header-section">
        <div class="school-header">
          <div class="school-logo">🏫</div>
          <div class="school-info">
            <h2>{{school_name}}</h2>
            <p>123 Education Lane, City District</p>
            <p>Ph: +91 XXXXX XXXXX | Email: info@school.edu.in</p>
          </div>
        </div>
        <div class="cert-ref">
          <div><span class="cert-ref-label">Ref:</span> BON/2025/XXX</div>
          <div><span class="cert-ref-label">Date:</span> {{issue_date}}</div>
        </div>
      </div>
      <div class="cert-title"><h1>Bonafide Certificate</h1></div>
      <div class="cert-content">
        <p>This is to certify that <span class="highlight">{{student_name}}</span>, son/daughter of <span class="highlight">{{father_name}}</span>, bearing Admission No. <span class="highlight">{{admission_number}}</span>, is a bonafide student of this school.</p>
      </div>
      <div class="info-box">
        <div class="info-row"><strong>Class:</strong> {{class_name}}</div>
        <div class="info-row"><strong>Section:</strong> {{section}}</div>
        <div class="info-row"><strong>Date of Birth:</strong> {{dob}}</div>
        <div class="info-row"><strong>Academic Year:</strong> {{academic_year}}</div>
      </div>
      <div class="cert-content" style="margin-top: 30px;">
        <p>{{gender_he_she}} has not been debarred from appearing in any examination and {{gender_his_her}} conduct has been satisfactory throughout {{gender_his_her}} stay in this institution. This certificate is issued on {{gender_his_her}} request for further studies and official purposes.</p>
      </div>
      <div class="signature-section">
        <div class="signature-block">
          <div class="signature-line"></div>
          <div class="signature-title">Class Teacher</div>
        </div>
        <div class="signature-block">
          <div class="signature-line"></div>
          <div class="signature-title">Principal</div>
        </div>
      </div>
      <div class="footer-info">
        <div>Place: City</div>
        <div>Date: {{issue_date}}</div>
      </div>
    </div>
    <div class="bottom-bar"></div>
  </div>
</body>
</html>'''

TRANSFER_HTML = '''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: "Segoe UI", Arial, sans-serif; background: #f5f5f5; padding: 30px 15px; }
    .cert-container { background: white; max-width: 900px; width: 100%; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12); position: relative; overflow: hidden; }
    .top-bar { height: 12px; background: linear-gradient(90deg, #1e3a8a 0%, #2563eb 50%, #1e3a8a 100%); }
    .cert-body { padding: 45px 50px; position: relative; z-index: 1; }
    .header-section { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
    .school-header { display: flex; gap: 15px; flex: 1; }
    .school-logo { font-size: 45px; line-height: 1; flex-shrink: 0; }
    .school-info h2 { font-size: 22px; font-weight: 700; color: #1e3a8a; margin-bottom: 3px; }
    .school-info p { font-size: 11px; color: #64748b; line-height: 1.5; margin: 2px 0; }
    .cert-ref { text-align: right; font-size: 12px; color: #64748b; }
    .cert-ref-label { font-weight: 600; color: #1e3a8a; }
    .cert-title { text-align: center; margin: 30px 0 25px 0; }
    .cert-title h1 { font-size: 32px; font-weight: 700; letter-spacing: 3px; color: #1e3a8a; text-transform: uppercase; text-decoration: underline; text-decoration-color: #2563eb; text-underline-offset: 8px; text-decoration-thickness: 3px; }
    .cert-content { margin: 30px 0; font-size: 14px; line-height: 1.8; color: #2d3748; text-align: justify; }
    .info-box { background: #eff6ff; border-left: 4px solid #2563eb; padding: 20px; margin: 25px 0; border-radius: 4px; font-size: 14px; line-height: 1.7; color: #2d3748; }
    .info-row { margin: 10px 0; }
    .info-row strong { color: #1e3a8a; }
    .signature-section { display: flex; justify-content: space-around; margin-top: 70px; padding-top: 30px; text-align: center; }
    .signature-block { flex: 1; }
    .signature-line { border-top: 2px solid #2d3748; width: 160px; margin: 0 auto 8px; }
    .signature-title { font-size: 12px; font-weight: 600; color: #2d3748; text-transform: capitalize; }
    .footer-info { display: flex; justify-content: space-between; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #64748b; }
    .bottom-bar { height: 12px; background: linear-gradient(90deg, #1e3a8a 0%, #2563eb 50%, #1e3a8a 100%); }
    .highlight { font-weight: 700; color: #1e3a8a; }
  </style>
</head>
<body>
  <div class="cert-container">
    <div class="top-bar"></div>
    <div class="cert-body">
      <div class="header-section">
        <div class="school-header">
          <div class="school-logo">🏫</div>
          <div class="school-info">
            <h2>{{school_name}}</h2>
            <p>123 Education Lane, City District</p>
            <p>Ph: +91 XXXXX XXXXX | Email: info@school.edu.in</p>
          </div>
        </div>
        <div class="cert-ref">
          <div><span class="cert-ref-label">Ref:</span> TC/2025/XXX</div>
          <div><span class="cert-ref-label">Date:</span> {{issue_date}}</div>
        </div>
      </div>
      <div class="cert-title"><h1>Transfer Certificate</h1></div>
      <div class="cert-content">
        <p>This is to certify that <span class="highlight">{{student_name}}</span>, son/daughter of <span class="highlight">{{father_name}}</span> and <span class="highlight">{{mother_name}}</span>, bearing Admission No. <span class="highlight">{{admission_number}}</span>, has studied in this school from the academic year <span class="highlight">{{academic_year}}</span>.</p>
      </div>
      <div class="info-box">
        <div class="info-row"><strong>Date of Birth:</strong> {{dob}}</div>
        <div class="info-row"><strong>Class:</strong> {{class_name}}</div>
        <div class="info-row"><strong>Conduct:</strong> Good</div>
      </div>
      <div class="cert-content" style="margin-top: 30px;">
        <p>{{gender_he_she}} is hereby transferred from this school and {{gender_he_she}} may be admitted to any school as a regular student. This transfer certificate is issued on {{gender_his_her}} request for admission to another school.</p>
      </div>
      <div class="signature-section">
        <div class="signature-block">
          <div class="signature-line"></div>
          <div class="signature-title">Class Teacher</div>
        </div>
        <div class="signature-block">
          <div class="signature-line"></div>
          <div class="signature-title">Principal</div>
        </div>
      </div>
      <div class="footer-info">
        <div>Place: City</div>
        <div>Date: {{issue_date}}</div>
      </div>
    </div>
    <div class="bottom-bar"></div>
  </div>
</body>
</html>'''

CONDUCT_HTML = '''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: "Segoe UI", Arial, sans-serif; background: #f5f5f5; padding: 30px 15px; }
    .cert-container { background: white; max-width: 900px; width: 100%; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12); position: relative; overflow: hidden; }
    .top-bar { height: 12px; background: linear-gradient(90deg, #991b1b 0%, #dc2626 50%, #991b1b 100%); }
    .cert-body { padding: 45px 50px; position: relative; z-index: 1; }
    .header-section { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
    .school-header { display: flex; gap: 15px; flex: 1; }
    .school-logo { font-size: 45px; line-height: 1; flex-shrink: 0; }
    .school-info h2 { font-size: 22px; font-weight: 700; color: #991b1b; margin-bottom: 3px; }
    .school-info p { font-size: 11px; color: #64748b; line-height: 1.5; margin: 2px 0; }
    .cert-ref { text-align: right; font-size: 12px; color: #64748b; }
    .cert-ref-label { font-weight: 600; color: #991b1b; }
    .cert-title { text-align: center; margin: 30px 0 25px 0; }
    .cert-title h1 { font-size: 32px; font-weight: 700; letter-spacing: 3px; color: #991b1b; text-transform: uppercase; text-decoration: underline; text-decoration-color: #dc2626; text-underline-offset: 8px; text-decoration-thickness: 3px; }
    .cert-content { margin: 30px 0; font-size: 14px; line-height: 1.8; color: #2d3748; text-align: justify; }
    .achievements { margin: 30px 0; display: grid; gap: 12px; }
    .achievement-item { background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px 15px; border-radius: 4px; font-size: 14px; color: #2d3748; }
    .conclusion { margin: 30px 0; font-size: 14px; line-height: 1.8; color: #2d3748; text-align: justify; }
    .signature-section { display: flex; justify-content: space-around; margin-top: 70px; padding-top: 30px; text-align: center; }
    .signature-block { flex: 1; }
    .signature-line { border-top: 2px solid #2d3748; width: 160px; margin: 0 auto 8px; }
    .signature-title { font-size: 12px; font-weight: 600; color: #2d3748; text-transform: capitalize; }
    .footer-info { display: flex; justify-content: space-between; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #64748b; }
    .bottom-bar { height: 12px; background: linear-gradient(90deg, #991b1b 0%, #dc2626 50%, #991b1b 100%); }
    .highlight { font-weight: 700; color: #991b1b; }
  </style>
</head>
<body>
  <div class="cert-container">
    <div class="top-bar"></div>
    <div class="cert-body">
      <div class="header-section">
        <div class="school-header">
          <div class="school-logo">🏫</div>
          <div class="school-info">
            <h2>{{school_name}}</h2>
            <p>123 Education Lane, City District</p>
            <p>Ph: +91 XXXXX XXXXX | Email: info@school.edu.in</p>
          </div>
        </div>
        <div class="cert-ref">
          <div><span class="cert-ref-label">Ref:</span> CC/2025/XXX</div>
          <div><span class="cert-ref-label">Date:</span> {{issue_date}}</div>
        </div>
      </div>
      <div class="cert-title"><h1>Conduct Certificate</h1></div>
      <div class="cert-content">
        <p>This is to certify that <span class="highlight">{{student_name}}</span>, Admission No. <span class="highlight">{{admission_number}}</span>, student of Class <span class="highlight">{{class_name}}</span>, has exemplified outstanding conduct and character throughout his/her tenure at {{school_name}} during the academic year <span class="highlight">{{academic_year}}</span>.</p>
      </div>
      <div class="achievements">
        <div class="achievement-item">Respectful and obedient to teachers and authorities</div>
        <div class="achievement-item">Cooperative and helpful towards fellow students</div>
        <div class="achievement-item">Regular attendance and consistent punctuality</div>
        <div class="achievement-item">Active participation in school activities</div>
        <div class="achievement-item">Demonstrates integrity and honesty</div>
        <div class="achievement-item">Shows responsibility and leadership qualities</div>
      </div>
      <div class="conclusion">
        {{gender_he_she}} has maintained exemplary discipline throughout the academic year. We are confident that {{student_name}} will continue to uphold these values in {{gender_his_her}} future endeavors.
      </div>
      <div class="signature-section">
        <div class="signature-block">
          <div class="signature-line"></div>
          <div class="signature-title">Class Teacher</div>
        </div>
        <div class="signature-block">
          <div class="signature-line"></div>
          <div class="signature-title">Principal</div>
        </div>
      </div>
      <div class="footer-info">
        <div>Place: City</div>
        <div>Date: {{issue_date}}</div>
      </div>
    </div>
    <div class="bottom-bar"></div>
  </div>
</body>
</html>'''

TEMPLATES = [
    {
        "id": uuid.UUID("00000000-0000-0000-0000-000000000001"),
        "name": "Bonafide Certificate",
        "html_template": BONAFIDE_HTML,
        "color_theme": "green",
        "variables_used": "student_name,father_name,admission_number,class_name,section,dob,academic_year,issue_date,school_name,gender_he_she,gender_his_her",
    },
    {
        "id": uuid.UUID("00000000-0000-0000-0000-000000000002"),
        "name": "Transfer Certificate",
        "html_template": TRANSFER_HTML,
        "color_theme": "blue",
        "variables_used": "student_name,father_name,mother_name,admission_number,dob,class_name,academic_year,issue_date,school_name,gender_he_she",
    },
    {
        "id": uuid.UUID("00000000-0000-0000-0000-000000000003"),
        "name": "Conduct Certificate",
        "html_template": CONDUCT_HTML,
        "color_theme": "red",
        "variables_used": "student_name,father_name,admission_number,class_name,academic_year,issue_date,school_name,gender_he_she,gender_his_her",
    },
]


# ============================================================================
# FUNCTIONS
# ============================================================================

async def get_active_tenants(db: AsyncSession) -> list[dict]:
    """Fetch all active tenants from public schema"""
    try:
        await db.execute(text("SET search_path TO public"))
        result = await db.execute(
            text("""
                SELECT schema_name, client_name
                FROM tenants
                WHERE is_active = true
                ORDER BY schema_name
            """)
        )
        return [{"schema_name": row[0], "client_name": row[1]} for row in result.fetchall()]
    except Exception as e:
        print(f"❌ Error fetching tenants: {e}")
        return []


async def create_tables_in_tenant(
    db: AsyncSession,
    schema_name: str,
    client_name: str
) -> bool:
    """Create issuable certificate tables in a tenant schema"""
    try:
        # Set search path to tenant schema
        await db.execute(text(f"SET search_path TO {schema_name}"))

        # Create tables using BaseOrg metadata
        await db.run_sync(
            lambda conn: BaseOrg.metadata.create_all(conn)
        )

        print(f"  ✓ Tables created in {schema_name} ({client_name})")
        return True

    except Exception as e:
        print(f"  ❌ Error creating tables in {schema_name}: {e}")
        return False


async def seed_templates_in_tenant(
    db: AsyncSession,
    schema_name: str,
    client_name: str
) -> bool:
    """Seed certificate templates in tenant schema"""
    try:
        await db.execute(text(f"SET search_path TO {schema_name}"))

        seeded_count = 0
        for template_data in TEMPLATES:
            # Check if template already exists
            query = select(IssuableCertificateTemplate).where(
                IssuableCertificateTemplate.id == template_data["id"]
            )
            result = await db.execute(query)
            existing = result.scalar_one_or_none()

            if existing:
                print(f"    → '{template_data['name']}' already exists")
                continue

            # Create new template
            template = IssuableCertificateTemplate(
                id=template_data["id"],
                name=template_data["name"],
                html_template=template_data["html_template"],
                color_theme=template_data["color_theme"],
                variables_used=template_data["variables_used"],
                is_active=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )

            db.add(template)
            seeded_count += 1
            print(f"    ✓ Created '{template_data['name']}'")

        await db.commit()

        if seeded_count > 0:
            print(f"  ✓ Seeded {seeded_count} templates in {client_name}")
        else:
            print(f"  ✓ All templates already exist in {client_name}")

        return True

    except Exception as e:
        await db.rollback()
        print(f"  ❌ Error seeding templates in {schema_name}: {e}")
        return False


async def main():
    """Main entry point"""
    database_url = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://user:password@localhost/cos360"
    )

    specific_tenant = sys.argv[1] if len(sys.argv) > 1 else None

    print("=" * 70)
    print("ISSUABLE CERTIFICATES SETUP")
    print("=" * 70)
    print(f"Database: {database_url}")
    print()

    engine = create_async_engine(database_url, echo=False)
    AsyncSessionLocal = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    try:
        async with AsyncSessionLocal() as db:
            # Get tenants
            tenants = await get_active_tenants(db)

            if not tenants:
                print("⚠️  No active tenants found")
                return

            if specific_tenant:
                tenants = [t for t in tenants if t['client_name'] == specific_tenant]
                if not tenants:
                    print(f"⚠️  Tenant '{specific_tenant}' not found or inactive")
                    return

            print(f"Found {len(tenants)} tenant(s)\n")

            # Setup each tenant
            success_count = 0
            for tenant in tenants:
                schema = tenant['schema_name']
                client = tenant['client_name']

                print(f"Setting up '{client}'...")

                # Create new session for each tenant
                async with AsyncSessionLocal() as tenant_db:
                    # Create tables
                    if not await create_tables_in_tenant(tenant_db, schema, client):
                        continue

                # Seed templates (separate session)
                async with AsyncSessionLocal() as tenant_db:
                    if await seed_templates_in_tenant(tenant_db, schema, client):
                        success_count += 1

            print()
            print("=" * 70)
            print(f"✅ Successfully set up {success_count}/{len(tenants)} tenant(s)")
            print("=" * 70)

    except Exception as e:
        print(f"❌ Fatal error: {e}")
        raise
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())

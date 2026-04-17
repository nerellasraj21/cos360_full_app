"""
Seed Script — Initialize default issuable certificate templates

Run this script to populate the database with three professional certificate templates:
- Bonafide Certificate (green)
- Transfer Certificate (blue)
- Conduct Certificate (red)

Usage:
    python scripts/seed_issuable_certificate_templates.py
"""

import asyncio
import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.models.student.issuable_certificate_model import IssuableCertificateTemplate

# ============================================================================
# TEMPLATE DEFINITIONS
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
    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px 40px; margin: 30px 0; padding: 0; }
    .detail-row { display: flex; justify-content: space-between; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; align-items: center; }
    .detail-label { font-weight: 600; color: #1e3a8a; font-size: 13px; min-width: 140px; }
    .detail-value { color: #2d3748; font-size: 13px; font-weight: 500; }
    .cert-statement { background: #f0f7ff; border-left: 4px solid #2563eb; padding: 20px; margin: 25px 0; border-radius: 4px; font-size: 14px; line-height: 1.7; color: #2d3748; text-align: justify; }
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
          <div><span class="cert-ref-label">TC No:</span> TC/2025/XXX</div>
          <div><span class="cert-ref-label">Date:</span> {{issue_date}}</div>
        </div>
      </div>
      <div class="cert-title"><h1>Transfer Certificate</h1></div>
      <div class="details-grid">
        <div class="detail-row"><span class="detail-label">Student Name</span><span class="detail-value">: {{student_name}}</span></div>
        <div class="detail-row"><span class="detail-label">Admission No.</span><span class="detail-value">: {{admission_number}}</span></div>
        <div class="detail-row"><span class="detail-label">Father's Name</span><span class="detail-value">: {{father_name}}</span></div>
        <div class="detail-row"><span class="detail-label">Mother's Name</span><span class="detail-value">: {{mother_name}}</span></div>
        <div class="detail-row"><span class="detail-label">Date of Birth</span><span class="detail-value">: {{dob}}</span></div>
        <div class="detail-row"><span class="detail-label">Gender</span><span class="detail-value">: M/F</span></div>
        <div class="detail-row"><span class="detail-label">Class Studying</span><span class="detail-value">: {{class_name}}</span></div>
        <div class="detail-row"><span class="detail-label">Academic Year</span><span class="detail-value">: {{academic_year}}</span></div>
      </div>
      <div class="cert-statement">
        This is to certify that <span class="highlight">{{student_name}}</span> studied in <span class="highlight">{{school_name}}</span> in Class <span class="highlight">{{class_name}}</span> during the academic year <span class="highlight">{{academic_year}}</span>. {{gender_he_she}} has completed all academic requirements and is eligible for transfer. Conduct and character have been satisfactory.
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
    .cert-body { padding: 45px 50px; position: relative; z-index: 1; text-align: center; }
    .header-section { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
    .school-header { display: flex; gap: 15px; flex: 1; }
    .school-logo { font-size: 45px; line-height: 1; flex-shrink: 0; }
    .school-info h2 { font-size: 22px; font-weight: 700; color: #991b1b; margin-bottom: 3px; }
    .school-info p { font-size: 11px; color: #64748b; line-height: 1.5; margin: 2px 0; }
    .cert-ref { text-align: right; font-size: 12px; color: #64748b; }
    .cert-ref-label { font-weight: 600; color: #991b1b; }
    .cert-title { text-align: center; margin: 30px 0 25px 0; }
    .cert-title h1 { font-size: 32px; font-weight: 700; letter-spacing: 3px; color: #991b1b; text-transform: uppercase; text-decoration: underline; text-decoration-color: #dc2626; text-underline-offset: 8px; text-decoration-thickness: 3px; }
    .cert-content { margin: 30px 0; font-size: 15px; line-height: 1.8; color: #2d3748; text-align: justify; }
    .achievements { background: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin: 25px 0; border-radius: 4px; }
    .achievement-item { font-size: 14px; line-height: 1.6; color: #2d3748; margin: 10px 0; padding-left: 25px; position: relative; }
    .achievement-item::before { content: "✓"; position: absolute; left: 0; font-weight: 700; color: #dc2626; font-size: 16px; }
    .conclusion { font-size: 14px; line-height: 1.8; color: #2d3748; text-align: justify; margin: 25px 0; font-style: italic; }
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
          <div><span class="cert-ref-label">Ref:</span> CON/2025/XXX</div>
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


async def seed_templates(db: AsyncSession) -> None:
    """Seed the database with default certificate templates"""

    for template_data in TEMPLATES:
        # Check if template already exists
        query = select(IssuableCertificateTemplate).where(
            IssuableCertificateTemplate.id == template_data["id"]
        )
        result = await db.execute(query)
        existing = result.scalar_one_or_none()

        if existing:
            print(f"✓ Template '{template_data['name']}' already exists")
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
        print(f"✓ Created template: '{template_data['name']}'")

    await db.commit()
    print("\n✅ All certificate templates seeded successfully!")


async def main():
    """Main entry point - connect to database and seed templates"""
    # Get database URL from environment or use default
    import os
    database_url = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://user:password@localhost/cos360"
    )

    print(f"Connecting to database: {database_url}...")

    # Create engine
    engine = create_async_engine(database_url, echo=False)

    # Create session
    AsyncSessionLocal = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    try:
        async with AsyncSessionLocal() as db:
            await seed_templates(db)
    except Exception as e:
        print(f"❌ Error: {e}")
        raise
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())

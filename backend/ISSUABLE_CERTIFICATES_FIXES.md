# Issuable Certificates — Quick Fix Guide

## Critical Fixes Required (Blocking)

### 1. Fix Model Type (issuable_certificate_model.py:28)

**Current:**
```python
is_active = Column(String, default=True, nullable=False)
```

**Fixed:**
```python
is_active = Column(Boolean, default=True, nullable=False)
```

---

### 2. Fix Boolean Comparison — Templates (issuable_certificate_service.py:33)

**Current:**
```python
query = select(IssuableCertificateTemplate).where(IssuableCertificateTemplate.is_active == True)
```

**Fixed:** (After fixing model to Boolean, this will work. Until then:)
```python
query = select(IssuableCertificateTemplate).where(IssuableCertificateTemplate.is_active != "False")
```

---

### 3. Fix Boolean Comparison — Generated Certs (issuable_certificate_service.py:187)

**Current:**
```python
GeneratedCertificate.is_active == True,
```

**Fixed:** (After model fix, remove. Until then:)
```python
GeneratedCertificate.is_active != "False",
```

---

### 4. Add UUID Validation (issuable_certificate_endpoints.py:189)

**Current:**
```python
user_id = UUID(current_user.get("sub"))
```

**Fixed:**
```python
sub = current_user.get("sub")
if not sub:
    raise HTTPException(status_code=401, detail="Invalid token: missing user ID")
try:
    user_id = UUID(sub)
except ValueError:
    raise HTTPException(status_code=401, detail="Invalid token: malformed user ID")
```

---

### 5. Replace f-String SQL (create_issuable_certificate_tables.py:49)

**Current:**
```python
await db.execute(text(f"SET search_path TO {schema_name}"))
```

**Fixed:**
```python
await db.execute(text("SET search_path TO :schema").bindparams(schema=schema_name))
```

**Also fix:** `setup_issuable_certificates.py:342` and `setup_issuable_certificates.py:364` (same pattern)

---

### 6. Fix TOCTOU Race in Seed (seed_issuable_certificate_templates.py:312-339)

**Current:**
```python
for template_data in TEMPLATES:
    query = select(IssuableCertificateTemplate).where(...)
    result = await db.execute(query)
    existing = result.scalar_one_or_none()

    if existing:
        print(f"✓ Template '{template_data['name']}' already exists")
        continue

    template = IssuableCertificateTemplate(...)
    db.add(template)
```

**Fixed:**
```python
for template_data in TEMPLATES:
    template = IssuableCertificateTemplate(...)
    db.add(template)
    try:
        await db.commit()
        print(f"✓ Created template: '{template_data['name']}'")
    except IntegrityError:
        await db.rollback()
        print(f"✓ Template '{template_data['name']}' already exists")
```

Add at top of file:
```python
from sqlalchemy.exc import IntegrityError
```

---

### 7. Fix DDL Timing Race (setup_issuable_certificates.py:456-464)

**Current:**
```python
# Create tables (Session A)
async with AsyncSessionLocal() as tenant_db:
    if not await create_tables_in_tenant(tenant_db, schema, client):
        continue

# Seed templates (Session B)
async with AsyncSessionLocal() as tenant_db:
    if await seed_templates_in_tenant(tenant_db, schema, client):
        success_count += 1
```

**Fixed:**
```python
# Create tables and seed in same session
async with AsyncSessionLocal() as tenant_db:
    if not await create_tables_in_tenant(tenant_db, schema, client):
        continue
    
    await tenant_db.commit()  # Ensure DDL is committed
    
    if await seed_templates_in_tenant(tenant_db, schema, client):
        success_count += 1
```

---

## Medium Priority Fixes

### M1. Add Role Null Check (issuable_certificate_endpoints.py — ALL endpoints)

**Current (Line 62, 84, 106, 131, 155, 212, 234, 256):**
```python
current_user = await get_current_user_token(request)
role = current_user.get("role")
```

**Fixed (add after get):**
```python
role = current_user.get("role")
if not role:
    raise HTTPException(status_code=401, detail="User role not found in token")
```

---

### M2. Remove Hardcoded Credentials (create_issuable_certificate_tables.py:81-84)

**Current:**
```python
database_url = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://user:password@localhost/cos360"
)
```

**Fixed:**
```python
database_url = os.getenv("DATABASE_URL")
if not database_url:
    print("ERROR: DATABASE_URL environment variable not set")
    sys.exit(1)
```

**Also fix:** `seed_issuable_certificate_templates.py:347-350` and `setup_issuable_certificates.py:412-414` (same pattern)

---

### M3. Add Pagination (issuable_certificate_service.py:180-192)

**Current:**
```python
async def get_issued_certificates_by_student(
    db: AsyncSession,
    student_id: UUID,
) -> list[GeneratedCertificateRead]:
    query = select(GeneratedCertificate).where(
        GeneratedCertificate.student_id == student_id,
        GeneratedCertificate.is_active == True,
    )
    result = await db.execute(query)
    certificates = result.scalars().all()
    return [GeneratedCertificateRead.from_orm(c) for c in certificates]
```

**Fixed:**
```python
async def get_issued_certificates_by_student(
    db: AsyncSession,
    student_id: UUID,
    limit: int = 100,
    offset: int = 0,
) -> list[GeneratedCertificateRead]:
    query = (
        select(GeneratedCertificate)
        .where(
            GeneratedCertificate.student_id == student_id,
            GeneratedCertificate.is_active != "False",
        )
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(query)
    certificates = result.scalars().all()
    return [GeneratedCertificateRead.from_orm(c) for c in certificates]
```

Also update endpoint to accept pagination params:
```python
@router.get("/issued/", response_model=list[GeneratedCertificateRead])
async def list_issued_certificates(
    student_id: UUID,
    limit: int = 100,
    offset: int = 0,
    request: Request = ...,
    db: AsyncSession = ...,
):
```

---

### M4. Use Safe Row Unpacking (setup_issuable_certificates.py:328)

**Current:**
```python
return [{"schema_name": row[0], "client_name": row[1]} for row in result.fetchall()]
```

**Fixed:**
```python
rows = await db.execute(
    text("""
        SELECT schema_name, client_name
        FROM tenants
        WHERE is_active = true
        ORDER BY schema_name
    """)
)
return [
    {"schema_name": r.schema_name, "client_name": r.client_name}
    for r in rows.mappings()
]
```

---

## Low Priority Fixes

### L1. Compile Regex Once (issuable_certificate_service.py)

**Add at module top:**
```python
_VAR_PATTERN = re.compile(r'\{\{(\w+)\}\}')
```

**Change function:**
```python
def extract_variables(html_template: str) -> list[str]:
    """Extract variable names from HTML template ({{variable_name}})"""
    matches = _VAR_PATTERN.findall(html_template)
    return list(set(matches))
```

---

### L2. Sanitize URLs in Logs (all scripts)

**Add helper function:**
```python
def sanitize_db_url(url: str) -> str:
    """Remove credentials from database URL for logging"""
    if "@" in url:
        scheme, rest = url.split("://", 1)
        return f"{scheme}://***@{rest.split('@')[1]}"
    return url
```

**Use in prints:**
```python
print(f"Database: {sanitize_db_url(database_url)}")
```

---

### L3. Add FK Constraints (issuable_certificate_model.py)

**Change column definitions:**
```python
from sqlalchemy import ForeignKey

class GeneratedCertificate(BaseOrg):
    student_id = Column(
        UUID(as_uuid=True),
        ForeignKey("admissions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    issued_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )
```

---

## Testing Checklist

- [ ] Import app with `python -c "from app.api.v1.main_router import router"` — should succeed
- [ ] Test template creation with admin user — should store correctly
- [ ] Test listing inactive templates — should not appear (after model fix)
- [ ] Test certificate generation with invalid token — should return 401 with detail
- [ ] Run seeding script twice — should handle duplicates gracefully
- [ ] Run setup script on all tenants — should not fail with DDL visibility issues
- [ ] Test pagination on `/issued/` endpoint with many certificates
- [ ] Verify no hardcoded credentials in logs

---

## Estimated Effort

- **Critical fixes:** 30-45 minutes
- **Medium fixes:** 30-45 minutes
- **Low fixes:** 15-20 minutes
- **Testing:** 30-60 minutes

**Total: ~2-3 hours for thorough testing and validation.**

---

**Last Updated:** April 7, 2026

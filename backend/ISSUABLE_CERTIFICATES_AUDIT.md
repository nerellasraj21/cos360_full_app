# Issuable Certificates Feature — PR Audit Report

**Date:** April 7, 2026  
**Branch:** dev  
**Status:** ⚠️ REQUIRES FIXES BEFORE MERGE

---

## Executive Summary

The issuable certificates feature adds 8 endpoints for template management and certificate generation. Code review identified **3 critical issues**, **6 medium-severity issues**, and **3 low-severity issues**. One blocker (typo) has been fixed. Remaining critical issues must be resolved before PR merge.

---

## I. CRITICAL ISSUES (BLOCKING)

### 1. [issuable_certificate_model.py:28] — Type Mismatch: String Column with Boolean Default

**Issue:**  
```python
is_active = Column(String, default=True, nullable=False)
```
Defines `is_active` as String type but defaults to boolean `True`. SQLAlchemy will store string `"True"` or `"False"`, causing comparison bugs downstream.

**Impact:** Soft-delete logic fails; inactive templates/certificates incorrectly returned as active.

**Fix:**
```python
is_active = Column(Boolean, default=True, nullable=False)
```

---

### 2. [issuable_certificate_service.py:33] — String-to-Boolean Comparison Logic Error

**Issue:**
```python
query = select(IssuableCertificateTemplate).where(IssuableCertificateTemplate.is_active == True)
```
Compares String column to boolean `True`. String value `"False"` is truthy in Python, so inactive templates are returned.

**Impact:** Cannot deactivate certificate templates; all "deleted" templates still visible to users.

**Fix:**
```python
query = select(IssuableCertificateTemplate).where(IssuableCertificateTemplate.is_active != "False")
```
Or (preferred after fixing model to Boolean):
```python
query = select(IssuableCertificateTemplate).where(IssuableCertificateTemplate.is_active == True)
```

---

### 3. [issuable_certificate_service.py:187] — Same Boolean Comparison Bug (Generated Certificates)

**Issue:**
```python
GeneratedCertificate.is_active == True
```
Same problem as #2 but for generated certificates.

**Impact:** Cannot soft-delete issued certificates; all "deleted" certificates still visible.

**Fix:** See #2 above.

---

### 4. [issuable_certificate_endpoints.py:189] — Unhandled UUID Parse Failure

**Issue:**
```python
user_id = UUID(current_user.get("sub"))
```
If `sub` is None or invalid UUID format, crashes with unhelpful error.

**Impact:** Token parsing errors return 500 instead of 401; poor user experience and security leak (error details exposed).

**Fix:**
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

### 5. [create_issuable_certificate_tables.py:49, setup_issuable_certificates.py:342, 364] — SQL Injection via f-String Schema Names

**Issue:**
```python
await db.execute(text(f"SET search_path TO {schema_name}"))
```
While `schema_name` comes from DB query (safer than user input), using f-strings is a dangerous pattern and violates secure coding practices.

**Impact:** Potential SQL injection if schema selection logic changes; code maintenance risk.

**Fix:**
```python
await db.execute(text("SET search_path TO :schema").bindparams(schema=schema_name))
```
Or use SQLAlchemy identifier escaping (preferred for schema names).

---

### 6. [seed_issuable_certificate_templates.py:312-322] — TOCTOU Race Condition on Template Creation

**Issue:**
```python
# Check if exists
query = select(IssuableCertificateTemplate).where(...)
result = await db.execute(query)
existing = result.scalar_one_or_none()

if existing:
    print(f"✓ Template '{template_data['name']}' already exists")
    continue

# Create (RACE WINDOW: Another process can insert here)
template = IssuableCertificateTemplate(...)
db.add(template)
```

Between the existence check and insert, another process can create the same template with same ID, causing `IntegrityError`.

**Impact:** Seeding script fails if run concurrently; manual recovery needed.

**Fix:** Use database UNIQUE constraint + handle IntegrityError:
```python
try:
    db.add(template)
    await db.commit()
except IntegrityError:
    await db.rollback()
    print(f"✓ Template '{template_data['name']}' already exists")
```

---

### 7. [setup_issuable_certificates.py:456-463] — Race Condition Between Table Creation and Seeding

**Issue:**
```python
# Create tables (Session A)
async with AsyncSessionLocal() as tenant_db:
    if not await create_tables_in_tenant(tenant_db, schema, client):
        continue

# Seed templates (Session B - NEW SESSION)
async with AsyncSessionLocal() as tenant_db:
    if await seed_templates_in_tenant(tenant_db, schema, client):
        success_count += 1
```

Tables are created in one session and closed before seeding begins in a new session. DDL changes may not be visible immediately; seeding could fail with "table not found" error.

**Impact:** Seeding fails intermittently if tables not fully committed when seeding starts.

**Fix:** Commit explicitly in same session or reuse session:
```python
async with AsyncSessionLocal() as tenant_db:
    if not await create_tables_in_tenant(tenant_db, schema, client):
        continue
    # Tables now visible in this session
    if not await seed_templates_in_tenant(tenant_db, schema, client):
        continue
    await tenant_db.commit()  # Ensure DDL is flushed
```

---

## II. MEDIUM SEVERITY ISSUES

### M1. [issuable_certificate_endpoints.py:62, 84, 106, 131, 155, 212, 234, 256] — Unhandled Null Role in Token

**Issue:**
```python
current_user = await get_current_user_token(request)
role = current_user.get("role")  # Can return None

# Permission check uses role directly
await check_role_plan_permission_with_error(db, request, role, ...)
```

If JWT doesn't include `role`, endpoint crashes with TypeError instead of 401.

**Fix:**
```python
role = current_user.get("role")
if not role:
    raise HTTPException(status_code=401, detail="User role not found in token")
```

---

### M2. [issuable_certificate_endpoints.py:61, 65-66] — Missing Error Handling on Async Auth Calls

**Issue:**
```python
current_user = await get_current_user_token(request)  # Can throw
role = current_user.get("role")

await check_role_plan_permission_with_error(db, request, role, ...)  # Can throw
```

If `get_current_user_token` or `check_role_plan_permission_with_error` throw, unhandled exception propagates.

**Fix:** Wrap in try/except (or rely on FastAPI global handler, but explicit is safer):
```python
try:
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    if not role:
        raise HTTPException(401, "Role missing from token")
    await check_role_plan_permission_with_error(db, request, role, "issuable_certificates", "read")
except HTTPException:
    raise
except Exception as e:
    raise HTTPException(500, "Internal error during auth")
```

---

### M3. [create_issuable_certificate_tables.py:81-84, seed_issuable_certificate_templates.py:347-350, setup_issuable_certificates.py:412-414] — Hardcoded Database Credentials in Default

**Issue:**
```python
database_url = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://user:password@localhost/cos360"  # ❌ Credentials in code!
)
```

Default DATABASE_URL includes placeholder credentials; if env var is missing, falls back to insecure default (and leaks pattern in source code).

**Impact:** Security risk; accidental commits could expose credentials.

**Fix:**
```python
database_url = os.getenv("DATABASE_URL")
if not database_url:
    print("ERROR: DATABASE_URL environment variable not set")
    sys.exit(1)
```

---

### M4. [issuable_certificate_service.py:180-192] — Unhandled Unbounded Query Result

**Issue:**
```python
async def get_issued_certificates_by_student(
    db: AsyncSession,
    student_id: UUID,
) -> list[GeneratedCertificateRead]:
    query = select(GeneratedCertificate).where(...)
    result = await db.execute(query)
    certificates = result.scalars().all()  # Fetches ALL certificates for student
```

No pagination or limit. If a student has 100k+ certificates, query consumes all memory and crashes.

**Impact:** DoS vulnerability; endpoint unavailable if student has many certificates.

**Fix:** Add pagination:
```python
async def get_issued_certificates_by_student(
    db: AsyncSession,
    student_id: UUID,
    limit: int = 100,
    offset: int = 0,
) -> list[GeneratedCertificateRead]:
    query = (
        select(GeneratedCertificate)
        .where(GeneratedCertificate.student_id == student_id)
        .limit(limit)
        .offset(offset)
    )
```

---

### M5. [setup_issuable_certificates.py:328] — Unsafe Tuple Unpacking (Assumes Column Order)

**Issue:**
```python
result = await db.execute(
    text("""
        SELECT schema_name, client_name
        FROM tenants
        WHERE is_active = true
        ORDER BY schema_name
    """)
)
return [{"schema_name": row[0], "client_name": row[1]} for row in result.fetchall()]
```

Assumes column order is stable. If SQL query changes order, code breaks silently.

**Impact:** Maintenance risk; future refactors could introduce bugs.

**Fix:** Use named tuples or ORM:
```python
result = await db.execute(text("""
    SELECT schema_name, client_name FROM tenants WHERE is_active = true
"""))
return [{"schema_name": row.schema_name, "client_name": row.client_name} 
        for row in result.mappings()]
```

---

### M6. [issuable_certificate_schema.py:41] — Type Mismatch in Schema

**Issue:**
```python
# Schema
class IssuableCertificateTemplateRead(BaseModel):
    ...
    is_active: bool  # ❌ Schema expects bool
    
# Model
class IssuableCertificateTemplate(BaseOrg):
    ...
    is_active = Column(String, ...)  # Stores string!
```

Schema declares `bool` but model stores String. Pydantic's `from_orm()` may coerce it, but it's unsafe and fragile.

**Fix:** After fixing model to use `Boolean` column, schema will work correctly.

---

## III. LOW SEVERITY ISSUES

### L1. [issuable_certificate_service.py:239-243] — Regex Compiled on Every Function Call

**Issue:**
```python
def extract_variables(html_template: str) -> list[str]:
    """Extract variable names from HTML template ({{variable_name}})"""
    pattern = r'\{\{(\w+)\}\}'  # Compiled every call
    matches = re.findall(pattern, html_template)
    return list(set(matches))
```

Regex pattern recompiled for each template created/updated. Minor performance waste.

**Fix:** Compile once at module level:
```python
_VAR_PATTERN = re.compile(r'\{\{(\w+)\}\}')

def extract_variables(html_template: str) -> list[str]:
    """Extract variable names from HTML template ({{variable_name}})"""
    matches = _VAR_PATTERN.findall(html_template)
    return list(set(matches))
```

---

### L2. [create_issuable_certificate_tables.py:89, seed_issuable_certificate_templates.py:352, setup_issuable_certificates.py:422] — Exposed Database URL in Print Statements

**Issue:**
```python
print(f"Database: {database_url}")  # Prints full URL to logs
print(f"Connecting to database: {database_url}...")
```

Database URL printed to stdout; if credentials are in URL, they leak to logs.

**Impact:** Log data exposure; risky in CI/CD pipelines.

**Fix:** Sanitize URL before printing:
```python
def sanitize_db_url(url: str) -> str:
    """Remove credentials from database URL for logging"""
    if "@" in url:
        scheme, rest = url.split("://", 1)
        return f"{scheme}://***@{rest.split('@')[1]}"
    return url

print(f"Database: {sanitize_db_url(database_url)}")
```

---

### L3. [issuable_certificate_model.py:42, 46] — Missing Foreign Key Constraints

**Issue:**
```python
class GeneratedCertificate(BaseOrg):
    student_id = Column(UUID(as_uuid=True), nullable=False, index=True)  # No FK!
    issued_by = Column(UUID(as_uuid=True), nullable=False, index=True)   # No FK!
```

No foreign key constraints to `students` or `users` tables. Orphan records possible; data integrity not enforced.

**Impact:** Referential integrity violations; cleanup difficult.

**Fix:** Add FK constraints (requires migration):
```python
student_id = Column(
    UUID(as_uuid=True), 
    ForeignKey("admissions.id", ondelete="CASCADE"),  # or CASCADE/RESTRICT per policy
    nullable=False, 
    index=True
)
issued_by = Column(
    UUID(as_uuid=True),
    ForeignKey("users.id", ondelete="RESTRICT"),  # Prevent orphaning
    nullable=False,
    index=True
)
```

---

## IV. DESIGN ISSUES (RECOMMENDATIONS)

### D1. Hardcoded Role Checks Should Use Permission Layer

**Current:** Endpoints check `if role != "Admin"` and hardcode 403 response.

**Better:** Use consistent permission layer like other modules:
```python
# Instead of:
if role != "Admin":
    raise HTTPException(403, "Only Admin can...")

# Use:
await check_role_plan_permission_with_error(
    db, request, role, "issuable_certificates", "write"
)
```

This aligns with your two-layer permission system and makes permission management consistent.

---

### D2. Silent Exception Handling in Scripts

**Files:** `create_issuable_certificate_tables.py:36-38`, `setup_issuable_certificates.py:329-331`

**Current:**
```python
except Exception as e:
    print(f"❌ Error: {e}")
    return []
```

Hides stack trace; hard to debug production issues.

**Better:**
```python
import logging
logger = logging.getLogger(__name__)

except Exception as e:
    logger.exception("Error fetching tenants")  # Logs full traceback
    return []
```

---

## V. FIXES APPLIED

✅ **[issuable_certificate_service.py:147]** — Fixed typo: `GenerateCertificateRead` → `GeneratedCertificateRead`

This was the blocking issue preventing app import. Now resolved.

---

## VI. MERGE CHECKLIST

- [ ] Fix model `is_active` column type to Boolean (CRITICAL #1)
- [ ] Fix boolean comparison logic in service (CRITICAL #2, #3)
- [ ] Add UUID validation in endpoints (CRITICAL #4)
- [ ] Replace f-string SQL with parameterized queries (CRITICAL #5)
- [ ] Add UNIQUE constraint + IntegrityError handling for templates (CRITICAL #6)
- [ ] Ensure DDL commitment between table creation and seeding (CRITICAL #7)
- [ ] Add null checks for `role` in all endpoints (MEDIUM #1)
- [ ] Add try/except around async auth calls (MEDIUM #2)
- [ ] Remove hardcoded credentials from env defaults (MEDIUM #3)
- [ ] Add pagination to `get_issued_certificates_by_student` (MEDIUM #4)
- [ ] Use named tuples for SQL row unpacking (MEDIUM #5)
- [ ] Compile regex pattern at module level (LOW #1)
- [ ] Sanitize database URL in logs (LOW #2)
- [ ] Add FK constraints to student/user references (LOW #3)
- [ ] Use permission layer instead of hardcoded role checks (DESIGN #1)
- [ ] Add structured logging to scripts (DESIGN #2)

---

## VII. FILES AFFECTED

| File | Issues | Severity |
|------|--------|----------|
| `issuable_certificate_model.py` | #1, L3 | CRITICAL, LOW |
| `issuable_certificate_service.py` | #2, #3, M4, L1 | CRITICAL, MEDIUM, LOW |
| `issuable_certificate_endpoints.py` | #4, M1, M2 | CRITICAL, MEDIUM |
| `create_issuable_certificate_tables.py` | #5, M3, L2 | CRITICAL, MEDIUM, LOW |
| `seed_issuable_certificate_templates.py` | #6, M3, L2 | CRITICAL, MEDIUM, LOW |
| `setup_issuable_certificates.py` | #5, #7, M3, M5, L2 | CRITICAL, MEDIUM, LOW |
| `issuable_certificate_schema.py` | M6 | MEDIUM |

---

## VIII. RECOMMENDATION

**Do not merge until all CRITICAL issues are resolved.** The feature has good structure and clear intent, but the type mismatches and race conditions represent genuine production risks. Estimated fix time: 2–3 hours for thorough testing.

---

**Report Generated:** April 7, 2026  
**Reviewer:** Claude Code  
**Status:** Awaiting fixes

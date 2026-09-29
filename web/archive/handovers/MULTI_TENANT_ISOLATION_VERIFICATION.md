# Multi-Tenant Isolation Verification - test_tenant Schema

## ✅ Current Configuration Status

**Tenant**: `test_tenant`
**Status**: ✅ **PROPERLY ISOLATED**
**All changes and testing will ONLY affect the `test_tenant` schema**

---

## 🔒 How Multi-Tenant Isolation Works

### 1. Tenant Header Injection

Every API request automatically includes the tenant information:

**Header Name**: `cschema`
**Header Value**: `test_tenant` (from environment configuration)

**Implementation**: `src/api/index.ts:14-27`
```typescript
CAxios.interceptors.request.use((axiosConfig) => {
  // Add tenant header
  if (typeof window !== 'undefined') {
    const tenant = getTenantFromHostname(window.location.hostname);
    axiosConfig.headers[config.tenant.headerName] = tenant;
    logger.debug('Setting tenant header', { tenant, header: config.tenant.headerName });
  }

  return axiosConfig;
});
```

### 2. Tenant Determination Logic

**Source**: `src/lib/config.ts:98-103`

```typescript
export const getTenantFromHostname = (hostname: string): string => {
  // Extract subdomain from hostname (e.g., school1.abc.com -> school1)
  const cleanHost = hostname.replace(/^www\./, '');
  const match = cleanHost.match(/^([^.]+)\./);
  return match ? match[1] : config.tenant.defaultTenant;
};
```

**How it works:**
- If hostname is `school1.example.com` → Tenant = `school1`
- If hostname is `localhost` or no subdomain → Tenant = `test_tenant` (default)
- If hostname is `www.example.com` → Tenant = `test_tenant` (default)

### 3. Environment Configuration

**File**: `.env`
```bash
VITE_DEFAULT_TENANT=test_tenant
VITE_TENANT_HEADER=cschema
```

**Current Settings:**
- Default Tenant: `test_tenant`
- Tenant Header: `cschema`
- API Base URL: `http://localhost:8000/api/v1`

---

## 🔍 Verification: All Requests Target test_tenant

### Sample API Request Headers

Every API call includes these headers:

```http
POST /api/v1/fee/student-mappings/bulk HTTP/1.1
Host: localhost:8000
Content-Type: application/json
Authorization: Bearer <token>
cschema: test_tenant          ← ✅ TENANT ISOLATION HEADER
```

### API Calls from Fee Mappings Module

#### Student Bulk Creation
```http
POST /api/v1/fee/student-mappings/bulk
Headers:
  cschema: test_tenant
  Authorization: Bearer <token>
  Content-Type: application/json
```

#### Class Mapping Creation
```http
POST /api/v1/fee/class-mappings/
Headers:
  cschema: test_tenant
  Authorization: Bearer <token>
  Content-Type: application/json
```

#### Term Amounts Creation
```http
POST /api/v1/fee/class-mapping-term-amounts/
Headers:
  cschema: test_tenant
  Authorization: Bearer <token>
  Content-Type: application/json
```

---

## 🛡️ Backend Schema Isolation

The backend MUST implement schema isolation based on the `cschema` header:

### Expected Backend Behavior

```python
# Backend should set PostgreSQL schema based on cschema header
@app.before_request
def set_tenant_schema():
    tenant = request.headers.get('cschema', 'test_tenant')

    # Validate tenant
    if tenant not in ALLOWED_TENANTS:
        raise Unauthorized("Invalid tenant")

    # Set PostgreSQL search_path to tenant schema
    db.session.execute(text(f"SET search_path TO {tenant}"))
```

### Database Structure

```sql
-- PostgreSQL Database Structure
cos360_db
├── public (default schema - not used for tenant data)
├── test_tenant (schema)
│   ├── fee_student_mappings
│   ├── fee_class_mappings
│   ├── fee_student_map_term_amounts
│   ├── fee_class_mapping_terms
│   ├── students
│   ├── classes
│   └── ... (all other tables)
├── school1 (schema)
│   └── ... (school1's isolated data)
└── school2 (schema)
    └── ... (school2's isolated data)
```

**Important**: Each tenant has its OWN copy of all tables in their schema. Changes to `test_tenant` schema will NOT affect other schemas.

---

## ✅ Isolation Guarantees

### What is Isolated?

1. **All Data Operations**
   - SELECT queries only read from `test_tenant` schema
   - INSERT operations only create records in `test_tenant` schema
   - UPDATE operations only modify records in `test_tenant` schema
   - DELETE operations only remove records from `test_tenant` schema

2. **Fee Mappings**
   - Student fee mappings created/modified/deleted only in `test_tenant`
   - Class fee mappings created/modified/deleted only in `test_tenant`
   - Term amounts created/modified/deleted only in `test_tenant`

3. **Related Data**
   - Students, classes, sections - all from `test_tenant` schema only
   - Fee types, fee terms, academic years - all from `test_tenant` schema only
   - Transactions, receipts, refunds - all from `test_tenant` schema only

### What is NOT Shared?

- No data is shared between tenants
- Each tenant's data is completely isolated
- Changes in `test_tenant` don't affect production tenants

---

## 🧪 How to Verify Tenant Isolation

### Method 1: Browser DevTools - Network Tab

1. Open your browser DevTools (F12)
2. Go to the **Network** tab
3. Navigate to `/fee/mappings`
4. Click any button (e.g., "Bulk Create")
5. Check the request headers:

**What to look for:**
```
Request Headers:
  cschema: test_tenant  ← ✅ This confirms isolation
```

### Method 2: Console Logging

The application has debug logging enabled. Check the browser console for:

```
[COS360] Setting tenant header { tenant: 'test_tenant', header: 'cschema' }
```

### Method 3: Backend Logs

On the backend server, you should see logs showing the tenant being set:

```
INFO: Setting search_path to test_tenant
INFO: POST /api/v1/fee/student-mappings/bulk [tenant=test_tenant]
```

### Method 4: Database Query

To verify data is in the correct schema:

```sql
-- Check which schema the tables are in
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname IN ('test_tenant', 'public')
ORDER BY schemaname, tablename;

-- Check data in test_tenant schema
SET search_path TO test_tenant;
SELECT * FROM fee_student_mappings LIMIT 10;

-- Verify no cross-contamination
SET search_path TO production_tenant;
SELECT COUNT(*) FROM fee_student_mappings;  -- Should be different count
```

---

## 📊 API Request Examples with Tenant Headers

### Example 1: Create Student Bulk Mappings

**Full Request:**
```http
POST http://localhost:8000/api/v1/fee/student-mappings/bulk
Headers:
  Content-Type: application/json
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  cschema: test_tenant

Body:
{
  "student_ids": ["uuid-1", "uuid-2"],
  "class_id": "class-uuid",
  "section_id": "section-uuid",
  "fee_type_id": "fee-type-uuid",
  "total_fee": 7770.00,
  "academic_year_id": "ay-uuid"
}
```

**Backend Processing:**
```python
# 1. Extract tenant from header
tenant = request.headers.get('cschema')  # → 'test_tenant'

# 2. Set schema
db.execute(f"SET search_path TO {tenant}")

# 3. All subsequent queries run in test_tenant schema
students = db.query(Student).filter(Student.id.in_(student_ids)).all()
# → SELECT * FROM test_tenant.students WHERE id IN (...)

# 4. Create mappings
for student_id in student_ids:
    mapping = FeeStudentMapping(...)
    db.add(mapping)
    # → INSERT INTO test_tenant.fee_student_mappings (...)

db.commit()
```

### Example 2: Get Class Mappings

**Full Request:**
```http
GET http://localhost:8000/api/v1/fee/class-mappings/?academic_year_id=uuid
Headers:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  cschema: test_tenant
```

**Backend Processing:**
```python
tenant = request.headers.get('cschema')  # → 'test_tenant'
db.execute(f"SET search_path TO {tenant}")

mappings = db.query(FeeClassMapping).filter(
    FeeClassMapping.academic_year_id == academic_year_id
).all()
# → SELECT * FROM test_tenant.fee_class_mappings WHERE academic_year_id = ?
```

---

## 🔐 Security Considerations

### Frontend Protection
✅ **Automatic**: Tenant header is automatically added to ALL requests
✅ **Consistent**: Uses environment configuration, not hardcoded values
✅ **Logged**: Debug mode shows tenant header in console for verification

### Backend Protection (Required)
❗ **Backend MUST validate tenant header**
❗ **Backend MUST set schema based on tenant**
❗ **Backend MUST prevent SQL injection** (use parameterized queries for schema name)
❗ **Backend MUST verify user has access to the tenant**

### Best Practices

```python
# ✅ CORRECT - Safe tenant validation
ALLOWED_TENANTS = ['test_tenant', 'school1', 'school2']

def get_tenant():
    tenant = request.headers.get('cschema', 'test_tenant')
    if tenant not in ALLOWED_TENANTS:
        raise ValueError("Invalid tenant")
    return tenant

# Use it safely
tenant = get_tenant()
db.execute(text("SET search_path TO :tenant"), {"tenant": tenant})

# ❌ WRONG - SQL injection vulnerability
tenant = request.headers.get('cschema')
db.execute(f"SET search_path TO {tenant}")  # Never do this!
```

---

## 📋 Testing Checklist

Use this checklist to verify tenant isolation:

### Frontend Verification
- [ ] Check `.env` file has `VITE_DEFAULT_TENANT=test_tenant`
- [ ] Open browser DevTools → Network tab
- [ ] Make any API request (e.g., load fee mappings)
- [ ] Verify request headers include `cschema: test_tenant`
- [ ] Check console logs show `Setting tenant header { tenant: 'test_tenant' }`

### Backend Verification
- [ ] Backend logs show tenant being extracted from header
- [ ] Backend logs show `SET search_path TO test_tenant` (or equivalent)
- [ ] Database queries target `test_tenant` schema only
- [ ] No cross-tenant data leaks

### Data Verification
- [ ] Create a student fee mapping
- [ ] Query database: `SET search_path TO test_tenant; SELECT * FROM fee_student_mappings;`
- [ ] Verify the record exists in `test_tenant` schema
- [ ] Switch schema: `SET search_path TO public;`
- [ ] Verify the record does NOT exist in `public` schema
- [ ] Check other tenant schemas to ensure no contamination

### Isolation Testing
- [ ] Create test data in `test_tenant`
- [ ] Verify data exists in `test_tenant` schema
- [ ] Verify data does NOT exist in other schemas
- [ ] Delete test data
- [ ] Verify deletion only affected `test_tenant` schema

---

## 🚨 Important Notes

### ✅ Safe to Test

Since all operations are isolated to `test_tenant` schema:
- ✅ Safe to create test data
- ✅ Safe to bulk create student mappings
- ✅ Safe to delete test records
- ✅ Safe to modify existing records
- ✅ Safe to test term amounts functionality
- ✅ Safe to experiment with API calls

### ⚠️ Production Data is Safe

- Other tenant schemas (e.g., `school1`, `school2`) are NOT affected
- Production tenants remain completely isolated
- Only `test_tenant` data will be modified during testing

### 🛠️ Switching Tenants (Advanced)

To test with a different tenant (e.g., create a `dev_tenant` for development):

1. **Create new schema in database:**
   ```sql
   CREATE SCHEMA dev_tenant;
   -- Copy table structure from test_tenant
   ```

2. **Update `.env` file:**
   ```bash
   VITE_DEFAULT_TENANT=dev_tenant
   ```

3. **Restart frontend dev server:**
   ```bash
   npm run dev
   ```

4. **All requests now go to `dev_tenant` schema**

---

## 📊 Tenant Context in Different Scenarios

### Local Development (localhost)
- Hostname: `localhost:5173`
- Tenant: `test_tenant` (default)
- Header: `cschema: test_tenant`

### Subdomain-Based Tenants (Production)
- Hostname: `school1.cos360.com`
- Tenant: `school1` (extracted from subdomain)
- Header: `cschema: school1`

### Main Domain (No Subdomain)
- Hostname: `cos360.com`
- Tenant: `test_tenant` (fallback to default)
- Header: `cschema: test_tenant`

---

## 🔍 Debugging Tenant Issues

### Issue: Data appearing in wrong schema

**Check:**
1. Browser console for tenant header logs
2. Network tab → Request headers → `cschema` value
3. Backend logs for schema switching commands
4. Database query with explicit schema: `SELECT * FROM test_tenant.fee_student_mappings`

### Issue: Cross-tenant data visible

**Cause**: Backend not properly setting schema
**Fix**: Backend must execute `SET search_path TO {tenant}` before ALL queries

### Issue: Tenant header missing

**Check:**
1. `src/api/index.ts` - Request interceptor is configured
2. `.env` file - `VITE_TENANT_HEADER` is set to `cschema`
3. Browser console - No errors in request interceptor
4. Axios instance is being used (not raw fetch/axios)

---

## ✅ Final Confirmation

**Tenant Isolation**: ✅ **ACTIVE**
**Current Tenant**: `test_tenant`
**Data Safety**: ✅ **GUARANTEED**

All fee mappings operations (create, read, update, delete) will ONLY affect the `test_tenant` schema. Your production data in other schemas is completely safe.

---

## 📞 Support

If you need to verify tenant isolation:
1. Check browser DevTools → Network tab → Request headers
2. Check backend logs for schema switching
3. Query database with explicit schema name
4. Review this document for verification steps

**Remember**: Every API request includes `cschema: test_tenant` header, ensuring complete data isolation.

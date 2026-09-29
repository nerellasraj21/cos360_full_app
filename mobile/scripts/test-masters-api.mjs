/**
 * Masters API endpoint test script
 * Usage: node scripts/test-masters-api.mjs <org_code> <username> <password>
 */

import axios from 'axios';

const BASE_URL = process.env.API_URL || 'http://localhost:8000/api/v1';
const [, , ORG_CODE, USERNAME, PASSWORD] = process.argv;

if (!ORG_CODE || !USERNAME || !PASSWORD) {
  console.error('Usage: node scripts/test-masters-api.mjs <org_code> <username> <password>');
  process.exit(1);
}

let token = '';
let academicYearId = '';

const client = axios.create({ baseURL: BASE_URL });
client.interceptors.request.use(cfg => {
  cfg.headers['cschema'] = ORG_CODE;
  if (token) cfg.headers['Authorization'] = `Bearer ${token}`;
  return cfg;
});

// ── helpers ────────────────────────────────────────────────────────────────
const pass = (label) => console.log(`  ✓  ${label}`);
const fail = (label, err) => {
  const status = err?.response?.status;
  const detail = err?.response?.data?.detail || err?.message || '';
  console.log(`  ✗  ${label} [${status ?? 'ERR'}] ${detail}`);
};

async function run(label, fn) {
  try {
    const result = await fn();
    pass(label);
    return result;
  } catch (err) {
    fail(label, err);
    return null;
  }
}

// ── auth ───────────────────────────────────────────────────────────────────
async function authenticate() {
  console.log('\n── Authentication ──────────────────────────────────────────');

  // 1. Get academic years (public endpoint)
  const years = await run('GET /auth/academic-years', async () => {
    const r = await client.get('/auth/academic-years');
    return r.data;
  });

  if (!years?.length) { console.error('No academic years returned. Check org code.'); process.exit(1); }
  academicYearId = years[0].id;
  console.log(`     Using academic year: ${years[0].title} (${academicYearId})`);

  // 2. Login
  const auth = await run(`POST /auth/login`, async () => {
    const r = await client.post('/auth/login', {
      username: USERNAME,
      password: PASSWORD,
      academic_year_id: academicYearId,
    });
    return r.data;
  });

  if (!auth?.access_token) { console.error('Login failed. Check credentials.'); process.exit(1); }
  token = auth.access_token;
  console.log(`     Logged in as: ${USERNAME}`);
}

// ── test suites ────────────────────────────────────────────────────────────
async function testAcademicYears() {
  console.log('\n── Academic Years ──────────────────────────────────────────');
  await run('GET /masters/academic_years/',           () => client.get('/masters/academic_years/'));
  await run('GET /masters/academic_years/dropdown',   () => client.get('/masters/academic_years/dropdown'));
  await run(`GET /masters/academic_years/${academicYearId}`, () => client.get(`/masters/academic_years/${academicYearId}`));
}

async function testClassSections() {
  console.log('\n── Class Sections ──────────────────────────────────────────');
  const all = await run('GET /masters/class_sections/read_all',       () => client.get('/masters/class_sections/read_all'));
  await run('GET /masters/class_sections/dropdown',                   () => client.get('/masters/class_sections/dropdown'));
  await run('GET /masters/class_sections/class-list',                 () => client.get('/masters/class_sections/class-list'));
  await run('GET /masters/class_sections/section-list',               () => client.get('/masters/class_sections/section-list'));
  await run('GET /masters/class_sections/class-section-list',         () => client.get('/masters/class_sections/class-section-list'));

  const firstClass = (all?.items || all)?.[0];
  if (firstClass) {
    await run(`GET /masters/class_sections/by_class_id/${firstClass.id}/sections`,
      () => client.get(`/masters/class_sections/by_class_id/${firstClass.id}/sections`));
  }
}

async function testSubjectCategories() {
  console.log('\n── Subject Categories ──────────────────────────────────────');
  const cats = await run('GET /masters/subject_categories/categories',          () => client.get('/masters/subject_categories/categories'));
  await run('GET /masters/subject_categories/categories/dropdown',              () => client.get('/masters/subject_categories/categories/dropdown'));

  const first = (cats?.items || cats)?.[0];
  if (first) {
    await run(`GET /masters/subject_categories/categories/${first.id}`,
      () => client.get(`/masters/subject_categories/categories/${first.id}`));
  }
}

async function testSubjects() {
  console.log('\n── Subjects ────────────────────────────────────────────────');
  const subs = await run('GET /masters/subjects/',                              () => client.get('/masters/subjects/'));
  await run('GET /masters/subjects/dropdown',                                   () => client.get('/masters/subjects/dropdown'));
  await run(`GET /masters/subjects/?academic_year_id=${academicYearId}`,
    () => client.get('/masters/subjects/', { params: { academic_year_id: academicYearId } }));

  const first = (subs?.items || subs)?.[0];
  if (first) {
    await run(`GET /masters/subjects/${first.id}`,                              () => client.get(`/masters/subjects/${first.id}`));
    if (first.category_id) {
      await run(`GET /masters/subjects/categories/${first.category_id}/subjects`,
        () => client.get(`/masters/subjects/categories/${first.category_id}/subjects`));
    }
  }
}

async function testClassSubjectMappings() {
  console.log('\n── Class-Subject Mappings ──────────────────────────────────');
  const maps = await run('GET /masters/class-subject-mappings/',                () => client.get('/masters/class-subject-mappings/'));
  await run('GET /masters/class-subject-mappings/dropdown',                     () => client.get('/masters/class-subject-mappings/dropdown'));
  await run(`GET /masters/class-subject-mappings/?academic_year_id=${academicYearId}`,
    () => client.get('/masters/class-subject-mappings/', { params: { academic_year_id: academicYearId } }));

  const first = (maps?.items || maps)?.[0];
  if (first) {
    await run(`GET /masters/class-subject-mappings/${first.id}`,                () => client.get(`/masters/class-subject-mappings/${first.id}`));
    await run(`GET /masters/class-subject-mappings/by-class/${first.class_id}`, () => client.get(`/masters/class-subject-mappings/by-class/${first.class_id}`));
  }
}

async function testHolidays() {
  console.log('\n── Holidays ────────────────────────────────────────────────');
  const holidays = await run('GET /masters/holidays/',                          () => client.get('/masters/holidays/'));
  await run('GET /masters/holidays/dropdown',                                   () => client.get('/masters/holidays/dropdown'));

  const first = (holidays?.items || holidays)?.[0];
  if (first) {
    await run(`GET /masters/holidays/${first.id}`,                              () => client.get(`/masters/holidays/${first.id}`));
  }
}

async function testRoutes() {
  console.log('\n── Routes ──────────────────────────────────────────────────');
  const routes = await run('GET /masters/routes/all_routes',                    () => client.get('/masters/routes/all_routes'));
  await run('GET /masters/routes/dropdown',                                     () => client.get('/masters/routes/dropdown'));

  const first = (routes?.items || routes)?.[0];
  if (first) {
    await run(`GET /masters/routes/routeid/${first.id}`,                        () => client.get(`/masters/routes/routeid/${first.id}`));
    await run(`GET /masters/routes/stops-by-route?route_name=${encodeURIComponent(first.route_name)}`,
      () => client.get('/masters/routes/stops-by-route', { params: { route_name: first.route_name } }));
  }
}

async function testVehicles() {
  console.log('\n── Vehicles ────────────────────────────────────────────────');
  const vehicles = await run('GET /masters/vehicles/',                          () => client.get('/masters/vehicles/'));
  await run('GET /masters/vehicles/dropdown',                                   () => client.get('/masters/vehicles/dropdown'));

  const first = (vehicles?.items || vehicles)?.[0];
  if (first) {
    await run(`GET /masters/vehicles/${first.id}`,                              () => client.get(`/masters/vehicles/${first.id}`));
  }
}

async function testRouteStops() {
  console.log('\n── Route Stops ─────────────────────────────────────────────');
  const stops = await run('GET /masters/route-stops/',                          () => client.get('/masters/route-stops/'));

  const first = (stops?.items || stops)?.[0];
  if (first) {
    await run(`GET /masters/route-stops/${first.id}`,                           () => client.get(`/masters/route-stops/${first.id}`));
  }
}

async function testTrips() {
  console.log('\n── Trips ───────────────────────────────────────────────────');
  const trips = await run('GET /masters/trips/',                                () => client.get('/masters/trips/'));

  const first = (trips?.items || trips)?.[0];
  if (first) {
    await run(`GET /masters/trips/${first.id}`,                                 () => client.get(`/masters/trips/${first.id}`));
  }
}

async function testParents() {
  console.log('\n── Parents ─────────────────────────────────────────────────');
  const parents = await run('GET /parents/',                                    () => client.get('/parents/'));
  await run('GET /parents/search',                                              () => client.get('/parents/search'));
  await run('GET /parents/salary-ranges/dropdown',                              () => client.get('/parents/salary-ranges/dropdown'));

  const first = (parents?.items || parents)?.[0];
  if (first) {
    await run(`GET /parents/${first.id}`,                                       () => client.get(`/parents/${first.id}`));
  }
}

async function testRolesPermissions() {
  console.log('\n── Roles & Permissions ─────────────────────────────────────');
  const roles = await run('GET /admin/role-mgmt/roles/',                                () => client.get('/admin/role-mgmt/roles/'));
  // dropdown uses same list endpoint (no dedicated /dropdown in backend)
  await run('GET /admin/role-mgmt/roles/ [dropdown fallback]',                          () => client.get('/admin/role-mgmt/roles/'));
  await run('GET /auth/resource-permissions/matrix/all',                                () => client.get('/auth/resource-permissions/matrix/all'));
  await run('GET /auth/available-resources',                                            () => client.get('/auth/available-resources'));
  await run('GET /auth/resource-permissions/dropdown/actions',                          () => client.get('/auth/resource-permissions/dropdown/actions'));
  await run('GET /auth/resource-permissions/dropdown/resources',                        () => client.get('/auth/resource-permissions/dropdown/resources'));

  const firstRole = (roles?.roles || roles?.items || roles)?.[0];
  if (firstRole) {
    await run(`GET /admin/role-mgmt/roles/${firstRole.id}`,                             () => client.get(`/admin/role-mgmt/roles/${firstRole.id}`));
    await run(`GET /admin/role-mgmt/roles/${firstRole.id}/permissions`,                 () => client.get(`/admin/role-mgmt/roles/${firstRole.id}/permissions`));
  }
}

async function testStudentTransport() {
  console.log('\n── Student Transport ───────────────────────────────────────');
  await run('GET /students/student-transport/',                                 () => client.get('/students/student-transport/'));
}

async function testStudentsDropdowns() {
  console.log('\n── Students — Dropdowns ────────────────────────────────────');
  await run('GET /students/admission/students/dropdown',                        () => client.get('/students/admission/students/dropdown'));
  await run('GET /students/admission/students/dropdown/simple',                 () => client.get('/students/admission/students/dropdown/simple'));
  await run('GET /students/admission/students/dropdown/simple?active_only=true',() => client.get('/students/admission/students/dropdown/simple', { params: { active_only: true } }));
  await run('GET /students/admission/admission-types/dropdown',                 () => client.get('/students/admission/admission-types/dropdown'));
  await run('GET /certificates/types/dropdown',                                 () => client.get('/certificates/types/dropdown'));
}

async function testFeesDropdowns() {
  console.log('\n── Fees — Dropdowns ────────────────────────────────────────');
  await run('GET /fee/categories/dropdown',                                     () => client.get('/fee/categories/dropdown'));
  await run('GET /fee/types/dropdown',                                          () => client.get('/fee/types/dropdown'));
  await run('GET /fee/terms/dropdown',                                          () => client.get('/fee/terms/dropdown'));
}

async function testExpenseDropdowns() {
  console.log('\n── Expense — Dropdowns ─────────────────────────────────────');
  await run('GET /expense/categories/dropdown',                                 () => client.get('/expense/categories/dropdown'));
  await run('GET /expense/types/dropdown',                                      () => client.get('/expense/types/dropdown'));
  await run('GET /expense/departments/dropdown',                                () => client.get('/expense/departments/dropdown'));
}

async function testStaffDropdowns() {
  console.log('\n── Staff — Dropdowns ───────────────────────────────────────');
  await run('GET /staff/designations/dropdown',                                 () => client.get('/staff/designations/dropdown'));
}

// ── main ───────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\nAll Modules Dropdown API Test — ${BASE_URL}`);
  console.log(`Org: ${ORG_CODE}  |  User: ${USERNAME}`);

  await authenticate();
  await testAcademicYears();
  await testClassSections();
  await testSubjectCategories();
  await testSubjects();
  await testClassSubjectMappings();
  await testHolidays();
  await testRoutes();
  await testVehicles();
  await testRouteStops();
  await testTrips();
  await testParents();
  await testRolesPermissions();
  await testStudentTransport();
  await testStudentsDropdowns();
  await testFeesDropdowns();
  await testExpenseDropdowns();
  await testStaffDropdowns();

  console.log('\n────────────────────────────────────────────────────────────');
  console.log('Done.\n');
})();

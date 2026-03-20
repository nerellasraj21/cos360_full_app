/**
 * Students API endpoint test script
 * Usage: node scripts/test-students-api.mjs <org_code> <username> <password>
 */

import axios from 'axios';

const BASE_URL = process.env.API_URL || 'http://localhost:8000/api/v1';
const [, , ORG_CODE, USERNAME, PASSWORD] = process.argv;

if (!ORG_CODE || !USERNAME || !PASSWORD) {
  console.error('Usage: node scripts/test-students-api.mjs <org_code> <username> <password>');
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

  const years = await run('GET /auth/academic-years', async () => {
    const r = await client.get('/auth/academic-years');
    return r.data;
  });

  if (!years?.length) { console.error('No academic years returned. Check org code.'); process.exit(1); }
  academicYearId = years[0].id;
  console.log(`     Using academic year: ${years[0].title} (${academicYearId})`);

  const auth = await run('POST /auth/login', async () => {
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

// ── Admissions ─────────────────────────────────────────────────────────────
async function testAdmissions() {
  console.log('\n── Admissions (/students/admission/) ──────────────────────');

  const admissions = await run('GET /students/admission/',
    () => client.get('/students/admission/'));

  const items = admissions?.items || admissions || [];
  const first = items[0];

  await run('GET /students/admission/next-admission-number',
    () => client.get('/students/admission/next-admission-number'));

  await run('GET /students/admission/admission-types/dropdown',
    () => client.get('/students/admission/admission-types/dropdown'));

  await run('GET /students/admission/students/dropdown',
    () => client.get('/students/admission/students/dropdown'));

  await run('GET /students/admission/students/dropdown/simple',
    () => client.get('/students/admission/students/dropdown/simple'));

  await run('GET /students/admission/search?q=a',
    () => client.get('/students/admission/search', { params: { q: 'a' } }));

  await run('GET /students/admission/my-admission',
    () => client.get('/students/admission/my-admission'));

  if (first) {
    await run(`GET /students/admission/id/${first.student?.id ?? first.id}`,
      () => client.get(`/students/admission/id/${first.student?.id ?? first.id}`));

    await run(`GET /students/admission/by-admission/${first.id}`,
      () => client.get(`/students/admission/by-admission/${first.id}`));

    await run(`PATCH /students/admission/${first.student?.id ?? first.id} (toggle-active)`,
      () => client.patch(`/students/admission/${first.student?.id ?? first.id}/toggle-active`));
  }

  return first;
}

// ── Attendance ─────────────────────────────────────────────────────────────
async function testAttendance(admissionItem) {
  console.log('\n── Attendance (/student/attendance/) ──────────────────────');
  const today = new Date().toISOString().split('T')[0];

  const all = await run('GET /student/attendance/',
    () => client.get('/student/attendance/'));

  const items = Array.isArray(all) ? all : (all?.items || []);
  const first = items[0];

  await run(`GET /student/attendance/by-date/${today}`,
    () => client.get(`/student/attendance/by-date/${today}`));

  await run('GET /student/attendance/search?date=' + today,
    () => client.get('/student/attendance/search', { params: { date: today } }));

  await run('GET /student/attendance/my-attendance',
    () => client.get('/student/attendance/my-attendance'));

  if (admissionItem?.student?.id) {
    await run(`GET /student/attendance/student/${admissionItem.student.id}/filter`,
      () => client.get(`/student/attendance/student/${admissionItem.student.id}/filter`));
  }

  if (first) {
    await run(`GET /student/attendance/${first.id}`,
      () => client.get(`/student/attendance/${first.id}`));
  }

  // Test create + update + delete
  let createdAttendanceId = null;
  if (admissionItem?.student?.id) {
    const created = await run('POST /student/attendance/ (create)',
      () => client.post('/student/attendance/', {
        student_id: admissionItem.student.id,
        date: today,
        status: 'present',
        remarks: 'test from script',
      }));
    createdAttendanceId = created?.id;
  }

  if (createdAttendanceId) {
    await run(`PATCH /student/attendance/${createdAttendanceId}`,
      () => client.patch(`/student/attendance/${createdAttendanceId}`, { status: 'late' }));

    await run(`DELETE /student/attendance/${createdAttendanceId}`,
      () => client.delete(`/student/attendance/${createdAttendanceId}`));
  }
}

// ── Certificate Types ──────────────────────────────────────────────────────
async function testCertificateTypes() {
  console.log('\n── Certificate Types (/certificates/types/) ───────────────');

  const types = await run('GET /certificates/types/',
    () => client.get('/certificates/types/'));

  const items = types?.items || types || [];
  const first = items[0];

  await run('GET /certificates/types/dropdown',
    () => client.get('/certificates/types/dropdown'));

  await run('GET /certificates/types/search?q=',
    () => client.get('/certificates/types/search', { params: { q: '' } }));

  if (first) {
    await run(`GET /certificates/types/${first.id}`,
      () => client.get(`/certificates/types/${first.id}`));
  }

  // Create + update + delete
  const created = await run('POST /certificates/types/ (create)',
    () => client.post('/certificates/types/', {
      name: '__test_cert_type__',
      description: 'Created by test script',
    }));

  if (created?.id) {
    await run(`PUT /certificates/types/${created.id}`,
      () => client.put(`/certificates/types/${created.id}`, {
        name: '__test_cert_type_updated__',
        description: 'Updated by test script',
      }));

    await run(`DELETE /certificates/types/${created.id}`,
      () => client.delete(`/certificates/types/${created.id}`));
  }

  return first;
}

// ── Certificates ───────────────────────────────────────────────────────────
async function testCertificates(admissionItem, certType) {
  console.log('\n── Certificates (/certificates/) ───────────────────────────');

  const all = await run('GET /certificates/',
    () => client.get('/certificates/'));

  await run('GET /certificates/received',
    () => client.get('/certificates/received'));

  await run('GET /certificates/issued',
    () => client.get('/certificates/issued'));

  await run('GET /certificates/my',
    () => client.get('/certificates/my'));

  await run('GET /certificates/selector/classes',
    () => client.get('/certificates/selector/classes'));

  await run('GET /certificates/selector/sections',
    () => client.get('/certificates/selector/sections'));

  await run('GET /certificates/selector/students',
    () => client.get('/certificates/selector/students'));

  const items = all?.items || all?.data || all || [];
  const first = Array.isArray(items) ? items[0] : null;

  if (admissionItem?.student?.id) {
    await run(`GET /certificates/by-student/${admissionItem.student.id}`,
      () => client.get(`/certificates/by-student/${admissionItem.student.id}`));
  }

  if (first) {
    await run(`GET /certificates/${first.id}`,
      () => client.get(`/certificates/${first.id}`));

    await run(`GET /certificates/${first.id}/download`,
      () => client.get(`/certificates/${first.id}/download`));
  }
}

// ── Documents ──────────────────────────────────────────────────────────────
async function testDocuments(admissionItem) {
  console.log('\n── Student Documents (/students/documents/) ────────────────');

  const all = await run('GET /students/documents/',
    () => client.get('/students/documents/'));

  const items = Array.isArray(all) ? all : (all?.items || []);
  const first = items[0];

  if (first) {
    await run(`GET /students/documents/${first.id}`,
      () => client.get(`/students/documents/${first.id}`));
  }
}

// ── Student Transport ──────────────────────────────────────────────────────
async function testStudentTransport(admissionItem) {
  console.log('\n── Student Transport (/students/student-transport/) ────────');

  const all = await run('GET /students/student-transport/',
    () => client.get('/students/student-transport/'));

  const items = Array.isArray(all) ? all : (all?.items || []);
  const first = items[0];

  if (admissionItem?.student?.id) {
    await run(`GET /students/student-transport/student/${admissionItem.student.id}`,
      () => client.get(`/students/student-transport/student/${admissionItem.student.id}`));
  }

  if (first) {
    await run(`PATCH /students/student-transport/${first.id}`,
      () => client.patch(`/students/student-transport/${first.id}`, {
        fee_per_term: first.fee_per_term,
      }));
  }
}

// ── main ───────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\nStudents API Test — ${BASE_URL}`);
  console.log(`Org: ${ORG_CODE}  |  User: ${USERNAME}`);

  await authenticate();
  const firstAdmission = await testAdmissions();
  await testAttendance(firstAdmission);
  const firstCertType = await testCertificateTypes();
  await testCertificates(firstAdmission, firstCertType);
  await testDocuments(firstAdmission);
  await testStudentTransport(firstAdmission);

  console.log('\n────────────────────────────────────────────────────────────');
  console.log('Done.\n');
})();

export function fillCertificateTemplate(html: string, values: Record<string, string>): string {
  let out = html;
  Object.entries(values).forEach(([key, value]) => {
    out = out.replace(new RegExp(`\{\{${key}\}\}`, 'g'), () => value);
  });
  return out;
}

function formatDate(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN');
}

export function buildCertificateValues(admission: any): Record<string, string> {
  const s = admission?.student ?? {};
  const gender = String(s.gender ?? '').toLowerCase();
  const isFemale = gender === 'f' || gender === 'female';
  const genderLabel = isFemale ? 'Female' : gender === 'm' || gender === 'male' ? 'Male' : s.gender ?? '';
  return {
    student_name: `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim(),
    admission_number: admission?.admission_number ?? '',
    dob: formatDate(s.date_of_birth),
    gender: genderLabel,
    aadhar_number: s.aadhar_number ?? '',
    apaar_number: s.apaar_number ?? '',
    father_name: s.father?.name ?? '',
    mother_name: s.mother?.name ?? '',
    guardian_name: s.guardian?.name ?? '',
    guardian_phone: s.guardian?.phone ?? '',
    guardian_relation: s.guardian?.relation_to_student ?? '',
    date_of_joining: formatDate(admission?.admission_date),
    issue_date: new Date().toLocaleDateString('en-IN'),
    gender_he_she: isFemale ? 'She' : 'He',
    gender_his_her: isFemale ? 'Her' : 'His',
  };
}

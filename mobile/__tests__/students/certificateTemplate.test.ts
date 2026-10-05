import { buildCertificateValues, fillCertificateTemplate } from '@/src/utils/certificateTemplate';

describe('fillCertificateTemplate', () => {
  it('replaces every occurrence of a known placeholder and leaves unknown ones', () => {
    const out = fillCertificateTemplate('{{a}} and {{a}} and {{b}}', { a: 'x' });
    expect(out).toBe('x and x and {{b}}');
  });

  it('inserts values containing dollar signs literally', () => {
    expect(fillCertificateTemplate('{{a}}', { a: '$&' })).toBe('$&');
  });
});

describe('buildCertificateValues', () => {
  const admission = {
    admission_number: '001',
    admission_date: '2026-04-01',
    student: {
      first_name: 'Asha',
      last_name: 'Rao',
      gender: 'F',
      father: { name: 'Ravi' },
      mother: { name: 'Sita' },
    },
  };

  it('maps student, parent and pronoun values', () => {
    const v = buildCertificateValues(admission);
    expect(v.student_name).toBe('Asha Rao');
    expect(v.admission_number).toBe('001');
    expect(v.gender).toBe('Female');
    expect(v.gender_he_she).toBe('She');
    expect(v.father_name).toBe('Ravi');
    expect(v.mother_name).toBe('Sita');
    expect(v.guardian_name).toBe('');
  });

  it('copes with a missing admission', () => {
    expect(buildCertificateValues(undefined).student_name).toBe('');
  });
});

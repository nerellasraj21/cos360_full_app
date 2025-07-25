// import type { Subject, SubjectInput } from '@/types/masters';
// import CAxios from '../index';
// import { SUBJECTS_API_BASE } from '@/constants';

// export const fetchSubjects = async (): Promise<Subject[]> => {
//   const { data } = await CAxios.get(SUBJECTS_API_BASE);
//   return data;
// };

// export const fetchSubjectById = async (id: number): Promise<Subject> => {
//   const { data } = await CAxios.get(`${SUBJECTS_API_BASE}${id}`);
//   return data;
// };

// export const createSubject = async (subject: SubjectInput): Promise<Subject> => {
//   const { data } = await CAxios.post(SUBJECTS_API_BASE, subject);
//   return data;
// };

// export const updateSubject = async ({ id, subject }: { id: number; subject: SubjectInput }): Promise<Subject> => {
//   const { data } = await CAxios.put(`${SUBJECTS_API_BASE}${id}`, subject);
//   return data;
// };

// export const deleteSubject = async (id: number): Promise<void> => {
//   await CAxios.delete(`${SUBJECTS_API_BASE}${id}`);
// };


import type { Subject, SubjectInput } from '@/types/masters';

let sampleSubjects: Subject[] = [
  {
    id: 1,
    name: 'Mathematics',
    category: 'Science',
    short_code: 'MATH',
    is_active: true,
    academic_year_id: 2023,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'English',
    category: 'Language',
    short_code: 'ENG',
    is_active: true,
    academic_year_id: 2023,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
  // Additional sample data
  {
    id: 3,
    name: 'Physics',
    category: 'Science',
    short_code: 'PHY',
    is_active: true,
    academic_year_id: 2022,
    created_at: '2022-01-01T00:00:00Z',
    updated_at: '2022-01-01T00:00:00Z',
  },
  {
    id: 4,
    name: 'Chemistry',
    category: 'Science',
    short_code: 'CHEM',
    is_active: false,
    academic_year_id: 2022,
    created_at: '2022-01-01T00:00:00Z',
    updated_at: '2022-01-01T00:00:00Z',
  },
  {
    id: 5,
    name: 'Biology',
    category: 'Science',
    short_code: 'BIO',
    is_active: true,
    academic_year_id: 2021,
    created_at: '2021-01-01T00:00:00Z',
    updated_at: '2021-01-01T00:00:00Z',
  },
  {
    id: 6,
    name: 'History',
    category: 'Social Studies',
    short_code: 'HIST',
    is_active: true,
    academic_year_id: 2021,
    created_at: '2021-01-01T00:00:00Z',
    updated_at: '2021-01-01T00:00:00Z',
  },
  {
    id: 7,
    name: 'Geography',
    category: 'Social Studies',
    short_code: 'GEO',
    is_active: false,
    academic_year_id: 2020,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2020-01-01T00:00:00Z',
  },
  {
    id: 8,
    name: 'Computer Science',
    category: 'Technology',
    short_code: 'CS',
    is_active: true,
    academic_year_id: 2023,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
  {
    id: 9,
    name: 'Physical Education',
    category: 'Sports',
    short_code: 'PE',
    is_active: true,
    academic_year_id: 2022,
    created_at: '2022-01-01T00:00:00Z',
    updated_at: '2022-01-01T00:00:00Z',
  },
  {
    id: 10,
    name: 'Art',
    category: 'Arts',
    short_code: 'ART',
    is_active: false,
    academic_year_id: 2021,
    created_at: '2021-01-01T00:00:00Z',
    updated_at: '2021-01-01T00:00:00Z',
  },
  {
    id: 11,
    name: 'Music',
    category: 'Arts',
    short_code: 'MUS',
    is_active: true,
    academic_year_id: 2020,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2020-01-01T00:00:00Z',
  },
  {
    id: 12,
    name: 'Economics',
    category: 'Commerce',
    short_code: 'ECO',
    is_active: true,
    academic_year_id: 2023,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
  {
    id: 13,
    name: 'Business Studies',
    category: 'Commerce',
    short_code: 'BUS',
    is_active: false,
    academic_year_id: 2022,
    created_at: '2022-01-01T00:00:00Z',
    updated_at: '2022-01-01T00:00:00Z',
  },
  {
    id: 14,
    name: 'Political Science',
    category: 'Social Studies',
    short_code: 'POL',
    is_active: true,
    academic_year_id: 2021,
    created_at: '2021-01-01T00:00:00Z',
    updated_at: '2021-01-01T00:00:00Z',
  },
  {
    id: 15,
    name: 'French',
    category: 'Language',
    short_code: 'FR',
    is_active: true,
    academic_year_id: 2020,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2020-01-01T00:00:00Z',
  },
  {
    id: 16,
    name: 'German',
    category: 'Language',
    short_code: 'GER',
    is_active: false,
    academic_year_id: 2023,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
  {
    id: 17,
    name: 'Spanish',
    category: 'Language',
    short_code: 'SPA',
    is_active: true,
    academic_year_id: 2022,
    created_at: '2022-01-01T00:00:00Z',
    updated_at: '2022-01-01T00:00:00Z',
  },
  {
    id: 18,
    name: 'Hindi',
    category: 'Language',
    short_code: 'HIN',
    is_active: true,
    academic_year_id: 2021,
    created_at: '2021-01-01T00:00:00Z',
    updated_at: '2021-01-01T00:00:00Z',
  },
  {
    id: 19,
    name: 'Sanskrit',
    category: 'Language',
    short_code: 'SAN',
    is_active: false,
    academic_year_id: 2020,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2020-01-01T00:00:00Z',
  },
  {
    id: 20,
    name: 'Environmental Science',
    category: 'Science',
    short_code: 'EVS',
    is_active: true,
    academic_year_id: 2023,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
];

export const fetchSubjects = async (): Promise<Subject[]> => {
  // Return a copy to simulate API
  return [...sampleSubjects];
};

export const fetchSubjectById = async (id: number): Promise<Subject> => {
  const subject = sampleSubjects.find((s) => s.id === id);
  if (!subject) throw new Error('Subject not found');
  return { ...subject };
};

export const createSubject = async (subject: SubjectInput): Promise<Subject> => {
  const newSubject: Subject = {
    ...subject,
    id: sampleSubjects.length ? Math.max(...sampleSubjects.map((s) => s.id)) + 1 : 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  sampleSubjects.push(newSubject);
  return { ...newSubject };
};

export const updateSubject = async ({ id, subject }: { id: number; subject: SubjectInput }): Promise<Subject> => {
  const idx = sampleSubjects.findIndex((s) => s.id === id);
  if (idx === -1) throw new Error('Subject not found');
  const updatedSubject: Subject = {
    ...sampleSubjects[idx],
    ...subject,
    updated_at: new Date().toISOString(),
  };
  sampleSubjects[idx] = updatedSubject;
  return { ...updatedSubject };
};

export const deleteSubject = async (id: number): Promise<void> => {
  sampleSubjects = sampleSubjects.filter((s) => s.id !== id);
};

export const fetchPaginatedSubjects = async (offset = 0, limit = 10): Promise<{ data: Subject[]; hasMore: boolean }> => {
  const data = sampleSubjects.slice(offset, offset + limit);
  const hasMore = offset + limit < sampleSubjects.length;
  return { data, hasMore };
};

export const fetchSubjectsPaginated = async (page = 0, pageSize = 10, academicYearId?: number): Promise<{ data: Subject[]; total: number; hasMore: boolean }> => {
  const offset = page * pageSize;
  let filtered = sampleSubjects;
  // if (academicYearId !== undefined) {
  //   filtered = filtered.filter(s => s.academic_year_id === academicYearId);
  // }
  const data = filtered.slice(offset, offset + pageSize);
  const total = filtered.length;
  const hasMore = offset + pageSize < total;
  return { data, total, hasMore };
};






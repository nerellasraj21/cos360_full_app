import type { AcademicYear, AcademicYearInput } from '@/types/masters/academicyear';

// Sample data
const sampleAcademicYears: AcademicYear[] = [
  {
    id: 1,
    name: '2022-2023',
    start_date: '2022-06-01',
    end_date: '2023-05-31',
    is_active: false,
    created_at: '2022-05-01T10:00:00Z',
    updated_at: '2023-05-31T10:00:00Z',
  },
  {
    id: 2,
    name: '2023-2024',
    start_date: '2023-06-01',
    end_date: '2024-05-31',
    is_active: true,
    created_at: '2023-05-01T10:00:00Z',
    updated_at: '2024-05-31T10:00:00Z',
  },
  {
    id: 3,
    name: '2021-2022',
    start_date: '2021-06-01',
    end_date: '2022-05-31',
    is_active: false,
    created_at: '2021-05-01T10:00:00Z',
    updated_at: '2022-05-31T10:00:00Z',
  },
  {
    id: 4,
    name: '2020-2021',
    start_date: '2020-06-01',
    end_date: '2021-05-31',
    is_active: false,
    created_at: '2020-05-01T10:00:00Z',
    updated_at: '2021-05-31T10:00:00Z',
  },
  {
    id: 5,
    name: '2019-2020',
    start_date: '2019-06-01',
    end_date: '2020-05-31',
    is_active: false,
    created_at: '2019-05-01T10:00:00Z',
    updated_at: '2020-05-31T10:00:00Z',
  },
  {
    id: 6,
    name: '2018-2019',
    start_date: '2018-06-01',
    end_date: '2019-05-31',
    is_active: false,
    created_at: '2018-05-01T10:00:00Z',
    updated_at: '2019-05-31T10:00:00Z',
  },
  {
    id: 7,
    name: '2017-2018',
    start_date: '2017-06-01',
    end_date: '2018-05-31',
    is_active: false,
    created_at: '2017-05-01T10:00:00Z',
    updated_at: '2018-05-31T10:00:00Z',
  },
  {
    id: 8,
    name: '2016-2017',
    start_date: '2016-06-01',
    end_date: '2017-05-31',
    is_active: false,
    created_at: '2016-05-01T10:00:00Z',
    updated_at: '2017-05-31T10:00:00Z',
  },
  {
    id: 9,
    name: '2015-2016',
    start_date: '2015-06-01',
    end_date: '2016-05-31',
    is_active: false,
    created_at: '2015-05-01T10:00:00Z',
    updated_at: '2016-05-31T10:00:00Z',
  },
  {
    id: 10,
    name: '2014-2015',
    start_date: '2014-06-01',
    end_date: '2015-05-31',
    is_active: false,
    created_at: '2014-05-01T10:00:00Z',
    updated_at: '2015-05-31T10:00:00Z',
  },
  {
    id: 11,
    name: '2013-2014',
    start_date: '2013-06-01',
    end_date: '2014-05-31',
    is_active: false,
    created_at: '2013-05-01T10:00:00Z',
    updated_at: '2014-05-31T10:00:00Z',
  },
  {
    id: 12,
    name: '2012-2013',
    start_date: '2012-06-01',
    end_date: '2013-05-31',
    is_active: false,
    created_at: '2012-05-01T10:00:00Z',
    updated_at: '2013-05-31T10:00:00Z',
  },
  {
    id: 13,
    name: '2011-2012',
    start_date: '2011-06-01',
    end_date: '2012-05-31',
    is_active: false,
    created_at: '2011-05-01T10:00:00Z',
    updated_at: '2012-05-31T10:00:00Z',
  },
  {
    id: 14,
    name: '2010-2011',
    start_date: '2010-06-01',
    end_date: '2011-05-31',
    is_active: false,
    created_at: '2010-05-01T10:00:00Z',
    updated_at: '2011-05-31T10:00:00Z',
  },
  {
    id: 15,
    name: '2009-2010',
    start_date: '2009-06-01',
    end_date: '2010-05-31',
    is_active: false,
    created_at: '2009-05-01T10:00:00Z',
    updated_at: '2010-05-31T10:00:00Z',
  },
];

let nextId = 16;

export const fetchAcademicYears = async (): Promise<AcademicYear[]> => {
  return [...sampleAcademicYears];
};

export const fetchAcademicYearById = async (id: number): Promise<AcademicYear> => {
  const found = sampleAcademicYears.find((ay) => ay.id === id);
  if (!found) throw new Error('Academic year not found');
  return { ...found };
};

export const createAcademicYear = async (academicYear: AcademicYearInput): Promise<AcademicYear> => {
  const newYear: AcademicYear = {
    id: nextId++,
    ...academicYear,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  sampleAcademicYears.push(newYear);
  return { ...newYear };
};

export const updateAcademicYear = async ({ id, academicYear }: { id: number; academicYear: AcademicYearInput }): Promise<AcademicYear> => {
  const index = sampleAcademicYears.findIndex((ay) => ay.id === id);
  if (index === -1) throw new Error('Academic year not found');
  const updatedYear: AcademicYear = {
    ...sampleAcademicYears[index],
    ...academicYear,
    updated_at: new Date().toISOString(),
  };
  sampleAcademicYears[index] = updatedYear;
  return { ...updatedYear };
};

export const deleteAcademicYear = async (id: number): Promise<void> => {
  const index = sampleAcademicYears.findIndex((ay) => ay.id === id);
  if (index !== -1) {
    sampleAcademicYears.splice(index, 1);
  }
};

export const fetchPaginatedAcademicYears = async (offset = 0, limit = 10): Promise<{ data: AcademicYear[]; hasMore: boolean }> => {
  const data = sampleAcademicYears.slice(offset, offset + limit);
  const hasMore = offset + limit < sampleAcademicYears.length;
  return { data, hasMore };
};


/*import type { AcademicYear, AcademicYearInput } from '@/types/masters/academicyear';
import CAxios from '../index';
import { ACADEMIC_YEARS_API_BASE } from '@/constants';

export const fetchAcademicYears = async (): Promise<AcademicYear[]> => {
  const { data } = await CAxios.get(ACADEMIC_YEARS_API_BASE);
  return data;
};

export const fetchAcademicYearById = async (id: number): Promise<AcademicYear> => {
  const { data } = await CAxios.get(`${ACADEMIC_YEARS_API_BASE}${id}`);
  return data;
};

export const createAcademicYear = async (academicYear: AcademicYearInput): Promise<AcademicYear> => {
  const { data } = await CAxios.post(ACADEMIC_YEARS_API_BASE, academicYear);
  return data;
};

export const updateAcademicYear = async ({ id, academicYear }: { id: number; academicYear: AcademicYearInput }): Promise<AcademicYear> => {
  const { data } = await CAxios.put(`${ACADEMIC_YEARS_API_BASE}${id}`, academicYear);
  return data;
};

export const deleteAcademicYear = async (id: number): Promise<void> => {
  await CAxios.delete(`${ACADEMIC_YEARS_API_BASE}${id}`);
};
*/
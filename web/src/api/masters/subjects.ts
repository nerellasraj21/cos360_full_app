import type { Subject, SubjectInput, ClassSubjectMappingBulkCreate, ClassSubjectMappingBulkResponse } from '@/types/masters';
import CAxios from '../index';
import { SUBJECTS_API_BASE } from '@/constants/api/masters/subjects';

// Dropdown interface for subjects
export interface SubjectDropdown {
  id: string;
  name: string;
  code: string;
  category?: string;
}

export const fetchSubjects = async (params?: {
  skip?: number;
  limit?: number;
  active_only?: boolean;
  academic_year_id?: string;
}): Promise<{ items: Subject[]; total: number }> => {
  const queryParams = new URLSearchParams();
  if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
  if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
  // Set active_only to false by default for table display
  const activeOnly = params?.active_only !== undefined ? params.active_only : false;
  queryParams.append('active_only', activeOnly.toString());
  if (params?.academic_year_id && params.academic_year_id.trim() !== '') queryParams.append('academic_year_id', params.academic_year_id);

  const queryString = queryParams.toString();
  const url = queryString ? `${SUBJECTS_API_BASE}?${queryString}` : SUBJECTS_API_BASE;

  const { data } = await CAxios.get(url);

  // Handle both response formats: array or { items, total }
  const items = Array.isArray(data) ? data : data.items || [];
  const total = Array.isArray(data) ? items.length : data.total || items.length;

  // Transform backend response to match frontend interface
  const transformedItems = items.map((item: any) => ({
    ...item,
    code: item.short_code || item.code || '', // Handle both short_code and code
    subject_category: item.category ? {
      id: item.category.id,
      name: item.category.name,
    } : null,
    subject_category_id: item.category_id, // Keep for form compatibility
  }));

  return {
    items: transformedItems,
    total
  };
};

export const fetchSubjectById = async (id: string): Promise<Subject> => {
  const { data } = await CAxios.get(`${SUBJECTS_API_BASE}${id}`);

  // Transform backend response to match frontend interface
  return {
    ...data,
    code: data.short_code || data.code || '', // Handle both short_code and code
    subject_category: data.category ? {
      id: data.category.id,
      name: data.category.name,
    } : null,
    subject_category_id: data.category_id, // Keep for form compatibility
  };
};

export const createSubject = async (subject: SubjectInput): Promise<Subject> => {
  // Transform subject_category_id to category_id for backend compatibility
  const payload = {
    ...subject,
    category_id: subject.subject_category_id,
    subject_category_id: undefined, // Remove the old field
  };
  delete payload.subject_category_id; // Clean up undefined field

  const { data } = await CAxios.post(SUBJECTS_API_BASE, payload);

  // Transform response to match frontend interface
  return {
    ...data,
    code: data.short_code || data.code || '',
    subject_category: data.category ? {
      id: data.category.id,
      name: data.category.name,
    } : null,
    subject_category_id: data.category_id,
  };
};

export const updateSubject = async ({ id, subject }: { id: string; subject: SubjectInput }): Promise<Subject> => {
  // Transform subject_category_id to category_id for backend compatibility
  const payload = {
    ...subject,
    category_id: subject.subject_category_id,
    subject_category_id: undefined, // Remove the old field
  };
  delete payload.subject_category_id; // Clean up undefined field

  const { data } = await CAxios.put(`${SUBJECTS_API_BASE}${id}`, payload);

  // Transform response to match frontend interface
  return {
    ...data,
    code: data.short_code || data.code || '',
    subject_category: data.category ? {
      id: data.category.id,
      name: data.category.name,
    } : null,
    subject_category_id: data.category_id,
  };
};

export const deleteSubject = async (id: string): Promise<void> => {
  await CAxios.delete(`${SUBJECTS_API_BASE}${id}`);
};

export const createBulkClassSubjectMappings = async (request: ClassSubjectMappingBulkCreate): Promise<ClassSubjectMappingBulkResponse> => {
  const { data } = await CAxios.post('/class-subject-mappings/', request);
  return data;
};

export const fetchSubjectsDropdown = async (params?: {
  category_id?: string;
  mandatory_only?: boolean;
  active_only?: boolean;
}): Promise<SubjectDropdown[]> => {
  const queryParams = new URLSearchParams();
  if (params?.category_id) queryParams.append('category_id', params.category_id);
  if (params?.mandatory_only !== undefined) queryParams.append('mandatory_only', params.mandatory_only.toString());
  if (params?.active_only !== undefined) queryParams.append('active_only', params.active_only.toString());

  const queryString = queryParams.toString();
  const url = queryString ? `${SUBJECTS_API_BASE}dropdown?${queryString}` : `${SUBJECTS_API_BASE}dropdown`;

  const { data } = await CAxios.get(url);
  return data;
};

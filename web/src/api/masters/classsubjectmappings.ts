import type {
  ClassSubjectMapping,
  ClassSubjectMappingInput,
  ClassSubjectMappingUpdate,
  ClassSubjectMappingDropdown,
  ClassSubjectMappingBulkCreate,
  ClassSubjectMappingBulkResponse
} from '@/types/masters';
import CAxios from '../index';
import { CLASS_SUBJECT_MAPPINGS_API_BASE } from '@/constants/api/masters/classsubjectmappings';

export const fetchClassSubjectMappings = async (params?: {
  skip?: number;
  limit?: number;
  academic_year_id?: string;
  active_only?: boolean;
}): Promise<{ items: ClassSubjectMapping[]; total: number }> => {
  const queryParams = new URLSearchParams();
  if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
  if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
  if (params?.academic_year_id) queryParams.append('academic_year_id', params.academic_year_id);
  if (params?.active_only !== undefined) queryParams.append('active_only', params.active_only.toString());

  const queryString = queryParams.toString();
  const url = queryString ? `${CLASS_SUBJECT_MAPPINGS_API_BASE}?${queryString}` : CLASS_SUBJECT_MAPPINGS_API_BASE;

  const { data } = await CAxios.get(url);
  return Array.isArray(data)
    ? { items: data, total: data.length }
    : { items: data.items || [], total: data.total_count || data.total || 0 };
};

export const fetchMappingsByClass = async (classId: string, params?: {
  academic_year_id?: string;
  active_only?: boolean;
}): Promise<ClassSubjectMapping[]> => {
  const queryParams = new URLSearchParams();
  if (params?.academic_year_id) queryParams.append('academic_year_id', params.academic_year_id);
  if (params?.active_only !== undefined) queryParams.append('active_only', params.active_only.toString());

  const queryString = queryParams.toString();
  const url = queryString ? `${CLASS_SUBJECT_MAPPINGS_API_BASE}by-class/${classId}?${queryString}` : `${CLASS_SUBJECT_MAPPINGS_API_BASE}by-class/${classId}`;

  const { data } = await CAxios.get(url);
  return data;
};

export const fetchMappingsDropdown = async (params?: {
  class_id?: string;
  academic_year_id?: string;
}): Promise<ClassSubjectMappingDropdown[]> => {
  const queryParams = new URLSearchParams();
  if (params?.class_id) queryParams.append('class_id', params.class_id);
  if (params?.academic_year_id) queryParams.append('academic_year_id', params.academic_year_id);

  const queryString = queryParams.toString();
  const url = queryString ? `${CLASS_SUBJECT_MAPPINGS_API_BASE}dropdown?${queryString}` : `${CLASS_SUBJECT_MAPPINGS_API_BASE}dropdown`;

  const { data } = await CAxios.get(url);
  return data;
};

export const fetchMappingById = async (id: string): Promise<ClassSubjectMapping> => {
  const { data } = await CAxios.get(`${CLASS_SUBJECT_MAPPINGS_API_BASE}${id}`);
  return data;
};

export const createClassSubjectMapping = async (mapping: ClassSubjectMappingInput): Promise<ClassSubjectMapping> => {
  const { data } = await CAxios.post(CLASS_SUBJECT_MAPPINGS_API_BASE, mapping);
  return data;
};

export const createBulkClassSubjectMappings = async (request: ClassSubjectMappingBulkCreate): Promise<ClassSubjectMappingBulkResponse> => {
  const { data } = await CAxios.post(`${CLASS_SUBJECT_MAPPINGS_API_BASE}bulk`, request);
  return data;
};

export const updateClassSubjectMapping = async (id: string, mapping: ClassSubjectMappingUpdate): Promise<ClassSubjectMapping> => {
  const { data } = await CAxios.put(`${CLASS_SUBJECT_MAPPINGS_API_BASE}${id}`, mapping);
  return data;
};

export const deleteClassSubjectMapping = async (id: string): Promise<void> => {
  await CAxios.delete(`${CLASS_SUBJECT_MAPPINGS_API_BASE}${id}`);
};

export interface ByClassesSubjectEntry {
  subject_id: string;
  subject_name: string;
  order: number;
  exclude_marks: boolean;
}

export const fetchMappingsByClasses = async (params: {
  class_ids: string[];
  academic_year_id?: string;
  active_only?: boolean;
}): Promise<Record<string, ByClassesSubjectEntry[]>> => {
  const queryParams = new URLSearchParams();
  params.class_ids.forEach(id => queryParams.append('class_ids', id));
  if (params.academic_year_id) queryParams.append('academic_year_id', params.academic_year_id);
  if (params.active_only !== undefined) queryParams.append('active_only', params.active_only.toString());

  const { data } = await CAxios.get(`${CLASS_SUBJECT_MAPPINGS_API_BASE}by-classes?${queryParams.toString()}`);
  return data;
};
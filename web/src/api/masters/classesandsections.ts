import CAxios from '@/api';
import type {
    ClassCreate,
    ClassRead,
    ClassUpdate,
    ClassDropdown,
    SectionDropdown,
    SectionRead,
    SectionUpdate,
    SectionOut
} from '@/types/masters/classesandsections';
import type { StudentAdmissionResponse } from '@/types/admission';
import { CLASSES_AND_SECTIONS_API_BASE } from '@/constants/api/masters/classesandsections';

// API endpoints
const CLASSES_AND_SECTIONS_BASE = CLASSES_AND_SECTIONS_API_BASE;

// Create class with sections
export const createClassSections = async (input: ClassCreate): Promise<ClassRead> => {
    const { data } = await CAxios.post<ClassRead>(CLASSES_AND_SECTIONS_BASE, input);
    return data;
};

// Read all classes with sections
export const readAllClassSections = async (params?: {
    skip?: number;
    limit?: number;
    academic_year_id?: string;
    active_only?: boolean;
}): Promise<ClassRead[]> => {
    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params?.academic_year_id) queryParams.append('academic_year_id', params.academic_year_id);
    // Set active_only to false by default for table display, or use provided value
    const activeOnly = params?.active_only !== undefined ? params.active_only : false;
    queryParams.append('active_only', activeOnly.toString());

    const queryString = queryParams.toString();
    const url = queryString ? `${CLASSES_AND_SECTIONS_BASE}read_all?${queryString}` : `${CLASSES_AND_SECTIONS_BASE}read_all`;

    const { data } = await CAxios.get<ClassRead[]>(url);
    return data;
};

// Get classes for dropdown
export const getClassesDropdown = async (active_only?: boolean): Promise<ClassDropdown[]> => {
    const queryParams = new URLSearchParams();
    if (active_only !== undefined) queryParams.append('active_only', active_only.toString());
    const queryString = queryParams.toString();
    const url = queryString ? `${CLASSES_AND_SECTIONS_BASE}dropdown?${queryString}` : `${CLASSES_AND_SECTIONS_BASE}dropdown`;
    const { data } = await CAxios.get<ClassDropdown[]>(url);
    return data;
};

// Get sections by class ID
export const getSectionsByClassId = async (class_id: string): Promise<SectionDropdown[]> => {
    const { data } = await CAxios.get<SectionDropdown[]>(`${CLASSES_AND_SECTIONS_BASE}by_class_id/${class_id}/sections`);
    return data;
};

// Update class with sections
export const updateClassSections = async (
  classId: string,
  input: ClassUpdate
): Promise<ClassRead> => {
  const { data } = await CAxios.put<ClassRead>(
    `${CLASSES_AND_SECTIONS_BASE}${classId}`,
    input
  );
  return data;
};

// Delete class and its sections
export const deleteClassSections = async (classId: string): Promise<void> => {
  await CAxios.delete(`${CLASSES_AND_SECTIONS_BASE}${classId}`);
};

// Section-specific operations (through class)
export const createSection = async (classId: string, sectionData: { name: string; description?: string; is_active?: boolean }): Promise<any> => {
  const { data } = await CAxios.post(`${CLASSES_AND_SECTIONS_BASE}${classId}/sections`, [sectionData]);
  return data;
};

export const createSections = async (classId: string, sections: { name: string; description?: string; is_active?: boolean }[]): Promise<any> => {
  const { data } = await CAxios.post(`${CLASSES_AND_SECTIONS_BASE}${classId}/sections`, sections);
  return data;
};

export const updateSection = async (classId: string, sectionId: string, sectionData: { name?: string; description?: string; is_active?: boolean }): Promise<any> => {
  const { data } = await CAxios.put(`${CLASSES_AND_SECTIONS_BASE}${classId}/sections/${sectionId}`, sectionData);
  return data;
};

export const deleteSection = async (classId: string, sectionId: string): Promise<void> => {
  await CAxios.delete(`${CLASSES_AND_SECTIONS_BASE}${classId}/sections/${sectionId}`);
};

// Direct section operations (individual section management)
export const getSectionById = async (sectionId: string): Promise<SectionOut> => {
  const { data } = await CAxios.get<SectionOut>(`${CLASSES_AND_SECTIONS_BASE}sections/${sectionId}`);
  return data;
};

export const updateSectionById = async (sectionId: string, sectionData: SectionUpdate): Promise<SectionOut> => {
  const { data } = await CAxios.put<SectionOut>(`${CLASSES_AND_SECTIONS_BASE}sections/${sectionId}`, sectionData);
  return data;
};

export const deleteSectionById = async (sectionId: string): Promise<void> => {
  await CAxios.delete(`${CLASSES_AND_SECTIONS_BASE}sections/${sectionId}`);
};

// Get students by class and section
export const getStudentsByClassSection = async (
  classId: string,
  sectionId: string,
  asOfDate?: string
): Promise<StudentAdmissionResponse[]> => {
  console.log('getStudentsByClassSection called with:', { classId, sectionId, asOfDate });

  const queryParams = new URLSearchParams();
  queryParams.append('class_id', classId);
  if (sectionId) {
    queryParams.append('section_id', sectionId);
  }
  queryParams.append('active_only', 'true');
  if (asOfDate) {
    queryParams.append('as_of_date', asOfDate);
  }

  // Use the correct student admission endpoint
  const url = `/students/admission/?${queryParams.toString()}`;
  console.log('API URL:', url);

  try {
    const { data } = await CAxios.get<{ items: StudentAdmissionResponse[] }>(url);
    console.log('API Response data:', data);
    console.log('API Response items length:', data.items?.length || 0);
    return data.items || [];
  } catch (error) {
    console.error('API Error in getStudentsByClassSection:', error);
    throw error;
  }
};

// Alias for backward compatibility
export const fetchClassesAndSections = readAllClassSections;


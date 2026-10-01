import CAxios from '../index';
import type {
  Parent,
  ParentCreateRequest,
  ParentUpdateRequest,
  ParentListResponse,
  StudentParentLink,
  StudentParentLinkInput
} from '@/types/masters/parent';

export const parentsApi = {
  // Get all parents
  getAllParents: async (params?: {
    skip?: number;
    limit?: number;
  }): Promise<ParentListResponse> => {

    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

    const response = await CAxios.get(`/parents/?${queryParams.toString()}`);
    return response.data;
  },

  // Get parent by ID
  getParentById: async (id: string): Promise<Parent> => {

    const response = await CAxios.get(`/parents/${id}`);
    return response.data;
  },

  // Search parent by phone
  searchParentByPhone: async (phone: string): Promise<Parent | null> => {

    try {
      const response = await CAxios.get(`/parents/search?phone=${phone}`);
      return response.data;
    } catch (error) {
      return null;
    }
  },

  // Create new parent
  createParent: async (data: ParentCreateRequest): Promise<Parent> => {

    try {
      const response = await CAxios.post('/parents/', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update parent
  updateParent: async (id: string, data: ParentUpdateRequest): Promise<Parent> => {

    const response = await CAxios.patch(`/parents/${id}`, data);
    return response.data;
  },

  // Delete parent
  deleteParent: async (id: string): Promise<void> => {

    await CAxios.delete(`/parents/${id}`);
  },

  // Get parent's students
  getParentStudents: async (parentId: string): Promise<StudentParentLink[]> => {

    const response = await CAxios.get(`/parents/${parentId}/students`);
    return response.data;
  },

  // Associate parent with student
  createStudentParentLink: async (data: StudentParentLinkInput): Promise<StudentParentLink> => {

    const response = await CAxios.post('/student-parent-links/', data);
    return response.data;
  },

  // Remove student-parent association
  deleteStudentParentLink: async (linkId: string): Promise<void> => {

    await CAxios.delete(`/student-parent-links/${linkId}`);
  },
};

export const {
  getAllParents,
  getParentById,
  searchParentByPhone,
  createParent,
  updateParent,
  deleteParent,
  getParentStudents,
  createStudentParentLink,
  deleteStudentParentLink,
} = parentsApi;
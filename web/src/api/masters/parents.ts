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
    console.log('[DEBUG] parentsApi.getAllParents called with params:', params);

    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

    const response = await CAxios.get(`/parents/?${queryParams.toString()}`);
    console.log('[DEBUG] parentsApi.getAllParents returning:', response.data);
    return response.data;
  },

  // Get parent by ID
  getParentById: async (id: string): Promise<Parent> => {
    console.log('[DEBUG] parentsApi.getParentById called with id:', id);

    const response = await CAxios.get(`/parents/${id}`);
    console.log('[DEBUG] parentsApi.getParentById returning:', response.data);
    return response.data;
  },

  // Create new parent
  createParent: async (data: ParentCreateRequest): Promise<Parent> => {
    console.log('[DEBUG] parentsApi.createParent called with data:', data);

    try {
      const response = await CAxios.post('/parents/', data);
      console.log('[DEBUG] parentsApi.createParent success:', response.data);
      return response.data;
    } catch (error) {
      console.error('[DEBUG] parentsApi.createParent failed:', error);
      throw error;
    }
  },

  // Update parent
  updateParent: async (id: string, data: ParentUpdateRequest): Promise<Parent> => {
    console.log('[DEBUG] parentsApi.updateParent called with id:', id, 'data:', data);

    const response = await CAxios.patch(`/parents/${id}`, data);
    console.log('[DEBUG] parentsApi.updateParent updated:', response.data);
    return response.data;
  },

  // Delete parent
  deleteParent: async (id: string): Promise<void> => {
    console.log('[DEBUG] parentsApi.deleteParent called with id:', id);

    await CAxios.delete(`/parents/${id}`);
    console.log('[DEBUG] parentsApi.deleteParent deleted parent with id:', id);
  },

  // Get parent's students
  getParentStudents: async (parentId: string): Promise<StudentParentLink[]> => {
    console.log('[DEBUG] parentsApi.getParentStudents called with parentId:', parentId);

    const response = await CAxios.get(`/parents/${parentId}/students`);
    console.log('[DEBUG] parentsApi.getParentStudents returning:', response.data);
    return response.data;
  },

  // Associate parent with student
  createStudentParentLink: async (data: StudentParentLinkInput): Promise<StudentParentLink> => {
    console.log('[DEBUG] parentsApi.createStudentParentLink called with data:', data);

    const response = await CAxios.post('/student-parent-links/', data);
    console.log('[DEBUG] parentsApi.createStudentParentLink success:', response.data);
    return response.data;
  },

  // Remove student-parent association
  deleteStudentParentLink: async (linkId: string): Promise<void> => {
    console.log('[DEBUG] parentsApi.deleteStudentParentLink called with linkId:', linkId);

    await CAxios.delete(`/student-parent-links/${linkId}`);
    console.log('[DEBUG] parentsApi.deleteStudentParentLink deleted link with id:', linkId);
  },
};

export const {
  getAllParents,
  getParentById,
  createParent,
  updateParent,
  deleteParent,
  getParentStudents,
  createStudentParentLink,
  deleteStudentParentLink,
} = parentsApi;
import CAxios from '../index';
import type {
  Caste,
  SubCaste,
  CasteDropdownOption,
  SubCasteDropdownOption,
  CasteCreateRequest,
  CasteUpdateRequest,
  SubCasteCreateRequest,
  SubCasteUpdateRequest,
} from '@/types/masters';

export const castesApi = {
  // Dropdown endpoints (for admission form)
  getCastesDropdown: async (activeOnly: boolean = true): Promise<CasteDropdownOption[]> => {
    try {
      const response = await CAxios.get(`/masters/castes/dropdown?active_only=${activeOnly}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching castes dropdown:', error);
      throw error;
    }
  },

  getSubCastesDropdown: async (
    casteId: string,
    activeOnly: boolean = true
  ): Promise<SubCasteDropdownOption[]> => {
    try {
      const response = await CAxios.get(
        `/masters/castes/${casteId}/sub-castes/dropdown?active_only=${activeOnly}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching sub-castes dropdown:', error);
      throw error;
    }
  },

  // CRUD endpoints (for master data management pages)
  getCastes: async (skip: number = 0, limit: number = 20, activeOnly: boolean = false): Promise<Caste[]> => {
    try {
      const response = await CAxios.get(
        `/masters/castes/?skip=${skip}&limit=${limit}&active_only=${activeOnly}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching castes:', error);
      throw error;
    }
  },

  getCaste: async (id: string): Promise<Caste> => {
    try {
      const response = await CAxios.get(`/masters/castes/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching caste:', error);
      throw error;
    }
  },

  createCaste: async (data: CasteCreateRequest): Promise<Caste> => {
    try {
      const response = await CAxios.post('/masters/castes/', data);
      return response.data;
    } catch (error) {
      console.error('Error creating caste:', error);
      throw error;
    }
  },

  updateCaste: async (id: string, data: CasteUpdateRequest): Promise<Caste> => {
    try {
      const response = await CAxios.put(`/masters/castes/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating caste:', error);
      throw error;
    }
  },

  deleteCaste: async (id: string): Promise<void> => {
    try {
      await CAxios.delete(`/masters/castes/${id}`);
    } catch (error) {
      console.error('Error deleting caste:', error);
      throw error;
    }
  },

  // Sub-caste CRUD
  getSubCastes: async (casteId: string, activeOnly: boolean = false): Promise<SubCaste[]> => {
    try {
      const response = await CAxios.get(
        `/masters/castes/${casteId}/sub-castes?active_only=${activeOnly}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching sub-castes:', error);
      throw error;
    }
  },

  getSubCaste: async (id: string): Promise<SubCaste> => {
    try {
      const response = await CAxios.get(`/masters/castes/sub-castes/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching sub-caste:', error);
      throw error;
    }
  },

  createSubCaste: async (data: SubCasteCreateRequest): Promise<SubCaste> => {
    try {
      const response = await CAxios.post('/masters/castes/sub-castes', data);
      return response.data;
    } catch (error) {
      console.error('Error creating sub-caste:', error);
      throw error;
    }
  },

  updateSubCaste: async (id: string, data: SubCasteUpdateRequest): Promise<SubCaste> => {
    try {
      const response = await CAxios.put(`/masters/castes/sub-castes/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating sub-caste:', error);
      throw error;
    }
  },

  deleteSubCaste: async (id: string): Promise<void> => {
    try {
      await CAxios.delete(`/masters/castes/sub-castes/${id}`);
    } catch (error) {
      console.error('Error deleting sub-caste:', error);
      throw error;
    }
  },
};

import CAxios from '../index';
import type {
  State,
  District,
  Mandal,
  StateDropdownOption,
  DistrictDropdownOption,
  MandalDropdownOption,
  StateCreateRequest,
  StateUpdateRequest,
  DistrictCreateRequest,
  DistrictUpdateRequest,
  MandalCreateRequest,
  MandalUpdateRequest,
} from '@/types/masters';

export const locationsApi = {
  // Dropdown endpoints (for admission form)
  getStatesDropdown: async (activeOnly: boolean = true): Promise<StateDropdownOption[]> => {
    try {
      const response = await CAxios.get(`/masters/locations/states/dropdown?active_only=${activeOnly}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching states dropdown:', error);
      throw error;
    }
  },

  getDistrictsDropdown: async (
    stateId: string,
    activeOnly: boolean = true
  ): Promise<DistrictDropdownOption[]> => {
    try {
      const response = await CAxios.get(
        `/masters/locations/states/${stateId}/districts/dropdown?active_only=${activeOnly}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching districts dropdown:', error);
      throw error;
    }
  },

  getMandalsDropdown: async (
    districtId: string,
    activeOnly: boolean = true
  ): Promise<MandalDropdownOption[]> => {
    try {
      const response = await CAxios.get(
        `/masters/locations/districts/${districtId}/mandals/dropdown?active_only=${activeOnly}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching mandals dropdown:', error);
      throw error;
    }
  },

  // State CRUD
  getStates: async (skip: number = 0, limit: number = 20, activeOnly: boolean = false): Promise<State[]> => {
    try {
      const response = await CAxios.get(
        `/masters/locations/states?skip=${skip}&limit=${limit}&active_only=${activeOnly}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching states:', error);
      throw error;
    }
  },

  getState: async (id: string): Promise<State> => {
    try {
      const response = await CAxios.get(`/masters/locations/states/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching state:', error);
      throw error;
    }
  },

  createState: async (data: StateCreateRequest): Promise<State> => {
    try {
      const response = await CAxios.post('/masters/locations/states', data);
      return response.data;
    } catch (error) {
      console.error('Error creating state:', error);
      throw error;
    }
  },

  updateState: async (id: string, data: StateUpdateRequest): Promise<State> => {
    try {
      const response = await CAxios.put(`/masters/locations/states/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating state:', error);
      throw error;
    }
  },

  deleteState: async (id: string): Promise<void> => {
    try {
      await CAxios.delete(`/masters/locations/states/${id}`);
    } catch (error) {
      console.error('Error deleting state:', error);
      throw error;
    }
  },

  // District CRUD
  getDistricts: async (stateId: string, activeOnly: boolean = false): Promise<District[]> => {
    try {
      const response = await CAxios.get(
        `/masters/locations/states/${stateId}/districts?active_only=${activeOnly}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching districts:', error);
      throw error;
    }
  },

  getDistrict: async (id: string): Promise<District> => {
    try {
      const response = await CAxios.get(`/masters/locations/districts/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching district:', error);
      throw error;
    }
  },

  createDistrict: async (data: DistrictCreateRequest): Promise<District> => {
    try {
      const response = await CAxios.post('/masters/locations/districts', data);
      return response.data;
    } catch (error) {
      console.error('Error creating district:', error);
      throw error;
    }
  },

  updateDistrict: async (id: string, data: DistrictUpdateRequest): Promise<District> => {
    try {
      const response = await CAxios.put(`/masters/locations/districts/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating district:', error);
      throw error;
    }
  },

  deleteDistrict: async (id: string): Promise<void> => {
    try {
      await CAxios.delete(`/masters/locations/districts/${id}`);
    } catch (error) {
      console.error('Error deleting district:', error);
      throw error;
    }
  },

  // Mandal CRUD
  getMandals: async (districtId: string, activeOnly: boolean = false): Promise<Mandal[]> => {
    try {
      const response = await CAxios.get(
        `/masters/locations/districts/${districtId}/mandals?active_only=${activeOnly}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching mandals:', error);
      throw error;
    }
  },

  getMandal: async (id: string): Promise<Mandal> => {
    try {
      const response = await CAxios.get(`/masters/locations/mandals/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching mandal:', error);
      throw error;
    }
  },

  createMandal: async (data: MandalCreateRequest): Promise<Mandal> => {
    try {
      const response = await CAxios.post('/masters/locations/mandals', data);
      return response.data;
    } catch (error) {
      console.error('Error creating mandal:', error);
      throw error;
    }
  },

  updateMandal: async (id: string, data: MandalUpdateRequest): Promise<Mandal> => {
    try {
      const response = await CAxios.put(`/masters/locations/mandals/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating mandal:', error);
      throw error;
    }
  },

  deleteMandal: async (id: string): Promise<void> => {
    try {
      await CAxios.delete(`/masters/locations/mandals/${id}`);
    } catch (error) {
      console.error('Error deleting mandal:', error);
      throw error;
    }
  },
};

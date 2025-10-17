import { useMutation, useQuery } from '@tanstack/react-query';
import CAxios from './index';
import type {
  FullTimetableCreate,
  GroupedSectionTimetableOut,
  TimetableSlotBulkUpdateRequest,
  FrontendTimetableCreate,
  FrontendTimetableRead
} from '@/types/masters/timetable';

// API functions
export const timetableApi = {
  /**
   * Create full timetable
   * POST /students/timetable/bulk
   */
  createFullTimetable: async (data: FullTimetableCreate): Promise<void> => {
    try {
      await CAxios.post('/students/timetable/bulk', data);
    } catch (error: any) {
      if (error.response?.status === 400) {
        throw new Error(error.response.data.detail || 'Validation error occurred');
      }
      if (error.response?.status === 403) {
        throw new Error('Permission denied: timetables:create');
      }
      if (error.response?.status === 409) {
        throw new Error(error.response.data.detail || 'Duplicate entry or dependency exists');
      }
      if (error.response?.status === 422) {
        throw new Error('Invalid data provided');
      }

      // Generic error handling
      throw new Error(error.response?.data?.detail || error.message || 'Failed to create full timetable');
    }
  },

  /**
   * Get timetable by section
   * GET /students/timetable/section/{section_id}
   */
  getTimetableBySection: async (sectionId: string): Promise<GroupedSectionTimetableOut> => {
    try {
      const response = await CAxios.get<GroupedSectionTimetableOut>(`/students/timetable/section/${sectionId}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Timetable not found for this section');
      }
      if (error.response?.status === 403) {
        throw new Error('Permission denied: timetables:read');
      }

      // Generic error handling
      throw new Error(error.response?.data?.detail || error.message || 'Failed to fetch timetable');
    }
  },

  /**
    * Bulk update timetable slots
    * PATCH /students/timetable/slots/bulk
    */
  bulkUpdateTimetableSlots: async (data: TimetableSlotBulkUpdateRequest): Promise<void> => {
    try {
      await CAxios.patch('/students/timetable/slots/bulk', data);
    } catch (error: any) {
      if (error.response?.status === 400) {
        throw new Error(error.response.data.detail || 'Validation error occurred');
      }
      if (error.response?.status === 403) {
        throw new Error('Permission denied: timetables:update');
      }
      if (error.response?.status === 404) {
        throw new Error('One or more timetable slots not found');
      }
      if (error.response?.status === 422) {
        throw new Error('Invalid data provided');
      }

      // Generic error handling
      throw new Error(error.response?.data?.detail || error.message || 'Failed to update timetable slots');
    }
  },

  /**
   * Create frontend timetable
   * POST /students/timetable/frontend
   */
  createFrontendTimetable: async (data: FrontendTimetableCreate): Promise<void> => {
    try {
      await CAxios.post('/students/timetable/frontend', data);
    } catch (error: any) {
      if (error.response?.status === 400) {
        throw new Error(error.response.data.detail || 'Validation error occurred');
      }
      if (error.response?.status === 403) {
        throw new Error('Permission denied: timetables:create');
      }
      if (error.response?.status === 409) {
        throw new Error(error.response.data.detail || 'Duplicate entry or dependency exists');
      }
      if (error.response?.status === 422) {
        throw new Error('Invalid data provided');
      }

      // Generic error handling
      throw new Error(error.response?.data?.detail || error.message || 'Failed to create frontend timetable');
    }
  },

  /**
   * Update frontend timetable
   * PUT /students/timetable/frontend/{section_id}
   */
  updateFrontendTimetable: async (sectionId: string, data: FrontendTimetableCreate): Promise<void> => {
    try {
      await CAxios.put(`/students/timetable/frontend/${sectionId}`, data);
    } catch (error: any) {
      if (error.response?.status === 400) {
        throw new Error(error.response.data.detail || 'Validation error occurred');
      }
      if (error.response?.status === 403) {
        throw new Error('Permission denied: timetables:update');
      }
      if (error.response?.status === 404) {
        throw new Error('Timetable not found for this section');
      }
      if (error.response?.status === 422) {
        throw new Error('Invalid data provided');
      }

      // Generic error handling
      throw new Error(error.response?.data?.detail || error.message || 'Failed to update frontend timetable');
    }
  },

  /**
   * Get frontend timetable
   * GET /students/timetable/frontend/{section_id}
   */
  getFrontendTimetable: async (sectionId: string): Promise<FrontendTimetableRead> => {
    try {
      const response = await CAxios.get<FrontendTimetableRead>(`/students/timetable/frontend/${sectionId}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Timetable not found for this section');
      }
      if (error.response?.status === 403) {
        throw new Error('Permission denied: timetables:read');
      }

      // Generic error handling
      throw new Error(error.response?.data?.detail || error.message || 'Failed to fetch frontend timetable');
    }
  }
};

// React Query hooks
export function useCreateFullTimetableMutation() {
  return useMutation({
    mutationFn: async (data: FullTimetableCreate): Promise<void> => {
      return timetableApi.createFullTimetable(data);
    },
    onError: (error: any) => {
      console.error('Full timetable creation error:', error);
      // Error handling can be customized in the component using this hook
    },
  });
}

export function useTimetableBySection(sectionId: string) {
  return useQuery({
    queryKey: ['timetable', 'section', sectionId],
    queryFn: async (): Promise<GroupedSectionTimetableOut> => {
      return timetableApi.getTimetableBySection(sectionId);
    },
    enabled: !!sectionId,
  });
}

export function useBulkUpdateTimetableSlotsMutation() {
  return useMutation({
    mutationFn: async (data: TimetableSlotBulkUpdateRequest): Promise<void> => {
      return timetableApi.bulkUpdateTimetableSlots(data);
    },
    onError: (error: any) => {
      console.error('Bulk timetable slots update error:', error);
      // Error handling can be customized in the component using this hook
    },
  });
}

export function useCreateFrontendTimetableMutation() {
  return useMutation({
    mutationFn: async (data: FrontendTimetableCreate): Promise<void> => {
      return timetableApi.createFrontendTimetable(data);
    },
    onError: (error: any) => {
      console.error('Frontend timetable creation error:', error);
      // Error handling can be customized in the component using this hook
    },
  });
}

export function useUpdateFrontendTimetableMutation() {
  return useMutation({
    mutationFn: async ({ sectionId, data }: { sectionId: string; data: FrontendTimetableCreate }): Promise<void> => {
      return timetableApi.updateFrontendTimetable(sectionId, data);
    },
    onError: (error: any) => {
      console.error('Frontend timetable update error:', error);
      // Error handling can be customized in the component using this hook
    },
  });
}

export function useFrontendTimetable(sectionId: string) {
  return useQuery({
    queryKey: ['timetable', 'frontend', sectionId],
    queryFn: async (): Promise<FrontendTimetableRead> => {
      return timetableApi.getFrontendTimetable(sectionId);
    },
    enabled: !!sectionId,
    retry: (failureCount, error: any) => {
      // Do not retry on 404 errors
      if (error?.message === 'Timetable not found for this section') {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
  });
}
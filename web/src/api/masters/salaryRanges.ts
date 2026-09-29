import CAxios from '../index';
import type { SalaryRange } from '@/types/masters';

export const salaryRangesApi = {
  getDropdownOptions: async (): Promise<SalaryRange[]> => {
    try {
      const response = await CAxios.get('/parents/salary-ranges/dropdown');
      return response.data;
    } catch (error) {
      console.error('Error fetching salary ranges:', error);
      throw error;
    }
  },
};

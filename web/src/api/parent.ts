import CAxios from './index';
import type { ParentProfileOut, ParentProfileUpdate } from '@/types/parent';
export { useParentStudents } from './parent/students';

/**
 * Fetch the authenticated parent's profile
 */
export const getParentProfile = async (): Promise<ParentProfileOut> => {
  const { data } = await CAxios.get<ParentProfileOut>('/profile/parent/me');
  return data;
};

/**
 * Update the authenticated parent's profile
 */
export const updateParentProfile = async (data: ParentProfileUpdate): Promise<ParentProfileOut> => {
  const { data: responseData } = await CAxios.put<ParentProfileOut>('/profile/parent', data);
  return responseData;
};
import CAxios from '@/api';
import type {
  HolidayCreate,
  HolidayRead,
  HolidayUpdate,
  HolidayDropdown,
  PaginatedHolidayResponse
} from '@/types/masters/holiday';
import { HOLIDAYS_API_BASE } from '@/constants/api/masters/holiday';

// Query parameters interface
export interface HolidayQueryParams {
  skip?: number;
  limit?: number;
  active_only?: boolean;
  academic_year_id?: string;
}

// Create a new holiday
export const createHoliday = async (holiday: HolidayCreate): Promise<HolidayRead> => {
  const { data } = await CAxios.post<HolidayRead>(HOLIDAYS_API_BASE, holiday);
  return data;
};

// Get paginated list of holidays
export const getHolidays = async (params?: HolidayQueryParams): Promise<PaginatedHolidayResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
  if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
  if (params?.active_only !== undefined) queryParams.append('active_only', params.active_only.toString());
  if (params?.academic_year_id) queryParams.append('academic_year_id', params.academic_year_id);

  const queryString = queryParams.toString();
  const url = queryString ? `${HOLIDAYS_API_BASE}?${queryString}` : HOLIDAYS_API_BASE;

  const { data } = await CAxios.get<PaginatedHolidayResponse>(url);
  return data;
};

// Get holidays dropdown
export const getHolidaysDropdown = async (activeOnly?: boolean): Promise<HolidayDropdown[]> => {
  const queryParams = new URLSearchParams();
  if (activeOnly !== undefined) queryParams.append('active_only', activeOnly.toString());

  const queryString = queryParams.toString();
  const url = queryString ? `${HOLIDAYS_API_BASE}dropdown?${queryString}` : `${HOLIDAYS_API_BASE}dropdown`;

  const { data } = await CAxios.get<HolidayDropdown[]>(url);
  return data;
};

// Get a single holiday by ID
export const getHoliday = async (holidayId: string): Promise<HolidayRead> => {
  const { data } = await CAxios.get<HolidayRead>(`${HOLIDAYS_API_BASE}${holidayId}`);
  return data;
};

// Update a holiday
export const updateHoliday = async (holidayId: string, holiday: HolidayUpdate): Promise<HolidayRead> => {
  const { data } = await CAxios.put<HolidayRead>(`${HOLIDAYS_API_BASE}${holidayId}`, holiday);
  return data;
};

// Deactivate a holiday
export const deactivateHoliday = async (holidayId: string): Promise<void> => {
  await CAxios.delete(`${HOLIDAYS_API_BASE}${holidayId}`);
};

// Activate a holiday
export const activateHoliday = async (holidayId: string): Promise<void> => {
  await CAxios.patch(`${HOLIDAYS_API_BASE}${holidayId}/activate`);
};
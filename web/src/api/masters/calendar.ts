/*import type { Holiday, HolidayInput } from '@/types/masters/holiday';
import { HOLIDAYS_API_BASE } from '@/constants';
import CAxios from '@/api';

export interface HolidayQueryParams {
  skip?: number;
  limit?: number;
  active_only?: boolean;
  academic_year_id?: number;
}

export const fetchHolidays = async (params: HolidayQueryParams = {}): Promise<Holiday[]> => {
  const res = await CAxios.get(HOLIDAYS_API_BASE, { params });
  console.log("res",res)
  return res.data;
};

export const fetchHolidayById = async (id: number): Promise<Holiday> => {
  const res = await CAxios.get(`${HOLIDAYS_API_BASE}${id}`);
  return res.data;
};

export const createHoliday = async (holiday: HolidayInput): Promise<Holiday> => {
  const res = await CAxios.post(HOLIDAYS_API_BASE, holiday);
  return res.data;
};

export const updateHoliday = async ({ id, holiday }: { id: number; holiday: HolidayInput }): Promise<Holiday> => {
  const res = await CAxios.put(`${HOLIDAYS_API_BASE}${id}`, holiday);
  return res.data;
};

export const deleteHoliday = async (id: number): Promise<void> => {
  await CAxios.delete(`${HOLIDAYS_API_BASE}${id}`);
};
*/
import type { Holiday, HolidayInput } from '@/types/masters/holiday';
import { HOLIDAYS_API_BASE } from '@/constants';
// import CAxios from '../index';

// Sample data for local dev
let sampleHolidays: Holiday[] = [];
let nextId = 1;

export interface HolidayQueryParams {
  skip?: number;
  limit?: number;
  active_only?: boolean;
  academic_year_id?: number;
}
export const fetchHolidays = async (): Promise<Holiday[]> => {
  return [...sampleHolidays];
};

export const fetchHolidayById = async (id: number): Promise<Holiday> => {
  const found = sampleHolidays.find((h) => h.id === id);
  if (!found) throw new Error('Holiday not found');
  return { ...found };
};

export const createHoliday = async (holiday: HolidayInput): Promise<Holiday> => {
  const newHoliday: Holiday = {
    id: nextId++,
    ...holiday,
    color: holiday.color || '#2563eb',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  sampleHolidays.push(newHoliday);
  return { ...newHoliday };
};

export const updateHoliday = async ({ id, holiday }: { id: number; holiday: HolidayInput }): Promise<Holiday> => {
  const index = sampleHolidays.findIndex((h) => h.id === id);
  if (index === -1) throw new Error('Holiday not found');
  const updatedHoliday: Holiday = {
    ...sampleHolidays[index],
    ...holiday,
    color: holiday.color || sampleHolidays[index].color || '#2563eb',
    updated_at: new Date().toISOString(),
  };
  sampleHolidays[index] = updatedHoliday;
  return { ...updatedHoliday };
};

export const deleteHoliday = async (id: number): Promise<void> => {
  const index = sampleHolidays.findIndex((h) => h.id === id);
  if (index !== -1) {
    sampleHolidays.splice(index, 1);
  }
};



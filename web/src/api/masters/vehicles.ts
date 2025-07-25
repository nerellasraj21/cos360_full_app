import type { Vehicle, VehicleInput } from '@/types/masters';

let sampleVehicles: Vehicle[] = [
  {
    id: 1,
    name: 'School Bus',
    registration_number: 'AB12CD3456',
    vehicle_type: 'Bus',
    last_inspected_date: '2023-01-10',
    pollution_renewal_date: '2023-12-31',
    is_active: true,
  },
  {
    id: 2,
    name: 'Staff Car',
    registration_number: 'XY98ZT7654',
    vehicle_type: 'Car',
    last_inspected_date: '2023-02-15',
    pollution_renewal_date: '2024-02-14',
    is_active: true,
  },
  {
    id: 3,
    name: 'Delivery Van',
    registration_number: 'MN45OP1234',
    vehicle_type: 'Van',
    last_inspected_date: '2022-11-20',
    pollution_renewal_date: '2023-11-19',
    is_active: false,
  },
];

export const fetchVehicles = async (): Promise<Vehicle[]> => {
  return [...sampleVehicles];
};

export const fetchVehicleById = async (id: number): Promise<Vehicle> => {
  const vehicle = sampleVehicles.find((v) => v.id === id);
  if (!vehicle) throw new Error('Vehicle not found');
  return { ...vehicle };
};

export const createVehicle = async (vehicle: VehicleInput): Promise<Vehicle> => {
  const newVehicle: Vehicle = {
    ...vehicle,
    id: sampleVehicles.length ? Math.max(...sampleVehicles.map((v) => v.id)) + 1 : 1,
  };
  sampleVehicles.push(newVehicle);
  return { ...newVehicle };
};

export const updateVehicle = async ({ id, vehicle }: { id: number; vehicle: VehicleInput }): Promise<Vehicle> => {
  const idx = sampleVehicles.findIndex((v) => v.id === id);
  if (idx === -1) throw new Error('Vehicle not found');
  const updatedVehicle: Vehicle = {
    ...sampleVehicles[idx],
    ...vehicle,
  };
  sampleVehicles[idx] = updatedVehicle;
  return { ...updatedVehicle };
};

export const deleteVehicle = async (id: number): Promise<void> => {
  sampleVehicles = sampleVehicles.filter((v) => v.id !== id);
};

export const fetchPaginatedVehicles = async (offset = 0, limit = 10): Promise<{ data: Vehicle[]; hasMore: boolean }> => {
  const data = sampleVehicles.slice(offset, offset + limit);
  const hasMore = offset + limit < sampleVehicles.length;
  return { data, hasMore };
};

export const fetchVehiclesPaginated = async (page = 0, pageSize = 10): Promise<{ data: Vehicle[]; total: number; hasMore: boolean }> => {
  const offset = page * pageSize;
  const data = sampleVehicles.slice(offset, offset + pageSize);
  const total = sampleVehicles.length;
  const hasMore = offset + pageSize < total;
  return { data, total, hasMore };
}; 


/*
import type { Vehicle, VehicleInput } from '@/types/masters';
import CAxios from '../index';
import { VEHICLES_API_BASE } from '@/constants';

export const fetchVehicles = async (): Promise<Vehicle[]> => {
  const { data } = await CAxios.get(VEHICLES_API_BASE);
  return data;
};

export const fetchVehicleById = async (id: number): Promise<Vehicle> => {
  const { data } = await CAxios.get(`${VEHICLES_API_BASE}${id}`);
  return data;
};

export const createVehicle = async (vehicle: VehicleInput): Promise<Vehicle> => {
  const { data } = await CAxios.post(VEHICLES_API_BASE, vehicle);
  return data;
};

export const updateVehicle = async ({ id, vehicle }: { id: number; vehicle: VehicleInput }): Promise<Vehicle> => {
  const { data } = await CAxios.put(`${VEHICLES_API_BASE}${id}`, vehicle);
  return data;
};

export const deleteVehicle = async (id: number): Promise<void> => {
  await CAxios.delete(`${VEHICLES_API_BASE}${id}`);
};

export const fetchPaginatedVehicles = async (offset = 0, limit = 10): Promise<{ data: Vehicle[]; hasMore: boolean }> => {
  const { data } = await CAxios.get(VEHICLES_API_BASE, { params: { offset, limit } });
  return data;
};

export const fetchVehiclesPaginated = async (page = 0, pageSize = 10): Promise<{ data: Vehicle[]; total: number; hasMore: boolean }> => {
  const offset = page * pageSize;
  const { data } = await CAxios.get(VEHICLES_API_BASE, { params: { offset, limit: pageSize } });
  return data;
}; */
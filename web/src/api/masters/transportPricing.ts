import CAxios from '../index';
import type {
  TransportPricing,
  TransportPricingInput,
  TransportPricingUpdate,
  TransportPricingDropdown,
} from '@/types/masters/transportPricing';

const API_BASE = '/masters/transport-pricing/';

const handleApiError = (error: any): Error => {
  if (error.response?.data) {
    const apiError = error.response.data;
    return new Error(apiError.detail || 'An error occurred');
  }
  return new Error(error.message || 'Network error');
};

export const createTransportPricing = async (pricing: TransportPricingInput): Promise<TransportPricing> => {
  try {
    const { data } = await CAxios.post(API_BASE, pricing);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const fetchTransportPricings = async (vehicleId?: string, billingCycle?: string): Promise<TransportPricing[]> => {
  try {
    const params: Record<string, string> = {};
    if (vehicleId) params.vehicle_id = vehicleId;
    if (billingCycle) params.billing_cycle = billingCycle;
    const { data } = await CAxios.get(API_BASE, { params });
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const fetchTransportPricingById = async (pricingId: string): Promise<TransportPricing> => {
  try {
    const { data } = await CAxios.get(`${API_BASE}${pricingId}`);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const updateTransportPricing = async (pricingId: string, pricing: TransportPricingInput): Promise<TransportPricing> => {
  try {
    const { data } = await CAxios.put(`${API_BASE}${pricingId}`, pricing);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const updateTransportPricingPartial = async (pricingId: string, pricing: TransportPricingUpdate): Promise<TransportPricing> => {
  try {
    const { data } = await CAxios.patch(`${API_BASE}${pricingId}`, pricing);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const deleteTransportPricing = async (pricingId: string): Promise<void> => {
  try {
    await CAxios.delete(`${API_BASE}${pricingId}`);
  } catch (error) {
    throw handleApiError(error);
  }
};

export const fetchTransportPricingDropdown = async (vehicleId: string): Promise<TransportPricingDropdown[]> => {
  try {
    const { data } = await CAxios.get(`${API_BASE}dropdown`, {
      params: { vehicle_id: vehicleId },
    });
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

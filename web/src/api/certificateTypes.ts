import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import CAxios from './index';
import type {
  CertificateTypeCreate,
  CertificateTypeUpdate,
  CertificateTypeRead,
  CertificateTypeDropdown,
  PaginatedResponse,
  ErrorResponse
} from '@/types/certificates/types';
import { CERTIFICATE_TYPES_BASE } from '@/constants/api/certificates';

// Fetch all certificate types with pagination
export async function fetchCertificateTypes(params?: {
  skip?: number;
  limit?: number;
}): Promise<PaginatedResponse<CertificateTypeRead>> {
  const queryParams = new URLSearchParams();
  if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
  if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

  const { data } = await CAxios.get<PaginatedResponse<CertificateTypeRead>>(
    `${CERTIFICATE_TYPES_BASE}/?${queryParams.toString()}`
  );
  return data;
}

// Fetch certificate type by ID
export async function fetchCertificateTypeById(id: string): Promise<CertificateTypeRead> {
  const { data } = await CAxios.get<CertificateTypeRead>(`${CERTIFICATE_TYPES_BASE}/${id}`);
  return data;
}

// Fetch certificate types dropdown
export async function fetchCertificateTypesDropdown(): Promise<CertificateTypeDropdown[]> {
  const { data } = await CAxios.get<CertificateTypeDropdown[]>(`${CERTIFICATE_TYPES_BASE}/dropdown`);
  return data;
}

// Create certificate type
export async function createCertificateType(certificateTypeData: CertificateTypeCreate): Promise<CertificateTypeRead> {
  const { data } = await CAxios.post<CertificateTypeRead>(CERTIFICATE_TYPES_BASE + '/', certificateTypeData);
  return data;
}

// Update certificate type
export async function updateCertificateType(id: string, certificateTypeData: CertificateTypeUpdate): Promise<CertificateTypeRead> {
  const { data } = await CAxios.put<CertificateTypeRead>(`${CERTIFICATE_TYPES_BASE}/${id}`, certificateTypeData);
  return data;
}

// Delete certificate type
export async function deleteCertificateType(id: string): Promise<void> {
  await CAxios.delete(`${CERTIFICATE_TYPES_BASE}/${id}`);
}

// React Query hooks
export function useCertificateTypes(params?: { skip?: number; limit?: number }) {
  return useQuery({
    queryKey: ['certificate-types', params],
    queryFn: () => fetchCertificateTypes(params),
  });
}

export function useCertificateType(id: string) {
  return useQuery({
    queryKey: ['certificate-type', id],
    queryFn: () => fetchCertificateTypeById(id),
    enabled: !!id,
  });
}

export function useCertificateTypesDropdown() {
  return useQuery({
    queryKey: ['certificate-types-dropdown'],
    queryFn: fetchCertificateTypesDropdown,
  });
}

export function useCreateCertificateType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCertificateType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificate-types'] });
      queryClient.invalidateQueries({ queryKey: ['certificate-types-dropdown'] });
    },
    onError: (error: any) => {
      console.error('Certificate type creation error:', error);
      if (error.response?.status === 400) {
        const errorData = error.response.data as ErrorResponse;
        if (errorData.detail.includes('duplicate') || errorData.detail.includes('unique')) {
          throw new Error('Certificate type name already exists');
        }
        throw new Error(errorData.detail || 'Invalid data provided');
      } else if (error.response?.status === 403) {
        throw new Error('Permission denied: certificate_types:create');
      }
      throw new Error(error.response?.data?.detail || 'Failed to create certificate type');
    },
  });
}

export function useUpdateCertificateType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CertificateTypeUpdate }) => updateCertificateType(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificate-types'] });
      queryClient.invalidateQueries({ queryKey: ['certificate-types-dropdown'] });
    },
    onError: (error: any) => {
      console.error('Certificate type update error:', error);
      if (error.response?.status === 400) {
        const errorData = error.response.data as ErrorResponse;
        if (errorData.detail.includes('duplicate') || errorData.detail.includes('unique')) {
          throw new Error('Certificate type name already exists');
        }
        throw new Error(errorData.detail || 'Invalid data provided');
      } else if (error.response?.status === 404) {
        throw new Error('Certificate type not found');
      } else if (error.response?.status === 403) {
        throw new Error('Permission denied: certificate_types:update');
      }
      throw new Error(error.response?.data?.detail || 'Failed to update certificate type');
    },
  });
}

export function useDeleteCertificateType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCertificateType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificate-types'] });
      queryClient.invalidateQueries({ queryKey: ['certificate-types-dropdown'] });
    },
    onError: (error: any) => {
      console.error('Certificate type deletion error:', error);
      if (error.response?.status === 400) {
        const errorData = error.response.data as ErrorResponse;
        if (errorData.detail.includes('in use')) {
          throw new Error('Cannot delete certificate type that is in use by student certificates');
        }
        throw new Error(errorData.detail || 'Cannot delete certificate type');
      } else if (error.response?.status === 404) {
        throw new Error('Certificate type not found');
      } else if (error.response?.status === 403) {
        throw new Error('Permission denied: certificate_types:delete');
      }
      throw new Error(error.response?.data?.detail || 'Failed to delete certificate type');
    },
  });
}
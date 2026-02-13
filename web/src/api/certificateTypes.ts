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
import { toast } from 'sonner';

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
      toast.success('Certificate type created successfully');
    },
    onError: (error: any) => {
      console.error('Certificate type creation error:', error);
      let errorMessage = 'Failed to create certificate type';

      if (error.response?.status === 400) {
        const errorData = error.response.data as ErrorResponse;
        if (errorData.detail.includes('duplicate') || errorData.detail.includes('unique')) {
          errorMessage = 'Certificate type name already exists';
        } else {
          errorMessage = errorData.detail || 'Invalid data provided';
        }
      } else if (error.response?.status === 403) {
        errorMessage = 'Permission denied: certificate_types:create';
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }

      toast.error(errorMessage);
      throw new Error(errorMessage);
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
      toast.success('Certificate type updated successfully');
    },
    onError: (error: any) => {
      console.error('Certificate type update error:', error);
      let errorMessage = 'Failed to update certificate type';

      if (error.response?.status === 400) {
        const errorData = error.response.data as ErrorResponse;
        if (errorData.detail.includes('duplicate') || errorData.detail.includes('unique')) {
          errorMessage = 'Certificate type name already exists';
        } else {
          errorMessage = errorData.detail || 'Invalid data provided';
        }
      } else if (error.response?.status === 404) {
        errorMessage = 'Certificate type not found';
      } else if (error.response?.status === 403) {
        errorMessage = 'Permission denied: certificate_types:update';
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }

      toast.error(errorMessage);
      throw new Error(errorMessage);
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
      toast.success('Certificate type deleted successfully');
    },
    onError: (error: any) => {
      console.error('Certificate type deletion error:', error);
      let errorMessage = 'Failed to delete certificate type';

      if (error.response?.status === 400) {
        const errorData = error.response.data as ErrorResponse;
        if (errorData.detail.includes('in use')) {
          errorMessage = 'Cannot delete certificate type that is in use by student certificates';
        } else {
          errorMessage = errorData.detail || 'Cannot delete certificate type';
        }
      } else if (error.response?.status === 404) {
        errorMessage = 'Certificate type not found';
      } else if (error.response?.status === 403) {
        errorMessage = 'Permission denied: certificate_types:delete';
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }

      toast.error(errorMessage);
      throw new Error(errorMessage);
    },
  });
}
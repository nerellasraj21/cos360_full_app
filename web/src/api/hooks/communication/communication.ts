import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { communicationApi } from '@/api/communication/communicationApi';
import type {
  TemplateCreate,
  TemplateUpdate,
  SendRequest,
  LogFilters,
  TemplateFilters,
  PreviewCountParams,
} from '@/types/communication';

// ─── Query Keys ────────────────────────────────────────────────────────────────

export const communicationKeys = {
  all: ['communication'] as const,
  templates: () => [...communicationKeys.all, 'templates'] as const,
  templateList: (filters?: TemplateFilters) =>
    [...communicationKeys.templates(), 'list', filters] as const,
  template: (id: string) => [...communicationKeys.templates(), id] as const,
  logs: () => [...communicationKeys.all, 'logs'] as const,
  logList: (filters?: LogFilters) => [...communicationKeys.logs(), 'list', filters] as const,
  logDetail: (id: string) => [...communicationKeys.logs(), id] as const,
  previewCount: (params: PreviewCountParams) =>
    [...communicationKeys.all, 'preview-count', params] as const,
};

// ─── Template Hooks ────────────────────────────────────────────────────────────

export function useTemplates(filters?: TemplateFilters) {
  return useQuery({
    queryKey: communicationKeys.templateList(filters),
    queryFn: () => communicationApi.getTemplates(filters),
  });
}

export function useTemplate(id: string | null) {
  return useQuery({
    queryKey: communicationKeys.template(id ?? ''),
    queryFn: () => communicationApi.getTemplate(id!),
    enabled: !!id,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TemplateCreate) => communicationApi.createTemplate(data),
    onSuccess: () => {
      toast.success('Template created successfully');
      queryClient.invalidateQueries({ queryKey: communicationKeys.templates() });
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg || 'Failed to create template');
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TemplateUpdate }) =>
      communicationApi.updateTemplate(id, data),
    onSuccess: () => {
      toast.success('Template updated successfully');
      queryClient.invalidateQueries({ queryKey: communicationKeys.templates() });
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg || 'Failed to update template');
    },
  });
}

export function useDeactivateTemplate() {
  const queryClient = useQueryClient();
  return useMutation<import('@/types/communication').Template, Error, string>({
    mutationFn: (id: string) => communicationApi.deactivateTemplate(id),
    onSuccess: () => {
      toast.success('Template deactivated');
      queryClient.invalidateQueries({ queryKey: communicationKeys.templates() });
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg || 'Failed to deactivate template');
    },
  });
}

// ─── Send / Preview Hooks ──────────────────────────────────────────────────────

export function usePreviewCount(params: PreviewCountParams | null) {
  return useQuery({
    queryKey: communicationKeys.previewCount(params!),
    queryFn: () => communicationApi.getPreviewCount(params!),
    enabled: !!params,
    staleTime: 30_000,
  });
}

export function useSendNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SendRequest) => communicationApi.sendNotification(data),
    onSuccess: (result) => {
      toast.success(`${result.queued_count} messages queued successfully`);
      queryClient.invalidateQueries({ queryKey: communicationKeys.logs() });
    },
    onError: (error: unknown) => {
      const axiosErr = error as { response?: { status?: number; data?: { detail?: string } } };
      if (axiosErr.response?.status === 429) {
        toast.error('Rate limit exceeded. Please wait a moment before sending again.');
      } else if (axiosErr.response?.status === 403) {
        toast.error('Permission denied');
      } else {
        toast.error(axiosErr.response?.data?.detail || 'Failed to send notification');
      }
    },
  });
}

// ─── Log Hooks ─────────────────────────────────────────────────────────────────

export function useLogs(filters?: LogFilters) {
  return useQuery({
    queryKey: communicationKeys.logList(filters),
    queryFn: () => communicationApi.getLogs(filters),
  });
}

export function useLogDetail(id: string | null) {
  return useQuery({
    queryKey: communicationKeys.logDetail(id ?? ''),
    queryFn: () => communicationApi.getLogDetail(id!),
    enabled: !!id,
  });
}

// src/api/hooks/students/useIssuableCertificates.ts
// React Query hooks for Issuable Certificate management

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import CAxios from "@/api/index";
import { toast } from "sonner";
import type {
  IssuableCertificateTemplate,
  IssuedCertificate,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  GenerateCertificateRequest,
  GenerateCertificateResponse,
} from "@/types/certificates/issuable";

// Query key factory
const issuableCertificateKeys = {
  all: ["issuable-certificates"] as const,

  // Templates
  templates: () => [...issuableCertificateKeys.all, "templates"] as const,
  templatesList: () => [...issuableCertificateKeys.templates(), "list"] as const,
  template: (id: string) => [...issuableCertificateKeys.templates(), id] as const,

  // Issued certificates
  issued: () => [...issuableCertificateKeys.all, "issued"] as const,
  issuedList: () => [...issuableCertificateKeys.issued(), "list"] as const,
  issuedDetail: (id: string) => [...issuableCertificateKeys.issued(), id] as const,
  issuedByStudent: (studentId: string) =>
    [...issuableCertificateKeys.issued(), "student", studentId] as const,
};

// ============================================================================
// TEMPLATE HOOKS
// ============================================================================

export const useIssuableCertificateTemplates = () => {
  return useQuery({
    queryKey: issuableCertificateKeys.templatesList(),
    queryFn: async () => {
      const response = await CAxios.get<IssuableCertificateTemplate[]>(
        "/issuable-certificates/templates/"
      );
      return response.data;
    },
  });
};

export const useIssuableCertificateTemplate = (templateId: string) => {
  return useQuery({
    queryKey: issuableCertificateKeys.template(templateId),
    queryFn: async () => {
      const response = await CAxios.get<IssuableCertificateTemplate>(
        `/issuable-certificates/templates/${templateId}/`
      );
      return response.data;
    },
    enabled: !!templateId,
  });
};

export const useCreateIssuableCertificateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTemplateRequest) => {
      const response = await CAxios.post<IssuableCertificateTemplate>(
        "/issuable-certificates/templates/",
        data
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: issuableCertificateKeys.templatesList() });
      toast.success(`Template "${data.name}" created successfully`);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || "Failed to create template");
    },
  });
};

export const useUpdateIssuableCertificateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      data,
    }: {
      templateId: string;
      data: UpdateTemplateRequest;
    }) => {
      const response = await CAxios.put<IssuableCertificateTemplate>(
        `/issuable-certificates/templates/${templateId}/`,
        data
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: issuableCertificateKeys.templatesList() });
      queryClient.invalidateQueries({ queryKey: issuableCertificateKeys.template(variables.templateId) });
      toast.success(`Template "${data.name}" updated successfully`);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || "Failed to update template");
    },
  });
};

export const useDeleteIssuableCertificateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      await CAxios.delete(`/issuable-certificates/templates/${templateId}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: issuableCertificateKeys.templatesList() });
      toast.success("Template deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || "Failed to delete template");
    },
  });
};

// ============================================================================
// ISSUED CERTIFICATE HOOKS
// ============================================================================

export const useIssuedCertificatesByStudent = (studentId: string) => {
  return useQuery({
    queryKey: issuableCertificateKeys.issuedByStudent(studentId),
    queryFn: async () => {
      const response = await CAxios.get<IssuedCertificate[]>(
        `/issuable-certificates/issued/?student_id=${studentId}`
      );
      return response.data;
    },
    enabled: !!studentId,
  });
};

export const useIssuedCertificateDetail = (certificateId: string) => {
  return useQuery({
    queryKey: issuableCertificateKeys.issuedDetail(certificateId),
    queryFn: async () => {
      const response = await CAxios.get<IssuedCertificate>(
        `/issuable-certificates/issued/${certificateId}/`
      );
      return response.data;
    },
    enabled: !!certificateId,
  });
};

/**
 * Generate and save a certificate.
 * Backend returns GenerateCertificateResponse: { id, status, message, download_url }.
 * No PDF download endpoint exists — use browser print after saving.
 */
export const useGenerateIssuableCertificate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: GenerateCertificateRequest) => {
      const response = await CAxios.post<GenerateCertificateResponse>(
        "/issuable-certificates/generate/",
        data
      );
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: issuableCertificateKeys.issuedByStudent(variables.student_id),
      });
      toast.success("Certificate saved successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || "Failed to generate certificate");
    },
  });
};

export const useDeleteIssuedCertificate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (certificateId: string) => {
      await CAxios.delete(`/issuable-certificates/issued/${certificateId}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: issuableCertificateKeys.issued() });
      toast.success("Certificate deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || "Failed to delete certificate");
    },
  });
};

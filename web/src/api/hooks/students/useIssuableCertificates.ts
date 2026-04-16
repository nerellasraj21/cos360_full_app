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

/**
 * Get all certificate templates
 */
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

/**
 * Get single certificate template
 */
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

/**
 * Create a new certificate template
 */
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
      queryClient.invalidateQueries({
        queryKey: issuableCertificateKeys.templatesList(),
      });
      toast.success(`Template "${data.name}" created successfully`);
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.detail || "Failed to create template";
      toast.error(message);
    },
  });
};

/**
 * Update a certificate template
 */
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
      queryClient.invalidateQueries({
        queryKey: issuableCertificateKeys.templatesList(),
      });
      queryClient.invalidateQueries({
        queryKey: issuableCertificateKeys.template(variables.templateId),
      });
      toast.success(`Template "${data.name}" updated successfully`);
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.detail || "Failed to update template";
      toast.error(message);
    },
  });
};

/**
 * Delete a certificate template
 */
export const useDeleteIssuableCertificateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      await CAxios.delete(`/issuable-certificates/templates/${templateId}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: issuableCertificateKeys.templatesList(),
      });
      toast.success("Template deleted successfully");
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.detail || "Failed to delete template";
      toast.error(message);
    },
  });
};

// ============================================================================
// ISSUED CERTIFICATE HOOKS
// ============================================================================

/**
 * Get all issued certificates for a student
 */
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

/**
 * Get single issued certificate details
 */
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
 * Generate and issue a certificate
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
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: issuableCertificateKeys.issuedByStudent(variables.student_id),
      });
      toast.success("Certificate generated and saved successfully");
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.detail || "Failed to generate certificate";
      toast.error(message);
    },
  });
};

/**
 * Download issued certificate as PDF
 */
export const useDownloadIssuedCertificatePdf = () => {
  return useMutation({
    mutationFn: async (certificateId: string) => {
      const response = await CAxios.get(
        `/issuable-certificates/issued/${certificateId}/download/`,
        {
          responseType: "blob",
        }
      );
      return response.data;
    },
    onSuccess: (blob: Blob, certificateId: string) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `certificate-${certificateId}.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      toast.success("Certificate downloaded");
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.detail || "Failed to download certificate";
      toast.error(message);
    },
  });
};

/**
 * Delete an issued certificate
 */
export const useDeleteIssuedCertificate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (certificateId: string) => {
      await CAxios.delete(`/issuable-certificates/issued/${certificateId}/`);
    },
    onSuccess: (_, certificateId) => {
      queryClient.invalidateQueries({
        queryKey: issuableCertificateKeys.issued(),
      });
      toast.success("Certificate deleted successfully");
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.detail || "Failed to delete certificate";
      toast.error(message);
    },
  });
};

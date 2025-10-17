import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
    ClassCreate,
    ClassRead,
    ClassUpdate,
    ClassDropdown,
    SectionRead,
    SectionUpdate,
    SectionOut
} from '@/types/masters/classesandsections';
import type { StudentAdmissionResponse } from '@/types/admission';
import {
  createClassSections,
  readAllClassSections,
  getClassesDropdown,
  updateClassSections,
  deleteClassSections,
  createSection,
  updateSection,
  deleteSection,
  getSectionById,
  updateSectionById,
  deleteSectionById,
  getStudentsByClassSection
} from '@/api/masters/classesandsections';
import { toast } from 'sonner';
import { useAcademicYearStore } from '@/lib/academicYearStore';

// Legacy types for backward compatibility
interface ClassAndSection {
    id: string;
    class_name: string;
    section_name: string;
    class_code: string;
    is_active: boolean | undefined;
    academic_year_id: string;
    created_at?: Date;
    updated_at?: Date;
}

interface ClassAndSectionInput {
    class_name: string;
    class_code: string;
    sections: { section_name: string }[];
    academic_year_id: string;
}

// New hooks for API-compliant endpoints
export function useReadAllClassSections(params?: {
    skip?: number;
    limit?: number;
    academic_year_id?: string;
}, enabled: boolean = true) {
    return useQuery<ClassRead[]>({
        queryKey: ['class-sections', 'read-all', params],
        queryFn: () => readAllClassSections(params),
        enabled,
    });
}

export function useClassSectionsDropdown() {
    return useQuery<ClassRead[]>({
        queryKey: ['class-sections', 'dropdown'],
        queryFn: () => readAllClassSections({ active_only: true }),
    });
}

export function useCreateClassSections() {
    const queryClient = useQueryClient();
    return useMutation<ClassRead, Error, ClassCreate>({
        mutationFn: (data) => {
            console.log('useCreateClassSections: mutationFn called with data:', data);
            return createClassSections(data);
        },
        onSuccess: (data) => {
            console.log('useCreateClassSections: onSuccess called with response:', data);
            toast.success('Class and sections created successfully!');
            queryClient.invalidateQueries({ queryKey: ['class-sections'] });
        },
        onError: (error) => {
            console.error('useCreateClassSections: onError called with error:', error);
            toast.error(`Failed to create class and sections: ${error.message}`);
        },
    });
}

export function useUpdateClassSections() {
    const queryClient = useQueryClient();
    return useMutation<ClassRead, Error, { classId: string; input: ClassUpdate }>({
        mutationFn: ({ classId, input }) => updateClassSections(classId, input),
        onSuccess: () => {
            toast.success('Class and sections updated successfully!');
            queryClient.invalidateQueries({ queryKey: ['class-sections'] });
        },
        onError: (error) => {
            toast.error(`Failed to update class and sections: ${error.message}`);
        },
    });
}

export function useDeleteClassSections() {
    const queryClient = useQueryClient();
    return useMutation<void, Error, string>({
        mutationFn: deleteClassSections,
        onSuccess: () => {
            toast.success('Class and sections deleted successfully!');
            queryClient.invalidateQueries({ queryKey: ['class-sections'] });
        },
        onError: (error) => {
            toast.error(`Failed to delete class and sections: ${error.message}`);
        },
    });
}

// Legacy hooks for backward compatibility
export function useClassesAndSections(params?: {
    skip?: number;
    limit?: number;
    academic_year_id?: string;
}) {
    const { selectedAcademicYearId } = useAcademicYearStore();

    const queryParams = {
        ...params,
        academic_year_id: params?.academic_year_id || selectedAcademicYearId,
    };

    const { data, ...rest } = useReadAllClassSections(queryParams);

    // Transform ClassRead[] to ClassAndSection[]
    const transformedData: ClassAndSection[] = data?.flatMap((item: ClassRead) =>
        item.sections.map((section: SectionRead) => ({
            id: section.id,
            class_name: item.name,
            section_name: section.name,
            class_code: item.short_code || '',
            is_active: item.is_active,
            academic_year_id: item.academic_year_id,
            created_at: undefined, // SectionRead doesn't have created_at
            updated_at: undefined, // SectionRead doesn't have updated_at
        }))
    ) || [];

    return {
        ...rest,
        data: transformedData,
    };
}

export function useCreateClassAndSection() {
    return useCreateClassSections();
}

export function useUpdateClassAndSection() {
    const queryClient = useQueryClient();
    return useMutation<ClassRead, Error, { id: string; input: ClassAndSectionInput }>({
        mutationFn: async ({ id, input }) => {
            const request: ClassCreate = {
                name: input.class_name,
                short_code: input.class_code,
                sections: input.sections.map((s: { section_name: string }) => ({ name: s.section_name })),
                academic_year_id: input.academic_year_id,
            };
            return updateClassSections(id, request);
        },
        onSuccess: () => {
            toast.success('Class and section updated successfully!');
            queryClient.invalidateQueries({ queryKey: ['class-sections'] });
        },
        onError: (error) => {
            toast.error(`Failed to update class and section: ${error.message}`);
        },
    });
}

export function useDeleteClassAndSection() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteClassSections(id),
    onSuccess: () => {
      toast.success('Class and section deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['class-sections'] });
    },
    onError: (error) => {
      toast.error(`Failed to delete class and section: ${error.message}`);
    },
  });
}

// Section-specific hooks
export function useCreateSection() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { classId: string; sectionData: { name: string; description?: string; is_active?: boolean } }>({
    mutationFn: ({ classId, sectionData }) => createSection(classId, sectionData),
    onSuccess: () => {
      toast.success('Section created successfully!');
      queryClient.invalidateQueries({ queryKey: ['class-sections'] });
    },
    onError: (error) => {
      toast.error(`Failed to create section: ${error.message}`);
    },
  });
}

export function useUpdateSection() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { classId: string; sectionId: string; sectionData: { name?: string; description?: string; is_active?: boolean } }>({
    mutationFn: ({ classId, sectionId, sectionData }) => updateSection(classId, sectionId, sectionData),
    onSuccess: () => {
      toast.success('Section updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['class-sections'] });
    },
    onError: (error) => {
      toast.error(`Failed to update section: ${error.message}`);
    },
  });
}

export function useDeleteSection() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { classId: string; sectionId: string }>({
    mutationFn: ({ classId, sectionId }) => deleteSection(classId, sectionId),
    onSuccess: () => {
      toast.success('Section deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['class-sections'] });
    },
    onError: (error) => {
      toast.error(`Failed to delete section: ${error.message}`);
    },
  });
}

// Direct section operations hooks (individual section management)
export function useGetSectionById(sectionId: string) {
  return useQuery<SectionOut, Error>({
    queryKey: ['section', sectionId],
    queryFn: () => getSectionById(sectionId),
    enabled: !!sectionId,
  });
}

export function useUpdateSectionById() {
  const queryClient = useQueryClient();
  return useMutation<SectionOut, Error, { sectionId: string; sectionData: SectionUpdate }>({
    mutationFn: ({ sectionId, sectionData }) => updateSectionById(sectionId, sectionData),
    onSuccess: (data) => {
      toast.success('Section updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['class-sections'] });
      queryClient.invalidateQueries({ queryKey: ['section', data.id] });
    },
    onError: (error) => {
      toast.error(`Failed to update section: ${error.message}`);
    },
  });
}

export function useDeleteSectionById() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (sectionId) => deleteSectionById(sectionId),
    onSuccess: () => {
      toast.success('Section deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['class-sections'] });
    },
    onError: (error) => {
      toast.error(`Failed to delete section: ${error.message}`);
    },
  });
}

// Hook for fetching students by class and section
export function useStudentsByClassSection(classId: string, sectionId: string) {
  console.log('useStudentsByClassSection called with:', { classId, sectionId });
  return useQuery<StudentAdmissionResponse[]>({
    queryKey: ['students', 'by-class-section', classId, sectionId],
    queryFn: () => getStudentsByClassSection(classId, sectionId),
    enabled: !!classId,
  });
}
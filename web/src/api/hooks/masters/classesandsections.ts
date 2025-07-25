import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ClassAndSection, ClassAndSectionInput } from '@/types/masters';
import {
    fetchClassesAndSections,
    fetchClassAndSectionById,
    createClassAndSection,
    updateClassAndSection,
    deleteClassAndSection,
} from '@/api/masters/classesandsections';
import { toast } from 'sonner';

export function useClassesAndSections() {
    return useQuery<ClassAndSection[]>({
        queryKey: ['classesandsections'],
        queryFn: fetchClassesAndSections,
    });
}

export function useClassAndSection(id: number) {
    return useQuery<ClassAndSection>({
        queryKey: ['classandsection', id],
        queryFn: () => fetchClassAndSectionById(id),
        enabled: !!id,
    });
}

export function useCreateClassAndSection() {
    const queryClient = useQueryClient();
    return useMutation<ClassAndSection, Error, ClassAndSectionInput>({
        mutationFn: createClassAndSection,
        onSuccess: () => {
            toast.success('Class and Section created!');
            queryClient.invalidateQueries({ queryKey: ['classesandsections'] });
        },
        onError: () => {
            toast.error('Failed to create Class and Section');
        },
    });
}

export function useUpdateClassAndSection() {
    const queryClient = useQueryClient();
    return useMutation<ClassAndSection, Error, { id: number; input: ClassAndSectionInput }>({
        mutationFn: updateClassAndSection,
        onSuccess: () => {
            toast.success('Class and Section updated!');
            queryClient.invalidateQueries({ queryKey: ['classesandsections'] });
        },
        onError: () => {
            toast.error('Failed to update Class and Section');
        },
    });
}

export function useDeleteClassAndSection() {
    const queryClient = useQueryClient();
    return useMutation<void, Error, number>({
        mutationFn: deleteClassAndSection,
        onSuccess: () => {
            toast.success('Class and Section deleted!');
            queryClient.invalidateQueries({ queryKey: ['classesandsections'] });
        },
        onError: () => {
            toast.error('Failed to delete Class and Section');
        },
    });
} 
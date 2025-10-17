import { useQuery } from '@tanstack/react-query';
import { getClassesDropdown, getSectionsByClassId } from '@/api/masters/classesandsections';
import type { ClassDropdown, SectionDropdown } from '@/types/masters/classesandsections';

// Query keys for classes and sections
export const classesAndSectionsKeys = {
    all: ['classes-and-sections'] as const,
    classes: () => [...classesAndSectionsKeys.all, 'classes'] as const,
    classesDropdown: (active_only?: boolean) => [...classesAndSectionsKeys.classes(), 'dropdown', active_only] as const,
    sections: () => [...classesAndSectionsKeys.all, 'sections'] as const,
    sectionsByClass: (classId: string) => [...classesAndSectionsKeys.sections(), 'by-class', classId] as const,
};

// Hook for getting classes dropdown
export function useClassesDropdown(active_only?: boolean) {
    return useQuery<ClassDropdown[]>({
        queryKey: classesAndSectionsKeys.classesDropdown(active_only),
        queryFn: () => getClassesDropdown(active_only),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

// Hook for getting sections by class ID
export function useSectionsByClassId(classId: string) {
    return useQuery<SectionDropdown[]>({
        queryKey: classesAndSectionsKeys.sectionsByClass(classId),
        queryFn: () => classId ? getSectionsByClassId(classId) : Promise.resolve([]),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}
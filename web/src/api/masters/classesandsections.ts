// import CAxios from '@/api';
// import type { ClassAndSection, ClassAndSectionInput } from '@/types/masters/classesandsections';
// import { CLASSES_AND_SECTIONS_API_BASE } from '@/constants/api/masters/classesandsections';

// // let sampleClassesAndSections: ClassAndSection[] = [
// //     {
// //         id: 1,
// //         class_name: 'Class 1',
// //         section_name: 'A',
// //         class_code: 'C1A',
// //         is_active: true,
// //         academic_year_id: 2023,
// //         created_at: '2023-01-01T00:00:00Z',
// //         updated_at: '2023-01-01T00:00:00Z',
// //     },
// //     {
// //         id: 2,
// //         class_name: 'Class 2',
// //         section_name: 'B',
// //         class_code: 'C2B',
// //         is_active: true,
// //         academic_year_id: 2023,
// //         created_at: '2023-01-01T00:00:00Z',
// //         updated_at: '2023-01-01T00:00:00Z',
// //     },
// // ];

// // Get all classes and sections
// export const fetchClassesAndSections = async (): Promise<ClassAndSection[]> => {
//     const { data } = await CAxios.get(CLASSES_AND_SECTIONS_API_BASE);
//     return data;
// };

// // Get a class and section by ID
// export const fetchClassAndSectionById = async (id: number): Promise<ClassAndSection> => {
//     const { data } = await CAxios.get(`${CLASSES_AND_SECTIONS_API_BASE}${id}`);
//     return data;
// };

// // Create a new class and section
// export const createClassAndSection = async (input: ClassAndSectionInput): Promise<ClassAndSection> => {
//     const { data } = await CAxios.post(CLASSES_AND_SECTIONS_API_BASE, input);
//     return data;
// };

// // Update a class and section by ID
// export const updateClassAndSection = async (id: number, input: ClassAndSectionInput): Promise<ClassAndSection> => {
//     const { data } = await CAxios.put(`${CLASSES_AND_SECTIONS_API_BASE}${id}`, input);
//     return data;
// };

// // Delete a class and section by ID
// export const deleteClassAndSection = async (id: number): Promise<void> => {
//     await CAxios.delete(`${CLASSES_AND_SECTIONS_API_BASE}${id}`);
// };





import type { ClassAndSection, ClassAndSectionInput } from '@/types/masters';

let sampleClassesAndSections: ClassAndSection[] = [
    {
        id: 1,
        class_name: 'Class 1',
        section_name: 'A',
        class_code: 'C1A',
        is_active: true,
        academic_year_id: 2023,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
    },
    {
        id: 2,
        class_name: 'Class 2',
        section_name: 'B',
        class_code: 'C2B',
        is_active: true,
        academic_year_id: 2023,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
    },
];

export const fetchClassesAndSections = async (): Promise<ClassAndSection[]> => {
    return [...sampleClassesAndSections];
};

export const fetchClassAndSectionById = async (id: number): Promise<ClassAndSection> => {
    const item = sampleClassesAndSections.find((c) => c.id === id);
    if (!item) throw new Error('Class and Section not found');
    return { ...item };
};

export const createClassAndSection = async (input: ClassAndSectionInput): Promise<ClassAndSection> => {
    let maxId = sampleClassesAndSections.length ? Math.max(...sampleClassesAndSections.map((c) => c.id)) : 0;
    const now = new Date().toISOString();
    const newItems: ClassAndSection[] = input.sections.map((section, idx) => {
        return {
            id: ++maxId,
            class_name: input.class_name,
            section_name: section.section_name,
            class_code: input.class_code,
            is_active: input.is_active,
            academic_year_id: input.academic_year_id,
            created_at: now,
            updated_at: now,
        };
    });
    sampleClassesAndSections.push(...newItems);
    return { ...newItems[0] };
};

export const updateClassAndSection = async ({ id, input }: { id: number; input: ClassAndSectionInput }): Promise<ClassAndSection> => {
    const idx = sampleClassesAndSections.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Class and Section not found');
    const updatedItem: ClassAndSection = {
        ...sampleClassesAndSections[idx],
        ...input,
        updated_at: new Date().toISOString(),
    };
    sampleClassesAndSections[idx] = updatedItem;
    return { ...updatedItem };
};

export const deleteClassAndSection = async (id: number): Promise<void> => {
    sampleClassesAndSections = sampleClassesAndSections.filter((c) => c.id !== id);
};

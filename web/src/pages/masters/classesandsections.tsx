import React from 'react';
import { MasterPage, type MasterPageConfig, type FormField } from '@/pages/masters/common/MasterPage';
import type { TableColumn } from '@/components/common/table';
import { useClassesAndSections, useCreateClassAndSection, useUpdateClassAndSection, useDeleteClassAndSection } from '@/api/hooks/masters/classesandsections';
import type { ClassAndSection, ClassAndSectionInput, SectionInput } from '@/types/masters/classesandsections';
import { AddClassAndSectionsModal } from './AddClassAndSectionsModal';

export default function ClassesAndSectionsPage() {
    const { data: classesAndSections = [], isLoading } = useClassesAndSections();
    const createClassAndSection = useCreateClassAndSection();
    const updateClassAndSection = useUpdateClassAndSection();
    const deleteClassAndSection = useDeleteClassAndSection();

    const columns: TableColumn<ClassAndSection>[] = [
        { key: 'class_name', label: 'Class Name', editable: true },
        { key: 'section_name', label: 'Section', editable: true },
        { key: 'class_code', label: 'Class Code', editable: true },
        { key: 'is_active', label: 'Active', editable: true, render: (v) => v ? 'Yes' : 'No' },
        { key: 'academic_year_id', label: 'Year', editable: true },
        { key: 'created_at', label: 'Created', render: (v) => v ? new Date(v).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }) : '-' },
          { key: 'updated_at', label: 'Updated', render: (v) => v ? new Date(v).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }) : '-' },
    ];


    const classFields: FormField[] = [
        { name: 'class_name', label: 'Class Name', required: true },
        { name: 'class_code', label: 'Class Code', required: true },
        { name: 'academic_year_id', label: 'Year', type: 'number', required: true },
        { name: 'is_active', label: 'Active', type: 'checkbox' },
    ];


    const sectionFields: FormField[] = [
        { name: 'section_name', label: 'Section', required: true },
    ];


    const defaultValues: Omit<ClassAndSectionInput, 'sections'> & { sections: SectionInput[] } = {
        class_name: '',
        class_code: '',
        is_active: true,
        academic_year_id: 2023,
        sections: [{ section_name: '' }],
    };


    const config: MasterPageConfig<ClassAndSection, ClassAndSectionInput> = {
        title: 'Classes & Sections',
        columns,
        defaultValues,
        formFields: classFields, 
        isLoading,
        showColumnSelector:true ,
        data: classesAndSections,
        onCreate: () => {}, // Disabled, handled by AddClassAndSectionsModal
        onUpdate: (id: number, input: ClassAndSectionInput) => updateClassAndSection.mutate({ id, input }),
        onDelete: (id: number) => deleteClassAndSection.mutate(id),
        isCreatePending: createClassAndSection.status === 'pending',
        resetForm: () => {},
        isEditing: true,
        steps: [
            { title: 'Class Info', fields: classFields },
            { title: 'Sections', fields: sectionFields, isDynamicList: true, itemLabel: 'Section' },
        ],
        addModal: (
            <AddClassAndSectionsModal 
                onSubmit={(data) => createClassAndSection.mutate(data)}
                isPending={createClassAndSection.status === 'pending'}
            />
        ),
    } as MasterPageConfig<ClassAndSection, ClassAndSectionInput>;

    return (
        <>
            <MasterPage config={config} />
        </>
    );
} 
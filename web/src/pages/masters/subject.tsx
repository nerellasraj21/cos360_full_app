import  { useState } from 'react';
import { MasterPage, type MasterPageConfig, type FormField } from '@/pages/masters/common/MasterPage';
import type { TableColumn } from '@/components/common/table';
import { useSubjectsPaginated, useCreateSubject, useUpdateSubject, useDeleteSubject } from '@/api/hooks/masters/subjects';
import type { Subject, SubjectInput } from '@/types/masters/subject';
import AcademicYearSelect from '@/components/common/AcademicYearSelect';
import { useAcademicYearStore } from "@/lib/academicYearStore";


export default function SubjectPage() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const {
    data,
    isLoading,
  } = useSubjectsPaginated(page, pageSize);

  const subjects = data?.data || [];
  const total = data?.total || 0;
  const hasMore = data?.hasMore || false;

  const createSubject = useCreateSubject();
  const updateSubject = useUpdateSubject();
  const deleteSubject = useDeleteSubject();
  const selectedAcademicYearId = useAcademicYearStore(state => state.selectedAcademicYearId);

  const columns: TableColumn<Subject>[] = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name', editable: true },
    { key: 'category', label: 'Category', editable: true },
    { key: 'short_code', label: 'Short Code', editable: true },

    {
      key: 'is_active',
      label: 'Active',
      editable: true,
      render: (v) => v ? 'Yes' : 'No',
      renderEdit: (value, _row, onChange) => (
        <input
          type="checkbox"
          checked={!!value}
          onChange={e => onChange(e.target.checked)}
          style={{ width: 16, height: 16 }}
        />
      ),
    },
    { key: 'academic_year_id', label: 'Year', editable: false, renderEdit: (value: number | null, _row: Subject, onChange: (v: number | null) => void) => (
      <AcademicYearSelect value={value} onChange={onChange} />
    ) },
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

  const formFields: FormField[] = [
    { name: 'name', label: 'Name', required: true },
    { name: 'category', label: 'Category', required: true },
    { name: 'short_code', label: 'Short Code', required: true },

    { name: 'is_active', label: 'Active', type: 'checkbox' },
  ];

  const handlePageChange = (newPage: number) => {
    if (newPage > page && hasMore) setPage(newPage);
    if (newPage < page && page > 0) setPage(newPage);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  };

  const config: MasterPageConfig<Subject, SubjectInput> = {
    title: 'Subjects',
    columns,
    defaultValues: {
      name: '',
      category: '',
      short_code: '',
      is_active: true,
      academic_year_id: selectedAcademicYearId as number,
    },
    formFields,
    isLoading,
    showColumnSelector:true ,
    data: subjects,
    onCreate: (data) => createSubject.mutate(data),
    onUpdate: (id, subject) => updateSubject.mutate({ id, subject }),
    onDelete: (id) => deleteSubject.mutate(id),
    isCreatePending: createSubject.status === 'pending',
    resetForm: () => {},
    pagination: {
      page,
      pageSize,
      total,
      onPageChange: handlePageChange,
      onPageSizeChange: handlePageSizeChange,
    },

  };

  return <MasterPage config={config} />;
}

import React, { useState } from 'react';
import { MasterPage, type MasterPageConfig, type FormField } from '@/pages/masters/common/MasterPage';
import type { TableColumn } from '@/components/common/table';
import { useAcademicYearsPaginated, useCreateAcademicYear, useUpdateAcademicYear, useDeleteAcademicYear } from '@/api/hooks/masters/academicyears';
import type { AcademicYear, AcademicYearInput } from '@/types/masters/academicyear';

export default function AcademicYearsPage() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const {
    data,
    isLoading,
  } = useAcademicYearsPaginated(page, pageSize);

  const academicYears = data?.data || [];
  const total = data?.total || 0;
  const hasMore = data?.hasMore || false;

  const createAcademicYear = useCreateAcademicYear();
  const updateAcademicYear = useUpdateAcademicYear();
  const deleteAcademicYear = useDeleteAcademicYear();

  const columns: TableColumn<AcademicYear>[] = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name', editable: true },
    { key: 'start_date', label: 'Start Date', editable: true },
    { key: 'end_date', label: 'End Date', editable: true },
    { key: 'is_active', label: 'Active', editable: true, render: (v) => v ? 'Yes' : 'No' },
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
    { name: 'start_date', label: 'Start Date', type: 'date', required: true },
    { name: 'end_date', label: 'End Date', type: 'date', required: true },
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

  const config: MasterPageConfig<AcademicYear, AcademicYearInput> = {
    title: 'Academic Years',
    columns,
    defaultValues: {
      name: '',
      start_date: '',
      end_date: '',
      is_active: true,
    },
    formFields,
    isLoading,
    data: academicYears,
    onCreate: (data) => createAcademicYear.mutate(data),
    onUpdate: (id, academicYear) => updateAcademicYear.mutate({ id, academicYear }),
    onDelete: (id) => deleteAcademicYear.mutate(id),
    isCreatePending: createAcademicYear.status === 'pending',
    resetForm: () => {},
    showColumnSelector:true ,
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

import React, { useState } from 'react';
import { MasterPage, type MasterPageConfig, type FormField } from '@/pages/masters/common/MasterPage';
import type { TableColumn } from '@/components/common/table';
import { useAcademicYearsPaginated, useCreateAcademicYear, useUpdateAcademicYear, useDeleteAcademicYear } from '@/api/hooks/masters/academicyears';
import type { AcademicYear, AcademicYearInput } from '@/types/masters/academicyear';
import { PermissionGuard } from '@/components/PermissionGuard';
import { PERMISSIONS } from '@/constants/permissions';
import { usePermission } from '@/hooks/usePermission';
import { Badge } from '@/components/ui/badge';

export default function AcademicYearsPage() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const { checkPermission } = usePermission();

  // Check permissions
  const hasListPermission = checkPermission('academic_years', 'list');
  const hasReadPermission = checkPermission('academic_years', 'read');

  // Only call API if user has permission to view academic years
  const {
    data,
    isLoading,
  } = useAcademicYearsPaginated(page, pageSize, hasListPermission);

  const academicYears = data?.data || [];
  const backendTotal = data?.total || 0;
  const hasMore = data?.hasMore || false;

  // Calculate total more intelligently
  // If backend provides total, use it; otherwise estimate based on current data
  const total = backendTotal > 0 ? backendTotal :
    hasMore ? (page + 2) * pageSize : // Assume at least one more page if hasMore
    academicYears.length > 0 ? (page + 1) * pageSize : // Current page is complete
    0;

  const createAcademicYear = useCreateAcademicYear();
  const updateAcademicYear = useUpdateAcademicYear();
  const deleteAcademicYear = useDeleteAcademicYear();

  const columns: TableColumn<AcademicYear>[] = [
    { key: 'id', label: 'ID' },
    { key: 'title', label: 'Title', editable: true },
    {
      key: 'start_date',
      label: 'Start Date',
      editable: true,
      renderEdit: (value: string, _row: AcademicYear, onChange: (v: string) => void) => (
        <input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-1 border rounded text-sm"
        />
      )
    },
    {
      key: 'end_date',
      label: 'End Date',
      editable: true,
      renderEdit: (value: string, _row: AcademicYear, onChange: (v: string) => void) => (
        <input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-1 border rounded text-sm"
        />
      )
    },
    {
      key: 'is_active',
      label: 'Active',
      editable: true,
      render: (v) => (
        <Badge variant={v ? "default" : "secondary"}>
          {v ? 'Active' : 'Inactive'}
        </Badge>
      ),
      renderEdit: (value: boolean, _row: AcademicYear, onChange: (v: boolean) => void) => (
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4"
        />
      )
    },
  ];

  const formFields: FormField[] = [
    { name: 'title', label: 'Title', required: true },
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
      title: '',
      start_date: '',
      end_date: '',
      is_active: true,
    },
    formFields,
    isLoading,
    data: academicYears,
    onCreate: (data) => createAcademicYear.mutate(data),
    onUpdate: (id, academicYear) => updateAcademicYear.mutate({ id: id.toString(), academicYear }),
    onDelete: (id) => deleteAcademicYear.mutate(id.toString()),
    isCreatePending: createAcademicYear.status === 'pending',
    resetForm: () => {},
    showColumnSelector: true,
    pagination: {
      page,
      pageSize,
      total,
      onPageChange: handlePageChange,
      onPageSizeChange: handlePageSizeChange,
    },
    // Permission configuration for Academic Years
    permissions: {
      resource: 'ACADEMIC_YEARS',
      create: true, // Allow create button if user has create permission
      read: true,   // Allow viewing data in table if user has read permission
      update: true, // Allow edit functionality if user has update permission
      delete: true, // Allow delete functionality if user has delete permission
      list: true,   // Allow accessing this page if user has list permission
    },
  };

  return (
    <PermissionGuard
      resource="academic_years"
      action="list"
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to view Academic Years.</p>
          </div>
        </div>
      }
    >
      <MasterPage config={config} />
    </PermissionGuard>
  );
}

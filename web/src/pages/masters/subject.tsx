import { useState, useEffect, useCallback } from 'react';
import { MasterPage, type MasterPageConfig, type FormField } from '@/pages/masters/common/MasterPage';
import type { TableColumn } from '@/components/common/table';
import { useSubjectsPaginated, useCreateSubject, useUpdateSubject, useDeleteSubject } from '@/api/hooks/masters/subjects';
import { useSubjectCategories } from '@/api/hooks/masters/subjectCategories';
import type { Subject, SubjectInput } from '@/types/masters/subject';
import { SubjectCategoriesDropdown } from '@/components/dropdown-system/components/SubjectCategoriesDropdown';
import { SubjectCategoriesInfiniteDropdown, CreateCategoryPopover } from '@/components/dropdown';
import { useAcademicYearStore } from "@/lib/academicYearStore";
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PermissionGuard } from '@/components/PermissionGuard';
import { usePermission } from '@/hooks/usePermission';

export default function SubjectPage() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const { selectedAcademicYearId, fetchAndSetAcademicYears } = useAcademicYearStore();
  const { checkPermission } = usePermission();

  // Check permissions
  const hasListPermission = checkPermission('subjects', 'list');

  // Initialize academic years if not loaded
  useEffect(() => {
    fetchAndSetAcademicYears();
  }, [fetchAndSetAcademicYears]);

  const {
    data,
    isLoading,
  } = useSubjectsPaginated(page, pageSize, hasListPermission);

  const subjects = data?.data || [];
  const total = data?.total || subjects.length;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data: _categories } = useSubjectCategories();

  // Sort subjects by category for hierarchical display
  const sortedSubjects = [...subjects].sort((a, b) => {
    const catA = a.subject_category?.name || '';
    const catB = b.subject_category?.name || '';
    return catA.localeCompare(catB);
  });

  const createSubject = useCreateSubject();
  const updateSubject = useUpdateSubject();
  const deleteSubject = useDeleteSubject();

  const columns: TableColumn<Subject>[] = [
    { key: 'name', label: 'Name', editable: true },
    {
      key: 'subject_category_id',
      label: 'Category',
      editable: true,
      render: (_value, row) => row.subject_category?.name || '',
      renderEdit: (value: string | null, _row: Subject, onChange: (v: string | null) => void) => (
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <SubjectCategoriesInfiniteDropdown
              value={value || undefined}
              onChange={(val, _option) => onChange(val || null)}
            />
          </div>
          <CreateCategoryPopover
            onCategoryCreated={(categoryId) => onChange(categoryId)}
          />
        </div>
      ),
    },
    { key: 'short_code', label: 'Short Code', editable: true },
    {
      key: 'is_active',
      label: 'Active',
      editable: true,
      render: (v) => (
        <StatusBadge status={v} />
      ),
      renderEdit: (value, _row, onChange) => (
        <input
          type="checkbox"
          checked={!!value}
          onChange={e => onChange(e.target.checked)}
          style={{ width: 16, height: 16 }}
        />
      ),
    },
  ];

  const formFields: FormField[] = [
    { name: 'name', label: 'Subject Name', required: true },
    { name: 'subject_category_id', label: 'Category', required: true },
    { name: 'short_code', label: 'Short Code' },
    { name: 'is_active', label: 'Active', type: 'checkbox' },
  ];

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  };

  // Handle category creation callback
  const handleCategoryCreated = useCallback((categoryId: string, _categoryName: string, onChange: (val: string | null) => void) => {
    // Auto-select the newly created category
    onChange(categoryId);
  }, []);

  const config: MasterPageConfig<Subject, SubjectInput> = {
    title: 'Subjects',
    columns,
    defaultValues: {
      name: '',
      subject_category_id: '',
      academic_year_id: selectedAcademicYearId,
      short_code: '',
      is_active: true,
    },
    formFields,
    isLoading,
    showColumnSelector: true,
    data: sortedSubjects,
    onCreate: (data) => createSubject.mutate(data),
    onUpdate: (id, subject) => updateSubject.mutate({ id: id.toString(), subject }),
    onDelete: (id) => deleteSubject.mutate(id.toString()),
    isCreatePending: createSubject.status === 'pending',
    resetForm: () => {},
    pagination: {
      page,
      pageSize,
      total,
      onPageChange: handlePageChange,
      onPageSizeChange: handlePageSizeChange,
    },
    // Permission configuration for Subjects
    permissions: {
      resource: 'SUBJECTS',
      create: true, // Allow create button if user has create permission
      read: true,   // Allow viewing data in table if user has read permission
      update: true, // Allow edit functionality if user has update permission
      delete: true, // Allow delete functionality if user has delete permission
      list: true,   // Allow accessing this page if user has list permission
    },
    renderCustomField: (field, value, onChange) => {
      if (field.name === 'subject_category_id') {
        return (
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <SubjectCategoriesInfiniteDropdown
                value={value || undefined}
                onChange={(val) => onChange(val as string | null)}
                placeholder="Select Category"
              />
            </div>
            <CreateCategoryPopover
              onCategoryCreated={(categoryId, categoryName) =>
                handleCategoryCreated(categoryId, categoryName, onChange)
              }
            />
          </div>
        );
      }
      return null;
    },
  };

  return (
    <PermissionGuard
      resource="subjects"
      action="list"
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to view Subjects.</p>
          </div>
        </div>
      }
    >
      <MasterPage config={config} />
    </PermissionGuard>
  );
}


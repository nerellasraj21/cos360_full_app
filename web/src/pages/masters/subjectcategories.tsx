import React, { useState } from 'react';
import { MasterPage, type MasterPageConfig, type FormField } from '@/pages/masters/common/MasterPage';
import type { TableColumn } from '@/components/common/table';
import {
  useSubjectCategoriesPaginated,
  useCreateSubjectCategory,
  useUpdateSubjectCategory,
  useDeleteSubjectCategory
} from '@/api/hooks/masters/subjectCategories';
import type { SubjectCategory, SubjectCategoryInput } from '@/types/masters/subject';

export default function SubjectCategoriesPage() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const {
    data,
    isLoading,
  } = useSubjectCategoriesPaginated(page, pageSize);

  const categories = data?.data || [];
  const backendTotal = data?.total || 0;
  const hasMore = data?.hasMore || false;

  // Calculate total more intelligently
  // If backend provides total, use it; otherwise estimate based on current data
  const total = backendTotal > 0 ? backendTotal :
    hasMore ? (page + 2) * pageSize : 
    categories.length > 0 ? (page + 1) * pageSize : // Current page is complete
    0;

  const createSubjectCategory = useCreateSubjectCategory();
  const updateSubjectCategory = useUpdateSubjectCategory();
  const deleteSubjectCategory = useDeleteSubjectCategory();

  const columns: TableColumn<SubjectCategory>[] = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name', editable: true },
  ];

  const formFields: FormField[] = [
    { name: 'name', label: 'Category Name', required: true },
  ];

  const handlePageChange = (newPage: number) => {
    if (newPage > page && hasMore) setPage(newPage);
    if (newPage < page && page > 0) setPage(newPage);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  };

  const config: MasterPageConfig<SubjectCategory, SubjectCategoryInput> = {
    title: 'Subject Categories',
    columns,
    defaultValues: {
      name: '',
    },
    formFields,
    isLoading,
    showColumnSelector: true,
    data: categories,
    onCreate: (data) => createSubjectCategory.mutate(data),
    onUpdate: (id, category) => updateSubjectCategory.mutate({ id: id.toString(), category }),
    onDelete: (id) => deleteSubjectCategory.mutate(id.toString()),
    isCreatePending: createSubjectCategory.status === 'pending',
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
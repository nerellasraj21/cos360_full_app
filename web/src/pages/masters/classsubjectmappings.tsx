import { useState, useEffect } from "react";
import {
  MasterPage,
  type MasterPageConfig,
  type FormField,
} from "@/pages/masters/common/MasterPage";
import type { TableColumn } from "@/components/common/table";
import {
  useClassSubjectMappingsPaginated,
  useUpdateClassSubjectMapping,
  useDeleteClassSubjectMapping,
} from "@/api/hooks/masters/classsubjectmappings";
import type {
  ClassSubjectMapping,
  ClassSubjectMappingInput,
} from "@/types/masters/subject";
import { fetchSubjects } from "@/api/masters/subjects";
import type { Subject } from "@/types/masters";
import { useAcademicYearStore } from "@/lib/academicYearStore";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/components/PermissionGuard";
import { usePermission } from "@/hooks/usePermission";
import { AddBulkClassSubjectMappingsModal } from "@/components/masters/classsubjectmappings";

// Custom styles for react-select with proper dark mode support
const getCustomSelectStyles = () => {
  const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');

  return {
    control: (base: any) => ({
      ...base,
      backgroundColor: isDark ? '#2d3748' : '#ffffff',
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0',
      color: isDark ? '#f7fafc' : '#1a202c',
      minHeight: '36px',
      '&:hover': {
        borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : '#cbd5e0',
      },
    }),
    menu: (base: any) => ({
      ...base,
      backgroundColor: isDark ? '#2d3748' : '#ffffff',
      border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0',
      zIndex: 9999,
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      pointerEvents: 'auto',
    }),
    menuPortal: (base: any) => ({
      ...base,
      zIndex: 9999,
      pointerEvents: 'auto',
    }),
    menuList: (base: any) => ({
      ...base,
      pointerEvents: 'auto',
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isSelected
        ? '#556ee6'
        : state.isFocused
        ? (isDark ? '#4a5568' : '#f7fafc')
        : (isDark ? '#2d3748' : '#ffffff'),
      color: state.isSelected
        ? '#ffffff'
        : (isDark ? '#f7fafc' : '#1a202c'),
      cursor: 'pointer',
      pointerEvents: 'auto',
      '&:active': {
        backgroundColor: '#556ee6',
      },
    }),
    singleValue: (base: any) => ({
      ...base,
      color: isDark ? '#f7fafc' : '#1a202c',
    }),
    input: (base: any) => ({
      ...base,
      color: isDark ? '#f7fafc' : '#1a202c',
    }),
    placeholder: (base: any) => ({
      ...base,
      color: isDark ? '#a0aec0' : '#718096',
    }),
    dropdownIndicator: (base: any) => ({
      ...base,
      color: isDark ? '#a0aec0' : '#718096',
      '&:hover': {
        color: isDark ? '#f7fafc' : '#1a202c',
      },
    }),
    indicatorSeparator: (base: any) => ({
      ...base,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0',
    }),
  };
};

export default function ClassSubjectMappingsPage() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const { selectedAcademicYearId, fetchAndSetAcademicYears } =
    useAcademicYearStore();
  const { checkPermission } = usePermission();

  // Check permissions
  const hasListPermission = checkPermission("class_subject_mappings", "list");

  // Initialize academic years if not loaded
  useEffect(() => {
    fetchAndSetAcademicYears();
  }, [fetchAndSetAcademicYears]);

  // Fetch subjects for bulk modal
  useEffect(() => {
    fetchSubjects()
      .then((response) => {
        setSubjects(response?.items || []);
        setSubjectsLoading(false);
      })
      .catch(() => {
        setSubjects([]);
        setSubjectsLoading(false);
      });
  }, []);

  const { data, isLoading } = useClassSubjectMappingsPaginated(
    page,
    pageSize,
    selectedAcademicYearId,
    hasListPermission
  );

  const mappings = data?.data || [];
  const total = data?.total || mappings.length;
  const hasMore = data?.hasMore || false;

  const updateMapping = useUpdateClassSubjectMapping();
  const deleteMapping = useDeleteClassSubjectMapping();

  const columns: TableColumn<ClassSubjectMapping>[] = [
    {
      key: "class_name",
      label: "Class",
      editable: false,
      render: (value) => value || "N/A",
    },
    {
      key: "section_name",
      label: "Section",
      editable: false,
      render: (value) => value || "All",
    },
    {
      key: "subject_name",
      label: "Subject",
      editable: false,
      render: (value) => value || "N/A",
    },
    // {
    //   key: 'academic_year_name',
    //   label: 'Academic Year',
    //   editable: false,
    //   render: (value) => value || 'N/A',
    // },
    {
      key: "exclude_marks",
      label: "Exclude from Marks",
      editable: true,
      render: (v) => (v ? "Yes" : "No"),
      renderEdit: (value, _row, onChange) => (
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          style={{ width: 16, height: 16 }}
        />
      ),
    },
    {
      key: "order",
      label: "Order",
      editable: true,
    },
    {
      key: "is_active",
      label: "Active",
      editable: true,
      render: (v) => (
        <Badge variant={v ? "default" : "secondary"}>
          {v ? "Active" : "Inactive"}
        </Badge>
      ),
      renderEdit: (value, _row, onChange) => (
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          style={{ width: 16, height: 16 }}
        />
      ),
    },
  ];

  const formFields: FormField[] = [
    { name: "class_id", label: "Class", required: true },
    { name: "subject_id", label: "Subject", required: true },
    { name: "exclude_marks", label: "Exclude from Marks", type: "checkbox" },
    { name: "order", label: "Order", type: "number" },
    { name: "is_active", label: "Active", type: "checkbox" },
  ];

  const handlePageChange = (newPage: number) => {
    if (newPage > page && hasMore) setPage(newPage);
    if (newPage < page && page > 0) setPage(newPage);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  };

  const config: MasterPageConfig<
    ClassSubjectMapping,
    ClassSubjectMappingInput
  > = {
    title: "Class-Subject Mappings",
    addButtonLabel: "Add Class-Subject Mappings",
    columns,
    defaultValues: {
      class_id: "",
      subject_id: "",
      academic_year_id: selectedAcademicYearId || "",
      exclude_marks: false,
      order: undefined,
      is_active: false,
    },
    formFields,
    isLoading,
    showColumnSelector: true,
    data: mappings,
    // Using custom addModal for bulk creation
    addModal: (
      <AddBulkClassSubjectMappingsModal
        subjects={subjects}
        subjectsLoading={subjectsLoading}
        selectStyles={getCustomSelectStyles()}
      />
    ),
    onCreate: () => {}, // Handled by custom modal
    onUpdate: (id, mapping) =>
      updateMapping.mutate({ id: id.toString(), mapping }),
    onDelete: (id) => deleteMapping.mutate(id.toString()),
    isCreatePending: false, // Handled by custom modal
    resetForm: () => {},
    pagination: {
      page,
      pageSize,
      total,
      onPageChange: handlePageChange,
      onPageSizeChange: handlePageSizeChange,
    },
    // Permission configuration for Class Subject Mappings
    permissions: {
      resource: "CLASS_SUBJECT_MAPPINGS",
      create: true,
      read: true,
      update: true,
      delete: true,
      list: true,
    },
  };

  return (
    <PermissionGuard
      resource="class_subject_mappings"
      action="list"
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Access Denied
            </h2>
            <p className="text-gray-600">
              You don't have permission to view Class-Subject Mappings.
            </p>
          </div>
        </div>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Class-Subject Mappings</CardTitle>
        </CardHeader>
        <CardContent>
          <MasterPage config={config} />
        </CardContent>
      </Card>
    </PermissionGuard>
  );
}

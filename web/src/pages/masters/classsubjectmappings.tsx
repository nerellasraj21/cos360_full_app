import { useState, useEffect, useMemo } from "react";
import {
  MasterPage,
  type MasterPageConfig,
  type FormField,
} from "@/pages/masters/common/MasterPage";
import type { TableColumn } from "@/components/common/table";
import {
  useClassSubjectMappingsPaginated,
  useCreateClassSubjectMapping,
  useUpdateClassSubjectMapping,
  useDeleteClassSubjectMapping,
} from "@/api/hooks/masters/classsubjectmappings";
import type {
  ClassSubjectMapping,
  ClassSubjectMappingInput,
} from "@/types/masters/subject";
import {
  useClassesDropdown,
  useSectionsByClassId,
} from "@/hooks/masters/useClassesAndSections";
import { fetchSubjects } from "@/api/masters/subjects";
import type { Subject } from "@/types/masters";
import { useAcademicYearStore } from "@/lib/academicYearStore";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Select, { type SingleValue } from "react-select";
import { PermissionGuard } from "@/components/PermissionGuard";
import { usePermission } from "@/hooks/usePermission";

type SelectOption = { value: string; label: string } | null;

export default function ClassSubjectMappingsPage() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [selectedClass, setSelectedClass] = useState<SelectOption>(null);
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

  // Fetch subjects for dropdown
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

  const createMapping = useCreateClassSubjectMapping();
  const updateMapping = useUpdateClassSubjectMapping();
  const deleteMapping = useDeleteClassSubjectMapping();

  // Dropdown hooks from timetable
  const { data: classesData, isLoading: classesLoading } = useClassesDropdown();
  const { data: sectionsData, isLoading: sectionsLoading } =
    useSectionsByClassId(selectedClass?.value || "");

  // Memoized dropdown options
  const classOptions = useMemo(() => {
    if (!classesData) return [];
    return classesData.map((cls) => ({ value: cls.id, label: cls.name }));
  }, [classesData]);

  const sectionOptions = useMemo(() => {
    if (!sectionsData) return [];
    return sectionsData.map((section) => ({
      value: section.id,
      label: section.name,
    }));
  }, [sectionsData]);

  const subjectOptions = (subjects || []).map((s) => ({
    value: s.id,
    label: s.name,
  }));

  // Handlers for dropdown changes
  const handleClassChange = (option: SingleValue<SelectOption>) => {
    setSelectedClass(option);
    // Reset section when class changes
  };

  const columns: TableColumn<ClassSubjectMapping>[] = [
    {
      key: "class_name",
      label: "Class",
      editable: false,
      render: (value) => value || "N/A",
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
    onCreate: (data) => createMapping.mutate(data),
    onUpdate: (id, mapping) =>
      updateMapping.mutate({ id: id.toString(), mapping }),
    onDelete: (id) => deleteMapping.mutate(id.toString()),
    isCreatePending: createMapping.status === "pending",
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
      create: true, // Allow create button if user has create permission
      read: true, // Allow viewing data in table if user has read permission
      update: true, // Allow edit functionality if user has update permission
      delete: true, // Allow delete functionality if user has delete permission
      list: true, // Allow accessing this page if user has list permission
    },
    renderCustomField: (field, value, onChange) => {
      if (field.name === "class_id") {
        return (
          <Select
            options={classOptions}
            value={classOptions.find((opt) => opt.value === value) || null}
            onChange={(option: SingleValue<SelectOption>) => {
              handleClassChange(option);
              onChange(option?.value || "");
            }}
            placeholder="Select Class"
            classNamePrefix="react-select"
            menuPlacement="auto"
            menuPortalTarget={
              typeof window !== "undefined" ? document.body : undefined
            }
            styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
            isLoading={classesLoading}
          />
        );
      }
      if (field.name === "subject_id") {
        return (
          <Select
            options={subjectOptions}
            value={subjectOptions.find((opt) => opt.value === value) || null}
            onChange={(option: SingleValue<SelectOption>) =>
              onChange(option?.value || "")
            }
            placeholder="Select Subject"
            classNamePrefix="react-select"
            menuPlacement="auto"
            menuPortalTarget={
              typeof window !== "undefined" ? document.body : undefined
            }
            styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
            isLoading={subjectsLoading}
          />
        );
      }
      return null;
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

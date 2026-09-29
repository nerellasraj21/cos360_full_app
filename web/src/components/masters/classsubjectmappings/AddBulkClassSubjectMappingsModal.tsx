import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Select, { type SingleValue, type MultiValue } from "react-select";
import { useCreateBulkClassSubjectMappings } from "@/api/hooks/masters/classsubjectmappings";
import { useClassesDropdown, useSectionsByClassId } from "@/hooks/masters/useClassesAndSections";
import { useAcademicYearStore } from "@/lib/academicYearStore";
import type { Subject } from "@/types/masters";
import type { SubjectMappingItem } from "@/types/masters/subject";
import { Trash2, AlertTriangle, Info } from "lucide-react";

type SelectOption = { value: string; label: string };

const ALL_SECTIONS_OPTION: SelectOption = { value: "ALL_SECTIONS", label: "All Sections" };

interface SubjectWithSettings extends SelectOption {
  order: number;
  exclude_marks: boolean;
  is_active: boolean;
}

interface AddBulkClassSubjectMappingsModalProps {
  subjects: Subject[];
  subjectsLoading: boolean;
  selectStyles: any;
}

export function AddBulkClassSubjectMappingsModal({
  subjects,
  subjectsLoading,
  selectStyles,
}: AddBulkClassSubjectMappingsModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [selectedClass, setSelectedClass] = useState<SelectOption | null>(null);
  const [selectedSections, setSelectedSections] = useState<SelectOption[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<SubjectWithSettings[]>([]);

  const { selectedAcademicYearId } = useAcademicYearStore();
  const { data: classesData, isLoading: classesLoading } = useClassesDropdown();
  const { data: sectionsData, isLoading: sectionsLoading } = useSectionsByClassId(
    selectedClass?.value || ""
  );
  const bulkCreateMutation = useCreateBulkClassSubjectMappings();

  const classOptions = useMemo(() => {
    if (!classesData) return [];
    return classesData.map((cls) => ({ value: cls.id, label: cls.name }));
  }, [classesData]);

  const sectionOptions = useMemo(() => {
    if (!sectionsData) return [ALL_SECTIONS_OPTION];
    const sections = sectionsData.map((section) => ({ value: section.id, label: section.name }));
    return [ALL_SECTIONS_OPTION, ...sections];
  }, [sectionsData]);

  // Check if "All Sections" is selected
  const isAllSectionsSelected = selectedSections.some(s => s.value === "ALL_SECTIONS");
  const sectionsCount = sectionsData?.length || 0;

  const subjectOptions = useMemo(() => {
    return (subjects || []).map((s) => ({
      value: s.id,
      label: s.name,
    }));
  }, [subjects]);

  // Filter out already selected subjects from dropdown
  const availableSubjectOptions = useMemo(() => {
    const selectedIds = new Set(selectedSubjects.map((s) => s.value));
    return subjectOptions.filter((opt) => !selectedIds.has(opt.value));
  }, [subjectOptions, selectedSubjects]);

  const handleClassChange = (option: SingleValue<SelectOption>) => {
    setSelectedClass(option || null);
    // Reset sections when class changes
    setSelectedSections([]);
    setIsFormDirty(true);
  };

  const handleSectionChange = (options: MultiValue<SelectOption>) => {
    // If "All Sections" is selected, only use that option
    const hasAllSections = options?.some(opt => opt.value === "ALL_SECTIONS");
    const newSelection = hasAllSections ? [ALL_SECTIONS_OPTION] : (options || []);
    setSelectedSections(newSelection);
    setIsFormDirty(true);
  };

  const handleSubjectsChange = (options: MultiValue<SelectOption>) => {
    const newSubjects = (options || []).map((opt, index) => {
      // Check if subject already exists in selectedSubjects to preserve settings
      const existing = selectedSubjects.find((s) => s.value === opt.value);
      if (existing) {
        return existing;
      }
      return {
        value: opt.value,
        label: opt.label,
        order: selectedSubjects.length + index + 1,
        exclude_marks: false,
        is_active: true,
      };
    });
    setSelectedSubjects(newSubjects);
    setIsFormDirty(true);
  };

  const handleRemoveSubject = (subjectId: string) => {
    setSelectedSubjects((prev) => {
      const filtered = prev.filter((s) => s.value !== subjectId);
      // Re-order remaining subjects
      return filtered.map((s, idx) => ({ ...s, order: idx + 1 }));
    });
    setIsFormDirty(true);
  };

  const handleSubjectSettingChange = (
    subjectId: string,
    field: "order" | "exclude_marks" | "is_active",
    value: number | boolean
  ) => {
    setSelectedSubjects((prev) =>
      prev.map((s) =>
        s.value === subjectId ? { ...s, [field]: value } : s
      )
    );
    setIsFormDirty(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClass || !selectedAcademicYearId || selectedSubjects.length === 0 || selectedSections.length === 0) {
      return;
    }

    const subjectMappings: SubjectMappingItem[] = selectedSubjects.map((s) => ({
      subject_id: s.value,
      order: s.order,
      exclude_marks: s.exclude_marks,
      is_active: s.is_active,
    }));

    // Handle "All Sections" selection - pass undefined for section_id
    const isAllSectionsSelected = selectedSections.some(s => s.value === "ALL_SECTIONS");
    const sectionsToCreate = isAllSectionsSelected
      ? [undefined]  // undefined means all sections
      : selectedSections.map(s => s.value);

    // Create mappings for each selected section
    sectionsToCreate.forEach(sectionId => {
      bulkCreateMutation.mutate(
        {
          class_id: selectedClass.value,
          section_id: sectionId,
          academic_year_id: selectedAcademicYearId,
          subjects: subjectMappings,
        },
        {
          onSuccess: () => {
            // Only close form and reset after the last request
            if (sectionId === sectionsToCreate[sectionsToCreate.length - 1]) {
              setIsOpen(false);
              resetForm();
            }
          },
        }
      );
    });
  };

  const resetForm = () => {
    setSelectedClass(null);
    setSelectedSections([]);
    setSelectedSubjects([]);
    setIsFormDirty(false);
  };

  const handleModalOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const isFormValid = selectedClass && selectedSubjects.length > 0 && selectedSections.length > 0 && selectedAcademicYearId;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={handleModalOpenChange}
      guardDirty={isFormDirty}
      onDirtyDiscard={() => setIsFormDirty(false)}
    >
      <DialogTrigger asChild>
        <Button onClick={() => setIsFormDirty(false)}>Add Class-Subject Mappings</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl" customLayout>
        <DialogHeader>
          <DialogTitle>Add Class-Subject Mappings</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} onChange={() => setIsFormDirty(true)} className="flex flex-col flex-1 overflow-hidden">
          <div className="space-y-4 flex-1 overflow-y-auto px-1">
            {/* Class Selection */}
            <div>
              <Label htmlFor="class_id">Class</Label>
              <Select
                options={classOptions}
                value={selectedClass}
                onChange={handleClassChange}
                placeholder="Select Class"
                classNamePrefix="react-select"
                menuPlacement="auto"
                menuPortalTarget={typeof window !== "undefined" ? document.body : undefined}
                isLoading={classesLoading}
                styles={selectStyles}
                isClearable
              />
            </div>

            {/* Section Selection (cascading from class) - Multi-select */}
            {selectedClass && (
              <div>
                <Label htmlFor="section_id">Sections</Label>
                <Select
                  isMulti
                  options={sectionOptions}
                  value={selectedSections}
                  onChange={handleSectionChange}
                  placeholder="Select one or more sections"
                  classNamePrefix="react-select"
                  menuPlacement="auto"
                  menuPortalTarget={typeof window !== "undefined" ? document.body : undefined}
                  isLoading={sectionsLoading}
                  styles={selectStyles}
                  isClearable
                  isDisabled={!selectedClass}
                  closeMenuOnSelect={false}
                />
                {/* Info when multiple sections are selected */}
                {selectedSections.length > 0 && !isAllSectionsSelected && (
                  <div className="flex items-center gap-2 mt-2 p-2 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Mappings will be created for {selectedSections.length} selected section{selectedSections.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                )}
                {/* Warning when All Sections is selected */}
                {isAllSectionsSelected && sectionsCount > 0 && (
                  <div className="flex items-center gap-2 mt-2 p-2 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      This will apply mappings to all {sectionsCount} section{sectionsCount !== 1 ? "s" : ""} in {selectedClass.label}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Multi-Select Subjects */}
            <div>
              <Label htmlFor="subjects">Subjects</Label>
              <Select
                isMulti
                options={availableSubjectOptions as any}
                value={selectedSubjects}
                onChange={handleSubjectsChange}
                placeholder="Select multiple subjects..."
                classNamePrefix="react-select"
                menuPlacement="auto"
                menuPortalTarget={typeof window !== "undefined" ? document.body : undefined}
                isLoading={subjectsLoading}
                styles={selectStyles}
                closeMenuOnSelect={false}
              />
            </div>

            {/* Selected Subjects Table */}
            {selectedSubjects.length > 0 && (
              <div>
                <Label className="mb-2 block">Selected Subjects Settings</Label>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Subject</th>
                        <th className="px-3 py-2 text-center font-medium w-20">Order</th>
                        <th className="px-3 py-2 text-center font-medium w-32">Exclude Marks</th>
                        <th className="px-3 py-2 text-center font-medium w-20">Active</th>
                        <th className="px-3 py-2 text-center font-medium w-16">Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSubjects.map((subject) => (
                        <tr key={subject.value} className="border-t">
                          <td className="px-3 py-2">{subject.label}</td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              min={1}
                              value={subject.order}
                              onChange={(e) =>
                                handleSubjectSettingChange(
                                  subject.value,
                                  "order",
                                  parseInt(e.target.value) || 1
                                )
                              }
                              className="w-16 h-8 text-center mx-auto"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <Checkbox
                              checked={subject.exclude_marks}
                              onCheckedChange={(checked) =>
                                handleSubjectSettingChange(
                                  subject.value,
                                  "exclude_marks",
                                  checked === true
                                )
                              }
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <Checkbox
                              checked={subject.is_active}
                              onCheckedChange={(checked) =>
                                handleSubjectSettingChange(
                                  subject.value,
                                  "is_active",
                                  checked === true
                                )
                              }
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveSubject(subject.value)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {selectedSubjects.length} subject(s) selected
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 pt-4 border-t">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={!isFormValid || bulkCreateMutation.isPending}
            >
              {bulkCreateMutation.isPending
                ? "Adding..."
                : `Add ${selectedSubjects.length} Mapping${selectedSubjects.length !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

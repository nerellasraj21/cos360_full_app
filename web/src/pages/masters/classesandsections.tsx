import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  useReadAllClassSections,
  useCreateClassSections,
  useUpdateClassSections,
  useDeleteClassSections,
  useUpdateSectionById,
  useDeleteSectionById,
  useCreateSectionsBulk,
} from "@/api/hooks/masters/classesandsections";
import type {
  ClassRead,
  ClassCreate,
  ClassUpdate,
  SectionRead,
} from "@/types/masters/classesandsections";
import { AddClassAndSectionsModal } from "./AddClassAndSectionsModal";
import {
  ClassSectionsTable,
  EditClassModal,
  EditSectionModal,
} from "@/components/masters/classesandsections";
import { useAcademicYearStore } from "@/lib/academicYearStore";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PermissionGuard } from "@/components/PermissionGuard";
import { usePermission } from "@/hooks/usePermission";
import { Loader2 } from "lucide-react";

export default function ClassesAndSectionsPage() {
  const { selectedAcademicYearId, academicYears, fetchAndSetAcademicYears } =
    useAcademicYearStore();
  const { checkPermission } = usePermission();

  // Check permissions
  const hasClassesListPermission = checkPermission("classes", "list");
  const hasSectionsListPermission = checkPermission("sections", "list");
  const hasClassesReadPermission = checkPermission("classes", "read");
  const hasSectionsReadPermission = checkPermission("sections", "read");

  // Only call API if user has permission to view either classes or sections
  const shouldFetchData = hasClassesListPermission && hasSectionsListPermission;
  const {
    data: classSectionsData,
    isLoading,
    refetch,
  } = useReadAllClassSections(
    { academic_year_id: selectedAcademicYearId || undefined },
    shouldFetchData
  );

  // Mutations
  const createClassMutation = useCreateClassSections();
  const updateClassMutation = useUpdateClassSections();
  const deleteClassMutation = useDeleteClassSections();
  const updateSectionByIdMutation = useUpdateSectionById();
  const deleteSectionByIdMutation = useDeleteSectionById();
  const createSectionsBulkMutation = useCreateSectionsBulk();


  // Modal states
  const [editClassModal, setEditClassModal] = useState<{
    isOpen: boolean;
    classData: ClassRead | null;
  }>({
    isOpen: false,
    classData: null,
  });
  const [editSectionModal, setEditSectionModal] = useState<{
    isOpen: boolean;
    sectionData: SectionRead | null;
    classId: string;
    className: string;
  }>({
    isOpen: false,
    sectionData: null,
    classId: "",
    className: "",
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: "class" | "section";
    id: string;
    name: string;
    classId?: string;
  }>({
    isOpen: false,
    type: "class",
    id: "",
    name: "",
  });

  // Initialize academic year store if not already done
  useEffect(() => {
    if (academicYears.length === 0) {
      fetchAndSetAcademicYears();
    }
  }, [academicYears.length, fetchAndSetAcademicYears]);

  // Handlers
  const handleEditClass = (classData: ClassRead) => {
    setEditClassModal({ isOpen: true, classData });
  };

  const handleDeleteClass = (classId: string) => {
    const classData = classSectionsData?.find((c) => c.id === classId);
    setDeleteConfirm({
      isOpen: true,
      type: "class",
      id: classId,
      name: classData?.name || "Unknown Class",
    });
  };

  const handleEditSection = (section: SectionRead) => {
    const classData = classSectionsData?.find((c) => c.id === section.class_id);
    setEditSectionModal({
      isOpen: true,
      sectionData: section,
      classId: section.class_id,
      className: classData?.name || "Unknown Class",
    });
  };

  const handleDeleteSection = (sectionId: string) => {
    const allSections = classSectionsData?.flatMap((c) => c.sections) || [];
    const sectionData = allSections.find((s) => s.id === sectionId);
    const classData = classSectionsData?.find(
      (c) => c.id === sectionData?.class_id
    );
    setDeleteConfirm({
      isOpen: true,
      type: "section",
      id: sectionId,
      name: sectionData?.name || "Unknown Section",
      classId: sectionData?.class_id,
    });
  };

  const handleAddSection = (classId: string) => {
    const classData = classSectionsData?.find((c) => c.id === classId);
    setEditSectionModal({
      isOpen: true,
      sectionData: null,
      classId,
      className: classData?.name || "Unknown Class",
    });
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm.type === "class") {
      deleteClassMutation.mutate(deleteConfirm.id);
    } else if (deleteConfirm.type === "section") {
      deleteSectionByIdMutation.mutate(deleteConfirm.id);
    }
    setDeleteConfirm({ isOpen: false, type: "class", id: "", name: "" });
  };

  const handleUpdateClass = (classId: string, data: ClassUpdate) => {
    updateClassMutation.mutate(
      { classId, input: data },
      {
        onSuccess: () => {
          setEditClassModal({ isOpen: false, classData: null });
        },
      }
    );
  };

  const handleUpdateSection = (sectionId: string, data: any) => {
    updateSectionByIdMutation.mutate(
      { sectionId, sectionData: { ...data, id: sectionId } },
      {
        onSuccess: () => setEditSectionModal({ isOpen: false, sectionData: null, classId: "", className: "" }),
      }
    );
  };

  const handleAddSections = (newSections: { name: string; is_active: boolean }[]) => {
    const classData = classSectionsData?.find((c) => c.id === editSectionModal.classId);
    const existingNames = new Set(
      (classData?.sections ?? []).map((s) => s.name.trim().toLowerCase())
    );

    const duplicates = newSections.filter((s) => existingNames.has(s.name.trim().toLowerCase()));
    const toAdd = newSections.filter((s) => !existingNames.has(s.name.trim().toLowerCase()));

    if (duplicates.length > 0) {
      const names = duplicates.map((s) => s.name).join(", ");
      if (toAdd.length === 0) {
        toast.error(`Section${duplicates.length > 1 ? "s" : ""} already exist: ${names}`);
        return;
      }
      toast.warning(`Skipped duplicate section${duplicates.length > 1 ? "s" : ""}: ${names}`);
    }

    createSectionsBulkMutation.mutate(
      { classId: editSectionModal.classId, sections: toAdd },
      {
        onSuccess: () => setEditSectionModal({ isOpen: false, sectionData: null, classId: "", className: "" }),
      }
    );
  };

  return (
    <PermissionGuard
      permissions={[
        ["classes", "list"],
        ["sections", "list"],
      ]}
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Access Denied
            </h2>
            <p className="text-muted-foreground">
              You don't have permission to view Classes & Sections.
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {!hasClassesListPermission ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">
              Permission not available for Classes.
            </p>
          </div>
        ) : (
          <>
            {!shouldFetchData ? (
                    <div className="flex items-center justify-center h-32">
                      <p className="text-muted-foreground">
                        You don't have permission to view class data.
                      </p>
                    </div>
                  ) : isLoading ? (
                    <div className="flex justify-center items-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <span className="ml-2">Loading classes...</span>
                    </div>
                  ) : (
                    <ClassSectionsTable
                      data={classSectionsData || []}
                      onEditClass={handleEditClass}
                      onDeleteClass={handleDeleteClass}
                      onEditSection={handleEditSection}
                      onDeleteSection={handleDeleteSection}
                      onAddSection={handleAddSection}
                      isLoading={isLoading}
                      hasSectionsPermission={hasSectionsListPermission}
                      addButton={
                        <PermissionGuard
                          resource="classes"
                          action="create"
                          fallback={null}
                        >
                          <AddClassAndSectionsModal
                            onSubmit={(data) => {
                              createClassMutation.mutate(data);
                            }}
                            isPending={createClassMutation.status === "pending"}
                          />
                        </PermissionGuard>
                      }
                    />
            )}
          </>
        )}

        {/* Edit Class Modal */}
        <EditClassModal
          isOpen={editClassModal.isOpen}
          onClose={() => setEditClassModal({ isOpen: false, classData: null })}
          classData={editClassModal.classData}
          onSubmit={handleUpdateClass}
          isPending={updateClassMutation.status === "pending"}
        />

        {/* Edit/Add Section Modal */}
        <EditSectionModal
          isOpen={editSectionModal.isOpen}
          onClose={() =>
            setEditSectionModal({
              isOpen: false,
              sectionData: null,
              classId: "",
              className: "",
            })
          }
          sectionData={editSectionModal.sectionData}
          className={editSectionModal.className}
          onSubmit={handleUpdateSection}
          onAddSections={handleAddSections}
          isPending={
            updateSectionByIdMutation.status === "pending" ||
            createSectionsBulkMutation.status === "pending"
          }
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={deleteConfirm.isOpen}
          onOpenChange={(open) =>
            !open &&
            setDeleteConfirm({ isOpen: false, type: "class", id: "", name: "" })
          }
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2">
                  <p>
                    Are you sure you want to delete {deleteConfirm.type === "class" ? "class" : "section"}{" "}
                    <strong>"{deleteConfirm.name}"</strong>?
                  </p>
                  {deleteConfirm.type === "class" && (() => {
                    const classData = classSectionsData?.find((c) => c.id === deleteConfirm.id);
                    const sectionCount = classData?.sections?.length ?? 0;
                    return sectionCount > 0 ? (
                      <p className="text-amber-600 dark:text-amber-400 text-sm font-medium">
                        This class has {sectionCount} section{sectionCount !== 1 ? "s" : ""}.
                        Deletion will fail if any section or class has linked student admissions,
                        fee mappings, or subject mappings. Deactivate instead if records exist.
                      </p>
                    ) : null;
                  })()}
                  <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-red-600 hover:bg-red-700"
                disabled={
                  deleteClassMutation.status === "pending" ||
                  deleteSectionByIdMutation.status === "pending"
                }
              >
                {(deleteClassMutation.status === "pending" ||
                  deleteSectionByIdMutation.status === "pending") && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                {deleteClassMutation.status === "pending" ||
                deleteSectionByIdMutation.status === "pending"
                  ? "Deleting..."
                  : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PermissionGuard>
  );
}

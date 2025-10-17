import React, { useEffect, useState } from 'react';
import { useReadAllClassSections, useCreateClassSections, useUpdateClassSections, useDeleteClassSections, useCreateSection, useUpdateSection, useDeleteSection, useUpdateSectionById, useDeleteSectionById } from '@/api/hooks/masters/classesandsections';
import type { ClassRead, ClassCreate, ClassUpdate, SectionRead } from '@/types/masters/classesandsections';
import { AddClassAndSectionsModal } from './AddClassAndSectionsModal';
import { ClassSectionsTable, EditClassModal, EditSectionModal, SectionsManagement } from '@/components/masters/classesandsections';
import { useAcademicYearStore } from '@/lib/academicYearStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PermissionGuard } from '@/components/PermissionGuard';
import { usePermission } from '@/hooks/usePermission';

export default function ClassesAndSectionsPage() {
    const { selectedAcademicYearId, academicYears, fetchAndSetAcademicYears } = useAcademicYearStore();
    const { checkPermission } = usePermission();

    // Check permissions
    const hasClassesListPermission = checkPermission('classes', 'list');
    const hasSectionsListPermission = checkPermission('sections', 'list');
    const hasClassesReadPermission = checkPermission('classes', 'read');
    const hasSectionsReadPermission = checkPermission('sections', 'read');

    // Only call API if user has permission to view either classes or sections
    const shouldFetchData = hasClassesListPermission && hasSectionsListPermission;
    const { data: classSectionsData, isLoading, refetch } = useReadAllClassSections(
        { academic_year_id: selectedAcademicYearId || undefined },
        shouldFetchData 
    );

    // Mutations
    const createClassMutation = useCreateClassSections();
    const updateClassMutation = useUpdateClassSections();
    const deleteClassMutation = useDeleteClassSections();
    const createSectionMutation = useCreateSection();
    const updateSectionMutation = useUpdateSection();
    const deleteSectionMutation = useDeleteSection();
    const updateSectionByIdMutation = useUpdateSectionById();
    const deleteSectionByIdMutation = useDeleteSectionById();

    // Modal states
    const [editClassModal, setEditClassModal] = useState<{ isOpen: boolean; classData: ClassRead | null }>({
        isOpen: false,
        classData: null
    });
    const [editSectionModal, setEditSectionModal] = useState<{ isOpen: boolean; sectionData: SectionRead | null; classId: string; className: string }>({
        isOpen: false,
        sectionData: null,
        classId: '',
        className: ''
    });
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; type: 'class' | 'section'; id: string; name: string; classId?: string }>({
        isOpen: false,
        type: 'class',
        id: '',
        name: ''
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
        const classData = classSectionsData?.find(c => c.id === classId);
        setDeleteConfirm({
            isOpen: true,
            type: 'class',
            id: classId,
            name: classData?.name || 'Unknown Class'
        });
    };

    const handleEditSection = (section: SectionRead) => {
        const classData = classSectionsData?.find(c => c.id === section.class_id);
        setEditSectionModal({
            isOpen: true,
            sectionData: section,
            classId: section.class_id,
            className: classData?.name || 'Unknown Class'
        });
    };

    const handleDeleteSection = (sectionId: string) => {
        const allSections = classSectionsData?.flatMap(c => c.sections) || [];
        const sectionData = allSections.find(s => s.id === sectionId);
        const classData = classSectionsData?.find(c => c.id === sectionData?.class_id);
        setDeleteConfirm({
            isOpen: true,
            type: 'section',
            id: sectionId,
            name: sectionData?.name || 'Unknown Section',
            classId: sectionData?.class_id
        });
    };

    const handleAddSection = (classId: string) => {
        const classData = classSectionsData?.find(c => c.id === classId);
        setEditSectionModal({
            isOpen: true,
            sectionData: null,
            classId,
            className: classData?.name || 'Unknown Class'
        });
    };

    const handleConfirmDelete = () => {
        if (deleteConfirm.type === 'class') {
            deleteClassMutation.mutate(deleteConfirm.id);
        } else if (deleteConfirm.type === 'section') {
            deleteSectionByIdMutation.mutate(deleteConfirm.id);
        }
        setDeleteConfirm({ isOpen: false, type: 'class', id: '', name: '' });
    };

    const handleUpdateClass = (classId: string, data: ClassUpdate) => {
        updateClassMutation.mutate({ classId, input: data }, {
            onSuccess: () => {
                setEditClassModal({ isOpen: false, classData: null });
                refetch();
            }
        });
    };

    const handleUpdateSection = (sectionId: string, data: any) => {
        if (editSectionModal.sectionData) {
            // Update existing section using direct section operations
            // Include the section ID in the request body as required by backend
            updateSectionByIdMutation.mutate({
                sectionId,
                sectionData: { ...data, id: sectionId }
            }, {
                onSuccess: () => {
                    setEditSectionModal({ isOpen: false, sectionData: null, classId: '', className: '' });
                    refetch();
                }
            });
        } else {
            // Create new section using class-based operations (since we need class context for creation)
            createSectionMutation.mutate({
                classId: editSectionModal.classId,
                sectionData: data
            }, {
                onSuccess: () => {
                    setEditSectionModal({ isOpen: false, sectionData: null, classId: '', className: '' });
                    refetch();
                }
            });
        }
    };

    return (
        <PermissionGuard
            permissions={[
                ["classes", "list"],
                ["sections", "list"]
            ]}
            fallback={
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <h2 className="text-xl font-semibold text-gray-800 mb-2">Access Denied</h2>
                        <p className="text-gray-600">You don't have permission to view Classes & Sections.</p>
                    </div>
                </div>
            }
        >
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Classes & Sections Management</CardTitle>
                    </CardHeader>
                    <CardContent>
                    <Tabs defaultValue="table" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="table">Classes View</TabsTrigger>
                            <TabsTrigger value="sections">Sections View</TabsTrigger>
                        </TabsList>

                        <TabsContent value="table" className="space-y-4">
                            {!hasClassesListPermission ? (
                                <div className="flex items-center justify-center h-32">
                                    <p className="text-gray-600">Permission not available for Classes.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-lg font-medium">Classes with Expandable Sections</h3>
                                        <PermissionGuard
                                            resource="classes"
                                            action="create"
                                            fallback={null}
                                        >
                                            <AddClassAndSectionsModal
                                                onSubmit={(data) => {
                                                    createClassMutation.mutate(data, {
                                                        onSuccess: () => refetch()
                                                    });
                                                }}
                                                isPending={createClassMutation.status === 'pending'}
                                            />
                                        </PermissionGuard>
                                    </div>

                                    {!shouldFetchData ? (
                                        <div className="flex items-center justify-center h-32">
                                            <p className="text-gray-600">You don't have permission to view class data.</p>
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
                                        />
                                    )}
                                </>
                            )}
                        </TabsContent>

                        <TabsContent value="sections" className="space-y-4">
                            {!shouldFetchData ? (
                                <div className="flex items-center justify-center h-32">
                                    <p className="text-gray-600">Permission not available for Sections.</p>
                                </div>
                            ) : !hasSectionsReadPermission ? (
                                <div className="flex items-center justify-center h-32">
                                    <p className="text-gray-600">You don't have permission to view section data.</p>
                                </div>
                            ) : (
                                <SectionsManagement
                                    data={classSectionsData || []}
                                    onEditSection={handleEditSection}
                                    onDeleteSection={handleDeleteSection}
                                    onAddSection={handleAddSection}
                                    isLoading={isLoading}
                                />
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Edit Class Modal */}
            <EditClassModal
                isOpen={editClassModal.isOpen}
                onClose={() => setEditClassModal({ isOpen: false, classData: null })}
                classData={editClassModal.classData}
                onSubmit={handleUpdateClass}
                isPending={updateClassMutation.status === 'pending'}
            />

            {/* Edit Section Modal */}
            <EditSectionModal
                isOpen={editSectionModal.isOpen}
                onClose={() => setEditSectionModal({ isOpen: false, sectionData: null, classId: '', className: '' })}
                sectionData={editSectionModal.sectionData}
                className={editSectionModal.className}
                onSubmit={handleUpdateSection}
                isPending={updateSectionByIdMutation.status === 'pending' || createSectionMutation.status === 'pending'}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteConfirm.isOpen} onOpenChange={(open) => !open && setDeleteConfirm({ isOpen: false, type: 'class', id: '', name: '' })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete {deleteConfirm.type === 'class' ? 'class' : 'section'} "{deleteConfirm.name}"?
                            {deleteConfirm.type === 'class' && ' This will also delete all associated sections.'}
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={deleteClassMutation.status === 'pending' || deleteSectionByIdMutation.status === 'pending'}
                        >
                            {deleteClassMutation.status === 'pending' || deleteSectionMutation.status === 'pending' ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            </div>
        </PermissionGuard>
    );
}
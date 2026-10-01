import React, { useState } from "react";
import { config } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table } from "@/components/common/table";
import type { TableColumn } from "@/components/common/table";
import { FileText, Trash2, RotateCcw, ChevronDown, ChevronUp, Upload, Eye, Download, FolderOpen, CheckCircle, Loader2 } from "lucide-react";
import { PageHeader } from '@/components/ui/PageHeader';
import { toast } from "sonner";
import { useStudentDocuments, useUploadStudentDocument, useDeleteStudentDocument, useDownloadStudentDocument } from "@/api/hooks/students/documents";
import { useDocumentTypes, useVerifyDocument } from "@/api/documents";
import { useStudentsDropdown } from "@/api/hooks/students/useAdmission";
import { useAuthStore } from "@/lib/authStore";
import { PermissionGuard } from "@/components/PermissionGuard";
import { usePermission } from "@/hooks/usePermission";
import { ViewButton, DeleteButton, DownloadButton, TableActionGroup } from "@/components/common/TableActions";
import type { Document } from "@/types/documents";

interface DocumentActionsCellProps {
    row: Document;
    onDelete: (row: Document) => void;
    onDownload: (id: string) => void;
    onVerify: (id: string, remarks: string) => void;
    canDelete: boolean;
    canVerify: boolean;
    deleteDialogOpen: string | null;
    setDeleteDialogOpen: (id: string | null) => void;
    verifyDialogOpen: string | null;
    setVerifyDialogOpen: (id: string | null) => void;
    verifyRemarks: string;
    setVerifyRemarks: (v: string) => void;
    mediaBase: string;
}

const DocumentActionsCell: React.FC<DocumentActionsCellProps> = ({
    row,
    onDelete,
    onDownload,
    onVerify,
    canDelete,
    canVerify,
    deleteDialogOpen,
    setDeleteDialogOpen,
    verifyDialogOpen,
    setVerifyDialogOpen,
    verifyRemarks,
    setVerifyRemarks,
    mediaBase,
}) => (
    <TableActionGroup>
        {row.file_path && (
            <ViewButton
                onClick={() => {
                    const url = row.file_path.startsWith('http') ? row.file_path : `${mediaBase}${row.file_path}`;
                    window.open(url, '_blank');
                }}
                title="View Document"
            />
        )}
        {canVerify && (
            <Dialog
                open={verifyDialogOpen === row.id}
                onOpenChange={(open) => {
                    setVerifyDialogOpen(open ? row.id : null);
                    if (!open) setVerifyRemarks('');
                }}
            >
                <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Verify Document">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Verify Document</DialogTitle>
                        <DialogDescription>
                            Mark this document as verified. Add optional remarks.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <Label>Remarks (optional)</Label>
                        <Input
                            value={verifyRemarks}
                            onChange={(e) => setVerifyRemarks(e.target.value)}
                            placeholder="Add verification remarks..."
                        />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button onClick={() => onVerify(row.id, verifyRemarks)}>
                            Verify
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )}
        {canDelete && (
            <Dialog open={deleteDialogOpen === row.id} onOpenChange={(open) => setDeleteDialogOpen(open ? row.id : null)}>
                <DialogTrigger asChild>
                    <DeleteButton
                        onClick={() => setDeleteDialogOpen(row.id)}
                        title="Delete"
                    />
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Document?</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this document? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline" onClick={() => setDeleteDialogOpen(null)}>Cancel</Button>
                        </DialogClose>
                        <Button
                            variant="destructive"
                            onClick={() => onDelete(row)}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )}
    </TableActionGroup>
);

export const DocumentUploadPage: React.FC = () => {
    const { checkPermission } = usePermission();
    const mediaBase = config.api.baseURL.replace(/\/api\/v\d+$/, '');
    const user = useAuthStore(s => s.user);
    const [selectedStudent, setSelectedStudent] = useState<string>("");
    const [documentType, setDocumentType] = useState<string>("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);
    const [verifyDialogOpen, setVerifyDialogOpen] = useState<string | null>(null);
    const [verifyRemarks, setVerifyRemarks] = useState<string>("");
    const [isUploadSectionOpen, setIsUploadSectionOpen] = useState(true);

    // API hooks
    const { data: students = [] } = useStudentsDropdown();
    const { data: documentTypes = [], isLoading: typesLoading } = useDocumentTypes({ is_active: true });

    const { data: documents = [], isLoading: documentsLoading } = useStudentDocuments(selectedStudent);

    const createDocument = useUploadStudentDocument();
    const deleteDocument = useDeleteStudentDocument();
    const downloadDocument = useDownloadStudentDocument();
    const verifyDocumentMutation = useVerifyDocument();

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    const handleSubmit = async () => {
        if (!selectedStudent || !documentType || !selectedFile) {
            toast.error("Please fill all required fields and select a file");
            return;
        }

        try {
            await createDocument.mutateAsync({
                student_id: selectedStudent,
                document_type: documentType,
                document_file: selectedFile
            });

            setDocumentType("");
            setSelectedFile(null);
        } catch (error) {
            // Error handled by mutation
        }
    };

    const handleEdit = async (row: Document, key: string, value: any) => {
        // Document editing is not supported by the backend
        toast.error('Document editing is not supported');
    };

    const handleDelete = async (row: Document) => {
        try {
            await deleteDocument.mutateAsync(row.id);
            setDeleteDialogOpen(null);
        } catch (error) {
            // Error handled by mutation
        }
    };

    const canDelete = checkPermission('student_documents', 'delete');
    const canVerify = checkPermission('student_documents', 'update');

    const handleVerify = async (documentId: string, remarks: string) => {
        const verifiedBy = (user as any)?.full_name || (user as any)?.name || (user as any)?.username || 'Staff';
        try {
            await verifyDocumentMutation.mutateAsync({
                document_id: documentId,
                verified_by: verifiedBy,
                remarks: remarks || undefined,
            });
            toast.success('Document verified successfully!');
            setVerifyDialogOpen(null);
            setVerifyRemarks('');
        } catch {
            toast.error('Failed to verify document');
        }
    };

    const columns: TableColumn<Document>[] = [
        {
            key: "document_type",
            label: "Document Type",
            render: (value) => (
                <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {value}
                </div>
            )
        },
        {
            key: "upload_date",
            label: "Uploaded At",
            render: (value, row) => {
                const dateStr = value || row.uploaded_at;
                if (!dateStr) return "N/A";
                try {
                    return new Date(dateStr).toLocaleDateString();
                } catch {
                    return dateStr;
                }
            }
        },
        {
            key: "actions",
            label: "Actions",
            render: (_, row) => (
                <DocumentActionsCell
                    row={row}
                    onDelete={handleDelete}
                    onDownload={(id) => downloadDocument.mutate(id)}
                    onVerify={handleVerify}
                    canDelete={canDelete}
                    canVerify={canVerify}
                    deleteDialogOpen={deleteDialogOpen}
                    setDeleteDialogOpen={setDeleteDialogOpen}
                    verifyDialogOpen={verifyDialogOpen}
                    setVerifyDialogOpen={setVerifyDialogOpen}
                    verifyRemarks={verifyRemarks}
                    setVerifyRemarks={setVerifyRemarks}
                    mediaBase={mediaBase}
                />
            )
        }
    ];

    return (
        <PermissionGuard
            permissions={[['student_documents', 'list'], ['student_documents', 'list_own']]}
            fallback={
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h2 className="text-lg font-semibold">Access Denied</h2>
                        <p className="text-sm text-muted-foreground">You don't have permission to view student documents.</p>
                    </div>
                </div>
            }
        >
            <div className="container mx-auto p-6 space-y-6">
                <PageHeader title="Document Upload" icon={<FolderOpen className="h-5 w-5" />} />

                <PermissionGuard
                    resource="student_documents"
                    action="create"
                    fallback={null}
                >
                    <Card>
                        <CardHeader
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => setIsUploadSectionOpen(!isUploadSectionOpen)}
                        >
                            <div className="flex items-center justify-between">
                                <CardTitle>Upload New Document</CardTitle>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    {isUploadSectionOpen ? (
                                        <ChevronUp className="h-4 w-4" />
                                    ) : (
                                        <ChevronDown className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </CardHeader>
                        {isUploadSectionOpen && (
                            <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="student">Student *</Label>
                                    <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select student" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {students.map(student => (
                                                <SelectItem key={student.id} value={student.id}>
                                                    {student.display_name || student.name} {student.admission_number ? `(${student.admission_number})` : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="document-type">Document Type *</Label>
                                    <Select value={documentType} onValueChange={setDocumentType} disabled={typesLoading}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={typesLoading ? "Loading types..." : "Select document type"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {documentTypes.map(type => (
                                                <SelectItem key={type.id} value={type.name}>
                                                    {type.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>


                                <div className="space-y-2">
                                    <Label>Browse File *</Label>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => document.getElementById('file-input')?.click()}
                                            className="flex-1"
                                        >
                                            <Upload className="h-4 w-4 mr-2" />
                                            Browse
                                        </Button>
                                    </div>
                                    <input
                                        id="file-input"
                                        type="file"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                    />
                                    {selectedFile && (
                                        <p className="text-sm text-muted-foreground">
                                            Selected: {selectedFile.name}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    onClick={handleSubmit}
                                    disabled={createDocument.isPending}
                                    className="flex-1 md:flex-none"
                                >
                                    {createDocument.isPending ? "Uploading..." : "Upload Document"}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setSelectedStudent("");
                                        setDocumentType("");
                                        setSelectedFile(null);
                                    }}
                                    disabled={createDocument.isPending}
                                    className="flex-1 md:flex-none"
                                >
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    Reset
                                </Button>
                            </div>
                        </CardContent>
                    )}
                    </Card>
                </PermissionGuard>

                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                <CardTitle>Uploaded Documents</CardTitle>
                            </div>
                        </div>
                    </CardHeader>
                <CardContent>
                    {documents.length > 0 && (
                        <div className="mb-4 pb-4 border-b">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <FileText className="h-4 w-4" />
                                <span>{documents.length} document(s) found</span>
                            </div>
                        </div>
                    )}
                    {!selectedStudent ? (
                        <div className="text-center py-8">
                            <FolderOpen className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-75" />
                            <p className="text-muted-foreground">Select a student above to view their documents</p>
                        </div>
                    ) : documentsLoading ? (
                        <div className="flex justify-center items-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin" />
                            <span className="ml-2 text-muted-foreground">Loading documents...</span>
                        </div>
                    ) : documents.length === 0 ? (
                        <div className="text-center py-8">
                            <FileText className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-75" />
                            <p className="text-muted-foreground">No documents found for this student</p>
                        </div>
                    ) : (
                        <Table
                            columns={columns}
                            data={documents}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            className="w-full"
                            isEditing={false}
                            permissions={{
                                resource: "student_documents",
                                canDelete: canDelete,
                            }}
                        />
                    )}
                </CardContent>
                </Card>
            </div>
        </PermissionGuard>
    );
};
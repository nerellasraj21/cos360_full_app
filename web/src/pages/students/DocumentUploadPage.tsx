import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table } from "@/components/common/table";
import type { TableColumn } from "@/components/common/table";
import { FileText, Trash2, RotateCcw, ChevronDown, ChevronUp, Upload, Eye, Download } from "lucide-react";
import { toast } from "sonner";
import { useStudentDocuments, useUploadStudentDocument, useDeleteStudentDocument, useDownloadStudentDocument } from "@/api/hooks/students/documents";
import { useStudentsDropdown } from "@/api/hooks/students/useAdmission";
import type { Document } from "@/types/documents";

export const DocumentUploadPage: React.FC = () => {
    const [selectedStudent, setSelectedStudent] = useState<string>("");
    const [documentType, setDocumentType] = useState<string>("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);
    const [isUploadSectionOpen, setIsUploadSectionOpen] = useState(false);

    // API hooks
    const { data: students = [] } = useStudentsDropdown();

    const { data: documents = [], isLoading: documentsLoading } = useStudentDocuments(selectedStudent);

    const createDocument = useUploadStudentDocument();
    const deleteDocument = useDeleteStudentDocument();
    const downloadDocument = useDownloadStudentDocument();

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

            // Reset form
            setSelectedStudent("");
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
            key: "uploaded_at",
            label: "Uploaded At",
            render: (value) => new Date(value).toLocaleDateString()
        },
        {
            key: "actions",
            label: "Actions",
            render: (_, row) => (
                <div className="flex gap-1">
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => window.open(row.file_path, '_blank')}
                        title="View Document"
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                            downloadDocument.mutate(row.id);
                        }}
                        title="Download"
                    >
                        <Download className="h-4 w-4" />
                    </Button>
                    <Dialog open={deleteDialogOpen === row.id} onOpenChange={(open) => setDeleteDialogOpen(open ? row.id : null)}>
                        <DialogTrigger asChild>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                                title="Delete"
                                onClick={() => setDeleteDialogOpen(row.id)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
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
                                    onClick={() => handleDelete(row)}
                                >
                                    Delete
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            )
        }
    ];

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Document Upload</h1>
            </div>

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
                                <Input
                                    value={documentType}
                                    onChange={(e) => setDocumentType(e.target.value)}
                                    placeholder="Enter document type (e.g., Birth Certificate, ID Proof)"
                                />
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
                                    <p className="text-sm text-gray-600">
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

            <Card>
                <CardHeader>
                    <CardTitle>Uploaded Documents</CardTitle>
                </CardHeader>
                <CardContent>
                    {documentsLoading ? (
                        <div className="text-center py-4">Loading documents...</div>
                    ) : (
                        <Table
                            columns={columns}
                            data={documents}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            className="w-full"
                            isEditing={false}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
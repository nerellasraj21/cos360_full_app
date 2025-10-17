import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Table } from "@/components/common/table";
import type { TableColumn } from "@/components/common/table";
import { FileText, Download, Upload, Plus } from "lucide-react";
import { toast } from "sonner";
import { useMyDocuments, useDownloadStudentDocument, useUploadMyDocument } from "@/api/hooks/students/documents";
import { useAuthStore } from "@/lib/authStore";
import type { Document } from "@/types/documents";

export const MyDocumentsPage: React.FC = () => {
    const { studentId, isAuthenticated } = useAuthStore();
    const [isUploadExpanded, setIsUploadExpanded] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [documentType, setDocumentType] = useState("");

    const { data: documents = [], isLoading } = useMyDocuments();
    const downloadDocument = useDownloadStudentDocument();
    const uploadDocument = useUploadMyDocument();

    const handleDownload = async (documentId: string, fileName?: string) => {
        try {
            await downloadDocument.mutateAsync(documentId);
        } catch (error) {
            toast.error("Failed to download document");
        }
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !documentType) {
            toast.error("Please select a file and document type");
            return;
        }

        try {
            await uploadDocument.mutateAsync({
                document_type: documentType,
                document_file: selectedFile,
            });

            // Reset form
            setSelectedFile(null);
            setDocumentType("");
            setIsUploadExpanded(false);

            // Reset file input
            const fileInput = document.getElementById('document-file') as HTMLInputElement;
            if (fileInput) {
                fileInput.value = '';
            }
        } catch (error) {
            // Error is handled by the mutation
        }
    };

    const handleUploadToggle = () => {
        setIsUploadExpanded(!isUploadExpanded);
        if (isUploadExpanded) {
            // Collapsing - reset form
            setSelectedFile(null);
            setDocumentType("");
            const fileInput = document.getElementById('document-file') as HTMLInputElement;
            if (fileInput) {
                fileInput.value = '';
            }
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
            label: "Upload Date",
            render: (value) => value ? new Date(value).toLocaleDateString() : '-'
        },
        {
            key: "file_path",
            label: "Actions",
            render: (_, row) => (
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(row.id)}
                        disabled={downloadDocument.isPending}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                    </Button>
                </div>
            )
        }
    ];

    // Show login message only for unauthenticated users
    if (!isAuthenticated) {
        return (
            <div className="container mx-auto p-6">
                <Card>
                    <CardContent className="p-6">
                        <div className="text-center text-muted-foreground">
                            Please log in to view your documents.
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Show loading while studentId is being set
    if (!studentId) {
        return (
            <div className="container mx-auto p-6">
                <Card>
                    <CardContent className="p-6">
                        <div className="text-center text-muted-foreground">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            Loading your documents...
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">My Documents</h1>
                <Button
                    onClick={handleUploadToggle}
                    variant="outline"
                    className="flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Upload Document
                    {isUploadExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
            </div>

            {/* Collapsible Upload Section */}
            {isUploadExpanded && (
                <Card className="mt-4">
                    <CardHeader>
                        <CardTitle className="text-lg">Upload New Document</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="document-type">Document Type</Label>
                                <Select value={documentType} onValueChange={setDocumentType}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select document type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="birth_certificate">Birth Certificate</SelectItem>
                                        <SelectItem value="marksheet">Marksheet</SelectItem>
                                        <SelectItem value="aadhar_card">Aadhar Card</SelectItem>
                                        <SelectItem value="passport">Passport</SelectItem>
                                        <SelectItem value="medical_certificate">Medical Certificate</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="document-file">File</Label>
                                <Input
                                    id="document-file"
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                    onChange={handleFileSelect}
                                />
                                {selectedFile && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Selected: {selectedFile.name}
                                    </p>
                                )}
                            </div>
                            <div className="flex gap-2 pt-4">
                                <Button
                                    onClick={handleUpload}
                                    disabled={uploadDocument.isPending || !selectedFile || !documentType}
                                    className="flex-1"
                                >
                                    {uploadDocument.isPending ? "Uploading..." : "Upload Document"}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleUploadToggle}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="mt-6">
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>My Documents</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-4">Loading documents...</div>
                    ) : documents.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No documents found.</p>
                            <p className="text-sm">Documents uploaded for you will appear here.</p>
                        </div>
                    ) : (
                        <Table
                            columns={columns}
                            data={documents}
                            onEdit={() => {}}
                            onDelete={() => {}}
                            isEditing={false}
                            className="w-full"
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
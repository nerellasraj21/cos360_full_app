import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table } from "@/components/common/table";
import type { TableColumn } from "@/components/common/table";
import { PDFViewer } from "@/components/common/PDFViewer";
import { Upload, Eye, Edit, FileText, X, Download, Trash2, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

interface Document {
    id: number;
    document_type: string;
    file_path: string;
    student_id: number;
    uploaded_at: string;
}

const DOCUMENT_TYPES = [
    "Birth Certificate",
    "Academic Transcript",
    "ID Card",
    "Medical Certificate",
    "Recommendation Letter",
    "Other"
];

export const CertificateUploadPage: React.FC = () => {
    const [selectedType, setSelectedType] = useState<string>("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const [documents, setDocuments] = useState<Document[]>([
        {
            id: 1,
            document_type: "Birth Certificate",
            file_path: "https://ontheline.trincoll.edu/images/bookdown/sample-local-pdf.pdf",
            student_id: 1,
            uploaded_at: "2024-01-15T10:30:00Z"
        },
        {
            id: 2,
            document_type: "Academic Transcript",
            file_path: "https://www.africau.edu/images/default/sample.pdf",
            student_id: 1,
            uploaded_at: "2024-01-20T14:45:00Z"
        },
        {
            id: 3,
            document_type: "ID Card",
            file_path: "https://via.placeholder.com/800x600/0066cc/ffffff?text=Sample+ID+Card",
            student_id: 1,
            uploaded_at: "2024-01-25T09:15:00Z"
        }
    ]);
    const [previewUrl, setPreviewUrl] = useState<string>("");
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState<number | null>(null);
    const [isUploadSectionOpen, setIsUploadSectionOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const handleBrowseClick = () => {
        if (!selectedType) {
            toast.error("Please select a document type first");
            return;
        }
        fileInputRef.current?.click();
    };

    const handleSubmit = async () => {
        if (!selectedFile || !selectedType) {
            toast.error("Please select both document type and file");
            return;
        }

        setIsUploading(true);
        try {

            const newDocument: Document = {
                id: Date.now(),
                document_type: selectedType,
                file_path: selectedFile.name,
                student_id: 1, // This should come from context/auth
                uploaded_at: new Date().toISOString()
            };

            setDocuments(prev => [...prev, newDocument]);
            setSelectedFile(null);
            setSelectedType("");
            setPreviewUrl("");
            toast.success("Document uploaded successfully");
        } catch (error) {
            toast.error("Failed to upload document");
        } finally {
            setIsUploading(false);
        }
    };

    const handleEdit = (row: Document, key: string, value: any) => {
        setDocuments(prev =>
            prev.map(doc =>
                doc.id === row.id ? { ...doc, [key]: value } : doc
            )
        );
    };

    const handleDelete = (row: Document) => {
        setDocuments(prev => prev.filter(doc => doc.id !== row.id));
        toast.success("Document deleted successfully");
    };

    const handleReplaceFile = (document: Document) => {
        setSelectedType(document.document_type);
        fileInputRef.current?.click();
    };

    const handleReset = () => {
        setSelectedType("");
        setSelectedFile(null);
        setPreviewUrl("");
        setIsPreviewOpen(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
        toast.success("Form reset");
    };

    const handleDownload = (doc: Document) => {
        try {
            const fileName = doc.file_path.split('\\').pop() || doc.file_path.split('/').pop() || 'document';


            if (doc.file_path.startsWith('C:') || doc.file_path.startsWith('/')) {

                window.open(doc.file_path, '_blank');
                toast.info("File opened in new tab");
                return;
            }


            fetch(doc.file_path)
                .then(response => response.blob())
                .then(blob => {
                    const url = window.URL.createObjectURL(blob);
                    const link = window.document.createElement('a');
                    link.href = url;
                    link.download = fileName;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    window.document.body.appendChild(link);
                    link.click();
                    window.document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                    toast.success("Download started");
                })
                .catch(() => {

                    window.open(doc.file_path, '_blank');
                    toast.info("File opened in new tab");
                });
        } catch (error) {

            window.open(doc.file_path, '_blank');
            toast.info("File opened in new tab");
        }
    };

    const columns: TableColumn<Document>[] = [
        {
            key: "document_type",
            label: "Certificate Type",
            render: (value) => (
                <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {value}
                </div>
            )
        },
        {
            key: "file_path",
            label: "File Name",
            render: (value) => (
                <span className="font-mono text-sm">{value}</span>
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
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                <Eye className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-6xl max-h-[90vh] w-[90vw]">
                            <DialogHeader className="flex flex-row items-center justify-between">
                                <DialogTitle>View Document - {row.file_path}</DialogTitle>
                                <DialogClose asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                        <X className="h-4 w-4" />
                                    </Button>
                                </DialogClose>
                            </DialogHeader>
                            <div className="h-[70vh] bg-gray-50 rounded">
                                {row.file_path.toLowerCase().endsWith('.pdf') ? (
                                    <PDFViewer file={row.file_path} fileName={row.file_path} className="h-full" />
                                ) : row.file_path.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) ? (
                                    <div className="flex justify-center items-center h-full">
                                        <img
                                            src={row.file_path}
                                            alt="Document"
                                            className="max-w-full max-h-full object-contain"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex justify-center items-center h-full">
                                        <div className="text-center">
                                            <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                                            <p className="text-gray-600">Document preview</p>
                                            <p className="text-sm text-gray-500">{row.file_path}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => handleDownload(row)}
                        title="Download"
                    >
                        <Download className="h-4 w-4" />
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => handleReplaceFile(row)}
                        title="Replace File"
                    >
                        <Edit className="h-4 w-4" />
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
                                    Are you sure you want to delete "{row.file_path.split('\\').pop() || row.file_path.split('/').pop()}"? This action cannot be undone.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button variant="outline" onClick={() => setDeleteDialogOpen(null)}>Cancel</Button>
                                </DialogClose>
                                <Button
                                    variant="destructive"
                                    onClick={() => {
                                        handleDelete(row);
                                        setDeleteDialogOpen(null);
                                    }}
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
                <h1 className="text-3xl font-bold">Certificate Upload</h1>
            </div>


            <Card>
                <CardHeader
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setIsUploadSectionOpen(!isUploadSectionOpen)}
                >
                    <div className="flex items-center justify-between">
                        <CardTitle>Upload New Certificate</CardTitle>
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
                                <Label htmlFor="document-type">Certificate Type</Label>
                                <Select value={selectedType} onValueChange={setSelectedType}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select certificate type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DOCUMENT_TYPES.map(type => (
                                            <SelectItem key={type} value={type}>{type}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Browse File</Label>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={handleBrowseClick}
                                        className="flex-1"
                                    >
                                        <Upload className="h-4 w-4 mr-2" />
                                        Browse
                                    </Button>
                                    {selectedFile && (
                                        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                                            <DialogTrigger asChild>
                                                <Button variant="outline">
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    Preview
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-6xl max-h-[90vh] w-[90vw]">
                                                <DialogHeader className="flex flex-row items-center justify-between">
                                                    <DialogTitle>File Preview - {selectedFile.name}</DialogTitle>
                                                    <DialogClose asChild>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </DialogClose>
                                                </DialogHeader>
                                                <div className="h-[70vh] bg-gray-50 rounded">
                                                    {selectedFile.type.startsWith('image/') ? (
                                                        <div className="flex justify-center items-center h-full">
                                                            <img
                                                                src={previewUrl}
                                                                alt="Preview"
                                                                className="max-w-full max-h-full object-contain"
                                                            />
                                                        </div>
                                                    ) : selectedFile.type === 'application/pdf' ? (
                                                        <PDFViewer file={selectedFile} className="h-full" />
                                                    ) : (
                                                        <div className="flex justify-center items-center h-full">
                                                            <div className="text-center">
                                                                <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                                                                <p className="text-gray-600">Preview not available for this file type</p>
                                                                <p className="text-sm text-gray-500">{selectedFile.name}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    )}
                                </div>
                                <input
                                    ref={fileInputRef}
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

                        {(selectedFile || selectedType) && (
                            <div className="flex gap-2">
                                {selectedFile && (
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={isUploading}
                                        className="flex-1 md:flex-none"
                                    >
                                        {isUploading ? "Uploading..." : "Submit"}
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    onClick={handleReset}
                                    disabled={isUploading}
                                    className="flex-1 md:flex-none"
                                >
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    Reset
                                </Button>
                            </div>
                        )}
                    </CardContent>
                )}
            </Card>


            <Card>
                <CardHeader>
                    <CardTitle>Uploaded Certificates</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table
                        columns={columns}
                        data={documents}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        className="w-full"
                        isEditing={false}
                    />
                </CardContent>
            </Card>
        </div>
    );
};

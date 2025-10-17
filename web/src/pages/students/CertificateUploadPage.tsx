import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table } from "@/components/common/table";
import type { TableColumn } from "@/components/common/table";
import { FileText, Trash2, RotateCcw, ChevronDown, ChevronUp, Upload } from "lucide-react";
import { toast } from "sonner";
import { useCertificates, useCreateCertificate, useUpdateCertificate, useDeleteCertificate } from "@/api/hooks/students/certificates";
import { useCertificateTypes } from "@/api/certificateTypes";
import { useStudentsDropdown } from "@/api/hooks/students/useAdmission";
import type { CertificateResponse } from "@/api/hooks/students/certificates";


export const CertificateUploadPage: React.FC = () => {
    const [selectedStudent, setSelectedStudent] = useState<string>("");
    const [selectedType, setSelectedType] = useState<string>("");
    const [issueDate, setIssueDate] = useState<string>("");
    const [description, setDescription] = useState<string>("");
    const [certificateFile, setCertificateFile] = useState<File | null>(null);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);
    const [isUploadSectionOpen, setIsUploadSectionOpen] = useState(false);

    // API hooks
    const { data: certificatesResponse, isLoading: certificatesLoading } = useCertificates({ limit: 50 });
    const { data: students = [] } = useStudentsDropdown();
    const { data: certificateTypesResponse } = useCertificateTypes({ limit: 100 });
    const certificateTypes = certificateTypesResponse?.items || [];

    const createCertificate = useCreateCertificate();
    const updateCertificate = useUpdateCertificate();
    const deleteCertificate = useDeleteCertificate();

    const certificates = certificatesResponse?.items || [];


    const handleSubmit = async () => {
        if (!selectedStudent || !selectedType) {
            toast.error("Please fill all required fields");
            return;
        }

        try {
            await createCertificate.mutateAsync({
                student_id: selectedStudent,
                certificate_type_id: selectedType,
                issue_date: issueDate || undefined,
                description: description || undefined,
                certificate_file: certificateFile || undefined
            });

            // Reset form
            setSelectedStudent("");
            setSelectedType("");
            setIssueDate("");
            setDescription("");
            setCertificateFile(null);
        } catch (error) {
            // Error handled by mutation
        }
    };

    const handleEdit = async (row: CertificateResponse, key: string, value: any) => {
        // Inline editing disabled for certificates - use dedicated edit modal instead
        toast.error('Inline editing not supported. Please use a dedicated edit form.');
    };

    const handleDelete = async (row: CertificateResponse) => {
        try {
            await deleteCertificate.mutateAsync(row.id);
            setDeleteDialogOpen(null);
        } catch (error) {
            // Error handled by mutation
        }
    };



    const columns: TableColumn<CertificateResponse>[] = [
        {
            key: "certificate_type_id",
            label: "Certificate Type",
            render: (value) => {
                const type = certificateTypes.find(t => t.id === value);
                return (
                    <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {type?.name || value}
                    </div>
                );
            }
        },
        {
            key: "issue_date",
            label: "Issue Date",
            render: (value) => value ? new Date(value).toLocaleDateString() : '-'
        },
        {
            key: "description",
            label: "Description",
            render: (value) => value || '-'
        },
        {
            key: "file_path",
            label: "File",
            render: (value) => value ? (
                <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm text-muted-foreground">Uploaded</span>
                </div>
            ) : '-'
        },
        {
            key: "actions",
            label: "Actions",
            render: (_, row) => (
                <div className="flex gap-1">
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
                                <DialogTitle>Delete Certificate?</DialogTitle>
                                <DialogDescription>
                                    Are you sure you want to delete this certificate? This action cannot be undone.
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
                                <Label htmlFor="student">Student *</Label>
                                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select student" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {students.map(student => (
                                            <SelectItem key={student.id} value={student.id}>
                                                {student.display_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="certificate-type">Certificate Type *</Label>
                                <Select value={selectedType} onValueChange={setSelectedType}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select certificate type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {certificateTypes.map(type => (
                                            <SelectItem key={type.id} value={type.id}>
                                                {type.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="issue-date">Issue Date</Label>
                                <input
                                    type="date"
                                    value={issueDate}
                                    onChange={(e) => setIssueDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="certificate-file">Certificate File</Label>
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={(e) => setCertificateFile(e.target.files?.[0] || null)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                                {certificateFile && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Upload className="h-4 w-4" />
                                        {certificateFile.name}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="description">Description</Label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    placeholder="Optional description"
                                    rows={3}
                                />
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                onClick={handleSubmit}
                                disabled={createCertificate.isPending}
                                className="flex-1 md:flex-none"
                            >
                                {createCertificate.isPending ? "Creating..." : "Create Certificate"}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSelectedStudent("");
                                    setSelectedType("");
                                    setIssueDate("");
                                    setDescription("");
                                    setCertificateFile(null);
                                }}
                                disabled={createCertificate.isPending}
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
                    <CardTitle>Certificates</CardTitle>
                </CardHeader>
                <CardContent>
                    {certificatesLoading ? (
                        <div className="text-center py-4">Loading certificates...</div>
                    ) : (
                        <Table
                            columns={columns}
                            data={certificates}
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

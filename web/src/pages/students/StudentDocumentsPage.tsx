import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table } from "@/components/common/table";
import type { TableColumn } from "@/components/common/table";
import { FileText, Download, Search, FolderOpen } from "lucide-react";
import { PageHeader } from '@/components/ui/PageHeader';
import { toast } from "sonner";
import { useAllStudentDocuments, useDownloadStudentDocument } from "@/api/hooks/students/documents";
import { useStudentsDropdown } from "@/api/hooks/students/useAdmission";
import type { StudentAllDocumentItem } from "@/types/documents";

export const StudentDocumentsPage: React.FC = () => {
    const [selectedStudent, setSelectedStudent] = useState<string>("");

    const { data: students = [] } = useStudentsDropdown();
    const { data: documents = [], isLoading } = useAllStudentDocuments(selectedStudent);
    const downloadDocument = useDownloadStudentDocument();

    const handleDownload = async (documentId: string) => {
        try {
            await downloadDocument.mutateAsync(documentId);
        } catch (error) {
            toast.error("Failed to download document");
        }
    };

    const sourceLabel: Record<StudentAllDocumentItem['source'], string> = {
        document: 'Document',
        certificate: 'Certificate',
        receipt: 'Receipt',
    };

    const sourceBadgeVariant: Record<StudentAllDocumentItem['source'], 'default' | 'secondary' | 'outline'> = {
        document: 'default',
        certificate: 'secondary',
        receipt: 'outline',
    };

    const columns: TableColumn<StudentAllDocumentItem>[] = [
        {
            key: "source",
            label: "Source",
            render: (value: StudentAllDocumentItem['source']) => (
                <Badge variant={sourceBadgeVariant[value]}>{sourceLabel[value]}</Badge>
            )
        },
        {
            key: "document_type",
            label: "Name / Type",
            render: (_, row) => {
                const label =
                    row.source === 'certificate' ? (row.type_name ?? row.certificate_category ?? '-') :
                    row.source === 'receipt'      ? (row.receipt_number ?? '-') :
                                                   (row.document_type ?? '-');
                return (
                    <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0" />
                        {label}
                    </div>
                );
            }
        },
        {
            key: "upload_date",
            label: "Date",
            render: (value) => value ? new Date(value).toLocaleDateString() : '-'
        },
        {
            key: "file_path",
            label: "Actions",
            render: (_, row) => row.source === 'document' ? (
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(row.id)}
                    disabled={downloadDocument.isPending}
                >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                </Button>
            ) : null
        }
    ];

    return (
        <div className="container mx-auto p-6 space-y-6">
            <PageHeader title="Student Documents" icon={<FolderOpen className="h-5 w-5" />} />

            <Card>
                <CardContent className="space-y-6 pt-6">
                    <div className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-2">Student</label>
                            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a student" />
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
                        <Button
                            onClick={() => setSelectedStudent("")}
                            variant="outline"
                            disabled={!selectedStudent}
                        >
                            Clear
                        </Button>
                    </div>

                    {!selectedStudent ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Please select a student to view their documents.</p>
                        </div>
                    ) : isLoading ? (
                        <div className="text-center py-4">Loading documents...</div>
                    ) : documents.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No documents found for this student.</p>
                            <p className="text-sm">Documents uploaded for the selected student will appear here.</p>
                        </div>
                    ) : (
                        <>
                            <div className="text-sm font-medium text-muted-foreground border-t pt-6">
                                Documents for {students.find(s => s.id === selectedStudent)?.display_name || 'Selected Student'}
                            </div>
                            <Table
                                columns={columns}
                                data={documents as StudentAllDocumentItem[]}
                                onEdit={() => {}}
                                onDelete={() => {}}
                                isEditing={false}
                                className="w-full"
                            />
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
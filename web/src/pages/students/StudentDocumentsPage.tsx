import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table } from "@/components/common/table";
import type { TableColumn } from "@/components/common/table";
import { FileText, Download, Search } from "lucide-react";
import { toast } from "sonner";
import { useStudentDocuments, useDownloadStudentDocument } from "@/api/hooks/students/documents";
import { useStudentsDropdown } from "@/api/hooks/students/useAdmission";
import type { Document } from "@/types/documents";

export const StudentDocumentsPage: React.FC = () => {
    const [selectedStudent, setSelectedStudent] = useState<string>("");

    const { data: students = [] } = useStudentsDropdown();
    const { data: documents = [], isLoading } = useStudentDocuments(selectedStudent);
    const downloadDocument = useDownloadStudentDocument();

    const handleDownload = async (documentId: string) => {
        try {
            await downloadDocument.mutateAsync(documentId);
        } catch (error) {
            toast.error("Failed to download document");
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

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Student Documents</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Select Student</CardTitle>
                </CardHeader>
                <CardContent>
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
                </CardContent>
            </Card>

            {selectedStudent && (
                <Card>
                    <CardHeader>
                        <CardTitle>
                            Documents for {students.find(s => s.id === selectedStudent)?.display_name || 'Selected Student'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="text-center py-4">Loading documents...</div>
                        ) : documents.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No documents found for this student.</p>
                                <p className="text-sm">Documents uploaded for the selected student will appear here.</p>
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
            )}

            {!selectedStudent && (
                <Card>
                    <CardContent className="p-6">
                        <div className="text-center text-muted-foreground">
                            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Please select a student to view their documents.</p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};
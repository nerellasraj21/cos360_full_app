import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table } from "@/components/common/table";
import type { TableColumn } from "@/components/common/table";
import { FileText, Download, Search } from "lucide-react";
import { toast } from "sonner";
import { useStudentCertificates, useDownloadCertificateDocument, useCertificateTypes } from "@/api/hooks/students/certificates";
import { useStudentsDropdown } from "@/api/hooks/students/useAdmission";
import type { CertificateResponse } from "@/api/hooks/students/certificates";

export const StudentCertificatesPage: React.FC = () => {
    const [selectedStudent, setSelectedStudent] = useState<string>("");

    const { data: students = [] } = useStudentsDropdown();
    const { data: certificates = [], isLoading } = useStudentCertificates(selectedStudent);
    const { data: certificateTypes = [] } = useCertificateTypes();
    const downloadCertificate = useDownloadCertificateDocument();

    const handleDownload = async (certificateId: string, fileName?: string) => {
        try {
            const blob = await downloadCertificate.mutateAsync(certificateId);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName || `certificate_${certificateId}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            toast.error("Failed to download certificate");
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
            label: "Actions",
            render: (_, row) => (
                <div className="flex gap-2">
                    {row.file_path && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(row.id)}
                            disabled={downloadCertificate.isPending}
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                        </Button>
                    )}
                </div>
            )
        }
    ];

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Student Certificates</h1>
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
                            Certificates for {students.find(s => s.id === selectedStudent)?.display_name || 'Selected Student'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="text-center py-4">Loading certificates...</div>
                        ) : certificates.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No certificates found for this student.</p>
                                <p className="text-sm">Certificates issued to the selected student will appear here.</p>
                            </div>
                        ) : (
                            <Table
                                columns={columns}
                                data={certificates}
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
                            <p>Please select a student to view their certificates.</p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};
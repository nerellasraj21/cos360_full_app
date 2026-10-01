import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table } from "@/components/common/table";
import type { TableColumn } from "@/components/common/table";
import { FileText, Search, FolderOpen, Loader2 } from "lucide-react";
import { PageHeader } from '@/components/ui/PageHeader';
import { useAllStudentDocuments } from "@/api/hooks/students/documents";
import { useStudentsDropdown } from "@/api/hooks/students/useAdmission";
import { useStudentProfile } from "@/api/hooks/students/profile";
import { PermissionGuard } from "@/components/PermissionGuard";
import { useAuthStore } from "@/lib/authStore";
import { ParentDocumentsPage } from "./ParentDocumentsPage";
import type { StudentAllDocumentItem } from "@/types/documents";

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

// Student view — own documents only, no student picker.
// The student's identity comes from the auth store (entity_id set at login)
// and their name/admission number from GET /profile/student/me.
const MyDocumentsView: React.FC = () => {
    const studentId = useAuthStore((s) => s.studentId);
    const username = useAuthStore((s) => s.user?.username);

    const { data: profile } = useStudentProfile();
    const { data: documents = [], isLoading } = useAllStudentDocuments(studentId ?? "");

    const fullName = profile
        ? `${profile.first_name} ${profile.last_name ?? ''}`.trim()
        : '';
    const admissionNumber = profile?.admission_number ?? username ?? '';
    const classLabel = profile?.class_name
        ? `${profile.class_name}${profile.section_name ? ` - ${profile.section_name}` : ''}`
        : '';
    const meta = [admissionNumber, classLabel].filter(Boolean).join(' · ');

    const title = fullName
        ? `Documents — ${fullName}${meta ? ` (${meta})` : ''}`
        : 'My Documents';

    if (!studentId) {
        return (
            <div className="container mx-auto p-6 space-y-6">
                <PageHeader title="Student Documents" icon={<FolderOpen className="h-5 w-5" />} />
                <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                        <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-75" />
                        <p>No student record is linked to your account.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <PageHeader title="Student Documents" icon={<FolderOpen className="h-5 w-5" />} />

            <Card>
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin" />
                            <span className="ml-2">Loading documents...</span>
                        </div>
                    ) : documents.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-4 opacity-75" />
                            <p>No documents found.</p>
                            <p className="text-sm">Documents issued to you will appear here.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-3 px-3 font-medium text-muted-foreground w-10">S.No.</th>
                                        <th className="text-left py-3 px-3 font-medium text-muted-foreground">Source</th>
                                        <th className="text-left py-3 px-3 font-medium text-muted-foreground">Name / Type</th>
                                        <th className="text-left py-3 px-3 font-medium text-muted-foreground">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {documents.map((doc, idx) => {
                                        const label =
                                            doc.source === 'certificate' ? (doc.type_name ?? doc.certificate_category ?? '-') :
                                            doc.source === 'receipt' ? (doc.receipt_number ?? '-') :
                                            (doc.document_type ?? '-');
                                        return (
                                            <tr key={`${doc.source}-${idx}`} className="border-b hover:bg-muted/40 transition-colors" style={{ height: 48 }}>
                                                <td className="py-2 px-3 text-muted-foreground">{idx + 1}</td>
                                                <td className="py-2 px-3">
                                                    <Badge variant={sourceBadgeVariant[doc.source]}>{sourceLabel[doc.source]}</Badge>
                                                </td>
                                                <td className="py-2 px-3">
                                                    <div className="flex items-center gap-1.5">
                                                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                                        {label}
                                                    </div>
                                                </td>
                                                <td className="py-2 px-3">
                                                    {doc.upload_date ? new Date(doc.upload_date).toLocaleDateString() : '-'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

// Staff/admin view — pick any student and browse their documents.
const StaffDocumentsView: React.FC = () => {
    const [selectedStudent, setSelectedStudent] = useState<string>("");

    const { data: students = [] } = useStudentsDropdown();
    const { data: documents = [], isLoading } = useAllStudentDocuments(selectedStudent);

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
                            <Search className="h-12 w-12 mx-auto mb-4 opacity-75" />
                            <p>Please select a student to view their documents.</p>
                        </div>
                    ) : isLoading ? (
                        <div className="flex justify-center items-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin" />
                            <span className="ml-2">Loading documents...</span>
                        </div>
                    ) : documents.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-4 opacity-75" />
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

// Route entry — branches to the parent's read-only child-document view,
// or the staff/admin browse-any-student view.
export const StudentDocumentsPage: React.FC = () => {
    const role = useAuthStore((s) => s.role);
    const roleName = role?.name.toLowerCase() ?? "";

    return (
        <PermissionGuard
            permissions={[
                ['student_documents', 'list'],
                ['student_documents', 'list_own'],
                ['student_documents', 'list_related'],
            ]}
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
            {roleName === "student" ? <MyDocumentsView />
                : roleName === "parent" ? <ParentDocumentsPage />
                : <StaffDocumentsView />}
        </PermissionGuard>
    );
};
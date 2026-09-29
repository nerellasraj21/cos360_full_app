import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table } from "@/components/common/table";
import type { TableColumn } from "@/components/common/table";
import { DownloadButton, TableActionGroup } from "@/components/common/TableActions";
import { FileText, Download, Search, Loader2, ScrollText } from "lucide-react";
import { PageHeader } from '@/components/ui/PageHeader';
import { useStudentCertificates, useDownloadCertificateDocument } from "@/api/hooks/students/certificates";
import { useStudentsDropdown } from "@/api/hooks/students/useAdmission";
import type { CertificateRead } from "@/api/hooks/students/certificates";

export const StudentCertificatesPage: React.FC = () => {
  const [selectedStudent, setSelectedStudent] = useState<string>("");

  const { data: students = [] } = useStudentsDropdown();
  const { data: certificatesData, isLoading } = useStudentCertificates(selectedStudent);
  const downloadCertificate = useDownloadCertificateDocument();

  const certificates = certificatesData?.items || [];

  const handleDownload = async (certificateId: string) => {
    try {
      const result = await downloadCertificate.mutateAsync(certificateId);
      window.location.href = result.presigned_url;
    } catch {
      // Error handled by mutation
    }
  };

  const columns: TableColumn<CertificateRead>[] = [
    {
      key: "type_name",
      label: "Certificate Type",
      render: (value) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          {value || "-"}
        </div>
      ),
    },
    {
      key: "issue_date",
      label: "Issue Date",
      render: (value) => (value ? new Date(value).toLocaleDateString() : "-"),
    },
    {
      key: "remarks",
      label: "Remarks",
      render: (value) => value || "-",
    },
    {
      key: "file_path",
      label: "File",
      render: (value) =>
        value ? (
          <Badge variant="secondary">
            <FileText className="h-3 w-3 mr-1" />
            Uploaded
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">No file</span>
        ),
    },
    {
      key: "actions" as keyof CertificateRead,
      label: "Actions",
      render: (_, row) => (
        <TableActionGroup>
          {row.file_path && (
            <DownloadButton
              onClick={() => handleDownload(row.id)}
              disabled={downloadCertificate.isPending}
              title="Download Certificate"
            />
          )}
        </TableActionGroup>
      ),
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader title="Student Certificates" icon={<ScrollText className="h-5 w-5" />} />
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
                  {students.map((student) => (
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
              Certificates for{" "}
              {students.find((s) => s.id === selectedStudent)?.display_name ||
                "Selected Student"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading certificates...</span>
              </div>
            ) : certificates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No certificates found for this student.</p>
                <p className="text-sm">
                  Certificates issued to the selected student will appear here.
                </p>
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

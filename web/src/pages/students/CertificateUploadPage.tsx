import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table } from "@/components/common/table";
import type { TableColumn } from "@/components/common/table";
import { FileText, Trash2, RotateCcw, ChevronDown, ChevronUp, Upload, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useCertificates,
  useCreateCertificate,
  useDeleteCertificate,
  useDownloadCertificateDocument,
} from "@/api/hooks/students/certificates";
import { useCertificateTypes } from "@/api/certificateTypes";
import { useStudentsDropdown } from "@/api/hooks/students/useAdmission";
import type { CertificateRead } from "@/api/hooks/students/certificates";

export const CertificateUploadPage: React.FC = () => {
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [issueDate, setIssueDate] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");
  const [certificateFile, setCertificateFile] = useState<File | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);
  const [isUploadSectionOpen, setIsUploadSectionOpen] = useState(false);

  const { data: certificatesResponse, isLoading: certificatesLoading } = useCertificates({ limit: 50 });
  const { data: students = [] } = useStudentsDropdown();
  const { data: certificateTypesResponse } = useCertificateTypes({ limit: 100 });
  const certificateTypes = certificateTypesResponse?.items || [];

  const createCertificate = useCreateCertificate();
  const deleteCertificate = useDeleteCertificate();
  const downloadCertificate = useDownloadCertificateDocument();

  const certificates = certificatesResponse?.items || [];

  const handleDownload = async (certificateId: string) => {
    try {
      const result = await downloadCertificate.mutateAsync(certificateId);
      window.location.href = result.presigned_url;
    } catch {
      // Error handled by mutation
    }
  };

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
        remarks: remarks || undefined,
        certificate_file: certificateFile || undefined,
      });

      setSelectedStudent("");
      setSelectedType("");
      setIssueDate("");
      setRemarks("");
      setCertificateFile(null);
    } catch {
      // Error handled by mutation
    }
  };

  const handleDelete = async (row: CertificateRead) => {
    try {
      await deleteCertificate.mutateAsync(row.id);
      setDeleteDialogOpen(null);
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
        <div className="flex gap-1">
          {row.file_path && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDownload(row.id)}
              disabled={downloadCertificate.isPending}
              title="Download"
            >
              {downloadCertificate.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </Button>
          )}
          <Dialog
            open={deleteDialogOpen === row.id}
            onOpenChange={(open) => setDeleteDialogOpen(open ? row.id : null)}
          >
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                title="Delete"
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
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(row)}
                  disabled={deleteCertificate.isPending}
                >
                  {deleteCertificate.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setIsUploadSectionOpen(!isUploadSectionOpen)}
        >
          <div className="flex items-center justify-between">
            <CardTitle>Issue New Certificate</CardTitle>
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
                <Label>Student *</Label>
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select student" />
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

              <div className="space-y-2">
                <Label>Certificate Type *</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select certificate type" />
                  </SelectTrigger>
                  <SelectContent>
                    {certificateTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Issue Date</Label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label>Certificate File</Label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.docx"
                  onChange={(e) => setCertificateFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                />
                {certificateFile && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Upload className="h-4 w-4" />
                    {certificateFile.name}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">PDF, JPG, JPEG, PNG, DOCX — max 10 MB</p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Remarks</Label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                  placeholder="Optional remarks"
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
                {createCertificate.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Issue Certificate"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedStudent("");
                  setSelectedType("");
                  setIssueDate("");
                  setRemarks("");
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
          <CardTitle>All Certificates</CardTitle>
        </CardHeader>
        <CardContent>
          {certificatesLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading certificates...</span>
            </div>
          ) : certificates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No certificates issued yet.</p>
            </div>
          ) : (
            <Table
              columns={columns}
              data={certificates}
              onEdit={() => {}}
              onDelete={() => {}}
              className="w-full"
              isEditing={false}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

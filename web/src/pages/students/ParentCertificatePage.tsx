import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DownloadButton } from "@/components/common/TableActions";
import { FileText, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMyChildCertificates, useDownloadCertificateDocument } from "@/api/hooks/students/certificates";
import { useAuthStore } from "@/lib/authStore";
import type { CertificateRead } from "@/types/certificates/types";

export const ParentCertificatePage: React.FC = () => {
  const availableStudents = useAuthStore((s) => s.availableStudents);
  const selectedStudentFromStore = useAuthStore((s) => s.selectedStudent);

  const [selectedChildId, setSelectedChildId] = useState<string>(
    selectedStudentFromStore?.id ?? ""
  );

  // Always sync when the store's selected student changes (handles stale localStorage)
  useEffect(() => {
    if (selectedStudentFromStore?.id) {
      setSelectedChildId(selectedStudentFromStore.id);
    }
  }, [selectedStudentFromStore?.id]);

  const { data: certificatesData, isLoading } = useMyChildCertificates(selectedChildId);
  const downloadCertificate = useDownloadCertificateDocument();

  const certificates = certificatesData?.items ?? [];
  const selectedChild = availableStudents.find((s) => s.id === selectedChildId);

  const handleDownload = async (certificateId: string) => {
    try {
      const result = await downloadCertificate.mutateAsync(certificateId);
      window.location.href = result.presigned_url;
    } catch {
      // handled by mutation
    }
  };

  if (availableStudents.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No children linked to your account.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">

      {availableStudents.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Child</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedChildId} onValueChange={setSelectedChildId}>
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="Select child" />
              </SelectTrigger>
              <SelectContent>
                {availableStudents.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.first_name} {child.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {selectedChild
              ? `Certificates — ${selectedChild.first_name} ${selectedChild.last_name}`
              : "Certificates"}
            {certificatesData && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({certificatesData.total} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading certificates...</span>
            </div>
          ) : certificates.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-40" />
              <p>No certificates found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-3 font-medium text-muted-foreground w-10">S.No.</th>
                    <th className="text-left py-3 px-3 font-medium text-muted-foreground">Certificate Type</th>
                    <th className="text-left py-3 px-3 font-medium text-muted-foreground">Issue Date</th>
                    <th className="text-left py-3 px-3 font-medium text-muted-foreground">Remarks</th>
                    <th className="text-left py-3 px-3 font-medium text-muted-foreground">File</th>
                    <th className="text-left py-3 px-3 font-medium text-muted-foreground">Download</th>
                  </tr>
                </thead>
                <tbody>
                  {certificates.map((cert: CertificateRead, idx) => (
                    <tr key={cert.id} className="border-b hover:bg-muted/40 transition-colors" style={{ height: 48 }}>
                      <td className="py-2 px-3 text-muted-foreground">{idx + 1}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          {cert.type_name || "-"}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        {cert.issue_date ? new Date(cert.issue_date).toLocaleDateString() : "-"}
                      </td>
                      <td className="py-2 px-3 max-w-[200px] truncate text-muted-foreground">
                        {cert.remarks || "-"}
                      </td>
                      <td className="py-2 px-3">
                        {cert.file_path ? (
                          <Badge variant="secondary">
                            <FileText className="h-3 w-3 mr-1" />
                            Uploaded
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">No file</span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        {cert.file_path ? (
                          <DownloadButton
                            onClick={() => handleDownload(cert.id)}
                            disabled={downloadCertificate.isPending}
                            title="Download Certificate"
                          />
                        ) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

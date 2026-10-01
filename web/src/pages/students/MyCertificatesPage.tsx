import React from "react";
import { config } from "@/lib/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DownloadButton } from "@/components/common/TableActions";
import { FileText, Loader2, ScrollText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from '@/components/ui/PageHeader';
import { useMyCertificates, useDownloadCertificateDocument } from "@/api/hooks/students/certificates";
import { useAuthStore } from "@/lib/authStore";
import type { CertificateRead } from "@/types/certificates/types";

const mediaBase = config.api.baseURL.replace(/\/api\/v\d+$/, '');

export const MyCertificatesPage: React.FC = () => {
  const { isAuthenticated } = useAuthStore();

  const { data: certificatesData, isLoading } = useMyCertificates();
  const downloadCertificate = useDownloadCertificateDocument();

  const certificates = certificatesData?.items ?? [];

  const handleDownload = async (certificateId: string) => {
    try {
      const result = await downloadCertificate.mutateAsync(certificateId);
      const url = result.presigned_url.startsWith('http')
        ? result.presigned_url
        : `${mediaBase}${result.presigned_url}`;
      window.open(url, '_blank');
    } catch {
      // handled by mutation
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              Please log in to view your certificates.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader title="My Certificates" icon={<ScrollText className="h-5 w-5" />} />
      <Card>
        <CardHeader>
          <CardTitle>
            Certificates
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
              <span className="ml-2">Loading your certificates...</span>
            </div>
          ) : certificates.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-75" />
              <p>No certificates found.</p>
              <p className="text-sm">Certificates issued to you will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-3 font-medium text-muted-foreground w-10">
                      S.No.
                    </th>
                    <th className="text-left py-3 px-3 font-medium text-muted-foreground">
                      Certificate Type
                    </th>
                    <th className="text-left py-3 px-3 font-medium text-muted-foreground">
                      Issue Date
                    </th>
                    <th className="text-left py-3 px-3 font-medium text-muted-foreground">
                      Remarks
                    </th>
                    <th className="text-left py-3 px-3 font-medium text-muted-foreground">
                      File
                    </th>
                    <th className="text-left py-3 px-3 font-medium text-muted-foreground">
                      Download
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {certificates.map((cert: CertificateRead, idx) => (
                    <tr
                      key={cert.id}
                      className="border-b hover:bg-muted/40 transition-colors"
                      style={{ height: 48 }}
                    >
                      <td className="py-2 px-3 text-muted-foreground">{idx + 1}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          {cert.type_name || "-"}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        {cert.issue_date
                          ? new Date(cert.issue_date).toLocaleDateString()
                          : "-"}
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
                        ) : (
                          "-"
                        )}
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

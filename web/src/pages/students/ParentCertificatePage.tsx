import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DownloadButton } from "@/components/common/TableActions";
import { FileText, Download, Loader2 } from "lucide-react";
import {
  useMyChildReceived,
  useMyChildIssued,
  useDownloadCertificateDocument,
} from "@/api/hooks/students/certificates";
import { useParentChildren } from "@/api/auth";
import type { CertificateRead } from "@/api/hooks/students/certificates";

type CertTab = "received" | "issued";

const TAB_LABELS: Record<CertTab, string> = {
  received: "Received Documents",
  issued: "Issued Certificates",
};

interface ParentCertificatePageProps {
  parentEntityId: string | null;
}

function CertificateTable({
  certificates,
  isLoading,
  emptyMessage,
  onDownload,
  downloadPending,
}: {
  certificates: CertificateRead[];
  isLoading: boolean;
  emptyMessage: string;
  onDownload: (id: string) => void;
  downloadPending: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading certificates...</span>
      </div>
    );
  }

  if (certificates.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-40" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
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
          {certificates.map((cert, idx) => (
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
                    onClick={() => onDownload(cert.id)}
                    disabled={downloadPending}
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
  );
}

export const ParentCertificatePage: React.FC<ParentCertificatePageProps> = ({
  parentEntityId,
}) => {
  const { data: children = [], isLoading: childrenLoading } =
    useParentChildren(parentEntityId);
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<CertTab>("received");

  // Auto-select first child
  useEffect(() => {
    if (children.length > 0 && !selectedChildId) {
      setSelectedChildId(children[0].id);
    }
  }, [children, selectedChildId]);

  const { data: receivedData, isLoading: receivedLoading } =
    useMyChildReceived(selectedChildId);
  const { data: issuedData, isLoading: issuedLoading } =
    useMyChildIssued(selectedChildId);
  const downloadCertificate = useDownloadCertificateDocument();

  const receivedCerts = receivedData?.items ?? [];
  const issuedCerts = issuedData?.items ?? [];
  const selectedChild = children.find((c) => c.id === selectedChildId);

  const handleDownload = async (certificateId: string) => {
    try {
      const result = await downloadCertificate.mutateAsync(certificateId);
      window.location.href = result.presigned_url;
    } catch {
      // handled by mutation
    }
  };

  if (childrenLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading children...</span>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No children linked to your account.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Child selector */}
      {children.length > 1 && (
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
                {children.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.first_name} {child.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Certificates */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>
              {selectedChild
                ? `Certificates — ${selectedChild.first_name} ${selectedChild.last_name}`
                : "Certificates"}
            </CardTitle>
            <div className="flex gap-1">
              {(["received", "issued"] as CertTab[]).map((tab) => (
                <Button
                  key={tab}
                  size="sm"
                  variant={activeTab === tab ? "default" : "outline"}
                  onClick={() => setActiveTab(tab)}
                >
                  {TAB_LABELS[tab]}
                  <span className="ml-1.5 text-xs opacity-70">
                    {tab === "received"
                      ? receivedData
                        ? `(${receivedData.total})`
                        : ""
                      : issuedData
                      ? `(${issuedData.total})`
                      : ""}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {activeTab === "received" ? (
            <CertificateTable
              certificates={receivedCerts}
              isLoading={receivedLoading}
              emptyMessage="No received documents found."
              onDownload={handleDownload}
              downloadPending={downloadCertificate.isPending}
            />
          ) : (
            <CertificateTable
              certificates={issuedCerts}
              isLoading={issuedLoading}
              emptyMessage="No issued certificates found."
              onDownload={handleDownload}
              downloadPending={downloadCertificate.isPending}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

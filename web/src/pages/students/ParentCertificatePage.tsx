import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table } from "@/components/common/table";
import type { TableColumn } from "@/components/common/table";
import { FileText, Download, Loader2 } from "lucide-react";
import { useMyChildCertificates, useDownloadCertificateDocument } from "@/api/hooks/students/certificates";
import { useParentChildren } from "@/api/auth";
import type { CertificateRead } from "@/api/hooks/students/certificates";

interface ParentCertificatePageProps {
  parentEntityId: string | null;
}

export const ParentCertificatePage: React.FC<ParentCertificatePageProps> = ({
  parentEntityId,
}) => {
  const { data: children = [], isLoading: childrenLoading } =
    useParentChildren(parentEntityId);
  const [selectedChildId, setSelectedChildId] = useState<string>("");

  // Auto-select first child
  useEffect(() => {
    if (children.length > 0 && !selectedChildId) {
      setSelectedChildId(children[0].id);
    }
  }, [children, selectedChildId]);

  const { data: certificatesData, isLoading: certsLoading } =
    useMyChildCertificates(selectedChildId);
  const downloadCertificate = useDownloadCertificateDocument();

  const certificates = certificatesData?.items || [];
  const selectedChild = children.find((c) => c.id === selectedChildId);

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
        <div className="flex gap-2">
          {row.file_path && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDownload(row.id)}
              disabled={downloadCertificate.isPending}
            >
              {downloadCertificate.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Download
            </Button>
          )}
        </div>
      ),
    },
  ];

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

      <Card>
        <CardHeader>
          <CardTitle>
            {selectedChild
              ? `Certificates — ${selectedChild.first_name} ${selectedChild.last_name}`
              : "Certificates"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {certsLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading certificates...</span>
            </div>
          ) : certificates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No certificates found.</p>
              <p className="text-sm">
                Certificates issued to your child will appear here.
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
    </div>
  );
};

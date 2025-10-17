import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table } from "@/components/common/table";
import type { TableColumn } from "@/components/common/table";
import { FileText, Download, Eye } from "lucide-react";
import { toast } from "sonner";
import { useMyCertificates, useDownloadCertificateDocument, useCertificateTypes } from "@/api/hooks/students/certificates";
import { useAuthStore } from "@/lib/authStore";
import type { CertificateResponse } from "@/api/hooks/students/certificates";

export const MyCertificatesPage: React.FC = () => {
    const { studentId, isAuthenticated, role } = useAuthStore();

    const { data: certificates = [], isLoading } = useMyCertificates();
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

    // Show login message only for unauthenticated users
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

    // Show loading while studentId is being set
    if (!studentId) {
        return (
            <div className="container mx-auto p-6">
                <Card>
                    <CardContent className="p-6">
                        <div className="text-center text-muted-foreground">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            Loading your certificates...
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">My Certificates</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Your Certificates</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-4">Loading certificates...</div>
                    ) : certificates.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No certificates found.</p>
                            <p className="text-sm">Certificates issued to you will appear here.</p>
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
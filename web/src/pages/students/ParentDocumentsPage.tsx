import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, FolderOpen, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAllStudentDocuments } from "@/api/hooks/students/documents";
import { useAuthStore } from "@/lib/authStore";
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

// Parent view — documents/certificates/receipts for the parent's own linked
// children only (student_documents: read_related, list_related).
// The active child is chosen via the header's student switcher
// (authStore.selectedStudent) — there's no page-local selector here so every
// module stays in sync with a single source of truth.
export const ParentDocumentsPage: React.FC = () => {
  const availableStudents = useAuthStore((s) => s.availableStudents);
  const selectedStudentFromStore = useAuthStore((s) => s.selectedStudent);

  const { data: documents = [], isLoading } = useAllStudentDocuments(selectedStudentFromStore?.id ?? "");
  const selectedChild = selectedStudentFromStore;

  if (availableStudents.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-75" />
            <p>No children linked to your account.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader title="Documents" icon={<FolderOpen className="h-5 w-5" />} />
      <Card>
        <CardHeader>
          <CardTitle>
            {selectedChild
              ? `Documents — ${selectedChild.first_name} ${selectedChild.last_name}${
                  selectedChild.class_name
                    ? ` (${selectedChild.class_name}${selectedChild.section_name ? ` - ${selectedChild.section_name}` : ''})`
                    : ''
                }`
              : "Documents"}
          </CardTitle>
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

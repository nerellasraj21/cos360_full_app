// src/components/students/IssuableCertificateGenerator.tsx
// Simple issuable certificate generator - select template and download with pre-filled student data

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Download, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useIssuableCertificateTemplates,
  useIssuableCertificateTemplate,
  useGenerateIssuableCertificate,
} from "@/api/hooks/students/useIssuableCertificates";
import { useAuthStore } from "@/lib/authStore";
import type { IssuableCertificateTemplate } from "@/types/certificates/issuable";

interface StudentData {
  id: string;
  name: string;
  admission_number: string;
  father_name?: string;
  mother_name?: string;
  dob?: string;
  class?: string;
  section?: string;
  gender?: string;
}

interface IssuableCertificateGeneratorProps {
  selectedStudent: StudentData | null;
  selectedStudentId: string;
}

export function IssuableCertificateGenerator({
  selectedStudent,
  selectedStudentId,
}: IssuableCertificateGeneratorProps) {
  // State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [editableHtml, setEditableHtml] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Hooks
  const { data: templates, isLoading: isLoadingTemplates } =
    useIssuableCertificateTemplates();
  const { data: templateData } = useIssuableCertificateTemplate(selectedTemplateId);
  const generateMutation = useGenerateIssuableCertificate();
  const { academicYearId } = useAuthStore();

  // Auto-fill HTML when student or template changes
  const filledHtml = useMemo(() => {
    if (!templateData || !selectedStudent) return "";

    let html = templateData.html_template;

    // Replace placeholders with student data
    const replacements: Record<string, string> = {
      student_name: selectedStudent.name || "",
      father_name: selectedStudent.father_name || "",
      mother_name: selectedStudent.mother_name || "",
      dob: selectedStudent.dob || "",
      admission_number: selectedStudent.admission_number || "",
      class_name: selectedStudent.class || "",
      section: selectedStudent.section || "",
      academic_year: academicYearId || new Date().getFullYear().toString(),
      issue_date: new Date().toLocaleDateString(),
      school_name: "Your School Name",
    };

    Object.entries(replacements).forEach(([key, value]) => {
      html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
    });

    return html;
  }, [templateData, selectedStudent, academicYearId]);

  // Update editable HTML when template changes
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setEditableHtml("");
    setIsEditing(false);
  };

  // Initialize editable HTML on first view
  const displayHtml = editableHtml || filledHtml;

  const handleDownload = async () => {
    if (!selectedTemplateId || !selectedStudentId) {
      toast.error("Please select a template and student");
      return;
    }

    await generateMutation.mutateAsync({
      student_id: selectedStudentId,
      template_id: selectedTemplateId,
      edited_html: displayHtml,
    });
  };

  const handleEditToggle = () => {
    if (!isEditing) {
      setEditableHtml(filledHtml);
    } else {
      setEditableHtml("");
    }
    setIsEditing(!isEditing);
  };

  // ============================================================================
  // MAIN VIEW: SELECT TEMPLATE AND VIEW CERTIFICATE
  // ============================================================================
  return (
    <div className="space-y-4">
      {/* Template Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Certificate Template</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingTemplates ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading templates...</span>
            </div>
          ) : templates && templates.length > 0 ? (
            <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select certificate type (Bonafide, TC, Conduct, etc.)" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template: IssuableCertificateTemplate) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <p>No certificate templates available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Certificate Preview & Edit */}
      {selectedTemplateId && (
        <>
          {/* Student Info */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground font-medium">Student Name</p>
                  <p className="font-semibold">{selectedStudent?.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium">Admission No</p>
                  <p className="font-semibold">{selectedStudent?.admission_number}</p>
                </div>
                {selectedStudent?.class && (
                  <div>
                    <p className="text-muted-foreground font-medium">Class</p>
                    <p className="font-semibold">{selectedStudent.class}</p>
                  </div>
                )}
                {selectedStudent?.section && (
                  <div>
                    <p className="text-muted-foreground font-medium">Section</p>
                    <p className="font-semibold">{selectedStudent.section}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Certificate View / Edit */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Certificate Preview</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={handleEditToggle}
              >
                {isEditing ? "View Only" : "Edit HTML"}
              </Button>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                /* Edit Mode */
                <div className="space-y-4">
                  <textarea
                    value={editableHtml}
                    onChange={(e) => setEditableHtml(e.target.value)}
                    className="w-full h-96 font-mono text-xs p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Edit certificate HTML..."
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditableHtml(filledHtml)}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Reset to Original
                    </Button>
                  </div>
                </div>
              ) : (
                /* Preview Mode */
                <div className="border rounded-lg overflow-auto bg-white">
                  <iframe
                    srcDoc={`
                      <!DOCTYPE html>
                      <html>
                      <head>
                        <meta charset="UTF-8">
                        <style>
                          body {
                            font-family: Arial, sans-serif;
                            padding: 20px;
                            margin: 0;
                            background: white;
                          }
                        </style>
                      </head>
                      <body>${displayHtml}</body>
                      </html>
                    `}
                    className="w-full h-96 border-0"
                    title="Certificate Preview"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Download Button */}
          <Card>
            <CardContent className="pt-6">
              <Button
                onClick={handleDownload}
                disabled={generateMutation.isPending}
                size="lg"
                className="w-full"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

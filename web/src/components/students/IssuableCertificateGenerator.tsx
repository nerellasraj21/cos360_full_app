// src/components/students/IssuableCertificateGenerator.tsx
// Issuable certificate generator — select template, fill student data, save & print

import { useState, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Printer, RotateCcw, Save } from "lucide-react";
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
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [editableHtml, setEditableHtml] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { data: templates, isLoading: isLoadingTemplates } =
    useIssuableCertificateTemplates();
  const { data: templateData } = useIssuableCertificateTemplate(selectedTemplateId);
  const generateMutation = useGenerateIssuableCertificate();
  const { academicYearId } = useAuthStore();

  // Auto-fill placeholders with student data
  const filledHtml = useMemo(() => {
    if (!templateData || !selectedStudent) return "";

    let html = templateData.html_template;

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
      // gender helpers
      gender_he_she: selectedStudent.gender === "Female" ? "She" : "He",
      gender_his_her: selectedStudent.gender === "Female" ? "Her" : "His",
    };

    Object.entries(replacements).forEach(([key, value]) => {
      html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
    });

    return html;
  }, [templateData, selectedStudent, academicYearId]);

  const displayHtml = editableHtml || filledHtml;

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setEditableHtml("");
    setIsEditing(false);
  };

  const handleEditToggle = () => {
    if (!isEditing) setEditableHtml(filledHtml);
    else setEditableHtml("");
    setIsEditing(!isEditing);
  };

  // Save certificate to backend then trigger browser print on the iframe
  const handleSaveAndPrint = async () => {
    if (!selectedTemplateId || !selectedStudentId) {
      toast.error("Please select a template and student");
      return;
    }

    await generateMutation.mutateAsync({
      student_id: selectedStudentId,
      template_id: selectedTemplateId,
      edited_html: displayHtml,
    });

    // Trigger browser print dialog on the preview iframe
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
    }
  };

  // Print preview without saving
  const handlePrintOnly = () => {
    if (!displayHtml) {
      toast.error("Please select a template first");
      return;
    }
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
    }
  };

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
                {templates
                  .filter((t: IssuableCertificateTemplate) => t.is_active === "True")
                  .map((template: IssuableCertificateTemplate) => (
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

      {selectedTemplateId && (
        <>
          {/* Student Info Summary */}
          <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
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

          {/* Preview / Edit */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Certificate Preview</CardTitle>
              <Button size="sm" variant="outline" onClick={handleEditToggle}>
                {isEditing ? "View Only" : "Edit HTML"}
              </Button>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-4">
                  <textarea
                    value={editableHtml}
                    onChange={(e) => setEditableHtml(e.target.value)}
                    className="w-full h-96 font-mono text-xs p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Edit certificate HTML..."
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditableHtml(filledHtml)}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Reset to Original
                  </Button>
                </div>
              ) : (
                <div className="border rounded-lg overflow-auto bg-white">
                  <iframe
                    ref={iframeRef}
                    srcDoc={`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;padding:20px;margin:0;background:white;}</style></head><body>${displayHtml}</body></html>`}
                    className="w-full h-[500px] border-0"
                    title="Certificate Preview"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="pt-6 flex gap-3">
              <Button
                onClick={handleSaveAndPrint}
                disabled={generateMutation.isPending}
                size="lg"
                className="flex-1"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save & Print
                  </>
                )}
              </Button>
              <Button
                onClick={handlePrintOnly}
                size="lg"
                variant="outline"
                disabled={!displayHtml}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Only
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

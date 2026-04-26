// src/components/students/IssuableCertificateGenerator.tsx
// Issuable certificate generator — select template, fill student data, save & print

import { useState, useMemo, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Printer, RotateCcw, Save, Settings } from "lucide-react";
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
import { useNavigate } from "@tanstack/react-router";
import type { IssuableCertificateTemplate } from "@/types/certificates/issuable";
import { CertificateEditor } from "./CertificateEditor";
import { useStudentAdmissionDetail } from "@/api/hooks/students/useAdmission";
import { useSelectorClasses, useSelectorSections } from "@/api/hooks/students/certificates";

interface StudentData {
  id: string;
  name: string;
  admission_number: string;
  class_name?: string;
  section_name?: string;
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
  const [logoUrl, setLogoUrl] = useState(() => localStorage.getItem("cert_logo_url") || "");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { data: templates, isLoading: isLoadingTemplates } =
    useIssuableCertificateTemplates();
  const { data: templateData } = useIssuableCertificateTemplate(selectedTemplateId);
  const { data: admissionDetail, isLoading: isLoadingDetail } =
    useStudentAdmissionDetail(selectedStudentId);

  // Resolve class & section names from the admission's current_class_id / current_section_id
  const currentClassId = admissionDetail?.current_class_id || "";
  const currentSectionId = admissionDetail?.current_section_id || "";
  const { data: allClasses = [] } = useSelectorClasses();
  const { data: classSections = [] } = useSelectorSections(currentClassId);

  const resolvedClassName =
    allClasses.find((c) => c.id === currentClassId)?.name ||
    selectedStudent?.class_name || "";
  const resolvedSectionName =
    classSections.find((s) => s.id === currentSectionId)?.name ||
    selectedStudent?.section_name || "";

  const generateMutation = useGenerateIssuableCertificate();
  const { academicYearTitle } = useAuthStore();
  const navigate = useNavigate();

  // Auto-fill placeholders — combines cascade-selected names with full API data
  const filledHtml = useMemo(() => {
    if (!templateData || !selectedStudent) return "";

    const s = admissionDetail?.student;
    const fmt = (d?: string) =>
      d ? new Date(d).toLocaleDateString("en-IN") : "";
    const normalizeGender = (g?: string) => {
      const l = g?.toLowerCase();
      if (l === "m" || l === "male") return "Male";
      if (l === "f" || l === "female") return "Female";
      return g || "";
    };
    const gender = normalizeGender(s?.gender);

    let html = templateData.html_template;

    const replacements: Record<string, string> = {
      // School
      school_logo: logoUrl || "",
      school_name: "Your School Name",
      // Student identity
      student_name: s ? `${s.first_name} ${s.last_name}`.trim() : selectedStudent.name,
      admission_number: admissionDetail?.admission_number || selectedStudent.admission_number || "",
      dob: fmt(s?.date_of_birth),
      gender,
      aadhar_number: s?.aadhar_number || "",
      apaar_number: s?.apaar_number || "",
      // Class
      class_name: resolvedClassName,
      section: resolvedSectionName,
      academic_year: academicYearTitle || new Date().getFullYear().toString(),
      // Parents
      father_name: s?.father?.name || "",
      mother_name: s?.mother?.name || "",
      // Guardian
      guardian_name: s?.guardian?.name || "",
      guardian_phone: s?.guardian?.phone || "",
      guardian_relation: s?.guardian?.relation_to_student || "",
      guardian_details: s?.guardian?.name
        ? [
            s.guardian.name,
            s.guardian.relation_to_student && `(${s.guardian.relation_to_student})`,
            s.guardian.phone && `Ph: ${s.guardian.phone}`,
          ].filter(Boolean).join(" | ")
        : "",
      // Dates
      date_of_joining: fmt(admissionDetail?.admission_date),
      date_of_leaving: "",          // not stored in current model — blank for manual fill
      date_of_joining_class: "",    // not stored in current model — blank for manual fill
      date_of_leaving_class: "",    // not stored in current model — blank for manual fill
      issue_date: new Date().toLocaleDateString("en-IN"),
      // Gender pronouns
      gender_he_she: gender === "Female" ? "She" : "He",
      gender_his_her: gender === "Female" ? "Her" : "His",
    };

    Object.entries(replacements).forEach(([key, value]) => {
      html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
    });

    return html;
  }, [templateData, selectedStudent, admissionDetail, resolvedClassName, resolvedSectionName, academicYearTitle, logoUrl]);

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

  const handleEditorChange = useCallback((html: string) => {
    setEditableHtml(html);
  }, []);

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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Select Certificate Template</CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => navigate({ to: "/students/certificatetemplates" })}
          >
            <Settings className="h-3.5 w-3.5" />
            Manage Templates
          </Button>
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

      {/* School Logo URL — persisted in localStorage */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium whitespace-nowrap">School Logo URL</label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => {
                setLogoUrl(e.target.value);
                localStorage.setItem("cert_logo_url", e.target.value);
              }}
              placeholder="https://yourschool.com/logo.png"
              className="flex-1 px-3 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {logoUrl && (
              <img
                src={logoUrl}
                alt="Logo preview"
                className="h-10 w-10 object-contain rounded border"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            Paste your school logo image URL — it will appear in all certificates and is saved for next time.
          </p>
        </CardContent>
      </Card>

      {selectedTemplateId && (
        <>
          {/* Preview / Edit */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Certificate Preview</CardTitle>
              <Button size="sm" variant="outline" onClick={handleEditToggle}>
                {isEditing ? "View Preview" : "Edit Content"}
              </Button>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-3">
                  <CertificateEditor
                    key={selectedTemplateId}
                    initialContent={filledHtml}
                    onChange={handleEditorChange}
                    minHeight="420px"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditableHtml("");
                      setIsEditing(false);
                      setTimeout(() => setIsEditing(true), 0);
                    }}
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

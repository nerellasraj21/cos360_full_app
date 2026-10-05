import React, { useState, useEffect } from "react";
import { usePermission } from "@/hooks/usePermission";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { FileText, Trash2, RotateCcw, Upload, Download, Loader2, ChevronRight, User, ScrollText, Filter, Search } from "lucide-react";
import { PageHeader } from '@/components/ui/PageHeader';
import { toast } from "sonner";
import {
  useCertificatesByStudent,
  useUploadReceived,
  useUploadIssued,
  useDeleteCertificate,
  useDownloadCertificateDocument,
  useSelectorClasses,
  useSelectorSections,
  useSelectorStudents,
  useSearchCertificateTypes,
} from "@/api/hooks/students/certificates";
import { IssuableCertificateGenerator } from "@/components/students/IssuableCertificateGenerator";
import { useStudentsDropdown } from "@/api/hooks/students/useAdmission";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/DatePicker";
import type { CertificateRead, SelectorStudent } from "@/types/certificates/types";
import { config } from "@/lib/config";

type UploadTab = "received" | "issued";
type IssueSubTab = "upload" | "generate";

const CERT_SESSION_KEY = "cert_page_selection";

export const CertificateUploadPage: React.FC = () => {
  const { checkPermission } = usePermission();
  const canCreate = checkPermission('issuable_certificates', 'create');

  // Restore cascade selection from sessionStorage
  const saved = (() => { try { return JSON.parse(sessionStorage.getItem(CERT_SESSION_KEY) || "{}"); } catch { return {}; } })();

  const [classId, setClassId] = useState<string>(saved.classId || "");
  const [sectionId, setSectionId] = useState<string>(saved.sectionId || "");
  const [selectedStudentId, setSelectedStudentId] = useState<string>(saved.selectedStudentId || "");
  const [selectedStudent, setSelectedStudent] = useState<SelectorStudent | null>(null);

  // Search state
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Upload tabs
  const [uploadTab, setUploadTab] = useState<UploadTab>("received");
  const [issueSubTab, setIssueSubTab] = useState<IssueSubTab>("upload");

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);

  // Received form
  const [recvTypeId, setRecvTypeId] = useState("");
  const [recvRemarks, setRecvRemarks] = useState("");
  const [recvFile, setRecvFile] = useState<File | null>(null);

  // Issued form
  const [issuedTypeId, setIssuedTypeId] = useState("");
  const [issuedDate, setIssuedDate] = useState("");
  const [issuedRemarks, setIssuedRemarks] = useState("");
  const [issuedFile, setIssuedFile] = useState<File | null>(null);

  // Data hooks
  const { data: classes = [], isLoading: classesLoading } = useSelectorClasses();
  const { data: sections = [] } = useSelectorSections(classId);
  const { data: students = [], isLoading: studentsLoading } = useSelectorStudents(
    classId,
    sectionId || undefined
  );
  const { data: certTypes = [] } = useSearchCertificateTypes("", 100);

  const { data: certificatesData, isLoading: certsLoading } = useCertificatesByStudent(
    selectedStudentId
  );

  const handleClear = () => {
    setClassId("");
    setSectionId("");
    setSelectedStudentId("");
    setSelectedStudent(null);
    setSearchInput("");
    setSearchQuery("");
    setShowSearchResults(false);
    sessionStorage.removeItem(CERT_SESSION_KEY);
  };

  const handleSelectFromSearch = (student: typeof allStudents[0]) => {
    const fullName = student.display_name || student.name || "";
    setSelectedStudentId(student.id);
    setSelectedStudent({ student_id: student.id, full_name: fullName, admission_no: student.admission_number || "" } as SelectorStudent);
    setSearchInput(fullName);
    setShowSearchResults(false);
    setClassId("");
    setSectionId("");
  };

  // Mutations
  const uploadReceived = useUploadReceived();
  const uploadIssued = useUploadIssued();
  const deleteCertificate = useDeleteCertificate();
  const downloadCertificate = useDownloadCertificateDocument();

  const certificates = certificatesData?.items ?? [];

  const { data: allStudents = [], isLoading: searchLoading } = useStudentsDropdown();

  // Filter students client-side by name or admission number
  const searchResults = searchInput.trim()
    ? allStudents.filter((s) => {
        const q = searchInput.toLowerCase();
        return (
          (s.display_name || s.name || "").toLowerCase().includes(q) ||
          (s.admission_number || "").toLowerCase().includes(q)
        );
      })
    : [];

  // Debounce no longer needed (client-side), but keep searchQuery in sync
  useEffect(() => {
    setSearchQuery(searchInput.trim());
  }, [searchInput]);

  // Restore selectedStudent object once students list loads
  useEffect(() => {
    if (selectedStudentId && students.length > 0 && !selectedStudent) {
      const found = students.find((s) => s.student_id === selectedStudentId);
      if (found) setSelectedStudent(found);
    }
  }, [students, selectedStudentId]);

  // Persist selection to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(CERT_SESSION_KEY, JSON.stringify({ classId, sectionId, selectedStudentId }));
  }, [classId, sectionId, selectedStudentId]);

  // Cascade handlers
  const handleClassChange = (val: string) => {
    setClassId(val);
    setSectionId("");
    setSelectedStudentId("");
    setSelectedStudent(null);
  };

  const handleSectionChange = (val: string) => {
    setSectionId(val === "__all__" ? "" : val);
    setSelectedStudentId("");
    setSelectedStudent(null);
  };

  const handleStudentChange = (val: string) => {
    setSelectedStudentId(val);
    setSelectedStudent(students.find((s) => s.student_id === val) ?? null);
  };

  const mediaBase = config.api.baseURL.replace(/\/api\/v\d+$/, '');

  // Download
  const handleDownload = async (id: string) => {
    try {
      const result = await downloadCertificate.mutateAsync(id);
      const url = result.presigned_url?.startsWith('http')
        ? result.presigned_url
        : `${mediaBase}${result.presigned_url}`;
      window.open(url, '_blank');
    } catch {
      // handled by mutation
    }
  };

  // Submit received
  const handleSubmitReceived = async () => {
    if (!selectedStudentId || !recvTypeId || !recvFile) {
      toast.error("Student, certificate type, and file are required");
      return;
    }
    const formData = new FormData();
    formData.append("student_id", selectedStudentId);
    formData.append("certificate_type_id", recvTypeId);
    if (recvRemarks) formData.append("remarks", recvRemarks);
    formData.append("file", recvFile);
    try {
      await uploadReceived.mutateAsync(formData);
      setRecvTypeId("");
      setRecvRemarks("");
      setRecvFile(null);
    } catch {
      // handled
    }
  };

  const handleResetReceived = () => {
    setRecvTypeId("");
    setRecvRemarks("");
    setRecvFile(null);
  };

  // Submit issued
  const handleSubmitIssued = async () => {
    if (!selectedStudentId || !issuedTypeId || !issuedDate || !issuedFile) {
      toast.error("Certificate type, issue date, and file are required");
      return;
    }
    const formData = new FormData();
    formData.append("student_id", selectedStudentId);
    formData.append("certificate_type_id", issuedTypeId);
    formData.append("issue_date", issuedDate);
    if (issuedRemarks) formData.append("remarks", issuedRemarks);
    formData.append("file", issuedFile);
    try {
      await uploadIssued.mutateAsync(formData);
      setIssuedTypeId("");
      setIssuedDate("");
      setIssuedRemarks("");
      setIssuedFile(null);
    } catch {
      // handled
    }
  };

  const handleResetIssued = () => {
    setIssuedTypeId("");
    setIssuedDate("");
    setIssuedRemarks("");
    setIssuedFile(null);
  };

  // Delete
  const handleDelete = async (row: CertificateRead) => {
    try {
      await deleteCertificate.mutateAsync(row.id);
      setDeleteDialogOpen(null);
    } catch {
      // handled
    }
  };

  const inputClass =
    "w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader title="Student Certificates" icon={<ScrollText className="h-5 w-5" />} />
      {/* ── Cascade Selector ── */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          {/* Filters header row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Filters</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleClear} disabled={!classId && !searchInput && !selectedStudentId}>
              Clear
            </Button>
          </div>

          {/* Search box */}
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, admission no..."
                value={searchInput}
                className="pl-9"
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setShowSearchResults(true);
                }}
                onFocus={() => searchInput && setShowSearchResults(true)}
                onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
              />
              {searchLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 z-50 mt-1 bg-popover border rounded-md shadow-lg max-h-52 overflow-y-auto">
                {searchResults.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="w-full text-left px-4 py-2 text-sm hover:bg-accent transition-colors"
                    onMouseDown={() => handleSelectFromSearch(s)}
                  >
                    <span className="font-medium">{s.display_name || s.name}</span>
                    {s.admission_number && <span className="ml-2 text-xs text-muted-foreground">{s.admission_number}</span>}
                  </button>
                ))}
              </div>
            )}
            {showSearchResults && searchQuery && !searchLoading && searchResults.length === 0 && (
              <div className="absolute left-0 right-0 z-50 mt-1 bg-popover border rounded-md shadow-lg px-4 py-3 text-sm text-muted-foreground">
                No students found
              </div>
            )}
          </div>

          {/* Cascade selectors */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5 flex-1 min-w-[160px]">
              <Label>Class</Label>
              <Select value={classId} onValueChange={handleClassChange} disabled={classesLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={classesLoading ? "Loading..." : "Select class"} />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {classId && (
              <>
                <ChevronRight className="h-4 w-4 text-muted-foreground mb-1 shrink-0" />
                <div className="space-y-1.5 flex-1 min-w-[160px]">
                  <Label>Section</Label>
                  <Select value={sectionId || "__all__"} onValueChange={handleSectionChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="All sections" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All sections</SelectItem>
                      {sections.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <ChevronRight className="h-4 w-4 text-muted-foreground mb-1 shrink-0" />
                <div className="space-y-1.5 flex-1 min-w-[200px]">
                  <Label>Student</Label>
                  <Select value={selectedStudentId} onValueChange={handleStudentChange} disabled={studentsLoading || students.length === 0}>
                    <SelectTrigger>
                      <SelectValue placeholder={studentsLoading ? "Loading..." : students.length === 0 ? "No students found" : "Select student"} />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((s) => (
                        <SelectItem key={s.student_id} value={s.student_id}>
                          {s.full_name} ({s.admission_no})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          {selectedStudent && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
              <User className="h-4 w-4" />
              <span>
                Selected:{" "}
                <strong className="text-foreground">{selectedStudent.full_name}</strong>
                {" — "}
                {selectedStudent.admission_no}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Upload + Datatable (shown after student selected) ── */}
      {selectedStudentId && (
        <>
          {/* Upload Section — only visible when user has create permission */}
          {canCreate && <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>Upload for {selectedStudent?.full_name}</CardTitle>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant={uploadTab === "received" ? "default" : "outline"}
                    onClick={() => setUploadTab("received")}
                  >
                    Received Document
                  </Button>
                  <Button
                    size="sm"
                    variant={uploadTab === "issued" ? "default" : "outline"}
                    onClick={() => setUploadTab("issued")}
                  >
                    Issue Certificate
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {uploadTab === "received" ? (
                /* ── Received Document Form ── */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Certificate Type *</Label>
                      <Select value={recvTypeId} onValueChange={setRecvTypeId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {certTypes.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>
                        Document File *{" "}
                        <span className="text-xs text-muted-foreground font-normal">
                          PDF/JPG/PNG/DOCX, max 10 MB
                        </span>
                      </Label>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.docx"
                        onChange={(e) => setRecvFile(e.target.files?.[0] ?? null)}
                        className={inputClass}
                      />
                      {recvFile && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Upload className="h-3 w-3" />
                          {recvFile.name}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label>Remarks</Label>
                      <textarea
                        value={recvRemarks}
                        onChange={(e) => setRecvRemarks(e.target.value)}
                        className={inputClass}
                        placeholder="Optional remarks (max 255 characters)"
                        rows={2}
                        maxLength={255}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleSubmitReceived}
                      disabled={uploadReceived.isPending}
                    >
                      {uploadReceived.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        "Upload Document"
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleResetReceived}
                      disabled={uploadReceived.isPending}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset
                    </Button>
                  </div>
                </div>
              ) : (
                /* ── Issue Certificate with Sub-tabs ── */
                <div className="space-y-4">
                  {/* Sub-tabs for Issue/Generate */}
                  <div className="flex items-center justify-between gap-2 border-b flex-wrap">
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant={issueSubTab === "upload" ? "default" : "outline"}
                        onClick={() => setIssueSubTab("upload")}
                        className="rounded-none"
                      >
                        Upload Certificate File
                      </Button>
                      <Button
                        size="sm"
                        variant={issueSubTab === "generate" ? "default" : "outline"}
                        onClick={() => setIssueSubTab("generate")}
                        className="rounded-none"
                      >
                        Generate Issuable
                      </Button>
                    </div>
                  </div>

                  {issueSubTab === "upload" ? (
                    /* ── Upload Certificate File ── */
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Certificate Type *</Label>
                          <Select value={issuedTypeId} onValueChange={setIssuedTypeId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              {certTypes.map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Issue Date *</Label>
                          <DatePicker value={issuedDate} onChange={setIssuedDate} />
                        </div>

                        <div className="space-y-2">
                          <Label>
                            Certificate File *{" "}
                            <span className="text-xs text-muted-foreground font-normal">
                              PDF/JPG/PNG/DOCX, max 10 MB
                            </span>
                          </Label>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.docx"
                            onChange={(e) => setIssuedFile(e.target.files?.[0] ?? null)}
                            className={inputClass}
                          />
                          {issuedFile && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Upload className="h-3 w-3" />
                              {issuedFile.name}
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>Remarks</Label>
                          <textarea
                            value={issuedRemarks}
                            onChange={(e) => setIssuedRemarks(e.target.value)}
                            className={inputClass}
                            placeholder="Optional remarks (max 255 characters)"
                            rows={2}
                            maxLength={255}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={handleSubmitIssued}
                          disabled={uploadIssued.isPending}
                        >
                          {uploadIssued.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Issuing...
                            </>
                          ) : (
                            "Issue Certificate"
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleResetIssued}
                          disabled={uploadIssued.isPending}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Reset
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* ── Generate Issuable Certificate ── */
                    <div>
                      {selectedStudent ? (
                        <IssuableCertificateGenerator
                          selectedStudent={{
                            id: selectedStudent.student_id,
                            name: selectedStudent.full_name,
                            admission_number: selectedStudent.admission_no,
                            class_name: classes.find(c => c.id === classId)?.name || "",
                            section_name: sections.find(s => s.id === sectionId)?.name || "",
                          }}
                          selectedStudentId={selectedStudentId}
                        />
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">
                          <p>Select a student above to generate certificates</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>}

          {/* ── Datatable ── */}
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>
                  Certificates — {selectedStudent?.full_name}
                  {certificatesData && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({certificatesData.total} total)
                    </span>
                  )}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {certsLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading certificates...</span>
                </div>
              ) : certificates.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-75" />
                  <p>No certificates found.</p>
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
                          Actions
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
                            {cert.issue_date
                              ? new Date(cert.issue_date).toLocaleDateString()
                              : "-"}
                          </td>
                          <td className="py-2 px-3 max-w-[180px] truncate text-muted-foreground">
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
                            <div className="flex gap-1">
                              {cert.file_path && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleDownload(cert.id)}
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
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

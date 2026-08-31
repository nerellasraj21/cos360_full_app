import { useEffect, useMemo, useState } from 'react';
import { Loader2, Users, GraduationCap, Briefcase, School, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { usePermission } from '@/hooks/usePermission';
import { ClassesDropdown } from '@/components/dropdown-system/components/ClassesDropdown';
import { SectionsByClassDropdown } from '@/components/dropdown-system/components/SectionsByClassDropdown';
import { useStudentsByClassSection } from '@/api/hooks/masters/classesandsections';
import { MultiTargetPicker, type PickedOption } from './MultiTargetPicker';
import { useTemplates, usePreviewCount, useSendNotification } from '@/api/hooks/communication/communication';
import type { Channel, Template, TargetType, TargetRef, PreviewCountParams } from '@/types/communication';

const SYSTEM_VARS = new Set([
  'name', 'parent_name', 'student_name', 'staff_name', 'class_name', 'section_name',
]);

const CHANNELS: { value: Channel; label: string }[] = [
  { value: 'sms', label: 'SMS' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
];

const CONTEXTS: { value: string; label: string; keywords: string[] }[] = [
  { value: 'general', label: 'General', keywords: [] },
  { value: 'exam', label: 'Exam schedule', keywords: ['exam', 'timetable', 'hall ticket', 'result'] },
  { value: 'attendance', label: 'Attendance', keywords: ['attendance', 'absent'] },
  { value: 'fee', label: 'Fee reminder', keywords: ['fee', 'payment', 'receipt', 'due'] },
  { value: 'admission', label: 'Admission', keywords: ['admission', 'enrolment', 'enrollment'] },
  { value: 'holiday', label: 'Holiday', keywords: ['holiday'] },
  { value: 'homework', label: 'Homework', keywords: ['homework', 'diary'] },
];

// ─── Target Type — exactly four, per product decision: Parents / Students /
// Staff / Entire School. Everything else (individual pickers, role-based,
// fee-defaulters, all_parents/all_students/all_staff) is intentionally not
// exposed here.
type TargetKind = 'parents' | 'students' | 'staff' | 'entire_school';

const TARGET_KINDS: { value: TargetKind; label: string; icon: typeof Users }[] = [
  { value: 'parents', label: 'Parents', icon: Users },
  { value: 'students', label: 'Students', icon: GraduationCap },
  { value: 'staff', label: 'Staff', icon: Briefcase },
  { value: 'entire_school', label: 'Entire School', icon: School },
];

interface StudentRow {
  id: string;
  name: string;
  admissionNumber: string;
  parentIds: string[];
}

function buildPreviewText(body: string, extraVars: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, varName) => {
    if (SYSTEM_VARS.has(varName)) return `[${varName}]`;
    return extraVars[varName] ? extraVars[varName] : `[${varName}]`;
  });
}

// Resolve the local Parents/Students/Staff/Entire-School choice down to the
// backend's target_type + target_ref shape. Returns null while the choice is
// incomplete (e.g. no students checked yet).
function resolveTarget(
  targetKind: TargetKind,
  selectedStudentIds: string[],
  selectedParentIds: string[],
  staffIds: string[],
): { target_type: TargetType; target_ref: TargetRef } | null {
  if (targetKind === 'entire_school') return { target_type: 'all_users', target_ref: {} };
  if (targetKind === 'staff') {
    if (staffIds.length === 0) return null;
    return { target_type: 'multiple_staff', target_ref: { staff_ids: staffIds } };
  }
  if (targetKind === 'students') {
    if (selectedStudentIds.length === 0) return null;
    return { target_type: 'multiple_students', target_ref: { student_ids: selectedStudentIds } };
  }
  // parents
  if (selectedParentIds.length === 0) return null;
  return { target_type: 'multiple_parents', target_ref: { parent_ids: selectedParentIds } };
}

function buildPreviewParams(
  target: { target_type: TargetType; target_ref: TargetRef } | null,
): PreviewCountParams | null {
  if (!target) return null;
  const { target_type, target_ref } = target;
  if (target_type === 'multiple_parents' && 'parent_ids' in target_ref) {
    return { target_type, parent_ids: target_ref.parent_ids };
  }
  if (target_type === 'multiple_students' && 'student_ids' in target_ref) {
    return { target_type, student_ids: target_ref.student_ids };
  }
  if (target_type === 'multiple_staff' && 'staff_ids' in target_ref) {
    return { target_type, staff_ids: target_ref.staff_ids };
  }
  if (target_type === 'all_users') return { target_type };
  return null;
}

interface SectionCardProps {
  number: number;
  title: string;
  children: React.ReactNode;
}

function SectionCard({ number, title, children }: SectionCardProps) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-2.5">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
          {number}
        </span>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
      </div>
      <div className="p-4 space-y-4">{children}</div>
    </div>
  );
}

interface SendMessagePanelProps {
  onSendSuccess?: () => void;
}

export default function SendMessagePanel({ onSendSuccess }: SendMessagePanelProps) {
  const { checkPermission } = usePermission();
  const canCreate = checkPermission('communications', 'create');

  // ── Target Type + recipient selection ──────────────────────────────────
  const [targetKind, setTargetKind] = useState<TargetKind>('parents');
  const [classId, setClassId] = useState<string | null>(null);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [staffSelection, setStaffSelection] = useState<PickedOption[]>([]);

  const [channel, setChannel] = useState<Channel>('sms');
  const [context, setContext] = useState(CONTEXTS[0].value);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [extraVars, setExtraVars] = useState<Record<string, string>>({});

  const { data: templatesData, isLoading: templatesLoading } = useTemplates({ channel, page_size: 100 });
  const allTemplates = useMemo(() => (templatesData?.items ?? []).filter((t) => t.is_active), [templatesData]);

  const contextConfig = CONTEXTS.find((c) => c.value === context) ?? CONTEXTS[0];
  const templates = useMemo<Template[]>(() => {
    if (!contextConfig.keywords.length) return allTemplates;
    return allTemplates.filter((t) =>
      contextConfig.keywords.some((kw) => t.name.toLowerCase().includes(kw)),
    );
  }, [allTemplates, contextConfig]);

  useEffect(() => {
    setTemplateId(null);
    setExtraVars({});
  }, [channel, context]);

  const selectedTemplate = templates.find((t) => t.id === templateId) ?? null;
  const userVars = selectedTemplate ? selectedTemplate.variables.filter((v) => !SYSTEM_VARS.has(v)) : [];

  useEffect(() => {
    setExtraVars({});
  }, [templateId]);

  // Reset recipient selection whenever the target type changes.
  useEffect(() => {
    setClassId(null);
    setSectionId(null);
    setStudentSearch('');
    setSelectedStudentIds(new Set());
    setStaffSelection([]);
  }, [targetKind]);

  // ── Class + Section → student checkbox list (Parents / Students) ───────
  // NOTE: don't default `data` to `[]` here — that inline default creates a
  // brand-new array reference on every render, which (via the useMemo/useEffect
  // below) triggers a "Maximum update depth exceeded" infinite loop. Fall back
  // to [] inside the memo instead, where it's only re-evaluated when the real
  // `studentsData` reference actually changes.
  const { data: studentsData, isLoading: studentsLoading } = useStudentsByClassSection(
    classId ?? '',
    sectionId ?? '',
  );

  const students = useMemo<StudentRow[]>(
    () => (studentsData ?? [])
      .filter((s) => !!s.student?.id)
      .map((s) => {
        const stu = s.student!;
        const parentIds = new Set<string>();
        if (stu.father?.id) parentIds.add(stu.father.id);
        if (stu.mother?.id) parentIds.add(stu.mother.id);
        if (stu.guardian?.id) parentIds.add(stu.guardian.id);
        stu.parent_links?.forEach((link) => {
          if (link.parent?.id) parentIds.add(link.parent.id);
        });
        return {
          id: stu.id,
          name: `${stu.first_name ?? ''} ${stu.last_name ?? ''}`.trim() || 'Unknown Student',
          admissionNumber: s.admission_number ?? '',
          parentIds: Array.from(parentIds),
        };
      }),
    [studentsData],
  );

  // Default to "everyone selected" whenever the student list changes.
  useEffect(() => {
    setSelectedStudentIds(new Set(students.map((s) => s.id)));
  }, [students]);

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => s.name.toLowerCase().includes(q) || s.admissionNumber.toLowerCase().includes(q));
  }, [students, studentSearch]);

  const allSelected = students.length > 0 && selectedStudentIds.size === students.length;
  const toggleAll = (checked: boolean) => {
    setSelectedStudentIds(checked ? new Set(students.map((s) => s.id)) : new Set());
  };
  const toggleStudent = (studentId: string, checked: boolean) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(studentId);
      else next.delete(studentId);
      return next;
    });
  };

  const selectedStudents = useMemo(
    () => students.filter((s) => selectedStudentIds.has(s.id)),
    [students, selectedStudentIds],
  );
  const selectedStudentIdList = useMemo(() => selectedStudents.map((s) => s.id), [selectedStudents]);
  const selectedParentIdList = useMemo(() => {
    const set = new Set<string>();
    selectedStudents.forEach((s) => s.parentIds.forEach((id) => set.add(id)));
    return Array.from(set);
  }, [selectedStudents]);
  const studentsWithoutParent = targetKind === 'parents'
    ? selectedStudents.filter((s) => s.parentIds.length === 0)
    : [];

  const staffIds = useMemo(() => staffSelection.map((s) => s.value), [staffSelection]);

  const resolvedTarget = useMemo(
    () => resolveTarget(targetKind, selectedStudentIdList, selectedParentIdList, staffIds),
    [targetKind, selectedStudentIdList, selectedParentIdList, staffIds],
  );

  // Recipient count preview — one call for whatever target is currently resolved.
  const previewParams = buildPreviewParams(resolvedTarget);
  const { data: previewData, isFetching: recipientsLoading } = usePreviewCount(previewParams);
  const recipientCount = previewData?.estimated_count ?? null;

  const sampleMessage = selectedTemplate ? buildPreviewText(selectedTemplate.body, extraVars) : '';
  const smsCharCount = channel === 'sms' ? sampleMessage.length : 0;
  const smsCredits = smsCharCount > 0 ? Math.ceil(smsCharCount / 160) : 0;

  const isAllFilled =
    !!selectedTemplate &&
    !!resolvedTarget &&
    userVars.every((v) => !!extraVars[v]?.trim());

  const sendMutation = useSendNotification();

  function handleSend() {
    if (!selectedTemplate || !resolvedTarget) return;
    sendMutation.mutate(
      {
        channel,
        target_type: resolvedTarget.target_type,
        target_ref: resolvedTarget.target_ref,
        template_id: selectedTemplate.id,
        extra_variables: userVars.length ? extraVars : undefined,
      },
      {
        onSuccess: () => {
          setSelectedStudentIds(new Set());
          setStaffSelection([]);
          setExtraVars({});
          onSendSuccess?.();
        },
      },
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
      {/* ── Target Type sidebar ──────────────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Target Type
        </h2>
        <div className="grid grid-cols-2 gap-1 rounded-lg border p-1">
          {TARGET_KINDS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTargetKind(value)}
              className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors ${
                targetKind === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {(targetKind === 'parents' || targetKind === 'students') && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium mb-1">Class</label>
                <ClassesDropdown
                  value={classId ?? undefined}
                  onChange={(val) => {
                    setClassId((val as string) ?? null);
                    setSectionId(null);
                  }}
                  placeholder="Class"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Section</label>
                <SectionsByClassDropdown
                  classId={classId ?? undefined}
                  value={sectionId ?? undefined}
                  onChange={(val) => setSectionId((val as string) ?? null)}
                  placeholder="Section"
                />
              </div>
            </div>

            {classId && sectionId && (
              <div className="flex flex-col overflow-hidden rounded-lg border">
                <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2">
                  <span className="text-sm font-semibold">Students</span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {selectedStudentIds.size}/{students.length}
                  </Badge>
                </div>
                <div className="border-b px-3 py-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Search name or admission #"
                      className="h-8 pl-8 text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 border-b px-3 py-2">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(checked) => toggleAll(checked === true)}
                    disabled={students.length === 0}
                  />
                  <span className="text-xs font-medium text-muted-foreground">Select all</span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {studentsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredStudents.length === 0 ? (
                    <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                      {studentSearch ? `No students match "${studentSearch}".` : 'No students in this class-section.'}
                    </p>
                  ) : (
                    filteredStudents.map((s) => (
                      <label
                        key={s.id}
                        className="flex cursor-pointer items-center gap-2 border-b px-3 py-2 last:border-0 hover:bg-muted/20"
                      >
                        <Checkbox
                          checked={selectedStudentIds.has(s.id)}
                          onCheckedChange={(checked) => toggleStudent(s.id, checked === true)}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.admissionNumber || '—'}</p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            {targetKind === 'parents' && studentsWithoutParent.length > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {studentsWithoutParent.length} selected student{studentsWithoutParent.length !== 1 ? 's have' : ' has'} no
                linked parent contact and will be skipped.
              </p>
            )}
          </>
        )}

        {targetKind === 'staff' && (
          <div>
            <label className="block text-xs font-medium mb-1">Staff</label>
            <MultiTargetPicker kind="staff" value={staffSelection} onChange={setStaffSelection} />
          </div>
        )}

        {targetKind === 'entire_school' && (
          <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
            This will send to every parent, student, and staff member in the school.
          </p>
        )}
      </div>

      {/* ── Main column ──────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex justify-end gap-1 rounded-lg border p-1 w-fit ml-auto">
          {CHANNELS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setChannel(value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                channel === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <SectionCard number={1} title="Context & template">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Context (what this {channel.toUpperCase()} is for)</label>
              <select
                value={context}
                onChange={(e) => setContext(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              >
                {CONTEXTS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Template</label>
              {templatesLoading ? (
                <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading templates…
                </div>
              ) : (
                <select
                  value={templateId ?? ''}
                  onChange={(e) => setTemplateId(e.target.value || null)}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                >
                  <option value="">Select template…</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {userVars.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {userVars.map((varName) => (
                <div key={varName}>
                  <label className="block text-sm font-medium mb-1 capitalize">
                    {varName.replace(/_/g, ' ')}
                  </label>
                  <Input
                    value={extraVars[varName] ?? ''}
                    onChange={(e) => setExtraVars((prev) => ({ ...prev, [varName]: e.target.value }))}
                    placeholder={varName.replace(/_/g, ' ')}
                  />
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard number={2} title="Preview & send">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-4 items-start">
            <div className="rounded-md border bg-muted/30 p-3">
              {sampleMessage ? (
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{sampleMessage}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Select a template to preview the message.
                </p>
              )}
            </div>
            <div className="space-y-2 text-right">
              <div>
                <p className="text-2xl font-semibold">
                  {previewParams ? (recipientsLoading ? '…' : recipientCount ?? 0) : '—'}
                </p>
                <p className="text-xs text-muted-foreground">recipients</p>
              </div>
              {canCreate && (
                <Button className="w-full" onClick={handleSend} disabled={!isAllFilled || sendMutation.isPending}>
                  {sendMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Send Now
                </Button>
              )}
            </div>
          </div>
          {channel === 'sms' && sampleMessage && (
            <p className="text-xs text-muted-foreground">
              {smsCharCount} chars · {smsCredits} SMS credit{smsCredits !== 1 ? 's' : ''} · Sender: COS360
            </p>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

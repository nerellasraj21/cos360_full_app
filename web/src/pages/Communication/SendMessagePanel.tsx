import { useEffect, useMemo, useState } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { Loader2, GraduationCap, Users as StaffIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePermission } from '@/hooks/usePermission';
import { useAcademicYearStore } from '@/lib/academicYearStore';
import { AcademicYearsDropdown } from '@/components/dropdown-system/components/AcademicYearsDropdown';
import { ClassSectionTreePicker, type ClassSectionSelection } from '@/components/communication/ClassSectionTreePicker';
import { communicationApi } from '@/api/communication/communicationApi';
import { communicationKeys, useTemplates } from '@/api/hooks/communication/communication';
import type { Channel, Template } from '@/types/communication';

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

const NARROW_TO = ['All in selection', 'Absentees today', 'Late comers', 'Fee defaulters'];

function buildPreviewText(body: string, extraVars: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, varName) => {
    if (SYSTEM_VARS.has(varName)) return `[${varName}]`;
    return extraVars[varName] ? extraVars[varName] : `[${varName}]`;
  });
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
  showAcademicYear?: boolean;
}

export default function SendMessagePanel({ onSendSuccess, showAcademicYear = true }: SendMessagePanelProps) {
  const { checkPermission } = usePermission();
  const canCreate = checkPermission('communications', 'create');
  const queryClient = useQueryClient();
  const { selectedAcademicYearId } = useAcademicYearStore();

  const [audience, setAudience] = useState<'students' | 'staff'>('students');
  const [academicYearId, setAcademicYearId] = useState<string | null>(selectedAcademicYearId || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [narrowTo, setNarrowTo] = useState(NARROW_TO[0]);
  const [selection, setSelection] = useState<ClassSectionSelection[]>([]);

  const [channel, setChannel] = useState<Channel>('sms');
  const [context, setContext] = useState(CONTEXTS[0].value);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [extraVars, setExtraVars] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

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

  // Recipient count — one preview-count call per selected class/section pair, summed.
  const previewQueries = useQueries({
    queries: selection.map(({ classId, sectionId }) => ({
      queryKey: communicationKeys.previewCount({
        target_type: 'class_section_parents',
        class_id: classId,
        section_id: sectionId,
      }),
      queryFn: () =>
        communicationApi.getPreviewCount({
          target_type: 'class_section_parents',
          class_id: classId,
          section_id: sectionId,
        }),
      staleTime: 30_000,
      enabled: audience === 'students',
    })),
  });
  const recipientsLoading = previewQueries.some((q) => q.isLoading);
  const recipientCount = audience === 'students'
    ? previewQueries.reduce((sum, q) => sum + (q.data?.estimated_count ?? 0), 0)
    : null;

  const sampleMessage = selectedTemplate ? buildPreviewText(selectedTemplate.body, extraVars) : '';
  const smsCharCount = channel === 'sms' ? sampleMessage.length : 0;
  const smsCredits = smsCharCount > 0 ? Math.ceil(smsCharCount / 160) : 0;

  const isAllFilled =
    !!selectedTemplate &&
    selection.length > 0 &&
    userVars.every((v) => !!extraVars[v]?.trim());

  async function handleSend() {
    if (!selectedTemplate || selection.length === 0) return;
    setSending(true);
    try {
      let totalQueued = 0;
      for (const { classId, sectionId } of selection) {
        const res = await communicationApi.sendNotification({
          channel,
          target_type: 'class_section_parents',
          target_ref: { class_id: classId, section_id: sectionId },
          template_id: selectedTemplate.id,
          extra_variables: userVars.length ? extraVars : undefined,
        });
        totalQueued += res.queued_count;
      }
      toast.success(`${channel.toUpperCase()} queued for ${totalQueued} recipient(s).`);
      queryClient.invalidateQueries({ queryKey: communicationKeys.logs() });
      setSelection([]);
      setExtraVars({});
      onSendSuccess?.();
    } catch (error) {
      const msg = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg || 'Failed to send message');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
      {/* ── Audience sidebar ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Audience
        </h2>
        <div className="flex gap-1 rounded-lg border p-1">
          <button
            type="button"
            onClick={() => setAudience('students')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-colors ${
              audience === 'students' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            Students
          </button>
          <button
            type="button"
            onClick={() => setAudience('staff')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-colors ${
              audience === 'staff' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <StaffIcon className="h-4 w-4" />
            Staff
          </button>
        </div>

        {audience === 'students' ? (
          <ClassSectionTreePicker
            academicYearId={academicYearId ?? undefined}
            value={selection}
            onChange={setSelection}
            searchQuery={searchQuery}
          />
        ) : (
          <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
            Staff audience selection isn&apos;t built yet — use the Communication compose flow for staff/role-based sends.
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

        <SectionCard number={1} title="Filters">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {showAcademicYear && (
              <div>
                <label className="block text-sm font-medium mb-1">Academic year</label>
                <AcademicYearsDropdown
                  value={academicYearId ?? undefined}
                  onChange={(val) => setAcademicYearId((val as string) ?? null)}
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Search within selection</label>
              <Input
                placeholder="Class or section name…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Narrow to</label>
            <div className="flex flex-wrap gap-2">
              {NARROW_TO.map((label) => {
                const isDefault = label === NARROW_TO[0];
                const isActive = narrowTo === label;
                return (
                  <button
                    key={label}
                    type="button"
                    disabled={!isDefault}
                    onClick={() => isDefault && setNarrowTo(label)}
                    title={isDefault ? undefined : 'Coming soon'}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      isActive ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </SectionCard>

        <SectionCard number={2} title="Context & template">
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

        <SectionCard number={3} title="Preview & send">
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
                  {audience === 'students' ? (recipientsLoading ? '…' : recipientCount) : '—'}
                </p>
                <p className="text-xs text-muted-foreground">recipients</p>
              </div>
              {canCreate && (
                <Button className="w-full" onClick={handleSend} disabled={!isAllFilled || sending}>
                  {sending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
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

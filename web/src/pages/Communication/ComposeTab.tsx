import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { ClassesDropdown } from '@/components/dropdown-system/components/ClassesDropdown';
import { SectionsByClassDropdown } from '@/components/dropdown-system/components/SectionsByClassDropdown';
import { StudentsDropdown } from '@/components/dropdown-system/components/StudentsDropdown';
import { useTemplates, usePreviewCount, useSendNotification } from '@/api/hooks/communication/communication';
import type { Channel, TargetType, Template, PreviewCountParams } from '@/types/communication';

// ─── System-resolved variables (never ask user to fill these) ─────────────────
const SYSTEM_VARS = new Set([
  'name', 'parent_name', 'student_name', 'staff_name', 'class_name', 'section_name',
]);

// ─── Channel card ─────────────────────────────────────────────────────────────
const CHANNELS: { value: Channel; label: string; icon: string }[] = [
  { value: 'sms', label: 'SMS', icon: '📱' },
  { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { value: 'email', label: 'Email', icon: '📧' },
];

const TARGET_TYPES: { value: TargetType; label: string }[] = [
  { value: 'individual_parent', label: 'Individual Parent' },
  { value: 'individual_student', label: 'Individual Student' },
  { value: 'individual_staff', label: 'Individual Staff' },
  { value: 'class_section_parents', label: 'Class + Section (Parents)' },
  { value: 'class_section_students', label: 'Class + Section (Students)' },
  { value: 'all_parents', label: 'All Parents' },
  { value: 'all_students', label: 'All Students' },
  { value: 'all_staff', label: 'All Staff' },
  { value: 'all_users', label: 'All Users' },
  { value: 'fee_defaulters', label: 'Fee Defaulters' },
  { value: 'role_based', label: 'Role-Based' },
];

const ROLES = ['Teacher', 'Admin', 'Accountant', 'Librarian', 'Receptionist'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildPreviewText(body: string, extraVars: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, varName) => {
    if (SYSTEM_VARS.has(varName)) return `[${varName}]`;
    return extraVars[varName] ? extraVars[varName] : `[${varName}]`;
  });
}

function getTargetLabel(
  targetType: TargetType,
  classLabel: string,
  sectionLabel: string,
  individualLabel: string,
  role: string,
): string {
  switch (targetType) {
    case 'individual_parent': return individualLabel || 'Selected Parent';
    case 'individual_student': return individualLabel || 'Selected Student';
    case 'individual_staff': return individualLabel || 'Selected Staff';
    case 'class_section_parents': return `${classLabel} ${sectionLabel} (Parents)`;
    case 'class_section_students': return `${classLabel} ${sectionLabel} (Students)`;
    case 'all_parents': return 'All Parents';
    case 'all_students': return 'All Students';
    case 'all_staff': return 'All Staff';
    case 'all_users': return 'All Users';
    case 'fee_defaulters': return 'Fee Defaulters';
    case 'role_based': return `Role: ${role}`;
    default: return targetType;
  }
}

// ─── Mobile Wizard Step indicator ─────────────────────────────────────────────
function WizardStepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-1 mb-4 md:hidden">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full flex-1 transition-all ${
            i < step ? 'bg-primary' : 'bg-muted'
          }`}
        />
      ))}
      <span className="ml-2 text-xs text-muted-foreground whitespace-nowrap">
        Step {step} of {total}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface ComposeTabProps {
  onSendSuccess: () => void;
}

export default function ComposeTab({ onSendSuccess }: ComposeTabProps) {
  // Step 1 — Channel
  const [channel, setChannel] = useState<Channel | null>(null);

  // Step 2 — Recipients
  const [targetType, setTargetType] = useState<TargetType>('class_section_parents');
  const [classId, setClassId] = useState<string | null>(null);
  const [classLabel, setClassLabel] = useState('');
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [sectionLabel, setSectionLabel] = useState('');
  const [individualId, setIndividualId] = useState<string | null>(null);
  const [individualLabel, setIndividualLabel] = useState('');
  const [role, setRole] = useState('');

  // Step 3 — Template
  const [templateId, setTemplateId] = useState<string | null>(null);

  // Step 4 — Extra variables
  const [extraVars, setExtraVars] = useState<Record<string, string>>({});

  // Mobile wizard
  const [mobileStep, setMobileStep] = useState(1);

  // Confirmation modal
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Template data
  const { data: templatesData, isLoading: templatesLoading } = useTemplates(
    channel ? { channel, page_size: 100 } : { page_size: 100 },
  );
  const templates = templatesData?.items ?? [];
  const selectedTemplate = templates.find((t) => t.id === templateId) ?? null;

  // Preview count
  const previewParams = buildPreviewParams(targetType, classId, sectionId, individualId, role);
  const { data: previewData } = usePreviewCount(previewParams);
  const estimatedCount = previewData?.estimated_count ?? null;

  // Send mutation
  const sendMutation = useSendNotification();

  // When channel changes, clear template
  useEffect(() => {
    setTemplateId(null);
    setExtraVars({});
  }, [channel]);

  // When template changes, reset extra vars
  useEffect(() => {
    setExtraVars({});
  }, [templateId]);

  // When target type changes, reset individual/class/section/role
  useEffect(() => {
    setClassId(null);
    setClassLabel('');
    setSectionId(null);
    setSectionLabel('');
    setIndividualId(null);
    setIndividualLabel('');
    setRole('');
  }, [targetType]);

  // User-input variables (exclude system-resolved)
  const userVars = selectedTemplate
    ? selectedTemplate.variables.filter((v) => !SYSTEM_VARS.has(v))
    : [];

  // Validation
  const isTargetRefComplete = isRefComplete(targetType, classId, sectionId, individualId, role);
  const isAllFilled =
    !!channel &&
    isTargetRefComplete &&
    !!templateId &&
    userVars.every((v) => !!extraVars[v]?.trim());

  function handleSend() {
    if (!isAllFilled || !channel) return;
    setConfirmOpen(true);
  }

  function handleConfirmSend() {
    if (!channel || !templateId) return;
    const targetRef = buildTargetRef(targetType, classId, sectionId, individualId, role);
    sendMutation.mutate(
      {
        channel,
        target_type: targetType,
        target_ref: targetRef,
        template_id: templateId,
        extra_variables: userVars.length ? extraVars : undefined,
      },
      {
        onSuccess: () => {
          setConfirmOpen(false);
          onSendSuccess();
        },
      },
    );
  }

  const smsCharCount = channel === 'sms' && selectedTemplate ? selectedTemplate.body.length : 0;
  const targetLabel = getTargetLabel(targetType, classLabel, sectionLabel, individualLabel, role);

  // ── Sample message for confirmation modal ──
  const sampleMessage = selectedTemplate
    ? buildPreviewText(selectedTemplate.body, extraVars)
    : '';

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Mobile wizard indicator */}
      <WizardStepIndicator step={mobileStep} total={4} />

      {/* ── Step 1: Channel ──────────────────────────────────────────────── */}
      <section className={`space-y-3 ${mobileStep !== 1 ? 'hidden md:block' : ''}`}>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          1. Select Channel
        </h2>
        <div
          role="radiogroup"
          aria-label="Select communication channel"
          className="flex flex-wrap gap-3"
        >
          {CHANNELS.map(({ value, label, icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={channel === value}
              onClick={() => setChannel(value)}
              className={`flex flex-col items-center gap-1 px-6 py-4 rounded-lg border-2 cursor-pointer transition-all min-w-[90px]
                ${
                  channel === value
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}
            >
              <span className="text-2xl" aria-hidden="true">{icon}</span>
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
        {channel === 'sms' && selectedTemplate && (
          <p className="text-xs text-muted-foreground" aria-live="polite">
            Body length: {smsCharCount} chars ({Math.ceil(smsCharCount / 160)} credit
            {Math.ceil(smsCharCount / 160) !== 1 ? 's' : ''})
          </p>
        )}
        <div className="flex justify-end md:hidden">
          <Button
            size="sm"
            disabled={!channel}
            onClick={() => setMobileStep(2)}
          >
            Next
          </Button>
        </div>
      </section>

      {/* ── Step 2: Recipients ───────────────────────────────────────────── */}
      <section className={`space-y-3 ${mobileStep !== 2 ? 'hidden md:block' : ''}`}>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          2. Select Recipients
        </h2>

        <div className="space-y-3">
          <div>
            <label htmlFor="target-type" className="block text-sm font-medium mb-1">
              Target Type <span aria-hidden="true">*</span>
            </label>
            <select
              id="target-type"
              value={targetType}
              onChange={(e) => setTargetType(e.target.value as TargetType)}
              aria-required="true"
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            >
              {TARGET_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Conditional fields */}
          {(targetType === 'class_section_parents' || targetType === 'class_section_students') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Class <span aria-hidden="true">*</span>
                </label>
                <ClassesDropdown
                  value={classId}
                  onChange={(val, opt) => {
                    setClassId(val as string | null);
                    setClassLabel((opt as { label?: string })?.label ?? '');
                    setSectionId(null);
                    setSectionLabel('');
                  }}
                  placeholder="Select Class"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Section <span aria-hidden="true">*</span>
                </label>
                <SectionsByClassDropdown
                  classId={classId ?? undefined}
                  value={sectionId}
                  onChange={(val, opt) => {
                    setSectionId(val as string | null);
                    setSectionLabel((opt as { label?: string })?.label ?? '');
                  }}
                  placeholder="Select Section"
                />
              </div>
            </div>
          )}

          {targetType === 'individual_student' && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Student <span aria-hidden="true">*</span>
              </label>
              <StudentsDropdown
                value={individualId}
                onChange={(val, opt) => {
                  setIndividualId(val as string | null);
                  setIndividualLabel((opt as { label?: string })?.label ?? '');
                }}
                placeholder="Search student by name / admission no"
              />
            </div>
          )}

          {targetType === 'individual_parent' && (
            <div>
              <label htmlFor="parent-search" className="block text-sm font-medium mb-1">
                Parent ID <span aria-hidden="true">*</span>
              </label>
              <input
                id="parent-search"
                type="text"
                placeholder="Enter parent ID"
                value={individualId ?? ''}
                onChange={(e) => {
                  setIndividualId(e.target.value || null);
                  setIndividualLabel(e.target.value);
                }}
                aria-required="true"
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the parent&apos;s UUID
              </p>
            </div>
          )}

          {targetType === 'individual_staff' && (
            <div>
              <label htmlFor="staff-search" className="block text-sm font-medium mb-1">
                Staff ID <span aria-hidden="true">*</span>
              </label>
              <input
                id="staff-search"
                type="text"
                placeholder="Enter staff ID"
                value={individualId ?? ''}
                onChange={(e) => {
                  setIndividualId(e.target.value || null);
                  setIndividualLabel(e.target.value);
                }}
                aria-required="true"
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the staff member&apos;s UUID
              </p>
            </div>
          )}

          {targetType === 'role_based' && (
            <div>
              <label htmlFor="role-select" className="block text-sm font-medium mb-1">
                Role <span aria-hidden="true">*</span>
              </label>
              <select
                id="role-select"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                aria-required="true"
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              >
                <option value="">Select role…</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          )}

          {/* Estimated count */}
          {isTargetRefComplete && (
            <p
              aria-live="polite"
              className="text-sm text-muted-foreground"
            >
              {estimatedCount !== null
                ? `Estimated recipients: ~${estimatedCount}`
                : 'Fetching recipient count…'}
            </p>
          )}
        </div>

        <div className="flex justify-between md:hidden">
          <Button size="sm" variant="outline" onClick={() => setMobileStep(1)}>Back</Button>
          <Button size="sm" disabled={!isTargetRefComplete} onClick={() => setMobileStep(3)}>Next</Button>
        </div>
      </section>

      {/* ── Step 3: Template ─────────────────────────────────────────────── */}
      <section className={`space-y-3 ${mobileStep !== 3 ? 'hidden md:block' : ''}`}>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          3. Select Template
        </h2>

        {!channel && (
          <p className="text-sm text-muted-foreground italic">
            Select a channel above to filter templates.
          </p>
        )}

        {channel && (
          <div className="space-y-3">
            <div>
              <label htmlFor="template-select" className="block text-sm font-medium mb-1">
                Template <span aria-hidden="true">*</span>
              </label>
              {templatesLoading ? (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading templates…</span>
                </div>
              ) : (
                <select
                  id="template-select"
                  value={templateId ?? ''}
                  onChange={(e) => setTemplateId(e.target.value || null)}
                  aria-required="true"
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                >
                  <option value="">Select template…</option>
                  {templates
                    .filter((t) => t.is_active)
                    .map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>
              )}
            </div>

            {selectedTemplate && (
              <div className="rounded-md border bg-muted/30 p-3 space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Preview</p>
                <p className="text-sm whitespace-pre-wrap font-mono leading-relaxed">
                  {selectedTemplate.body.replace(/\{\{(\w+)\}\}/g, (_, v) => `[${v}]`)}
                </p>
                {userVars.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Variables required:{' '}
                    <span className="font-medium text-foreground">{userVars.join(', ')}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between md:hidden">
          <Button size="sm" variant="outline" onClick={() => setMobileStep(2)}>Back</Button>
          <Button size="sm" disabled={!templateId} onClick={() => setMobileStep(4)}>Next</Button>
        </div>
      </section>

      {/* ── Step 4: Extra Variables ──────────────────────────────────────── */}
      {userVars.length > 0 && (
        <section className={`space-y-3 ${mobileStep !== 4 ? 'hidden md:block' : ''}`}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            4. Fill Variables
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {userVars.map((varName) => (
              <div key={varName}>
                <label
                  htmlFor={`var-${varName}`}
                  className="block text-sm font-medium mb-1 capitalize"
                >
                  {varName.replace(/_/g, ' ')} <span aria-hidden="true">*</span>
                </label>
                <input
                  id={`var-${varName}`}
                  type="text"
                  value={extraVars[varName] ?? ''}
                  onChange={(e) =>
                    setExtraVars((prev) => ({ ...prev, [varName]: e.target.value }))
                  }
                  aria-required="true"
                  placeholder={varName.replace(/_/g, ' ')}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-between md:hidden">
            <Button size="sm" variant="outline" onClick={() => setMobileStep(3)}>Back</Button>
          </div>
        </section>
      )}

      {/* ── Send Button ──────────────────────────────────────────────────── */}
      <div className={`flex justify-end pt-2 ${mobileStep !== 4 && userVars.length > 0 ? 'hidden md:flex' : ''}`}>
        <Button onClick={handleSend} disabled={!isAllFilled}>
          Send Now
        </Button>
      </div>

      {/* ── Confirmation Modal ───────────────────────────────────────────── */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent aria-labelledby="confirm-send-title" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle id="confirm-send-title">Confirm Send</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">You are about to send:</p>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b">
                  <th scope="row" className="py-2 pr-4 text-left font-medium text-muted-foreground w-32">Channel</th>
                  <td className="py-2 capitalize">{channel}</td>
                </tr>
                <tr className="border-b">
                  <th scope="row" className="py-2 pr-4 text-left font-medium text-muted-foreground">Target</th>
                  <td className="py-2">{targetLabel}</td>
                </tr>
                <tr className="border-b">
                  <th scope="row" className="py-2 pr-4 text-left font-medium text-muted-foreground">Recipients</th>
                  <td className="py-2">
                    {estimatedCount !== null ? `~${estimatedCount} people` : '…'}
                  </td>
                </tr>
                <tr className="border-b">
                  <th scope="row" className="py-2 pr-4 text-left font-medium text-muted-foreground">Template</th>
                  <td className="py-2">{selectedTemplate?.name}</td>
                </tr>
              </tbody>
            </table>

            {sampleMessage && (
              <div>
                <p className="font-medium mb-1">Sample message:</p>
                <div className="rounded-md bg-muted/40 p-3 text-sm font-mono whitespace-pre-wrap border">
                  &ldquo;{sampleMessage}&rdquo;
                </div>
              </div>
            )}

            <div
              role="alert"
              aria-live="assertive"
              className="flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-900 p-3"
            >
              <span className="text-base" aria-hidden="true">⚠️</span>
              <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                This action will send{' '}
                {estimatedCount !== null ? `${estimatedCount} ` : ''}
                {channel?.toUpperCase()} messages and cannot be undone.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirmSend}
                disabled={sendMutation.isPending}
              >
                {sendMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                Confirm &amp; Send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildPreviewParams(
  targetType: TargetType,
  classId: string | null,
  sectionId: string | null,
  individualId: string | null,
  role: string,
): PreviewCountParams | null {
  const base = { target_type: targetType };

  if (targetType === 'class_section_parents' || targetType === 'class_section_students') {
    if (!classId || !sectionId) return null;
    return { ...base, class_id: classId, section_id: sectionId };
  }
  if (targetType === 'individual_parent') {
    if (!individualId) return null;
    return { ...base, parent_id: individualId };
  }
  if (targetType === 'individual_student') {
    if (!individualId) return null;
    return { ...base, student_id: individualId };
  }
  if (targetType === 'individual_staff') {
    if (!individualId) return null;
    return { ...base, staff_id: individualId };
  }
  if (targetType === 'role_based') {
    if (!role) return null;
    return { ...base, role };
  }
  // all_parents, all_students, all_staff, all_users, fee_defaulters
  return base;
}

function isRefComplete(
  targetType: TargetType,
  classId: string | null,
  sectionId: string | null,
  individualId: string | null,
  role: string,
): boolean {
  if (targetType === 'class_section_parents' || targetType === 'class_section_students') {
    return !!classId && !!sectionId;
  }
  if (targetType === 'individual_parent' || targetType === 'individual_student' || targetType === 'individual_staff') {
    return !!individualId;
  }
  if (targetType === 'role_based') return !!role;
  return true; // all_* and fee_defaulters need no extra ref
}

function buildTargetRef(
  targetType: TargetType,
  classId: string | null,
  sectionId: string | null,
  individualId: string | null,
  role: string,
): Record<string, string> {
  if (targetType === 'class_section_parents' || targetType === 'class_section_students') {
    return { class_id: classId!, section_id: sectionId! };
  }
  if (targetType === 'individual_parent') return { parent_id: individualId! };
  if (targetType === 'individual_student') return { student_id: individualId! };
  if (targetType === 'individual_staff') return { staff_id: individualId! };
  if (targetType === 'role_based') return { role };
  return {};
}

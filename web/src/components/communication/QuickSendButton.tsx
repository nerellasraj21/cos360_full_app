import { useEffect, useMemo, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePermission } from '@/hooks/usePermission';
import { useTemplates, useSendNotification } from '@/api/hooks/communication/communication';
import type { Channel, TargetRef, TargetType, Template } from '@/types/communication';

/**
 * Variables the backend resolves on its own from the recipient record.
 * These are never asked for in the dialog.
 */
const SYSTEM_VARS = new Set([
  'name',
  'parent_name',
  'student_name',
  'staff_name',
  'class_name',
  'section_name',
]);

const CHANNELS: { value: Channel; label: string }[] = [
  { value: 'sms', label: 'SMS' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
];

function buildPreview(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, v: string) =>
    vars[v]?.trim() ? vars[v] : `[${v}]`,
  );
}

export interface QuickSendButtonProps {
  /** Template name to preselect, e.g. 'Welcome' — matched case-insensitively. */
  templateName: string;
  /** Who receives the message. */
  targetType: TargetType;
  targetRef: TargetRef;
  /** Values known from the row — prefill and lock the matching placeholders. */
  variables?: Record<string, string | number | null | undefined>;
  /** Shown in the dialog subtitle so the user can confirm the recipient. */
  recipientLabel?: string;
  /** Icon-only ghost button (table rows) vs. labelled button (toolbars). */
  variant?: 'icon' | 'button';
  label?: string;
  disabled?: boolean;
  title?: string;
}

/**
 * Single-recipient "Send" action reusing the Communication templates + send API.
 * Renders nothing when the user lacks `communications:create`.
 */
export function QuickSendButton({
  templateName,
  targetType,
  targetRef,
  variables,
  recipientLabel,
  variant = 'icon',
  label = 'Send',
  disabled,
  title,
}: QuickSendButtonProps) {
  const { checkPermission } = usePermission();
  const canSend = checkPermission('communications', 'create');

  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<Channel>('sms');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [extraVars, setExtraVars] = useState<Record<string, string>>({});

  const { data: templatesData, isLoading: templatesLoading } = useTemplates({
    channel,
    page_size: 100,
  });
  const sendMutation = useSendNotification();

  const templates = useMemo<Template[]>(
    () => (templatesData?.items ?? []).filter((t) => t.is_active),
    [templatesData],
  );

  // Prefilled values coming from the row, normalised to strings.
  const prefill = useMemo<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(variables ?? {})) {
      if (v !== null && v !== undefined && String(v).trim() !== '') out[k] = String(v);
    }
    return out;
  }, [variables]);

  // Preselect the template whose name matches `templateName`.
  useEffect(() => {
    if (!open || templates.length === 0) return;
    const wanted = templateName.trim().toLowerCase();
    const match =
      templates.find((t) => t.name.trim().toLowerCase() === wanted) ??
      templates.find((t) => t.name.toLowerCase().includes(wanted));
    setTemplateId(match?.id ?? null);
  }, [open, templates, templateName]);

  const selectedTemplate = templates.find((t) => t.id === templateId) ?? null;

  // Placeholders the user must still fill: not system-resolved, not prefilled.
  const missingVars = useMemo(
    () =>
      selectedTemplate
        ? selectedTemplate.variables.filter(
            (v) => !SYSTEM_VARS.has(v) && !prefill[v],
          )
        : [],
    [selectedTemplate, prefill],
  );

  useEffect(() => {
    setExtraVars({});
  }, [templateId]);

  const mergedVars = { ...prefill, ...extraVars };
  const previewText = selectedTemplate ? buildPreview(selectedTemplate.body, mergedVars) : '';
  const charCount = previewText.length;
  const credits = charCount > 0 ? Math.ceil(charCount / 160) : 0;

  const canSubmit =
    !!selectedTemplate &&
    missingVars.every((v) => !!extraVars[v]?.trim()) &&
    !sendMutation.isPending;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setExtraVars({});
      setTemplateId(null);
    }
  }

  function handleSend() {
    if (!selectedTemplate) return;
    const payloadVars = Object.fromEntries(
      Object.entries(mergedVars).filter(([k]) => !SYSTEM_VARS.has(k)),
    );
    sendMutation.mutate(
      {
        channel,
        target_type: targetType,
        target_ref: targetRef,
        template_id: selectedTemplate.id,
        extra_variables: Object.keys(payloadVars).length ? payloadVars : undefined,
      },
      { onSuccess: () => handleOpenChange(false) },
    );
  }

  if (!canSend) return null;

  const buttonTitle = title ?? `Send ${templateName} message`;

  return (
    <>
      {variant === 'icon' ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(true)}
          disabled={disabled}
          title={buttonTitle}
          aria-label={buttonTitle}
          className="h-8 w-8 p-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          disabled={disabled}
          title={buttonTitle}
        >
          <Send className="h-4 w-4 mr-2" />
          {label}
        </Button>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Send Message</DialogTitle>
            {recipientLabel && (
              <p className="text-sm text-muted-foreground">To: {recipientLabel}</p>
            )}
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
            {/* Channel */}
            <div>
              <p className="text-sm font-medium mb-1.5">Channel</p>
              <div className="flex gap-1 rounded-lg border p-1 w-fit">
                {CHANNELS.map(({ value, label: chLabel }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setChannel(value)}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      channel === value
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {chLabel}
                  </button>
                ))}
              </div>
            </div>

            {/* Template */}
            <div>
              <label htmlFor="quick-send-template" className="block text-sm font-medium mb-1">
                Template
              </label>
              {templatesLoading ? (
                <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading templates…
                </div>
              ) : templates.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No active {channel.toUpperCase()} templates. Create one in Communication →
                  Templates.
                </p>
              ) : (
                <select
                  id="quick-send-template"
                  value={templateId ?? ''}
                  onChange={(e) => setTemplateId(e.target.value || null)}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                >
                  <option value="">Select template…</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Remaining variables */}
            {missingVars.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {missingVars.map((varName) => (
                  <div key={varName}>
                    <label
                      htmlFor={`qs-var-${varName}`}
                      className="block text-sm font-medium mb-1 capitalize"
                    >
                      {varName.replace(/_/g, ' ')}
                    </label>
                    <Input
                      id={`qs-var-${varName}`}
                      value={extraVars[varName] ?? ''}
                      onChange={(e) =>
                        setExtraVars((prev) => ({ ...prev, [varName]: e.target.value }))
                      }
                      placeholder={varName.replace(/_/g, ' ')}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Preview */}
            <div>
              <p className="text-sm font-medium mb-1">Preview</p>
              <div className="rounded-md border bg-muted/30 p-3">
                {previewText ? (
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{previewText}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Select a template to preview the message.
                  </p>
                )}
              </div>
              {channel === 'sms' && previewText && (
                <p className="text-xs text-muted-foreground mt-1">
                  {charCount} chars · {credits} SMS credit{credits !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={!canSubmit}>
              {sendMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Send Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default QuickSendButton;

import { useState, useRef, useCallback } from 'react';
import { usePermission } from '@/hooks/usePermission';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Edit, Trash2, Loader2 } from 'lucide-react';
import {
  useTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeactivateTemplate,
  communicationKeys,
} from '@/api/hooks/communication/communication';
import { communicationApi } from '@/api/communication/communicationApi';
import { DEFAULT_COMMUNICATION_TEMPLATES } from '@/lib/defaultCommunicationTemplates';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Channel, Template, TemplateCreate, TemplateUpdate } from '@/types/communication';

// ─── Constants ────────────────────────────────────────────────────────────────

const CHANNEL_ICONS: Record<Channel, string> = {
  sms: '📱',
  whatsapp: '💬',
  email: '📧',
};

const VARIABLE_SUGGESTIONS = [
  'name', 'parent_name', 'student_name', 'staff_name',
  'class_name', 'section_name', 'amount', 'due_date',
  'exam_name', 'month', 'date', 'reason',
];

// ─── Detect variables from body ───────────────────────────────────────────────
function detectVariables(body: string): string[] {
  const matches = body.match(/\{\{(\w+)\}\}/g) ?? [];
  return [...new Set(matches.map((m) => m.slice(2, -2)))];
}

// ─── Template Form Modal ──────────────────────────────────────────────────────
interface TemplateFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Template | null;
}

function TemplateFormModal({ open, onOpenChange, editing }: TemplateFormModalProps) {
  const [name, setName] = useState(editing?.name ?? '');
  const [channel, setChannel] = useState<Channel>(editing?.channel ?? 'sms');
  const [body, setBody] = useState(editing?.body ?? '');
  const [subject, setSubject] = useState(editing?.subject ?? '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showVarMenu, setShowVarMenu] = useState(false);

  const detectedVars = detectVariables(body);
  const previewText = body.replace(/\{\{(\w+)\}\}/g, (_, v) => `[${v}]`);
  const charCount = body.length;

  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();
  const isPending = createMutation.isPending || updateMutation.isPending;

  // Reset form when editing target changes
  const handleOpen = useCallback(
    (isOpen: boolean) => {
      if (isOpen && editing) {
        setName(editing.name);
        setChannel(editing.channel);
        setBody(editing.body);
        setSubject(editing.subject ?? '');
      } else if (!isOpen) {
        setName('');
        setChannel('sms');
        setBody('');
        setSubject('');
        setShowVarMenu(false);
      }
      onOpenChange(isOpen);
    },
    [editing, onOpenChange],
  );

  function insertVariable(varName: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newBody = body.slice(0, start) + `{{${varName}}}` + body.slice(end);
    setBody(newBody);
    setShowVarMenu(false);
    // Restore cursor
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + varName.length + 4;
      ta.setSelectionRange(pos, pos);
    });
  }

  function handleSave() {
    if (!name.trim() || !body.trim()) return;
    const variables = detectVariables(body);

    if (editing) {
      const update: TemplateUpdate = { name, body, variables, is_active: editing.is_active };
      if (channel === 'email') update.subject = subject || null;
      updateMutation.mutate(
        { id: editing.id, data: update },
        { onSuccess: () => handleOpen(false) },
      );
    } else {
      const create: TemplateCreate = { name, channel, body, variables };
      if (channel === 'email') create.subject = subject || null;
      createMutation.mutate(create, { onSuccess: () => handleOpen(false) });
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Template' : 'New Template'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="tpl-name" className="block text-sm font-medium mb-1">
              Template Name <span aria-hidden="true">*</span>
            </label>
            <input
              id="tpl-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-required="true"
              placeholder="e.g. fee_reminder"
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            />
          </div>

          {/* Channel */}
          {!editing && (
            <div>
              <p className="text-sm font-medium mb-2">
                Channel <span aria-hidden="true">*</span>
              </p>
              <div role="radiogroup" aria-label="Select channel" className="flex gap-4">
                {(['sms', 'whatsapp', 'email'] as Channel[]).map((ch) => (
                  <label key={ch} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="channel"
                      value={ch}
                      checked={channel === ch}
                      onChange={() => setChannel(ch)}
                    />
                    <span className="text-sm capitalize">{ch}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Body */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="tpl-body" className="text-sm font-medium">
                Message Body <span aria-hidden="true">*</span>
              </label>
              <span
                className="text-xs text-muted-foreground"
                aria-live="polite"
              >
                {charCount}{channel === 'sms' ? ` / 160 (${Math.ceil(charCount / 160)} credit${Math.ceil(charCount / 160) !== 1 ? 's' : ''})` : ''}
              </span>
            </div>
            <textarea
              id="tpl-body"
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              aria-required="true"
              aria-label="Message body with Jinja2 placeholders"
              placeholder="Dear {{parent_name}}, fee ₹{{amount}} is due…"
              rows={5}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background font-mono resize-none"
            />
            {/* Insert variable dropdown */}
            <div className="relative inline-block mt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowVarMenu((v) => !v)}
              >
                Insert Variable ▼
              </Button>
              {showVarMenu && (
                <div className="absolute z-50 top-full left-0 mt-1 w-52 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
                  {VARIABLE_SUGGESTIONS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVariable(v)}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent"
                    >
                      {`{{${v}}}`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Detected vars */}
            {detectedVars.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="text-xs text-muted-foreground mr-1">Detected variables:</span>
                {detectedVars.map((v) => (
                  <Badge key={v} variant="secondary" className="text-xs font-mono">
                    {v}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Subject (email only) */}
          {channel === 'email' && (
            <div>
              <label htmlFor="tpl-subject" className="block text-sm font-medium mb-1">
                Subject <span aria-hidden="true">*</span>
              </label>
              <input
                id="tpl-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                aria-required="true"
                placeholder="Email subject line"
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              />
            </div>
          )}

          {/* Live preview */}
          {body && (
            <div>
              <p className="text-sm font-medium mb-1">Live Preview</p>
              <div className="rounded-md border bg-muted/30 p-3 text-sm font-mono whitespace-pre-wrap leading-relaxed">
                {previewText}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => handleOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!name.trim() || !body.trim() || isPending}
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editing ? 'Save Changes' : 'Save Template'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Templates Tab ───────────────────────────────────────────────────────
export default function TemplatesTab() {
  const { checkPermission } = usePermission();
  const canCreate = checkPermission('communications', 'create');
  const canUpdate = checkPermission('communications', 'update');

  const [channelFilter, setChannelFilter] = useState<Channel | ''>('');
  const [statusFilter, setStatusFilter] = useState<'' | 'active' | 'inactive'>('');
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Template | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Template | null>(null);
  const [seeding, setSeeding] = useState(false);
  const queryClient = useQueryClient();

  const isActiveFilter =
    statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined;

  const { data, isLoading } = useTemplates({
    channel: channelFilter || undefined,
    is_active: isActiveFilter,
    page_size: 100,
  });

  const deactivateMutation = useDeactivateTemplate();

  const templates = (data?.items ?? []).filter((t) =>
    search
      ? t.name.toLowerCase().includes(search.toLowerCase())
      : true,
  );

  function openCreate() {
    setEditTarget(null);
    setFormOpen(true);
  }

  function openEdit(t: Template) {
    setEditTarget(t);
    setFormOpen(true);
  }

  /**
   * Creates any of the built-in default templates that don't exist yet.
   * Existing templates (matched by name, case-insensitive) are left untouched.
   */
  async function handleLoadDefaults() {
    setSeeding(true);

    // Fetch unfiltered — the visible list may be narrowed by channel/status filters.
    let existing: Set<string>;
    try {
      const all = await communicationApi.getTemplates({ page_size: 200 });
      existing = new Set(all.items.map((t) => t.name.trim().toLowerCase()));
    } catch {
      setSeeding(false);
      toast.error('Could not check existing templates. Please try again.');
      return;
    }

    const missing = DEFAULT_COMMUNICATION_TEMPLATES.filter(
      (t) => !existing.has(t.name.trim().toLowerCase()),
    );

    if (missing.length === 0) {
      setSeeding(false);
      toast.info('All default templates already exist.');
      return;
    }

    let created = 0;
    const failed: string[] = [];
    for (const tpl of missing) {
      try {
        await communicationApi.createTemplate({
          ...tpl,
          variables: detectVariables(tpl.body),
        });
        created += 1;
      } catch {
        failed.push(tpl.name);
      }
    }
    setSeeding(false);
    queryClient.invalidateQueries({ queryKey: communicationKeys.templates() });

    if (created > 0) toast.success(`${created} default template(s) created.`);
    if (failed.length > 0) toast.error(`Failed to create: ${failed.join(', ')}`);
  }

  function handleDeactivate() {
    if (!deactivateTarget) return;
    deactivateMutation.mutate(deactivateTarget.id, {
      onSuccess: () => setDeactivateTarget(null),
    });
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value as Channel | '')}
          className="border rounded-md px-3 py-2 text-sm bg-background"
          aria-label="Filter by channel"
        >
          <option value="">All Channels</option>
          <option value="sms">SMS</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="email">Email</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as '' | 'active' | 'inactive')}
          className="border rounded-md px-3 py-2 text-sm bg-background"
          aria-label="Filter by status"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search templates…"
          className="border rounded-md px-3 py-2 text-sm bg-background flex-1 min-w-[160px]"
          aria-label="Search templates"
        />

        {canCreate && (
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleLoadDefaults}
              disabled={seeding || isLoading}
              className="whitespace-nowrap"
              title="Create the built-in Welcome / Attendance / Fee / Exam / Holiday templates"
            >
              {seeding && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Load Default Templates
            </Button>
            <Button onClick={openCreate} className="whitespace-nowrap">
              + New Template
            </Button>
          </div>
        )}
      </div>

      {/* Table — desktop */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2 text-sm text-muted-foreground">Loading templates…</span>
        </div>
      ) : templates.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground text-sm">No templates found.</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th scope="col" className="text-left px-4 py-3 font-medium">Name</th>
                  <th scope="col" className="text-left px-4 py-3 font-medium">Channel</th>
                  <th scope="col" className="text-left px-4 py-3 font-medium hidden lg:table-cell">Variables</th>
                  <th scope="col" className="text-left px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="text-left px-4 py-3 font-medium hidden lg:table-cell">Last Modified</th>
                  <th scope="col" className="text-left px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((t, i) => (
                  <tr
                    key={t.id}
                    className={`border-t h-12 ${i % 2 === 0 ? '' : 'bg-muted/20'}`}
                  >
                    <td className="px-4 py-2 font-medium">{t.name}</td>
                    <td className="px-4 py-2">
                      <span>{CHANNEL_ICONS[t.channel]} {t.channel.toUpperCase()}</span>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground hidden lg:table-cell">
                      {t.variables.join(', ') || '—'}
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge status={t.is_active} />
                    </td>
                    <td className="px-4 py-2 text-muted-foreground hidden lg:table-cell">
                      {t.updated_at ? new Date(t.updated_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1">
                        {canUpdate && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(t)}
                            aria-label={`Edit ${t.name}`}
                            className="h-8 w-8 p-0"
                            title="Edit Template"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {canUpdate && t.is_active && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeactivateTarget(t)}
                            aria-label={`Deactivate ${t.name}`}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive/80"
                            title="Deactivate Template"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-4 py-2 text-xs text-muted-foreground border-t">
              Showing {templates.length} of {data?.total ?? templates.length} templates
            </p>
          </div>

          {/* Mobile card layout */}
          <div className="md:hidden space-y-3">
            {templates.map((t) => (
              <div key={t.id} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{t.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {CHANNEL_ICONS[t.channel]} {t.channel.toUpperCase()}
                    </p>
                  </div>
                  <StatusBadge status={t.is_active} />
                </div>
                {t.variables.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Variables: {t.variables.join(', ')}
                  </p>
                )}
                <div className="flex gap-2 pt-1">
                  {canUpdate && (
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit Template" onClick={() => openEdit(t)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {canUpdate && t.is_active && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive/80"
                      title="Deactivate Template"
                      onClick={() => setDeactivateTarget(t)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Template form modal */}
      <TemplateFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editTarget}
      />

      {/* Deactivate confirm dialog */}
      <Dialog open={!!deactivateTarget} onOpenChange={(o) => !o && setDeactivateTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Deactivate Template</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to deactivate{' '}
            <span className="font-medium text-foreground">{deactivateTarget?.name}</span>?
            It will no longer be available for sending messages.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setDeactivateTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeactivate}
              disabled={deactivateMutation.isPending}
            >
              {deactivateMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Deactivate
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

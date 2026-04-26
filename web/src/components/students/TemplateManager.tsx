// src/components/students/TemplateManager.tsx
// Manage certificate templates (Create/Edit/Delete)

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Edit, Trash2, Plus, Eye, X, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import {
  useIssuableCertificateTemplates,
  useIssuableCertificateTemplate,
  useCreateIssuableCertificateTemplate,
  useUpdateIssuableCertificateTemplate,
  useDeleteIssuableCertificateTemplate,
} from "@/api/hooks/students/useIssuableCertificates";
import type { IssuableCertificateTemplate } from "@/types/certificates/issuable";
import { CertificateEditor } from "./CertificateEditor";
import { DEFAULT_TEMPLATES } from "@/lib/defaultCertificateTemplates";

const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  html_template: z.string().min(1, "HTML template is required"),
  color_theme: z.enum(["blue", "green", "red", "orange"]),
});

type TemplateFormData = z.infer<typeof templateSchema>;

// ── Isolated preview component ───────────────────────────────────────────────
function TemplatePreviewDialog({
  template,
  onClose,
}: {
  template: IssuableCertificateTemplate | null;
  onClose: () => void;
}) {
  const { data: freshTemplate, isLoading } = useIssuableCertificateTemplate(template?.id ?? "");
  const html = freshTemplate?.html_template ?? template?.html_template ?? "";
  const iframeSrcDoc = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{margin:0;padding:16px;background:#fff;color:#222;font-family:Arial,sans-serif;}</style></head><body>${html}</body></html>`;

  return (
    <Dialog open={!!template} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col gap-3">
        <DialogHeader>
          <DialogTitle>{freshTemplate?.name ?? template?.name} — Preview</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-40 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading…
            </div>
          ) : (
            <iframe
              key={freshTemplate?.id ?? template?.id}
              srcDoc={iframeSrcDoc}
              className="w-full border-0"
              style={{ height: "65vh" }}
              title="Certificate Preview"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main TemplateManager ─────────────────────────────────────────────────────
export function TemplateManager() {
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<IssuableCertificateTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<IssuableCertificateTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IssuableCertificateTemplate | null>(null);

  const { data: templates, isLoading } = useIssuableCertificateTemplates();
  const createMutation = useCreateIssuableCertificateTemplate();
  const updateMutation = useUpdateIssuableCertificateTemplate();
  const deleteMutation = useDeleteIssuableCertificateTemplate();

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: { name: "", html_template: "", color_theme: "blue" },
  });

  const handleSubmit = async (data: TemplateFormData) => {
    if (editingTemplate) {
      await updateMutation.mutateAsync({ templateId: editingTemplate.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
    form.reset();
    setIsCreating(false);
    setEditingTemplate(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const [isSeeding, setIsSeeding] = useState(false);
  const handleLoadDefaultTemplates = async () => {
    setIsSeeding(true);
    try {
      for (const tpl of DEFAULT_TEMPLATES) {
        await createMutation.mutateAsync(tpl);
      }
      toast.success("Default templates added successfully");
    } catch {
      toast.error("Failed to add one or more default templates");
    } finally {
      setIsSeeding(false);
    }
  };

  // ── Create / Edit form ────────────────────────────────────────────────────
  if (isCreating || editingTemplate) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{editingTemplate ? "Edit Template" : "Create New Template"}</CardTitle>
          <Button
            variant="ghost" size="sm"
            onClick={() => { setIsCreating(false); setEditingTemplate(null); form.reset(); }}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Template Name *</label>
              <input
                type="text"
                placeholder="e.g., Bonafide Certificate"
                {...form.register("name")}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {form.formState.errors.name && (
                <p className="text-destructive text-sm mt-1">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Color Theme</label>
              <div className="flex gap-4">
                {(["blue", "green", "red", "orange"] as const).map((theme) => (
                  <label key={theme} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" value={theme} {...form.register("color_theme")} className="h-4 w-4" />
                    <span className="text-sm capitalize">{theme}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Certificate Content *</label>
              <p className="text-xs text-muted-foreground mb-2">
                Type your certificate text. Use <strong>Insert Variable</strong> to add dynamic fields.
              </p>
              <Controller
                key={editingTemplate?.id ?? "new"}
                name="html_template"
                control={form.control}
                render={({ field }) => (
                  <CertificateEditor initialContent={field.value} onChange={field.onChange} minHeight="360px" />
                )}
              />
              {form.formState.errors.html_template && (
                <p className="text-destructive text-sm mt-1">{form.formState.errors.html_template.message}</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                  : `${editingTemplate ? "Update" : "Create"} Template`}
              </Button>
              <Button type="button" variant="outline"
                onClick={() => { setIsCreating(false); setEditingTemplate(null); form.reset(); }}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  // ── List ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-semibold">Certificate Templates</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleLoadDefaultTemplates} disabled={isSeeding} className="gap-2">
            {isSeeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Load Default Templates
          </Button>
          <Button onClick={() => setIsCreating(true)} className="gap-2">
            <Plus className="h-4 w-4" />Create Template
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading templates…</span>
          </CardContent>
        </Card>
      ) : templates && templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template: IssuableCertificateTemplate) => (
            <Card key={template.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base flex-1">{template.name}</CardTitle>
                  <Badge variant="outline" className="capitalize">{template.color_theme}</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3">
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Created: {new Date(template.created_at).toLocaleDateString()}</p>
                  {template.variables_used && (
                    <p>Variables: {template.variables_used.split(",").length} fields</p>
                  )}
                  <p>Status:{" "}
                    <Badge variant={template.is_active === "True" ? "default" : "secondary"}>
                      {template.is_active === "True" ? "Active" : "Inactive"}
                    </Badge>
                  </p>
                </div>
                <div className="flex gap-2 mt-auto pt-3 border-t">
                  <Button size="sm" variant="outline" className="gap-1.5 flex-1"
                    onClick={() => setPreviewTemplate(template)}>
                    <Eye className="h-4 w-4" />Preview
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 flex-1"
                    onClick={() => {
                      setEditingTemplate(template);
                      form.reset({ name: template.name, html_template: template.html_template, color_theme: template.color_theme });
                    }}>
                    <Edit className="h-4 w-4" />Edit
                  </Button>
                  <Button size="sm" variant="ghost"
                    onClick={() => setDeleteTarget(template)}
                    disabled={deleteMutation.isPending}
                    className="text-destructive hover:text-destructive/80 p-0 w-10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No templates created yet</p>
            <Button onClick={() => setIsCreating(true)}>Create Your First Template</Button>
          </CardContent>
        </Card>
      )}

      {/* ── Preview Dialog (with student selector) ── */}
      <TemplatePreviewDialog
        template={previewTemplate}
        onClose={() => setPreviewTemplate(null)}
      />

      {/* ── Delete Confirm Dialog ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Template?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</>
                : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

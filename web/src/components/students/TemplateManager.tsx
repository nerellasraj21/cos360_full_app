// src/components/students/TemplateManager.tsx
// Manage certificate templates (Create/Edit/Delete)

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Plus, Eye, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useIssuableCertificateTemplates,
  useCreateIssuableCertificateTemplate,
  useUpdateIssuableCertificateTemplate,
  useDeleteIssuableCertificateTemplate,
} from "@/api/hooks/students/useIssuableCertificates";
import type { IssuableCertificateTemplate } from "@/types/certificates/issuable";

// Validation schema
const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  html_template: z.string().min(1, "HTML template is required"),
  color_theme: z.enum(["blue", "green", "red", "orange"]),
});

type TemplateFormData = z.infer<typeof templateSchema>;

export function TemplateManager() {
  // State
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<IssuableCertificateTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewTemplate, setPreviewTemplate] =
    useState<IssuableCertificateTemplate | null>(null);

  // Hooks
  const { data: templates, isLoading } = useIssuableCertificateTemplates();
  const createMutation = useCreateIssuableCertificateTemplate();
  const updateMutation = useUpdateIssuableCertificateTemplate();
  const deleteMutation = useDeleteIssuableCertificateTemplate();

  // Form setup
  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: editingTemplate?.name || "",
      html_template: editingTemplate?.html_template || "",
      color_theme: editingTemplate?.color_theme || "blue",
    },
  });

  // Handle form submit
  const handleSubmit = async (data: TemplateFormData) => {
    if (editingTemplate) {
      await updateMutation.mutateAsync({
        templateId: editingTemplate.id,
        data,
      });
    } else {
      await createMutation.mutateAsync(data);
    }

    form.reset();
    setIsCreating(false);
    setEditingTemplate(null);
  };

  // Handle delete
  const handleDelete = async (templateId: string) => {
    if (
      window.confirm(
        "Are you sure you want to delete this template? This cannot be undone."
      )
    ) {
      await deleteMutation.mutateAsync(templateId);
    }
  };

  // ============================================================================
  // CREATE/EDIT MODE
  // ============================================================================
  if (isCreating || editingTemplate) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {editingTemplate ? "Edit Template" : "Create New Template"}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsCreating(false);
              setEditingTemplate(null);
              form.reset();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            {/* Template Name */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Template Name *
              </label>
              <input
                type="text"
                placeholder="e.g., Bonafide Certificate"
                {...form.register("name")}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {form.formState.errors.name && (
                <p className="text-red-500 text-sm mt-1">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            {/* Color Theme */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Color Theme
              </label>
              <div className="flex gap-2">
                {(["blue", "green", "red", "orange"] as const).map((theme) => (
                  <label
                    key={theme}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      value={theme}
                      {...form.register("color_theme")}
                      className="h-4 w-4"
                    />
                    <span className="text-sm capitalize">{theme}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* HTML Template */}
            <div>
              <label className="block text-sm font-medium mb-2">
                HTML Template *
              </label>
              <p className="text-xs text-gray-600 mb-2">
                Use placeholders like{" "}
                <code className="bg-gray-200 px-2 py-1 rounded text-xs">
                  {"{"}
                  {"{"}student_name{"}"}{"}"}
                </code>{" "}
                for dynamic fields
              </p>
              <textarea
                placeholder="<h1>CERTIFICATE</h1>..."
                {...form.register("html_template")}
                rows={15}
                className="w-full px-3 py-2 border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {form.formState.errors.html_template && (
                <p className="text-red-500 text-sm mt-1">
                  {form.formState.errors.html_template.message}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={
                  createMutation.isPending || updateMutation.isPending
                }
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  `${editingTemplate ? "Update" : "Create"} Template`
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreating(false);
                  setEditingTemplate(null);
                  form.reset();
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  // ============================================================================
  // LIST MODE
  // ============================================================================
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Certificate Templates</h2>
        <Button onClick={() => setIsCreating(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Template
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading templates...</span>
          </CardContent>
        </Card>
      ) : templates && templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template: IssuableCertificateTemplate) => (
            <Card key={template.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-base">{template.name}</CardTitle>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {template.color_theme}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col gap-3">
                <div className="text-xs text-gray-600">
                  <p>
                    Created:{" "}
                    {new Date(template.created_at).toLocaleDateString()}
                  </p>
                  <p className="mt-1">
                    Status:{" "}
                    <Badge variant={template.is_active ? "default" : "secondary"}>
                      {template.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </p>
                </div>

                <div className="flex gap-2 mt-auto pt-3 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setPreviewTemplate(template);
                      setShowPreview(true);
                    }}
                    className="gap-2 flex-1"
                  >
                    <Eye className="h-4 w-4" />
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingTemplate(template);
                      form.reset({
                        name: template.name,
                        html_template: template.html_template,
                        color_theme: template.color_theme,
                      });
                    }}
                    className="gap-2 flex-1"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(template.id)}
                    disabled={deleteMutation.isPending}
                    className="text-destructive hover:text-destructive/80 p-0 w-10"
                  >
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
            <p className="text-gray-600 mb-4">No templates created yet</p>
            <Button onClick={() => setIsCreating(true)}>
              Create Your First Template
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Preview Modal */}
      {showPreview && previewTemplate && (
        <Card className="fixed inset-4 z-50 max-w-4xl mx-auto flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{previewTemplate.name} - Preview</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            <div
              className="border rounded-lg p-4 bg-white"
              dangerouslySetInnerHTML={{ __html: previewTemplate.html_template }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

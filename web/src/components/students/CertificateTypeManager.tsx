import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Plus, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select as SelectComponent, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  useCertificateTypes,
  useCertificateTypesDropdown,
  useCreateCertificateType,
  useUpdateCertificateType,
  useDeleteCertificateType
} from '@/api/certificateTypes';
import type { CertificateTypeRead, CertificateTypeCreate, CertificateTypeUpdate, CertificateTypeDropdown } from '@/types/certificates/types';
import { toast } from 'sonner';

interface CertificateTypeManagerProps {
  onSelect?: (certificateType: CertificateTypeRead) => void;
  className?: string;
}

interface CertificateTypeFormData extends CertificateTypeCreate {}

export const CertificateTypeManager: React.FC<CertificateTypeManagerProps> = ({ onSelect, className }) => {
  const [editingCertificateType, setEditingCertificateType] = useState<CertificateTypeRead | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<CertificateTypeRead | null>(null);
  const [formData, setFormData] = useState<CertificateTypeFormData>({
    name: '',
    description: ''
  });

  const { data: certificateTypesResponse, isLoading } = useCertificateTypes({ skip: 0, limit: 100 });
  const { data: dropdownOptions } = useCertificateTypesDropdown();

  const certificateTypes: CertificateTypeRead[] = certificateTypesResponse?.items || [];

  const createMutation = useCreateCertificateType();
  const updateMutation = useUpdateCertificateType();
  const deleteMutation = useDeleteCertificateType();

  const handleCreate = () => {
    setFormData({
      name: '',
      description: ''
    });
    setEditingCertificateType(null);
    setShowCreateDialog(true);
  };

  const handleEdit = (certificateType: CertificateTypeRead) => {
    setFormData({
      name: certificateType.name,
      description: certificateType.description || ''
    });
    setEditingCertificateType(certificateType);
    setShowCreateDialog(true);
  };

  const handleDelete = (certificateType: CertificateTypeRead) => {
    setShowDeleteDialog(certificateType);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Certificate type name is required');
      return;
    }

    try {
      if (editingCertificateType) {
        await updateMutation.mutateAsync({
          id: editingCertificateType.id,
          input: formData
        });
      } else {
        await createMutation.mutateAsync(formData);
      }
      setShowCreateDialog(false);
      setEditingCertificateType(null);
    } catch (error) {
      // Error handling is done in the mutation hooks
    }
  };

  const handleConfirmDelete = async () => {
    if (showDeleteDialog) {
      try {
        await deleteMutation.mutateAsync(showDeleteDialog.id);
        setShowDeleteDialog(null);
      } catch (error) {
        // Error handling is done in the mutation hook
      }
    }
  };

  if (isLoading) {
    return (
      <div className={cn("p-6", className)}>
        <div className="text-center text-muted-foreground">Loading certificate types...</div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Certificate Types</h2>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Certificate Type
        </Button>
      </div>

      {/* Certificate Types Table */}
      {certificateTypes.length > 0 ? (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {certificateTypes.map((certificateType) => (
                  <tr key={certificateType.id} className="hover:bg-accent/50">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span>{certificateType.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {certificateType.description || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-1">
                        {onSelect && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onSelect(certificateType)}
                            className="h-8 w-8 p-0"
                            title="Select Certificate Type"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(certificateType)}
                          className="h-8 w-8 p-0"
                          title="Edit Certificate Type"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(certificateType)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive/80"
                          title="Delete Certificate Type"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground bg-card border border-border rounded-lg">
          <p>No certificate types found.</p>
          <Button onClick={handleCreate} className="mt-4">
            Create First Certificate Type
          </Button>
        </div>
      )}

      {/* Dropdown Preview */}
      {dropdownOptions && dropdownOptions.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium text-foreground mb-2">Dropdown Preview</h3>
          <SelectComponent>
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue placeholder="Select certificate type" />
            </SelectTrigger>
            <SelectContent>
              {dropdownOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </SelectComponent>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCertificateType ? 'Edit Certificate Type' : 'Create Certificate Type'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
                Name *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter certificate type name"
                maxLength={100}
              />
            </div>
            <div>
              <Label htmlFor="description" className="block text-sm font-medium text-foreground mb-1">
                Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter description (optional)"
                maxLength={255}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Certificate Type</DialogTitle>
          </DialogHeader>

          <p className="text-muted-foreground">
            Are you sure you want to delete the certificate type "{showDeleteDialog?.name}"?
            This action cannot be undone and may affect existing student certificates.
          </p>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
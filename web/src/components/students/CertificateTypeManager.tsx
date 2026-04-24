import React, { useState, useMemo } from 'react';
import { Edit, Trash2, Plus, FileText, Loader2, Filter, Search, X, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  useCertificateTypes,
  useCreateCertificateType,
  useUpdateCertificateType,
  useDeleteCertificateType
} from '@/api/certificateTypes';
import type { CertificateTypeRead, CertificateTypeCreate } from '@/types/certificates/types';
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
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<'name' | 'description' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const { data: certificateTypesResponse, isLoading } = useCertificateTypes({ skip: 0, limit: 100 });

  const certificateTypes: CertificateTypeRead[] = certificateTypesResponse?.items || [];

  const createMutation = useCreateCertificateType();
  const updateMutation = useUpdateCertificateType();
  const deleteMutation = useDeleteCertificateType();

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ col }: { col: typeof sortKey }) => {
    if (sortKey !== col) return <ChevronsUpDown className="ml-1 inline h-3 w-3 opacity-50" />;
    return sortDir === 'asc'
      ? <ChevronUp className="ml-1 inline h-3 w-3" />
      : <ChevronDown className="ml-1 inline h-3 w-3" />;
  };

  const filteredTypes = useMemo(() => {
    const q = searchQuery.toLowerCase();
    let result = certificateTypes.filter(ct =>
      ct.name.toLowerCase().includes(q) ||
      (ct.description ?? '').toLowerCase().includes(q)
    );
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const av = String((a as any)[sortKey] ?? '');
        const bv = String((b as any)[sortKey] ?? '');
        const cmp = av.localeCompare(bv);
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  }, [certificateTypes, searchQuery, sortKey, sortDir]);

  const handleCreate = () => {
    setFormData({ name: '', description: '' });
    setEditingCertificateType(null);
    setIsFormDirty(false);
    setShowCreateDialog(true);
  };

  const handleEdit = (certificateType: CertificateTypeRead) => {
    setFormData({
      name: certificateType.name,
      description: certificateType.description || ''
    });
    setEditingCertificateType(certificateType);
    setIsFormDirty(false);
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
      setIsFormDirty(false);
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
      <div className={cn('flex items-center justify-center py-16', className)}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading certificate types...</span>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Filter Bar */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-muted-foreground">Filters</span>
          {searchQuery && (
            <span className="text-xs text-muted-foreground">
              {filteredTypes.length} of {certificateTypes.length}
            </span>
          )}
          <Button onClick={handleCreate} className="ml-auto flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Certificate Type
          </Button>
        </div>
        <div className="relative max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search name or description..."
            className="pl-8 pr-8 h-9 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Certificate Types Table */}
      {certificateTypes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground bg-card border border-border rounded-lg">
          <p>No certificate types found.</p>
          <Button onClick={handleCreate} className="mt-4">
            Create First Certificate Type
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium w-12">S.No.</th>
                <th
                  className="px-4 py-3 text-left font-medium cursor-pointer select-none"
                  onClick={() => handleSort('name')}
                >
                  Name <SortIcon col="name" />
                </th>
                <th
                  className="px-4 py-3 text-left font-medium cursor-pointer select-none"
                  onClick={() => handleSort('description')}
                >
                  Description <SortIcon col="description" />
                </th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTypes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    No certificate types match your search.
                  </td>
                </tr>
              ) : (
                filteredTypes.map((certificateType, idx) => (
                  <tr
                    key={certificateType.id}
                    className="border-b transition-colors hover:bg-muted/20 last:border-0"
                    style={{ height: '48px' }}
                  >
                    <td className="px-4 py-3 text-muted-foreground text-sm">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span>{certificateType.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {certificateType.description || '—'}
                    </td>
                    <td className="px-4 py-3">
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
                          <Edit className="h-4 w-4" />
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
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog} guardDirty={isFormDirty} onDirtyDiscard={() => setIsFormDirty(false)}>
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
                onChange={(e) => { setFormData({ ...formData, name: e.target.value }); setIsFormDirty(true); }}
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
                onChange={(e) => { setFormData({ ...formData, description: e.target.value }); setIsFormDirty(true); }}
                placeholder="Enter description (optional)"
                maxLength={255}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save
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
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

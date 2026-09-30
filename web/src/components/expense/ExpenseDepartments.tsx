import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, Search, Loader2, Filter, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import {
  useExpenseDepartments,
  useCreateExpenseDepartment,
  useUpdateExpenseDepartment,
  useDeleteExpenseDepartment,
} from '@/hooks/expense';
import { validateDepartmentForm } from '@/lib/expenseValidation';
import type { ExpenseDepartment, ExpenseDepartmentCreate } from '@/types/expense';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { usePermission } from '@/hooks/usePermission';

export function ExpenseDepartments() {
  const { checkPermission } = usePermission();
  const canCreate = checkPermission('expense_departments', 'create');
  const canUpdate = checkPermission('expense_departments', 'update');
  const canDelete = checkPermission('expense_departments', 'delete');
  const hasAnyAction = canUpdate || canDelete;

  const [showDialog, setShowDialog] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<ExpenseDepartment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExpenseDepartment | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null);
  const [formData, setFormData] = useState<ExpenseDepartmentCreate>({ name: '', description: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: departmentsResponse, isLoading } = useExpenseDepartments();
  const createMutation = useCreateExpenseDepartment();
  const updateMutation = useUpdateExpenseDepartment();
  const deleteMutation = useDeleteExpenseDepartment();

  const departments = useMemo(() => departmentsResponse || [], [departmentsResponse]);

  const filteredDepartments = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return departments.filter(department =>
      department.name.toLowerCase().includes(q) ||
      (department.description ?? '').toLowerCase().includes(q)
    );
  }, [departments, searchQuery]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else if (sortDir === 'desc') { setSortKey(null); setSortDir(null); }
      else setSortDir('asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return <ChevronsUpDown className="h-3 w-3 ml-1 opacity-75 shrink-0 inline" />;
    if (sortDir === 'asc') return <ChevronUp className="h-3 w-3 ml-1 shrink-0 inline" />;
    return <ChevronDown className="h-3 w-3 ml-1 shrink-0 inline" />;
  };

  const sortedDepartments = useMemo(() => {
    const data = [...filteredDepartments];
    if (!sortKey || !sortDir) return data;
    return data.sort((a, b) => {
      let aVal = '';
      let bVal = '';
      switch (sortKey) {
        case 'name': aVal = a.name; bVal = b.name; break;
        case 'status': aVal = String(a.is_active); bVal = String(b.is_active); break;
        case 'created_at': aVal = a.created_at || ''; bVal = b.created_at || ''; break;
      }
      const cmp = aVal.localeCompare(bVal, undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredDepartments, sortKey, sortDir]);

  const handleCreate = () => {
    setFormData({ name: '', description: '' });
    setEditingDepartment(null);
    setErrors({});
    setIsFormDirty(false);
    setShowDialog(true);
  };

  const handleEdit = (department: ExpenseDepartment) => {
    setFormData({ name: department.name, description: department.description || '' });
    setEditingDepartment(department);
    setErrors({});
    setIsFormDirty(false);
    setShowDialog(true);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
    }
  };

  const closeDialog = () => {
    setIsFormDirty(false);
    setShowDialog(false);
    setEditingDepartment(null);
  };

  const handleSubmit = () => {
    const validationErrors = validateDepartmentForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const payload: ExpenseDepartmentCreate = {
      name: formData.name.trim(),
      ...(formData.description?.trim() ? { description: formData.description.trim() } : {}),
    };

    if (editingDepartment) {
      updateMutation.mutate(
        { id: editingDepartment.id, data: { name: payload.name, description: formData.description?.trim() ?? '' } },
        { onSuccess: closeDialog }
      );
    } else {
      createMutation.mutate(payload, { onSuccess: closeDialog });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setIsFormDirty(true);
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl font-bold">Expense Departments</CardTitle>
          {canCreate && (
            <Button onClick={handleCreate} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Department
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 mb-3">
          <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            <span>Filters</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search departments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-xs text-muted-foreground">S.No.</TableHead>
              <TableHead className="cursor-pointer select-none hover:bg-muted/80" onClick={() => handleSort('name')}>
                <div className="flex items-center">Name<SortIcon col="name" /></div>
              </TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="cursor-pointer select-none hover:bg-muted/80" onClick={() => handleSort('status')}>
                <div className="flex items-center">Status<SortIcon col="status" /></div>
              </TableHead>
              <TableHead className="cursor-pointer select-none hover:bg-muted/80" onClick={() => handleSort('created_at')}>
                <div className="flex items-center">Created<SortIcon col="created_at" /></div>
              </TableHead>
              {hasAnyAction && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="ml-2">Loading departments...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : sortedDepartments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {searchQuery ? 'No departments match your search' : 'No departments found'}
                </TableCell>
              </TableRow>
            ) : (
              sortedDepartments.map((department, index) => (
                <TableRow key={department.id} style={{ height: '48px' }}>
                  <TableCell className="text-muted-foreground text-sm">{index + 1}</TableCell>
                  <TableCell className="font-medium">{department.name}</TableCell>
                  <TableCell>{department.description || '-'}</TableCell>
                  <TableCell>
                    <StatusBadge status={department.is_active} />
                  </TableCell>
                  <TableCell>{new Date(department.created_at).toLocaleDateString()}</TableCell>
                  {hasAnyAction && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {canUpdate && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(department)}
                            className="h-8 w-8 p-0"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteTarget(department)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive/80"
                            title="Deactivate"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={showDialog} onOpenChange={setShowDialog} guardDirty={isFormDirty} onDirtyDiscard={() => setIsFormDirty(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingDepartment ? 'Edit Department' : 'Create Department'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="department-name">Name *</Label>
              <Input
                id="department-name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter department name"
                maxLength={100}
              />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
            </div>

            <div>
              <Label htmlFor="department-description">Description</Label>
              <Textarea
                id="department-description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter department description"
                maxLength={300}
                rows={3}
              />
              {errors.description && <p className="text-sm text-destructive mt-1">{errors.description}</p>}
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Deactivate Department"
        description={`Deactivate "${deleteTarget?.name}"? It will no longer be offered for new expenses; existing expenses keep it.`}
        confirmLabel="Deactivate"
        onConfirm={confirmDelete}
        isPending={deleteMutation.isPending}
      />
    </Card>
  );
}

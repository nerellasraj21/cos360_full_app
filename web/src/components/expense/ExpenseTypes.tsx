
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, Search, Loader2, Filter, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { useExpenseTypes, useExpenseCategoryDropdown, useCreateExpenseType, useUpdateExpenseType, useDeleteExpenseType } from '@/hooks/expense';
import { validateTypeForm } from '@/lib/expenseValidation';
import { handleExpenseApiError } from '@/lib/expenseErrorHandler';
import type { ExpenseType, ExpenseTypeCreate } from '@/types/expense';
import { PermissionGuard } from '@/components/PermissionGuard';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

export function ExpenseTypes() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [editingType, setEditingType] = useState<ExpenseType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExpenseType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null);
  const [formData, setFormData] = useState<ExpenseTypeCreate>({
    name: '',
    category_id: '',
    description: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: typesResponse, isLoading } = useExpenseTypes({
    category_id: categoryFilter || undefined
  });
  const { data: categories = [] } = useExpenseCategoryDropdown();
  const createMutation = useCreateExpenseType();
  const updateMutation = useUpdateExpenseType();
  const deleteMutation = useDeleteExpenseType();

  const types = typesResponse || [];

  const filteredTypes = useMemo(() => types.filter(type =>
    type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    type.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ), [types, searchQuery]);

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'Unknown';
  };

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
    if (sortKey !== col) return <ChevronsUpDown className="h-3 w-3 ml-1 opacity-40 shrink-0 inline" />;
    if (sortDir === 'asc') return <ChevronUp className="h-3 w-3 ml-1 shrink-0 inline" />;
    return <ChevronDown className="h-3 w-3 ml-1 shrink-0 inline" />;
  };

  const sortedTypes = useMemo(() => {
    const data = [...filteredTypes];
    if (!sortKey || !sortDir) return data;
    return data.sort((a, b) => {
      let aVal = '';
      let bVal = '';
      switch (sortKey) {
        case 'name': aVal = a.name; bVal = b.name; break;
        case 'category': aVal = getCategoryName(a.category_id); bVal = getCategoryName(b.category_id); break;
        case 'status': aVal = String(a.is_active); bVal = String(b.is_active); break;
        case 'created_at': aVal = a.created_at || ''; bVal = b.created_at || ''; break;
      }
      const cmp = aVal.localeCompare(bVal, undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredTypes, sortKey, sortDir, categories]);

  const handleCreate = () => {
    setFormData({ name: '', category_id: '', description: '' });
    setEditingType(null);
    setErrors({});
    setIsFormDirty(false);
    setShowCreateDialog(true);
  };

  const handleEdit = (type: ExpenseType) => {
    setFormData({
      name: type.name,
      category_id: type.category_id,
      description: type.description || ''
    });
    setEditingType(type);
    setErrors({});
    setIsFormDirty(false);
    setShowCreateDialog(true);
  };

  const handleDelete = (type: ExpenseType) => {
    setDeleteTarget(type);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const handleSubmit = async () => {
    const validationErrors = validateTypeForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      if (editingType) {
        await updateMutation.mutateAsync({
          id: editingType.id,
          data: formData
        });
      } else {
        await createMutation.mutateAsync(formData);
      }
      setIsFormDirty(false);
      setShowCreateDialog(false);
      setEditingType(null);
    } catch (error) {
      handleExpenseApiError(error);
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

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl font-bold">Expense Types</CardTitle>
          <PermissionGuard resource="expense_types" action="create" fallback={null}>
            <Button onClick={handleCreate} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Type
            </Button>
          </PermissionGuard>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filter bar */}
        <div className="flex flex-col gap-2 mb-3">
          <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            <span>Filters</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search types..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48 h-8 text-sm">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-xs text-muted-foreground">S.No.</TableHead>
              <TableHead className="cursor-pointer select-none hover:bg-muted/80" onClick={() => handleSort('name')}>
                <div className="flex items-center">Name<SortIcon col="name" /></div>
              </TableHead>
              <TableHead className="cursor-pointer select-none hover:bg-muted/80" onClick={() => handleSort('category')}>
                <div className="flex items-center">Category<SortIcon col="category" /></div>
              </TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="cursor-pointer select-none hover:bg-muted/80" onClick={() => handleSort('status')}>
                <div className="flex items-center">Status<SortIcon col="status" /></div>
              </TableHead>
              <TableHead className="cursor-pointer select-none hover:bg-muted/80" onClick={() => handleSort('created_at')}>
                <div className="flex items-center">Created<SortIcon col="created_at" /></div>
              </TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="ml-2">Loading expense types...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : sortedTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No expense types found
                </TableCell>
              </TableRow>
            ) : (
              sortedTypes.map((type, index) => (
                <TableRow key={type.id} style={{ height: '48px' }}>
                  <TableCell className="text-muted-foreground text-sm">{index + 1}</TableCell>
                  <TableCell className="font-medium">{type.name}</TableCell>
                  <TableCell>{getCategoryName(type.category_id)}</TableCell>
                  <TableCell>{type.description || '-'}</TableCell>
                  <TableCell>
                    <StatusBadge status={type.is_active} />
                  </TableCell>
                  <TableCell>
                    {new Date(type.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <PermissionGuard resource="expense_types" action="update" fallback={null}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(type)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </PermissionGuard>
                      <PermissionGuard resource="expense_types" action="delete" fallback={null}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(type)}
                          className="h-8 w-8 p-0 text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </PermissionGuard>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog} guardDirty={isFormDirty} onDirtyDiscard={() => setIsFormDirty(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingType ? 'Edit Expense Type' : 'Create Expense Type'}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Expense types must be linked to categories for proper classification
            </p>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter type name"
                maxLength={100}
              />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="category_id">Category *</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => handleInputChange('category_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category_id && (
                <p className="text-sm text-destructive mt-1">{errors.category_id}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter type description"
                maxLength={500}
                rows={3}
              />
              {errors.description && (
                <p className="text-sm text-destructive mt-1">{errors.description}</p>
              )}
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
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete Expense Type"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This may affect existing transactions.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        isPending={deleteMutation.isPending}
      />
    </Card>
  );
}


import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, Search, Loader2, Filter, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { useExpenseCategories, useCreateExpenseCategory, useUpdateExpenseCategory, useDeleteExpenseCategory } from '@/hooks/expense';
import { validateCategoryForm } from '@/lib/expenseValidation';
import { handleExpenseApiError } from '@/lib/expenseErrorHandler';
import type { ExpenseCategory, ExpenseCategoryCreate } from '@/types/expense';

export function ExpenseCategories() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null);
  const [formData, setFormData] = useState<ExpenseCategoryCreate>({
    name: '',
    description: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: categoriesResponse, isLoading } = useExpenseCategories();
  const createMutation = useCreateExpenseCategory();
  const updateMutation = useUpdateExpenseCategory();
  const deleteMutation = useDeleteExpenseCategory();

  const categories = categoriesResponse || [];

  const filteredCategories = useMemo(() => categories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ), [categories, searchQuery]);

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

  const sortedCategories = useMemo(() => {
    const data = [...filteredCategories];
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
  }, [filteredCategories, sortKey, sortDir]);

  const handleCreate = () => {
    setFormData({ name: '', description: '' });
    setEditingCategory(null);
    setErrors({});
    setIsFormDirty(false);
    setShowCreateDialog(true);
  };

  const handleEdit = (category: ExpenseCategory) => {
    setFormData({
      name: category.name,
      description: category.description || ''
    });
    setEditingCategory(category);
    setErrors({});
    setIsFormDirty(false);
    setShowCreateDialog(true);
  };

  const handleDelete = (category: ExpenseCategory) => {
    if (confirm(`Are you sure you want to delete the category "${category.name}"? This may affect existing expense types.`)) {
      deleteMutation.mutate(category.id);
    }
  };

  const handleSubmit = async () => {
    const validationErrors = validateCategoryForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      if (editingCategory) {
        await updateMutation.mutateAsync({
          id: editingCategory.id,
          data: formData
        });
      } else {
        await createMutation.mutateAsync(formData);
      }
      setIsFormDirty(false);
      setShowCreateDialog(false);
      setEditingCategory(null);
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
          <CardTitle className="text-2xl font-bold">Expense Categories</CardTitle>
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Category
          </Button>
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
                placeholder="Search categories..."
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
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="ml-2">Loading categories...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : sortedCategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No categories found
                </TableCell>
              </TableRow>
            ) : (
              sortedCategories.map((category, index) => (
                <TableRow key={category.id} style={{ height: '48px' }}>
                  <TableCell className="text-muted-foreground text-sm">{index + 1}</TableCell>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>{category.description || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={category.is_active ? 'default' : 'secondary'}>
                      {category.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(category.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(category)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(category)}
                        className="h-8 w-8 p-0 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
              {editingCategory ? 'Edit Category' : 'Create Category'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter category name"
                maxLength={100}
              />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter category description"
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
    </Card>
  );
}

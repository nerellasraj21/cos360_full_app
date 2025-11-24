
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, Search, Loader2 } from 'lucide-react';
import { useExpenseTypes, useExpenseCategoryDropdown, useCreateExpenseType, useUpdateExpenseType, useDeleteExpenseType } from '@/hooks/expense';
import { validateTypeForm } from '@/lib/expenseValidation';
import { handleExpenseApiError } from '@/lib/expenseErrorHandler';
import type { ExpenseType, ExpenseTypeCreate, ExpenseTypeUpdate } from '@/types/expense';
import { PermissionGuard } from '@/components/PermissionGuard';

export function ExpenseTypes() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingType, setEditingType] = useState<ExpenseType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
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

  const filteredTypes = types.filter(type =>
    type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    type.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'Unknown';
  };

  const handleCreate = () => {
    setFormData({ name: '', category_id: '', description: '' });
    setEditingType(null);
    setErrors({});
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
    setShowCreateDialog(true);
  };

  const handleDelete = (type: ExpenseType) => {
    if (confirm(`Are you sure you want to delete the expense type "${type.name}"? This may affect existing transactions.`)) {
      deleteMutation.mutate(type.id);
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
      setShowCreateDialog(false);
      setEditingType(null);
    } catch (error) {
      handleExpenseApiError(error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Expense Types</h2>
          <p className="text-muted-foreground">Manage specific expense classifications within categories</p>
          <p className="text-xs text-muted-foreground mt-1">
            Each expense type must be linked to a category for proper organization
          </p>
        </div>
        <PermissionGuard
          resource="expense_types"
          action="create"
          fallback={null}
        >
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Type
          </Button>
        </PermissionGuard>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search types..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48">
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
        </CardContent>
      </Card>

      {/* Types Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex justify-center items-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <span className="ml-2">Loading expense types...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredTypes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No expense types found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTypes.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell className="font-medium">{type.name}</TableCell>
                    <TableCell>{getCategoryName(type.category_id)}</TableCell>
                    <TableCell>{type.description || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={type.is_active ? 'default' : 'secondary'}>
                        {type.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(type.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <PermissionGuard
                          resource="expense_types"
                          action="update"
                          fallback={null}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(type)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </PermissionGuard>
                        <PermissionGuard
                          resource="expense_types"
                          action="delete"
                          fallback={null}
                        >
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
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
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
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
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
    </div>
  );
}
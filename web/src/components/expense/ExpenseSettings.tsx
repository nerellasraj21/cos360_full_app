
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Settings, Shield, Workflow, Bell, Database } from 'lucide-react';
import { useExpenseSettings, useExpenseCommonSettings, useCreateExpenseSetting, useUpdateExpenseSetting, useDeleteExpenseSetting } from '@/hooks/expense';
import { handleExpenseApiError } from '@/lib/expenseErrorHandler';
import type { ExpenseSettings, ExpenseSettingsCreate, ExpenseSettingsUpdate } from '@/types/expense';
import { PermissionGuard } from '@/components/PermissionGuard';

export function ExpenseSettings() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingSetting, setEditingSetting] = useState<ExpenseSettings | null>(null);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [formData, setFormData] = useState<ExpenseSettingsCreate>({
    setting_key: '',
    setting_name: '',
    setting_description: '',
    setting_category: 'approval',
    string_value: '',
    numeric_value: undefined,
    integer_value: undefined,
    boolean_value: undefined,
    json_value: undefined,
    department_id: undefined,
    applies_to_all_departments: true,
    default_value: '',
    is_system_setting: false,
    is_user_configurable: true,
    validation_rules: undefined,
    allowed_values: undefined,
    requires_approval: false,
    approval_threshold: undefined,
    is_audit_required: false,
    is_sensitive: false,
    compliance_level: 'standard',
    effective_from: undefined,
    effective_until: undefined
  });

  const { data: settings = [], isLoading } = useExpenseSettings({
    category: categoryFilter || undefined
  });
  const { data: commonSettings } = useExpenseCommonSettings();
  const createMutation = useCreateExpenseSetting();
  const updateMutation = useUpdateExpenseSetting();
  const deleteMutation = useDeleteExpenseSetting();

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'approval': return Shield;
      case 'workflow': return Workflow;
      case 'security': return Shield;
      case 'compliance': return Database;
      case 'notification': return Bell;
      case 'integration': return Settings;
      default: return Settings;
    }
  };

  const getComplianceBadgeVariant = (level: string) => {
    switch (level) {
      case 'critical': return 'destructive';
      case 'high': return 'secondary';
      case 'standard': return 'default';
      default: return 'outline';
    }
  };

  const handleCreate = () => {
    setFormData({
      setting_key: '',
      setting_name: '',
      setting_description: '',
      setting_category: 'approval',
      string_value: '',
      numeric_value: undefined,
      integer_value: undefined,
      boolean_value: undefined,
      json_value: undefined,
      department_id: undefined,
      applies_to_all_departments: true,
      default_value: '',
      is_system_setting: false,
      is_user_configurable: true,
      validation_rules: undefined,
      allowed_values: undefined,
      requires_approval: false,
      approval_threshold: undefined,
      is_audit_required: false,
      is_sensitive: false,
      compliance_level: 'standard',
      effective_from: undefined,
      effective_until: undefined
    });
    setEditingSetting(null);
    setIsFormDirty(false);
    setShowCreateDialog(true);
  };

  const handleEdit = (setting: ExpenseSettings) => {
    setFormData({
      setting_key: setting.setting_key,
      setting_name: setting.setting_name,
      setting_description: setting.setting_description || '',
      setting_category: setting.setting_category,
      string_value: setting.string_value || '',
      numeric_value: setting.numeric_value,
      integer_value: setting.integer_value,
      boolean_value: setting.boolean_value,
      json_value: setting.json_value,
      department_id: setting.department_id || '',
      applies_to_all_departments: setting.applies_to_all_departments,
      default_value: setting.default_value || '',
      is_system_setting: setting.is_system_setting,
      is_user_configurable: setting.is_user_configurable,
      validation_rules: setting.validation_rules,
      allowed_values: setting.allowed_values,
      requires_approval: setting.requires_approval,
      approval_threshold: setting.approval_threshold,
      is_audit_required: setting.is_audit_required,
      is_sensitive: setting.is_sensitive,
      compliance_level: setting.compliance_level,
      effective_from: setting.effective_from,
      effective_until: setting.effective_until
    });
    setEditingSetting(setting);
    setIsFormDirty(false);
    setShowCreateDialog(true);
  };

  const handleDelete = (setting: ExpenseSettings) => {
    if (confirm(`Are you sure you want to delete the setting "${setting.setting_name}"?`)) {
      deleteMutation.mutate(setting.id);
    }
  };

  const handleSubmit = async () => {
    try {
      // Prepare data for submission - omit department_id if null/undefined/empty
      const submitData = { ...formData };
      if (submitData.department_id === null || submitData.department_id === undefined || submitData.department_id === '') {
        delete submitData.department_id;
      }

      if (editingSetting) {
        await updateMutation.mutateAsync({
          id: editingSetting.id,
          data: submitData
        });
      } else {
        await createMutation.mutateAsync(submitData);
      }
      setIsFormDirty(false);
      setShowCreateDialog(false);
      setEditingSetting(null);
    } catch (error) {
      handleExpenseApiError(error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Expense Settings</h2>
          <p className="text-muted-foreground">Configure expense management settings and policies</p>
        </div>
        <PermissionGuard
          resource="expense_settings"
          action="create"
          fallback={null}
        >
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Setting
          </Button>
        </PermissionGuard>
      </div>

      {/* Common Settings Overview */}
      {commonSettings && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Approval Workflow</p>
                  <Badge variant={commonSettings.approval_workflow_enabled ? 'default' : 'secondary'}>
                    {commonSettings.approval_workflow_enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Attachment Required</p>
                  <Badge variant={commonSettings.attachment_required ? 'default' : 'secondary'}>
                    {commonSettings.attachment_required ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Notifications</p>
                  <Badge variant={commonSettings.notification_enabled ? 'default' : 'secondary'}>
                    {commonSettings.notification_enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="category_filter">Filter by Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  <SelectItem value="approval">Approval</SelectItem>
                  <SelectItem value="workflow">Workflow</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                  <SelectItem value="compliance">Compliance</SelectItem>
                  <SelectItem value="notification">Notification</SelectItem>
                  <SelectItem value="integration">Integration</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Setting</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Compliance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading settings...
                  </TableCell>
                </TableRow>
              ) : settings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No settings found
                  </TableCell>
                </TableRow>
              ) : (
                settings.map((setting) => {
                  const IconComponent = getCategoryIcon(setting.setting_category);
                  return (
                    <TableRow key={setting.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{setting.setting_name}</div>
                            <div className="text-sm text-muted-foreground">{setting.setting_key}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{setting.setting_category}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {setting.string_value || setting.numeric_value?.toString() ||
                           setting.boolean_value?.toString() || 'Not set'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getComplianceBadgeVariant(setting.compliance_level)}>
                          {setting.compliance_level}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={setting.is_active ? 'default' : 'secondary'}>
                          {setting.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <PermissionGuard
                            resource="expense_settings"
                            action="update"
                            fallback={null}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(setting)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </PermissionGuard>
                          {!setting.is_system_setting && (
                            <PermissionGuard
                              resource="expense_settings"
                              action="delete"
                              fallback={null}
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(setting)}
                                className="h-8 w-8 p-0 text-destructive"
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                            </PermissionGuard>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        guardDirty={isFormDirty}
        onDirtyDiscard={() => setIsFormDirty(false)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSetting ? 'Edit Setting' : 'Create Setting'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4" onChange={() => setIsFormDirty(true)}>
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="setting_key">Setting Key *</Label>
                <Input
                  id="setting_key"
                  value={formData.setting_key}
                  onChange={(e) => handleInputChange('setting_key', e.target.value)}
                  placeholder="unique_setting_key"
                  disabled={!!editingSetting}
                />
              </div>

              <div>
                <Label htmlFor="setting_name">Setting Name *</Label>
                <Input
                  id="setting_name"
                  value={formData.setting_name}
                  onChange={(e) => handleInputChange('setting_name', e.target.value)}
                  placeholder="Display name"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="setting_description">Description</Label>
              <Textarea
                id="setting_description"
                value={formData.setting_description}
                onChange={(e) => handleInputChange('setting_description', e.target.value)}
                placeholder="Setting description"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="setting_category">Category *</Label>
                <Select
                  value={formData.setting_category}
                  onValueChange={(value: any) => { handleInputChange('setting_category', value); setIsFormDirty(true); }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approval">Approval</SelectItem>
                    <SelectItem value="workflow">Workflow</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                    <SelectItem value="notification">Notification</SelectItem>
                    <SelectItem value="integration">Integration</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="compliance_level">Compliance Level</Label>
                <Select
                  value={formData.compliance_level}
                  onValueChange={(value: any) => { handleInputChange('compliance_level', value); setIsFormDirty(true); }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Value Fields */}
            <div className="space-y-2">
              <Label>Setting Value</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="string_value" className="text-xs">String Value</Label>
                  <Input
                    id="string_value"
                    value={formData.string_value}
                    onChange={(e) => handleInputChange('string_value', e.target.value)}
                    placeholder="Text value"
                  />
                </div>

                <div>
                  <Label htmlFor="numeric_value" className="text-xs">Numeric Value</Label>
                  <Input
                    id="numeric_value"
                    type="number"
                    step="0.01"
                    value={formData.numeric_value || ''}
                    onChange={(e) => handleInputChange('numeric_value', parseFloat(e.target.value) || undefined)}
                    placeholder="Number value"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="boolean_value"
                    checked={formData.boolean_value || false}
                    onCheckedChange={(checked) => { handleInputChange('boolean_value', checked); setIsFormDirty(true); }}
                  />
                  <Label htmlFor="boolean_value" className="text-xs">Boolean Value</Label>
                </div>
              </div>
            </div>

            {/* Configuration */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="is_user_configurable"
                  checked={formData.is_user_configurable}
                  onCheckedChange={(checked) => { handleInputChange('is_user_configurable', checked); setIsFormDirty(true); }}
                />
                <Label htmlFor="is_user_configurable" className="text-xs">User Configurable</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="requires_approval"
                  checked={formData.requires_approval}
                  onCheckedChange={(checked) => { handleInputChange('requires_approval', checked); setIsFormDirty(true); }}
                />
                <Label htmlFor="requires_approval" className="text-xs">Requires Approval</Label>
              </div>
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
    </div>
  );
}
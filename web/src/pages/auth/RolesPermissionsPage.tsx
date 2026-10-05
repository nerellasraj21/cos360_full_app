import React, { useState, useEffect } from 'react';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Plus,
  Edit,
  Trash2,
  Shield,
  Users,
  Settings,
  Grid3X3,
  CheckCircle,
  XCircle,
  AlertCircle,
  BookOpen,
  DollarSign,
  GraduationCap,
  Bus,
  UserCheck,
  Calendar,
  FileText,
  ChevronLeft,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  fetchResourcePermissions,
  fetchResourcePermissionsPaginated,
  getPermissionsByRole,
  createResourcePermission,
  updateResourcePermission,
  deleteResourcePermission,
  bulkCreatePermissions,
  getPermissionMatrix,
  getAvailableResources,
  getAvailableActions,
  fetchRoles,
  createRole,
  updateRole,
  deleteRole,
  getRoleById,
  getRolePermissions,
  updateRolePermission,
  bulkUpdateRolePermissions,
  getPermissionTemplates,
  applyPermissionTemplate,
  validateRoleDeletion,
  getTenantRoles,
  type ResourcePermission,
  type PermissionMatrix,
  type BulkPermissionRequest,
  type Role
} from '@/api/auth';

const RolesPermissionsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('roles');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState<ResourcePermission | null>(null);
  const [deletingPermission, setDeletingPermission] = useState<ResourcePermission | null>(null);

  // Mock current user role - in real app this would come from auth context
  const currentUserRole = 'admin'; // 'admin', 'teacher', 'student'

  // Permission checking functions
  const hasPermission = (resource: string, action: string): boolean => {
    // Admin has all permissions
    if (currentUserRole === 'admin') return true;

    // Teacher has read permissions on most resources
    if (currentUserRole === 'teacher' && action === 'read') return true;

    // Student has limited read permissions
    if (currentUserRole === 'student' && action === 'read' && ['academic_years', 'fee_categories'].includes(resource)) {
      return true;
    }

    return false;
  };

  const canManagePermissions = (): boolean => {
    return currentUserRole === 'admin';
  };

  const canCreateAcademicYear = (): boolean => {
    return hasPermission('academic_years', 'create');
  };

  const canCreateFeeCategory = (): boolean => {
    return hasPermission('fee_categories', 'create');
  };

  const canCreateClass = (): boolean => {
    return hasPermission('classes', 'create');
  };
  const [isAcademicYearDialogOpen, setIsAcademicYearDialogOpen] = useState(false);
  const [isFeeCategoryDialogOpen, setIsFeeCategoryDialogOpen] = useState(false);
  const [isClassDialogOpen, setIsClassDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deleteRoleTarget, setDeleteRoleTarget] = useState<string | null>(null);
  const [academicYearForm, setAcademicYearForm] = useState({
    title: '',
    start_date: '',
    end_date: '',
    is_active: true
  });
  const [feeCategoryForm, setFeeCategoryForm] = useState({
    category_name: '',
    academic_year_id: '',
    is_active: true
  });
  const [classForm, setClassForm] = useState({
    class_name: '',
    sections: [{ section_name: '' }]
  });
  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    is_active: true
  });
  const [formData, setFormData] = useState({
    role_id: '',
    resource: '',
    action: '',
    is_granted: true
  });
  const [bulkFormData, setBulkFormData] = useState<BulkPermissionRequest>({
    role_id: '',
    permissions: []
  });

  // Pagination state for permissions
  const [permissionsPage, setPermissionsPage] = useState(1);
  const [permissionsPageSize, setPermissionsPageSize] = useState(100);

  const queryClient = useQueryClient();

  // Fetch roles first
  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => fetchRoles()
  });

  const roles = Array.isArray(rolesData) ? rolesData : [];

  // Fetch permissions with pagination
  const { data: permissionsData, isLoading: pagedPermissionsLoading } = useQuery({
    queryKey: ['resource-permissions', permissionsPage, permissionsPageSize],
    queryFn: () => fetchResourcePermissionsPaginated((permissionsPage - 1) * permissionsPageSize, permissionsPageSize),
    enabled: !selectedRole
  });

  const { data: rolePermissionsData, isLoading: rolePermissionsLoading } = useQuery({
    queryKey: ['resource-permissions', 'role', selectedRole],
    queryFn: () => getPermissionsByRole(selectedRole),
    enabled: !!selectedRole
  });

  const permissionsLoading = selectedRole ? rolePermissionsLoading : pagedPermissionsLoading;

  const permissions = ((selectedRole ? rolePermissionsData : permissionsData?.items) || []).map(permission => ({
    ...permission,
    role_name: roles.find(r => r.id === permission.role_id)?.name || permission.role_id
  }));

  const totalPermissions = selectedRole ? permissions.length : (permissionsData?.total_count || 0);
  const hasNextPage = selectedRole ? false : (permissionsData?.has_next || false);

  // Fetch permission matrix
  const { data: permissionMatrix, isLoading: matrixLoading } = useQuery({
    queryKey: ['permission-matrix'],
    queryFn: () => getPermissionMatrix()
  });

  // Fetch available resources and actions
  const { data: availableResources = [] } = useQuery({
    queryKey: ['available-resources'],
    queryFn: () => getAvailableResources()
  });

  const { data: availableActions = [] } = useQuery({
    queryKey: ['available-actions'],
    queryFn: () => getAvailableActions()
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createResourcePermission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['permission-matrix'] });
      setIsCreateDialogOpen(false);
      resetForm();
      setPermissionsPage(1); // Reset to first page after creating
      toast.success('Permission created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create permission: ${error.message || 'Unknown error'}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ResourcePermission> }) =>
      updateResourcePermission(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['permission-matrix'] });
      setEditingPermission(null);
      resetForm();
      setPermissionsPage(1); // Reset to first page after updating
      toast.success('Permission updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update permission: ${error.message || 'Unknown error'}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteResourcePermission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['permission-matrix'] });
      setPermissionsPage(1); // Reset to first page after deleting
      toast.success('Permission deleted successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete permission: ${error.message || 'Unknown error'}`);
    }
  });

  const bulkCreateMutation = useMutation({
    mutationFn: bulkCreatePermissions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['permission-matrix'] });
      setIsBulkDialogOpen(false);
      setBulkFormData({ role_id: '', permissions: [] });
      setPermissionsPage(1); // Reset to first page after bulk creating
      toast.success('Permissions created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create permissions: ${error.message || 'Unknown error'}`);
    }
  });

  // Role mutations
  const createRoleMutation = useMutation({
    mutationFn: createRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['permission-matrix'] });
      setIsRoleDialogOpen(false);
      resetRoleForm();
      toast.success('Role created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create role: ${error.message || 'Unknown error'}`);
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Role> }) =>
      updateRole(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['permission-matrix'] });
      setIsRoleDialogOpen(false);
      setEditingRole(null);
      resetRoleForm();
      toast.success('Role updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update role: ${error.message || 'Unknown error'}`);
    }
  });

  const deleteRoleMutation = useMutation({
    mutationFn: deleteRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['permission-matrix'] });
      toast.success('Role deleted successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete role: ${error.message || 'Unknown error'}`);
    }
  });

  const resetForm = () => {
    setFormData({
      role_id: '',
      resource: '',
      action: '',
      is_granted: true
    });
  };

  const resetRoleForm = () => {
    setRoleForm({
      name: '',
      description: '',
      is_active: true
    });
  };

  const handleCreate = () => {
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (editingPermission) {
      updateMutation.mutate({
        id: editingPermission.id,
        data: formData
      });
    }
  };

  const handleDelete = (permission: ResourcePermission) => {
    setDeletingPermission(permission);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingPermission) {
      deleteMutation.mutate(deletingPermission.id);
      setIsDeleteDialogOpen(false);
      setDeletingPermission(null);
    }
  };

  const handleEdit = (permission: ResourcePermission) => {
    setEditingPermission(permission);
    setFormData({
      role_id: permission.role_id,
      resource: permission.resource,
      action: permission.action,
      is_granted: permission.is_granted
    });
    setIsCreateDialogOpen(true);
  };

  const handleBulkCreate = () => {
    bulkCreateMutation.mutate(bulkFormData);
  };

  const addBulkPermission = () => {
    setBulkFormData(prev => ({
      ...prev,
      permissions: [
        ...prev.permissions,
        { resource: '', action: '', is_granted: true }
      ]
    }));
  };

  const updateBulkPermission = (index: number, field: string, value: any) => {
    setBulkFormData(prev => ({
      ...prev,
      permissions: prev.permissions.map((perm, i) =>
        i === index ? { ...perm, [field]: value } : perm
      )
    }));
  };

  const removeBulkPermission = (index: number) => {
    setBulkFormData(prev => ({
      ...prev,
      permissions: prev.permissions.filter((_, i) => i !== index)
    }));
  };

  const handleCreateAcademicYear = () => {
    // Mock implementation - in real app would call API
    setIsAcademicYearDialogOpen(false);
    setAcademicYearForm({ title: '', start_date: '', end_date: '', is_active: true });
  };

  const handleCreateFeeCategory = () => {
    // Mock implementation - in real app would call API
    setIsFeeCategoryDialogOpen(false);
    setFeeCategoryForm({ category_name: '', academic_year_id: '', is_active: true });
  };

  const handleCreateClass = () => {
    // Mock implementation - in real app would call API
    setIsClassDialogOpen(false);
    setClassForm({ class_name: '', sections: [{ section_name: '' }] });
  };

  const addSection = () => {
    setClassForm(prev => ({
      ...prev,
      sections: [...prev.sections, { section_name: '' }]
    }));
  };

  const updateSection = (index: number, value: string) => {
    setClassForm(prev => ({
      ...prev,
      sections: prev.sections.map((section, i) =>
        i === index ? { section_name: value } : section
      )
    }));
  };

  const removeSection = (index: number) => {
    setClassForm(prev => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index)
    }));
  };

  const handleCreateRole = () => {
    createRoleMutation.mutate(roleForm);
  };

  const handleUpdateRole = () => {
    if (editingRole) {
      updateRoleMutation.mutate({
        id: editingRole.id,
        data: roleForm
      });
    }
  };

  const handleDeleteRole = (id: string) => {
    setDeleteRoleTarget(id);
  };

  const confirmDeleteRole = () => {
    if (deleteRoleTarget) {
      deleteRoleMutation.mutate(deleteRoleTarget);
      setDeleteRoleTarget(null);
    }
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      description: role.description || '',
      is_active: role.is_active
    });
    setIsRoleDialogOpen(true);
  };

  const getResourceIcon = (resource: string) => {
    switch (resource) {
      case 'academic_years': return <Calendar className="h-4 w-4" />;
      case 'fee_categories':
      case 'fee_types':
      case 'fee_terms': return <DollarSign className="h-4 w-4" />;
      case 'students': return <GraduationCap className="h-4 w-4" />;
      case 'classes':
      case 'sections':
      case 'subjects': return <BookOpen className="h-4 w-4" />;
      case 'transport': return <Bus className="h-4 w-4" />;
      case 'staff': return <UserCheck className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create': return 'bg-green-100 text-green-800';
      case 'read': return 'bg-blue-100 text-blue-800';
      case 'update': return 'bg-yellow-100 text-yellow-800';
      case 'delete': return 'bg-red-100 text-red-800';
      default: return 'bg-muted text-foreground';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Roles & Permissions" icon={<ShieldCheck className="h-5 w-5" />} subtitle="Manage user roles and their access permissions across the system" />
        <div className="flex gap-2">
          {canManagePermissions() && (
            <>
              <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Role
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingRole ? 'Edit Role' : 'Create Role'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingRole
                        ? 'Update the role information'
                        : 'Add a new role to the system'
                      }
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="role_name">Role Name</Label>
                      <Input
                        id="role_name"
                        value={roleForm.name}
                        onChange={(e) => setRoleForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Librarian"
                      />
                    </div>

                    <div>
                      <Label htmlFor="role_description">Description</Label>
                      <Input
                        id="role_description"
                        value={roleForm.description}
                        onChange={(e) => setRoleForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Role description (optional)"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="role_active"
                        checked={roleForm.is_active}
                        onCheckedChange={(checked) => setRoleForm(prev => ({ ...prev, is_active: checked as boolean }))}
                      />
                      <Label htmlFor="role_active">Active</Label>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => {
                        setIsRoleDialogOpen(false);
                        setEditingRole(null);
                        resetRoleForm();
                      }}>
                        Cancel
                      </Button>
                      <Button
                        onClick={editingRole ? handleUpdateRole : handleCreateRole}
                        disabled={createRoleMutation.isPending || updateRoleMutation.isPending}
                      >
                        {createRoleMutation.isPending || updateRoleMutation.isPending
                          ? 'Saving...'
                          : editingRole ? 'Update' : 'Create'
                        }
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Grid3X3 className="h-4 w-4 mr-2" />
                    Bulk Create
                  </Button>
                </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Bulk Create Permissions</DialogTitle>
                <DialogDescription>
                  Create multiple permissions for a role at once
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bulk-role">Role</Label>
                  <Select
                    value={bulkFormData.role_id}
                    onValueChange={(value) => setBulkFormData(prev => ({ ...prev, role_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {rolesLoading ? (
                        <SelectItem value="">Loading roles...</SelectItem>
                      ) : (
                        roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Permissions</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addBulkPermission}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {bulkFormData.permissions.map((perm, index) => (
                    <div key={index} className="flex gap-2 items-center p-2 border rounded">
                      <Select
                        value={perm.resource}
                        onValueChange={(value) => updateBulkPermission(index, 'resource', value)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Resource" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableResources.map((resource, index) => (
                            <SelectItem key={resource.resource} value={resource.resource}>
                              {resource.display_name || resource.resource.replace('_', ' ').toUpperCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={perm.action}
                        onValueChange={(value) => updateBulkPermission(index, 'action', value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Action" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableActions.map(action => (
                            <SelectItem key={action.action} value={action.action}>
                              {action.display_name || action.action.toUpperCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`granted-${index}`}
                          checked={perm.is_granted}
                          onCheckedChange={(checked) => updateBulkPermission(index, 'is_granted', checked)}
                        />
                        <Label htmlFor={`granted-${index}`}>Granted</Label>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive/80"
                        onClick={() => removeBulkPermission(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsBulkDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleBulkCreate} disabled={bulkCreateMutation.isPending}>
                    {bulkCreateMutation.isPending ? 'Creating...' : 'Create Permissions'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
            </>
          )}

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Permission
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingPermission ? 'Edit Permission' : 'Create Permission'}
                </DialogTitle>
                <DialogDescription>
                  {editingPermission
                    ? 'Update the permission settings'
                    : 'Add a new permission for a role'
                  }
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, role_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {rolesLoading ? (
                        <SelectItem value="">Loading roles...</SelectItem>
                      ) : (
                        roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="resource">Resource</Label>
                  <Select
                    value={formData.resource}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, resource: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select resource" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableResources.map((resource, index) => (
                        <SelectItem key={resource.resource} value={resource.resource}>
                          <div className="flex items-center gap-2">
                            {getResourceIcon(resource.resource)}
                            {resource.display_name || resource.resource.replace('_', ' ').toUpperCase()}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="action">Action</Label>
                  <Select
                    value={formData.action}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, action: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableActions.map((action, index) => (
                        <SelectItem key={action.action} value={action.action}>
                          {action.display_name || action.action.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_granted"
                    checked={formData.is_granted}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_granted: checked as boolean }))}
                  />
                  <Label htmlFor="is_granted">Permission Granted</Label>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => {
                    setIsCreateDialogOpen(false);
                    setEditingPermission(null);
                    resetForm();
                  }}>
                    Cancel
                  </Button>
                  <Button
                    onClick={editingPermission ? handleUpdate : handleCreate}
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? 'Saving...'
                      : editingPermission ? 'Update' : 'Create'
                    }
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Delete Permission Dialog */}
          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Permission</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this permission? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              {deletingPermission && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                    <div>
                      <Label className="text-sm font-medium">Role</Label>
                      <p className="text-sm text-muted-foreground">
                        {roles.find(r => r.id === deletingPermission.role_id)?.name || deletingPermission.role_id}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Resource</Label>
                      <p className="text-sm text-muted-foreground">
                        {deletingPermission.resource.replace('_', ' ')}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Action</Label>
                      <p className="text-sm text-muted-foreground">
                        {deletingPermission.action}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Status</Label>
                      <p className="text-sm text-muted-foreground">
                        {deletingPermission.is_granted ? 'Granted' : 'Denied'}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={confirmDelete}
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? 'Deleting...' : 'Delete Permission'}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2 border-b">
          <Button
            variant={activeTab === 'roles' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('roles')}
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
          >
            Roles
          </Button>
          <Button
            variant={activeTab === 'permissions' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('permissions')}
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
          >
            Permissions
          </Button>
          <Button
            variant={activeTab === 'matrix' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('matrix')}
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
          >
            Permission Matrix
          </Button>
        </div>

        {activeTab === 'roles' && (
          <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Roles Management
              </CardTitle>
              <CardDescription>
                Create, edit, and delete user roles in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rolesLoading ? (
                <div className="text-center py-8">Loading roles...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell>
                          <div className="font-medium">{role.name}</div>
                        </TableCell>
                        <TableCell>{role.description || 'No description'}</TableCell>
                        <TableCell>
                          <StatusBadge status={role.is_active} />
                        </TableCell>
                        <TableCell>
                          {new Date(role.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditRole(role)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive/80"
                              onClick={() => handleDeleteRole(role.id)}
                              disabled={role.name === 'Admin'} // Prevent deleting admin role
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          </div>
        )}

        {activeTab === 'permissions' && (
          <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Resource Permissions
              </CardTitle>
              <CardDescription>
                Manage individual permissions for roles and resources
              </CardDescription>
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="role-filter">Filter by Role:</Label>
                  <Select
                    value={selectedRole || '__all__'}
                    onValueChange={(value) => {
                      setSelectedRole(value === '__all__' ? '' : value);
                      setPermissionsPage(1); // Reset to first page when filtering
                    }}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Roles</SelectItem>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedRole && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedRole('');
                      setPermissionsPage(1);
                    }}
                  >
                    Clear Filter
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {permissionsLoading ? (
                <div className="text-center py-8">Loading permissions...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {permissions.map((permission) => (
                      <TableRow key={permission.id}>
                        <TableCell>
                          <Badge variant="outline">{permission.role_name || permission.role_id}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getResourceIcon(permission.resource)}
                            {permission.resource.replace('_', ' ')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getActionColor(permission.action)}>
                            {permission.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {permission.is_granted ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(permission)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive/80"
                              onClick={() => handleDelete(permission)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* Pagination Controls */}
              {totalPermissions > permissionsPageSize && !selectedRole && (
                <div className="flex items-center justify-between px-2 py-4">
                  <div className="flex-1 text-sm text-muted-foreground">
                    Showing {((permissionsPage - 1) * permissionsPageSize) + 1} to {Math.min(permissionsPage * permissionsPageSize, totalPermissions)} of {totalPermissions} permissions
                  </div>
                  <div className="flex items-center space-x-6 lg:space-x-8">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium">Rows per page</p>
                      <Select
                        value={permissionsPageSize.toString()}
                        onValueChange={(value) => {
                          setPermissionsPageSize(Number(value));
                          setPermissionsPage(1); // Reset to first page when changing page size
                        }}
                      >
                        <SelectTrigger className="h-8 w-[70px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[10, 25, 50, 100,500].map((size) => (
                            <SelectItem key={size} value={size.toString()}>
                              {size}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                      Page {permissionsPage} of {Math.ceil(totalPermissions / permissionsPageSize)}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => setPermissionsPage(prev => Math.max(1, prev - 1))}
                        disabled={permissionsPage === 1}
                      >
                        <span className="sr-only">Go to previous page</span>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => setPermissionsPage(prev => prev + 1)}
                        disabled={!hasNextPage}
                      >
                        <span className="sr-only">Go to next page</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Show filtered results info when role filter is applied */}
              {selectedRole && (
                <div className="flex items-center justify-between px-2 py-4">
                  <div className="flex-1 text-sm text-muted-foreground">
                    Showing {permissions.length} permissions for {roles.find(r => r.id === selectedRole)?.name || selectedRole}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        )}

        {activeTab === 'matrix' && (
           <div className="space-y-4">
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <Grid3X3 className="h-5 w-5" />
                 Permission Matrix
               </CardTitle>
               <CardDescription>
                 View permissions across all roles and resources in a matrix format
               </CardDescription>
             </CardHeader>
             <CardContent>
               {matrixLoading ? (
                 <div className="flex items-center justify-center py-12">
                   <div className="flex items-center gap-2 text-muted-foreground">
                     <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                     Loading permission matrix...
                   </div>
                 </div>
               ) : Array.isArray(permissionMatrix) && permissionMatrix.length > 0 ? (() => {
                 // Dynamically extract unique resources and actions from the role data
                 const uniqueResources = Array.from(new Set(permissionMatrix.flatMap((role: any) => Object.keys(role.permissions_by_resource || {})))).sort();
                 const uniqueActions = Array.from(new Set(permissionMatrix.flatMap((role: any) => Object.keys(role.permissions_by_resource || {}).flatMap((resource: string) => Object.keys(role.permissions_by_resource[resource] || {}))))).sort();

                 return (
                   <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
                     <div className="overflow-x-auto">
                       <Table>
                         <TableHeader>
                           <TableRow className="bg-muted/50 hover:bg-muted/70">
                             <TableHead className="font-semibold text-foreground py-4 px-6">Role / Resource</TableHead>
                             {uniqueResources.map((resource: string) => (
                               <TableHead key={resource} className="font-semibold text-foreground py-4 px-6 min-w-[200px]">
                                 <div className="flex items-center gap-2">
                                   {getResourceIcon(resource)}
                                   <span className="capitalize">{resource.replace('_', ' ')}</span>
                                 </div>
                               </TableHead>
                             ))}
                           </TableRow>
                         </TableHeader>
                         <TableBody>
                           {permissionMatrix.map((role: any, index: number) => (
                             <TableRow
                               key={role.id}
                               className={`${
                                 index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                               } hover:bg-muted/40 transition-colors duration-150`}
                             >
                               <TableCell className="font-medium text-foreground py-4 px-6 bg-muted/30">
                                 {role.role_name || role.name || role.id}
                               </TableCell>
                               {uniqueResources.map((resource: string) => (
                                 <TableCell key={resource} className="py-4 px-6">
                                   <div className="flex flex-col gap-3">
                                     {uniqueActions.map((action: string) => (
                                       <div key={action} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors duration-150">
                                         <Checkbox
                                           disabled
                                           checked={role.permissions_by_resource?.[resource]?.[action] || false}
                                           className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                         />
                                         <Badge
                                           variant="secondary"
                                           className={`text-xs font-medium ${getActionColor(action)}`}
                                         >
                                           {action}
                                         </Badge>
                                       </div>
                                     ))}
                                   </div>
                                 </TableCell>
                               ))}
                             </TableRow>
                           ))}
                         </TableBody>
                       </Table>
                     </div>
                   </div>
                 );
               })() : (
                 <div className="flex flex-col items-center justify-center py-12 text-center">
                   <Grid3X3 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                   <h3 className="text-lg font-medium text-muted-foreground mb-2">No Permission Matrix Data</h3>
                   <p className="text-sm text-muted-foreground max-w-md">
                     There are no roles or permissions configured yet. Create roles and assign permissions to see the matrix.
                   </p>
                 </div>
               )}
             </CardContent>
           </Card>
           </div>
         )}

        {activeTab === 'operations' && (
          <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Academic Years Operations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Academic Years
                </CardTitle>
                <CardDescription>Manage academic years</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {canCreateAcademicYear() ? (
                  <Dialog open={isAcademicYearDialogOpen} onOpenChange={setIsAcademicYearDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full" variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Academic Year
                      </Button>
                    </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Academic Year</DialogTitle>
                      <DialogDescription>
                        Add a new academic year to the system
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="title">Title</Label>
                        <Input
                          id="title"
                          value={academicYearForm.title}
                          onChange={(e) => setAcademicYearForm(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="e.g., Academic Year 2025-26"
                        />
                      </div>
                      <div>
                        <Label htmlFor="start_date">Start Date</Label>
                        <Input
                          id="start_date"
                          type="date"
                          value={academicYearForm.start_date}
                          onChange={(e) => setAcademicYearForm(prev => ({ ...prev, start_date: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="end_date">End Date</Label>
                        <Input
                          id="end_date"
                          type="date"
                          value={academicYearForm.end_date}
                          onChange={(e) => setAcademicYearForm(prev => ({ ...prev, end_date: e.target.value }))}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="ay_active"
                          checked={academicYearForm.is_active}
                          onCheckedChange={(checked) => setAcademicYearForm(prev => ({ ...prev, is_active: checked as boolean }))}
                        />
                        <Label htmlFor="ay_active">Active</Label>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsAcademicYearDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateAcademicYear}>
                          Create Academic Year
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                ) : (
                  <Button className="w-full" variant="outline" disabled>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Academic Year (No Permission)
                  </Button>
                )}

                <Button className="w-full" variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Update Academic Year
                </Button>
                <Button className="w-full text-destructive hover:text-destructive/80" variant="outline">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Academic Year
                </Button>
              </CardContent>
            </Card>

            {/* Fee Management Operations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Fee Management
                </CardTitle>
                <CardDescription>Manage fee categories and types</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Dialog open={isFeeCategoryDialogOpen} onOpenChange={setIsFeeCategoryDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Fee Category
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Fee Category</DialogTitle>
                      <DialogDescription>
                        Add a new fee category for organizing fee types
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="category_name">Category Name</Label>
                        <Input
                          id="category_name"
                          value={feeCategoryForm.category_name}
                          onChange={(e) => setFeeCategoryForm(prev => ({ ...prev, category_name: e.target.value }))}
                          placeholder="e.g., Tuition Fees"
                        />
                      </div>
                      <div>
                        <Label htmlFor="academic_year">Academic Year</Label>
                        <Select
                          value={feeCategoryForm.academic_year_id}
                          onValueChange={(value) => setFeeCategoryForm(prev => ({ ...prev, academic_year_id: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select academic year" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ay-2025">Academic Year 2025-26</SelectItem>
                            <SelectItem value="ay-2024">Academic Year 2024-25</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="fc_active"
                          checked={feeCategoryForm.is_active}
                          onCheckedChange={(checked) => setFeeCategoryForm(prev => ({ ...prev, is_active: checked as boolean }))}
                        />
                        <Label htmlFor="fc_active">Active</Label>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsFeeCategoryDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateFeeCategory}>
                          Create Fee Category
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button className="w-full" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Fee Type
                </Button>
                <Button className="w-full" variant="outline">
                  <Grid3X3 className="h-4 w-4 mr-2" />
                  Bulk Fee Mapping
                </Button>
              </CardContent>
            </Card>

            {/* Student Management Operations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Student Management
                </CardTitle>
                <CardDescription>Manage student admissions and records</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Admission
                </Button>
                <Button className="w-full" variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Upload Certificate
                </Button>
                <Button className="w-full" variant="outline">
                  <UserCheck className="h-4 w-4 mr-2" />
                  Mark Attendance
                </Button>
              </CardContent>
            </Card>

            {/* Masters Operations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Masters
                </CardTitle>
                <CardDescription>Manage classes, subjects, and staff</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Dialog open={isClassDialogOpen} onOpenChange={setIsClassDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Class
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create Class with Sections</DialogTitle>
                      <DialogDescription>
                        Add a new class with multiple sections
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="class_name">Class Name</Label>
                        <Input
                          id="class_name"
                          value={classForm.class_name}
                          onChange={(e) => setClassForm(prev => ({ ...prev, class_name: e.target.value }))}
                          placeholder="e.g., Grade 10"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Sections</Label>
                          <Button type="button" variant="outline" size="sm" onClick={addSection}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        {classForm.sections.map((section, index) => (
                          <div key={index} className="flex gap-2 items-center">
                            <Input
                              value={section.section_name}
                              onChange={(e) => updateSection(index, e.target.value)}
                              placeholder={`Section ${String.fromCharCode(65 + index)}`}
                            />
                            {classForm.sections.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive/80"
                                onClick={() => removeSection(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsClassDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateClass}>
                          Create Class
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button className="w-full" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Subject
                </Button>
                <Button className="w-full" variant="outline">
                  <UserCheck className="h-4 w-4 mr-2" />
                  Add Staff
                </Button>
              </CardContent>
            </Card>

            {/* Transport Operations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bus className="h-5 w-5" />
                  Transport
                </CardTitle>
                <CardDescription>Manage routes, vehicles, and assignments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Route
                </Button>
                <Button className="w-full" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Vehicle
                </Button>
                <Button className="w-full" variant="outline">
                  <UserCheck className="h-4 w-4 mr-2" />
                  Assign Transport
                </Button>
              </CardContent>
            </Card>

            {/* System Operations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  System
                </CardTitle>
                <CardDescription>System administration tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => setActiveTab('roles')}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Manage Roles
                </Button>
                <Button className="w-full" variant="outline">
                  <Shield className="h-4 w-4 mr-2" />
                  Manage Permissions
                </Button>
                <Button className="w-full" variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  System Settings
                </Button>
              </CardContent>
            </Card>
          </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteRoleTarget}
        onOpenChange={(open) => { if (!open) setDeleteRoleTarget(null); }}
        title="Delete Role"
        description="Are you sure you want to delete this role? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDeleteRole}
        isPending={deleteRoleMutation.isPending}
      />
    </div>
  );
};

export default RolesPermissionsPage;
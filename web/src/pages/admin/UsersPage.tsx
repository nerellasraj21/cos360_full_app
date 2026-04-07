import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Users, Search, Eye, Edit, KeyRound, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/PageHeader';
import { PermissionGuard } from '@/components/PermissionGuard';
import { adminUsersApi, type UserWithDetails, type UserUpdatePayload } from '@/api/admin/users';

const ROLE_COLORS: Record<string, string> = {
  Admin: 'bg-purple-100 text-purple-700',
  Teacher: 'bg-blue-100 text-blue-700',
  Staff: 'bg-green-100 text-green-700',
  Student: 'bg-yellow-100 text-yellow-700',
  Parent: 'bg-orange-100 text-orange-700',
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  student: 'Student',
  staff: 'Staff',
  parent: 'Parent',
};

function RoleBadge({ role }: { role: string }) {
  const cls = ROLE_COLORS[role] ?? 'bg-gray-100 text-gray-700';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{role}</span>;
}

// ── View Dialog ──────────────────────────────────────────────────────────────

function ViewUserDialog({ user, open, onClose }: { user: UserWithDetails | null; open: boolean; onClose: () => void }) {
  if (!user) return null;
  const rows: [string, React.ReactNode][] = [
    ['Username', user.username],
    ['Email', user.email ?? '—'],
    ['Role', <RoleBadge key="role" role={user.role_name} />],
    ['Status', user.is_active
      ? <Badge variant="outline" className="text-green-600 border-green-300">Active</Badge>
      : <Badge variant="outline" className="text-red-500 border-red-300">Inactive</Badge>],
    ['Entity Type', user.entity_type ? ENTITY_TYPE_LABELS[user.entity_type] ?? user.entity_type : '—'],
    ['Entity Name', user.entity_name ?? '—'],
    ['Created', user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'],
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-4 w-4" /> User Details
          </DialogTitle>
        </DialogHeader>
        <div className="divide-y divide-border">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between items-center py-2.5 text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium">{value}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Dialog ───────────────────────────────────────────────────────────────

function EditUserDialog({
  user,
  open,
  onClose,
  onSave,
  isPending,
}: {
  user: UserWithDetails | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, data: UserUpdatePayload) => void;
  isPending: boolean;
}) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [isActive, setIsActive] = useState(true);

  React.useEffect(() => {
    if (user) {
      setUsername(user.username);
      setEmail(user.email ?? '');
      setIsActive(user.is_active);
    }
  }, [user]);

  if (!user) return null;

  const handleSave = () => {
    const payload: UserUpdatePayload = {};
    if (username !== user.username) payload.username = username;
    if (email !== (user.email ?? '')) payload.email = email || undefined;
    if (isActive !== user.is_active) payload.is_active = isActive;
    if (Object.keys(payload).length === 0) { onClose(); return; }
    onSave(user.id, payload);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-4 w-4" /> Edit User
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-username">Username</Label>
            <Input id="edit-username" value={username} onChange={e => setUsername(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-email">Email</Label>
            <Input id="edit-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Optional" />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="edit-active">Active</Label>
            <Switch id="edit-active" checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Reset Password Dialog ─────────────────────────────────────────────────────

function ResetPasswordDialog({
  user,
  open,
  onClose,
  onReset,
  isPending,
}: {
  user: UserWithDetails | null;
  open: boolean;
  onClose: () => void;
  onReset: (id: string, password: string) => void;
  isPending: boolean;
}) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  React.useEffect(() => {
    if (open) { setPassword(''); setConfirm(''); }
  }, [open]);

  if (!user) return null;

  const mismatch = password && confirm && password !== confirm;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" /> Reset Password
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Set a new password for <strong>{user.username}</strong>.</p>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="new-pw">New Password</Label>
            <Input id="new-pw" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-pw">Confirm Password</Label>
            <Input id="confirm-pw" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} />
            {mismatch && <p className="text-xs text-red-500">Passwords do not match</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={isPending || !password || password.length < 8 || !!mismatch}
            onClick={() => onReset(user.id, password)}
          >
            {isPending ? 'Resetting...' : 'Reset Password'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  const [viewUser, setViewUser] = useState<UserWithDetails | null>(null);
  const [editUser, setEditUser] = useState<UserWithDetails | null>(null);
  const [resetUser, setResetUser] = useState<UserWithDetails | null>(null);

  // Debounce search
  React.useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const queryParams = useMemo(() => ({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    role: roleFilter || undefined,
    is_active: activeFilter === '' ? undefined : activeFilter === 'true',
  }), [page, debouncedSearch, roleFilter, activeFilter]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', queryParams],
    queryFn: () => adminUsersApi.listUsers(queryParams),
  });

  const { data: filterOptions } = useQuery({
    queryKey: ['admin-users-filter-options'],
    queryFn: () => adminUsersApi.getFilterOptions(),
    staleTime: 5 * 60 * 1000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UserUpdatePayload }) =>
      adminUsersApi.updateUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setEditUser(null);
      toast.success('User updated successfully');
    },
    onError: () => toast.error('Failed to update user'),
  });

  const resetMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      adminUsersApi.resetPassword(id, password),
    onSuccess: () => {
      setResetUser(null);
      toast.success('Password reset successfully');
    },
    onError: () => toast.error('Failed to reset password'),
  });

  const users = data?.users ?? [];
  const totalPages = data?.total_pages ?? 1;
  const total = data?.total ?? 0;
  const availableRoles = filterOptions?.available_roles ?? ['Admin', 'Teacher', 'Staff', 'Student', 'Parent'];

  return (
    <PermissionGuard
      resource="user_management"
      action="list"
      fallback={
        <div className="flex items-center justify-center h-64 text-center">
          <div>
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You don't have permission to view users.</p>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <PageHeader
          title="User Management"
          subtitle="View and manage all user accounts across the organization"
          icon={<Users className="h-5 w-5" />}
          actions={
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {total} {total === 1 ? 'user' : 'users'}
            </Badge>
          }
        />

        {/* Filters */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search username or email..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={roleFilter} onValueChange={v => { setRoleFilter(v === 'all' ? '' : v); setPage(1); }}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {availableRoles.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={activeFilter} onValueChange={v => { setActiveFilter(v === 'all' ? '' : v); setPage(1); }}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      Loading users...
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map(user => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{user.email ?? '—'}</TableCell>
                      <TableCell><RoleBadge role={user.role_name} /></TableCell>
                      <TableCell className="text-sm">
                        {user.entity_name
                          ? <span>{user.entity_name} <span className="text-muted-foreground">({ENTITY_TYPE_LABELS[user.entity_type!] ?? user.entity_type})</span></span>
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {user.is_active
                          ? <Badge variant="outline" className="text-green-600 border-green-300">Active</Badge>
                          : <Badge variant="outline" className="text-red-500 border-red-300">Inactive</Badge>}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewUser(user)} title="View">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditUser(user)} title="Edit">
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setResetUser(user)} title="Reset Password">
                            <KeyRound className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <ViewUserDialog user={viewUser} open={!!viewUser} onClose={() => setViewUser(null)} />
      <EditUserDialog
        user={editUser}
        open={!!editUser}
        onClose={() => setEditUser(null)}
        onSave={(id, payload) => updateMutation.mutate({ id, payload })}
        isPending={updateMutation.isPending}
      />
      <ResetPasswordDialog
        user={resetUser}
        open={!!resetUser}
        onClose={() => setResetUser(null)}
        onReset={(id, password) => resetMutation.mutate({ id, password })}
        isPending={resetMutation.isPending}
      />
    </PermissionGuard>
  );
}

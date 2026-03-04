import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Edit,
  Trash2,
  Eye,
  Plus,
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Search,
  Filter
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useStaffEnrollments, useUpdateStaffEnrollment, useDeleteStaffEnrollment, useDesignationsDropdown } from '@/hooks/masters/useStaff';
import { useRoles } from '@/api/auth';
import { StaffEnrollmentForm } from './StaffEnrollmentForm';

interface StaffTableProps {
  searchQuery?: string;
}

export function StaffTable({ searchQuery }: StaffTableProps) {
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isEditDirty, setIsEditDirty] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null);
  const [localSearch, setLocalSearch] = useState('');

  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    gender: '',
    date_of_birth: '',
    joining_date: '',
    qualification: '',
    experience_years: '',
    address: '',
    designation_id: '',
    department: '',
    is_active: true
  });

  const { data: staffResponse, isLoading } = useStaffEnrollments();
  const { data: designations = [] } = useDesignationsDropdown();
  const { data: roles = [] } = useRoles();
  const updateMutation = useUpdateStaffEnrollment();
  const deleteMutation = useDeleteStaffEnrollment();

  // Transform API data
  const staff = staffResponse?.items || [];

  const getDesignationName = (designationId: string) => {
    const designation = designations.find((d: any) => d.id === designationId);
    return designation ? designation.title : 'N/A';
  };

  const getRoleName = (roleId: string) => {
    const role = roles.find((r: any) => r.id === roleId);
    return role ? role.name : 'N/A';
  };

  const handleView = (staffMember: any) => {
    setSelectedStaff(staffMember);
    setViewModalOpen(true);
  };

  const handleEdit = (staffMember: any) => {
    setSelectedStaff(staffMember);
    setEditForm({
      first_name: staffMember.first_name,
      last_name: staffMember.last_name || '',
      email: staffMember.email || '',
      phone: staffMember.phone || '',
      gender: staffMember.gender || '',
      date_of_birth: staffMember.date_of_birth || '',
      joining_date: staffMember.joining_date,
      qualification: staffMember.qualification || '',
      experience_years: staffMember.experience_years?.toString() || '',
      address: staffMember.address || '',
      designation_id: staffMember.designation_id || '',
      department: staffMember.department || '',
      is_active: staffMember.is_active
    });
    setIsEditDirty(false);
    setEditModalOpen(true);
  };

  const handleDelete = (staffId: string) => {
    if (confirm('Are you sure you want to delete this staff member? This action cannot be undone.')) {
      deleteMutation.mutate(staffId);
    }
  };

  const handleUpdate = async () => {
    if (!selectedStaff) return;

    try {
      const updateData = {
        ...editForm,
        experience_years: editForm.experience_years ? parseInt(editForm.experience_years) : undefined,
        gender: editForm.gender as 'Male' | 'Female' | 'Other' | undefined
      };

      await updateMutation.mutateAsync({
        id: selectedStaff.id,
        data: updateData
      });
      setIsEditDirty(false);
      setEditModalOpen(false);
    } catch (error) {
      console.error('Error updating staff:', error);
    }
  };


  // Combined search: prop searchQuery OR local search bar
  const effectiveSearch = (searchQuery || localSearch).toLowerCase();
  const filteredData = useMemo(() => {
    if (!effectiveSearch) return staff;
    return staff.filter((s: any) => {
      const name = `${s.first_name} ${s.last_name || ''}`.toLowerCase();
      const email = (s.email || '').toLowerCase();
      const designation = getDesignationName(s.designation_id || '').toLowerCase();
      const department = (s.department || '').toLowerCase();
      return (
        name.includes(effectiveSearch) ||
        email.includes(effectiveSearch) ||
        designation.includes(effectiveSearch) ||
        department.includes(effectiveSearch)
      );
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff, effectiveSearch, designations]);

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDir) return filteredData;
    return [...filteredData].sort((a: any, b: any) => {
      let aVal: string;
      let bVal: string;
      switch (sortKey) {
        case 'name':
          aVal = `${a.first_name} ${a.last_name || ''}`.toLowerCase();
          bVal = `${b.first_name} ${b.last_name || ''}`.toLowerCase();
          break;
        case 'email':
          aVal = (a.email || '').toLowerCase();
          bVal = (b.email || '').toLowerCase();
          break;
        case 'designation':
          aVal = getDesignationName(a.designation_id || '').toLowerCase();
          bVal = getDesignationName(b.designation_id || '').toLowerCase();
          break;
        case 'department':
          aVal = (a.department || '').toLowerCase();
          bVal = (b.department || '').toLowerCase();
          break;
        case 'joining_date':
          aVal = a.joining_date || '';
          bVal = b.joining_date || '';
          break;
        default:
          return 0;
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredData, sortKey, sortDir, designations]);

  const handleSort = (key: string) => {
    if (editModalOpen) return;
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else if (sortDir === 'desc') { setSortKey(null); setSortDir(null); }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return <ChevronsUpDown className="h-3 w-3 ml-1 inline opacity-50" />;
    if (sortDir === 'asc') return <ChevronUp className="h-3 w-3 ml-1 inline" />;
    return <ChevronDown className="h-3 w-3 ml-1 inline" />;
  };

  const getStaffDetails = (staffMember: any) => [
    { label: 'Full Name', value: `${staffMember.first_name} ${staffMember.last_name || ''}`.trim() },
    { label: 'Email', value: staffMember.email || 'N/A' },
    { label: 'Phone', value: staffMember.phone || 'N/A' },
    { label: 'Gender', value: staffMember.gender || 'N/A' },
    { label: 'Date of Birth', value: staffMember.date_of_birth ? new Date(staffMember.date_of_birth).toLocaleDateString() : 'N/A' },
    { label: 'Joining Date', value: new Date(staffMember.joining_date).toLocaleDateString() },
    { label: 'Qualification', value: staffMember.qualification || 'N/A' },
    { label: 'Experience', value: staffMember.experience_years ? `${staffMember.experience_years} years` : 'N/A' },
    { label: 'Designation', value: getDesignationName(staffMember.designation_id || '') },
    { label: 'Department', value: staffMember.department || 'N/A' },
    { label: 'Role', value: getRoleName(staffMember.user?.role_id || '') },
    { label: 'Address', value: staffMember.address || 'N/A' },
    { label: 'Status', value: staffMember.is_active ? 'Active' : 'Inactive' }
  ];

  if (isLoading) {
    return <div className="text-center py-8">Loading staff members...</div>;
  }

  return (
    <div className="space-y-4">

      {/* Filter bar */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          <span>Filters</span>
        </div>
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input placeholder="Search staff..." value={localSearch} onChange={(e) => setLocalSearch(e.target.value)} className="pl-8 h-8 text-sm" />
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-3 py-2 text-left font-semibold border-b bg-muted w-14 text-xs text-muted-foreground">S.No.</TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('name')}
              >
                Name <SortIcon col="name" />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('email')}
              >
                Email <SortIcon col="email" />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('designation')}
              >
                Designation <SortIcon col="designation" />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('department')}
              >
                Department <SortIcon col="department" />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('joining_date')}
              >
                Joining Date <SortIcon col="joining_date" />
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((staffMember: any, index: number) => (
              <TableRow key={staffMember.id} style={{ height: '48px' }}>
                <TableCell className="px-3 align-middle text-xs text-muted-foreground">{index + 1}</TableCell>
                <TableCell className="font-medium align-middle">
                  {`${staffMember.first_name} ${staffMember.last_name || ''}`.trim()}
                </TableCell>
                <TableCell className="align-middle">{staffMember.email || '-'}</TableCell>
                <TableCell className="align-middle">{getDesignationName(staffMember.designation_id || '')}</TableCell>
                <TableCell className="align-middle">{staffMember.department || '-'}</TableCell>
                <TableCell className="align-middle">{new Date(staffMember.joining_date).toLocaleDateString()}</TableCell>
                <TableCell className="align-middle">
                  <Badge variant={staffMember.is_active ? "default" : "secondary"}>
                    {staffMember.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="align-middle">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleView(staffMember)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(staffMember)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(staffMember.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* View Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Staff Details - {selectedStaff ? `${selectedStaff.first_name} ${selectedStaff.last_name || ''}`.trim() : ''}</DialogTitle>
          </DialogHeader>
          {selectedStaff && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <tbody>
                    {getStaffDetails(selectedStaff).map((detail, index) => (
                      <tr key={index} className="border-b last:border-0">
                        <td className="px-4 py-2 font-medium bg-muted/50 w-1/3">
                          {detail.label}
                        </td>
                        <td className="px-4 py-2">
                          {detail.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen} guardDirty={isEditDirty} onDirtyDiscard={() => setIsEditDirty(false)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4" onChange={() => setIsEditDirty(true)}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-first-name">First Name *</Label>
                <Input
                  id="edit-first-name"
                  value={editForm.first_name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, first_name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-last-name">Last Name</Label>
                <Input
                  id="edit-last-name"
                  value={editForm.last_name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, last_name: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={editForm.phone}
                  onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit-gender">Gender</Label>
                <Select value={editForm.gender} onValueChange={(value) => setEditForm(prev => ({ ...prev, gender: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-dob">Date of Birth</Label>
                <Input
                  id="edit-dob"
                  type="date"
                  value={editForm.date_of_birth}
                  onChange={(e) => setEditForm(prev => ({ ...prev, date_of_birth: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-joining">Joining Date *</Label>
                <Input
                  id="edit-joining"
                  type="date"
                  value={editForm.joining_date}
                  onChange={(e) => setEditForm(prev => ({ ...prev, joining_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-qualification">Qualification</Label>
                <Input
                  id="edit-qualification"
                  value={editForm.qualification}
                  onChange={(e) => setEditForm(prev => ({ ...prev, qualification: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-experience">Experience (Years)</Label>
                <Input
                  id="edit-experience"
                  type="number"
                  value={editForm.experience_years}
                  onChange={(e) => setEditForm(prev => ({ ...prev, experience_years: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-designation">Designation</Label>
                <Select value={editForm.designation_id} onValueChange={(value) => setEditForm(prev => ({ ...prev, designation_id: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {designations.map((designation: any) => (
                      <SelectItem key={designation.id} value={designation.id}>
                        {designation.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-department">Department</Label>
                <Input
                  id="edit-department"
                  value={editForm.department}
                  onChange={(e) => setEditForm(prev => ({ ...prev, department: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-address">Address</Label>
              <Textarea
                id="edit-address"
                value={editForm.address}
                onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-active"
                checked={editForm.is_active}
                onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, is_active: checked as boolean }))}
              />
              <Label htmlFor="edit-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
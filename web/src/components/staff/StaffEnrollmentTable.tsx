import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit, Trash2, Plus, Users, Mail, Phone, Calendar, Award, MapPin, Filter, Download, FileText, FileSpreadsheet, Eye, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { useStaffEnrollments, useCreateStaffEnrollment, useUpdateStaffEnrollment, useDeleteStaffEnrollment } from '@/hooks/staff/useStaff';
import { useRoles } from '@/api/auth';
import { getAllDesignations } from '@/api/staff/staff';
import { InfiniteScrollDropdown } from '@/components/dropdown';
import { usePermission } from '@/hooks/usePermission';
import type { Staff, StaffInput, DesignationListResponse } from '@/types/staff/staff';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface StaffEnrollmentTableProps {
    className?: string;
}

interface StaffFormData extends StaffInput {}

export function StaffEnrollmentTable({ className }: StaffEnrollmentTableProps) {
    const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState<Staff | null>(null);
    const [viewingStaff, setViewingStaff] = useState<Staff | null>(null);
    const [showViewDialog, setShowViewDialog] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
        new Set(['name', 'contact', 'designation', 'department', 'status'])
    );
    const [formData, setFormData] = useState<StaffFormData>({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        gender: undefined,
        date_of_birth: '',
        joining_date: '',
        qualification: '',
        experience_years: 0,
        address: '',
        designation_id: '',
        department: '',
        is_active: true,
        role_id: ''
    });

    const { data: staffResponse, isLoading } = useStaffEnrollments();
    const { data: designationsResponse } = useQuery<DesignationListResponse>({
        queryKey: ['designations'],
        queryFn: () => getAllDesignations(),
        staleTime: 5 * 60 * 1000,
    });
    const designations = designationsResponse?.items || [];
    const { data: roles = [] } = useRoles();

    // Use API data - API returns array directly
    const staff: Staff[] = Array.isArray(staffResponse) ? staffResponse : staffResponse?.items || [];

    const createMutation = useCreateStaffEnrollment();
    const updateMutation = useUpdateStaffEnrollment();
    const deleteMutation = useDeleteStaffEnrollment();

    // Permission checks for UI elements
    const { checkPermission } = usePermission();
    const hasCreatePermission = checkPermission('staff', 'create');
    const hasUpdatePermission = checkPermission('staff', 'update');
    const hasDeletePermission = checkPermission('staff', 'delete');
    const hasReadPermission = checkPermission('staff', 'read');

    // Available columns
    const allColumns = [
        { key: 'name', label: 'Name' },
        { key: 'contact', label: 'Contact' },
        { key: 'designation', label: 'Designation' },
        { key: 'department', label: 'Department' },
        { key: 'status', label: 'Status' },
    ];

    // Filtered columns
    const filteredColumns = allColumns.filter(col => visibleColumns.has(col.key));

    // Paginated data
    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return staff.slice(startIndex, endIndex);
    }, [staff, currentPage, pageSize]);

    const totalPages = Math.ceil(staff.length / pageSize);

    // Column management functions
    const handleColumnToggle = (columnKey: string) => {
        setVisibleColumns(prev => {
            const newSet = new Set(prev);
            if (newSet.has(columnKey)) {
                newSet.delete(columnKey);
            } else {
                newSet.add(columnKey);
            }
            return newSet;
        });
    };

    const handleSelectAllColumns = () => {
        setVisibleColumns(new Set(allColumns.map(col => col.key)));
    };

    const handleDeselectAllColumns = () => {
        setVisibleColumns(new Set());
    };

    // Export functions
    const handleExportCSV = () => {
        const headers = filteredColumns.map(col => col.label).join(',');
        const rows = staff.map(staffMember =>
            filteredColumns.map(col => {
                let value: any = '';
                switch (col.key) {
                    case 'name':
                        value = `${staffMember.first_name} ${staffMember.last_name || ''}`.trim();
                        break;
                    case 'contact':
                        value = `${staffMember.email || ''} ${staffMember.phone || ''}`.trim();
                        break;
                    case 'designation':
                        value = getDesignationTitle(staffMember.designation_id);
                        break;
                    case 'department':
                        value = staffMember.department || '';
                        break;
                    case 'status':
                        value = staffMember.is_active ? 'Active' : 'Inactive';
                        break;
                }
                const escapedValue = String(value).replace(/"/g, '""');
                return `"${escapedValue}"`;
            }).join(',')
        ).join('\n');

        const csvContent = `${headers}\n${rows}`;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'staff_enrollments_data.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportExcel = () => {
        const exportData = staff.map(staffMember => {
            const row: any = {};
            filteredColumns.forEach(col => {
                switch (col.key) {
                    case 'name':
                        row[col.label] = `${staffMember.first_name} ${staffMember.last_name || ''}`.trim();
                        break;
                    case 'contact':
                        row[col.label] = `${staffMember.email || ''} ${staffMember.phone || ''}`.trim();
                        break;
                    case 'designation':
                        row[col.label] = getDesignationTitle(staffMember.designation_id);
                        break;
                    case 'department':
                        row[col.label] = staffMember.department || '';
                        break;
                    case 'status':
                        row[col.label] = staffMember.is_active ? 'Active' : 'Inactive';
                        break;
                }
            });
            return row;
        });

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Staff Enrollments');
        XLSX.writeFile(workbook, 'staff_enrollments_data.xlsx');
    };

    const handleCreate = () => {
        setFormData({
            first_name: '',
            last_name: '',
            email: '',
            phone: '',
            gender: undefined,
            date_of_birth: '',
            joining_date: '',
            qualification: '',
            experience_years: 0,
            address: '',
            designation_id: '',
            department: '',
            is_active: true,
            role_id: ''
        });
        setEditingStaff(null);
        setShowCreateDialog(true);
    };

    const handleEdit = (staff: Staff) => {
        setFormData({
            first_name: staff.first_name,
            last_name: staff.last_name || '',
            email: staff.email || '',
            phone: staff.phone || '',
            gender: staff.gender,
            date_of_birth: staff.date_of_birth || '',
            joining_date: staff.joining_date,
            qualification: staff.qualification || '',
            experience_years: staff.experience_years || 0,
            address: staff.address || '',
            designation_id: staff.designation_id || '',
            department: staff.department || '',
            is_active: staff.is_active,
            role_id: '' // This would need to be fetched or set appropriately
        });
        setEditingStaff(staff);
        setShowCreateDialog(true);
    };

    const handleView = (staff: Staff) => {
        setViewingStaff(staff);
        setShowViewDialog(true);
    };

    const handleDelete = (staff: Staff) => {
        setShowDeleteDialog(staff);
    };

    const handleSubmit = async () => {
        if (!formData.first_name.trim()) {
            toast.error('First name is required');
            return;
        }

        if (!formData.joining_date) {
            toast.error('Joining date is required');
            return;
        }

        try {
            if (editingStaff) {
                await updateMutation.mutateAsync({
                    id: editingStaff.id,
                    data: formData
                });
            } else {
                await createMutation.mutateAsync(formData);
            }
            setShowCreateDialog(false);
            setEditingStaff(null);
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

    const getGenderBadgeVariant = (gender?: string) => {
        switch (gender) {
            case 'Male':
                return 'default';
            case 'Female':
                return 'secondary';
            case 'Other':
                return 'outline';
            default:
                return 'secondary';
        }
    };

    const getDesignationTitle = (designationId?: string) => {
        if (!designationId) return 'Not Assigned';
        const designation = designations.find(d => d.id === designationId);
        return designation ? designation.title : 'Unknown';
    };

    return (
        <>
            <Card className={className}>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Staff Enrollment Management
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <DropdownMenu modal={false}>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                                        <Filter className="h-4 w-4" />
                                        Columns
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuCheckboxItem
                                        checked={visibleColumns.size === allColumns.length}
                                        onCheckedChange={(checked) => {
                                            if (checked) {
                                                handleSelectAllColumns();
                                            } else {
                                                handleDeselectAllColumns();
                                            }
                                        }}
                                        onSelect={(e) => e.preventDefault()}
                                        className="cursor-pointer font-medium border-b border-b-gray-200"
                                    >
                                        Select All
                                    </DropdownMenuCheckboxItem>
                                    {allColumns.map((col) => (
                                        <DropdownMenuCheckboxItem
                                            key={col.key}
                                            checked={visibleColumns.has(col.key)}
                                            onCheckedChange={() => handleColumnToggle(col.key)}
                                            onSelect={(e) => e.preventDefault()}
                                            className="cursor-pointer"
                                        >
                                            {col.label}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                                        <Download className="h-4 w-4" />
                                        Export
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer">
                                        <FileText className="h-4 w-4 mr-2" />
                                        Export to CSV
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer">
                                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                                        Export to Excel
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            {hasCreatePermission && (
                                <Button onClick={handleCreate} className="flex items-center gap-2">
                                    <Plus className="h-4 w-4" />
                                    Add Staff
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin" />
                            <span className="ml-2">Loading staff enrollments...</span>
                        </div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {filteredColumns.map(col => (
                                            <TableHead key={col.key}>{col.label}</TableHead>
                                        ))}
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedData.map((staffMember) => (
                                        <TableRow key={staffMember.id} className="hover:bg-gray-50">
                                            {filteredColumns.map(col => (
                                                <TableCell key={col.key}>
                                                    {col.key === 'name' && (
                                                        <div>
                                                            <div className="font-medium">
                                                                {staffMember.first_name} {staffMember.last_name}
                                                            </div>
                                                            {staffMember.gender && (
                                                                <Badge variant={getGenderBadgeVariant(staffMember.gender)} className="text-xs mt-1">
                                                                    {staffMember.gender}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    )}
                                                    {col.key === 'contact' && (
                                                        <div className="space-y-1">
                                                            {staffMember.email && (
                                                                <div className="flex items-center gap-1">
                                                                    <Mail className="h-3 w-3" />
                                                                    <span className="text-xs">{staffMember.email}</span>
                                                                </div>
                                                            )}
                                                            {staffMember.phone && (
                                                                <div className="flex items-center gap-1">
                                                                    <Phone className="h-3 w-3" />
                                                                    <span className="text-xs">{staffMember.phone}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    {col.key === 'designation' && (
                                                        <div>
                                                            <div className="font-medium">
                                                                {getDesignationTitle(staffMember.designation_id)}
                                                            </div>
                                                            {staffMember.qualification && (
                                                                <div className="flex items-center gap-1 mt-1">
                                                                    <Award className="h-3 w-3" />
                                                                    <span className="text-xs text-muted-foreground">
                                                                        {staffMember.qualification}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    {col.key === 'department' && (staffMember.department || '-')}
                                                    {col.key === 'status' && (
                                                        <Badge variant={staffMember.is_active ? "default" : "secondary"}>
                                                            {staffMember.is_active ? 'Active' : 'Inactive'}
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                            ))}
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {hasReadPermission && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleView(staffMember)}
                                                            title="View Staff Details"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    {hasUpdatePermission && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleEdit(staffMember)}
                                                            title="Edit Staff"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    {hasDeletePermission && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDelete(staffMember)}
                                                            title="Delete Staff"
                                                            className="text-red-600 hover:text-red-700"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {staff.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={filteredColumns.length + 1} className="text-center py-8 text-gray-500">
                                                No staff enrollments found
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>

                            {/* Pagination Controls */}
                            {staff.length > pageSize && (
                                <div className="flex items-center justify-between mt-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-600">Rows per page:</span>
                                        <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
                                            <SelectTrigger className="w-20">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="5">5</SelectItem>
                                                <SelectItem value="10">10</SelectItem>
                                                <SelectItem value="20">20</SelectItem>
                                                <SelectItem value="50">50</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-600">
                                            {Math.min((currentPage - 1) * pageSize + 1, staff.length)}-{Math.min(currentPage * pageSize, staff.length)} of {staff.length}
                                        </span>
                                        <div className="flex gap-1">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                disabled={currentPage === 1}
                                            >
                                                Previous
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                disabled={currentPage === totalPages}
                                            >
                                                Next
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>
                    {editingStaff ? 'Edit Staff Enrollment' : 'Create Staff Enrollment'}
                </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Basic Information */}
                <div className="md:col-span-2">
                    <h3 className="text-sm font-medium text-foreground mb-3">Basic Information</h3>
                </div>

                <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                        First Name *
                    </label>
                    <Input
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        placeholder="Enter first name"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                        Last Name
                    </label>
                    <Input
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        placeholder="Enter last name"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                        Email
                    </label>
                    <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="Enter email address"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                        Phone
                    </label>
                    <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="Enter phone number"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                        Gender
                    </label>
                    <Select
                        value={formData.gender || ''}
                        onValueChange={(value) => setFormData({ ...formData, gender: value as 'Male' | 'Female' | 'Other' })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                        Date of Birth
                    </label>
                    <Input
                        type="date"
                        value={formData.date_of_birth}
                        onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                        Joining Date *
                    </label>
                    <Input
                        type="date"
                        value={formData.joining_date}
                        onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                        Qualification
                    </label>
                    <Input
                        value={formData.qualification}
                        onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                        placeholder="Enter educational qualification"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                        Experience (Years)
                    </label>
                    <Input
                        type="number"
                        min="0"
                        value={formData.experience_years}
                        onChange={(e) => setFormData({ ...formData, experience_years: parseInt(e.target.value) || 0 })}
                        placeholder="Enter years of experience"
                    />
                </div>

                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-1">
                        Address
                    </label>
                    <Input
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Enter residential address"
                    />
                </div>

                {/* Professional Information */}
                <div className="md:col-span-2">
                    <h3 className="text-sm font-medium text-foreground mb-3">Professional Information</h3>
                </div>

                <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                        Designation
                    </label>
                    <InfiniteScrollDropdown
                        data={designations.map(d => ({ id: d.id, value: d.id, label: d.title }))}
                        value={formData.designation_id || ''}
                        onChange={(value) => setFormData({ ...formData, designation_id: String(value) })}
                        placeholder="Select designation"
                        searchable={true}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                        Department
                    </label>
                    <Input
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        placeholder="Enter department name"
                    />
                </div>

                {/* Account Information */}
                <div className="md:col-span-2">
                    <h3 className="text-sm font-medium text-foreground mb-3">Account Information</h3>
                </div>

                <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                        Role
                    </label>
                    <InfiniteScrollDropdown
                        data={roles.map(r => ({ id: r.id, value: r.id, label: r.name }))}
                        value={formData.role_id || ''}
                        onChange={(value) => setFormData({ ...formData, role_id: String(value) })}
                        placeholder="Select role"
                        searchable={true}
                    />
                </div>

                <div className="md:col-span-2">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="is_active"
                            checked={formData.is_active}
                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                            className="rounded border-border"
                        />
                        <label htmlFor="is_active" className="text-sm font-medium text-foreground">
                            Active Staff Member
                        </label>
                    </div>
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

        {/* View Staff Details Dialog */}
        <Dialog open={showViewDialog} onOpenChange={() => setShowViewDialog(false)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Staff Details: {viewingStaff?.first_name} {viewingStaff?.last_name}
                    </DialogTitle>
                </DialogHeader>

                {viewingStaff && (
                    <div className="space-y-6">
                        {/* Basic Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-foreground border-b pb-2">Basic Information</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="font-medium text-muted-foreground">Full Name:</span>
                                        <span className="text-foreground">{viewingStaff.first_name} {viewingStaff.last_name || ''}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-medium text-muted-foreground">Gender:</span>
                                        <span className="text-foreground">{viewingStaff.gender || 'Not specified'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-medium text-muted-foreground">Date of Birth:</span>
                                        <span className="text-foreground">
                                            {viewingStaff.date_of_birth ? new Date(viewingStaff.date_of_birth).toLocaleDateString() : 'Not specified'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-medium text-muted-foreground">Joining Date:</span>
                                        <span className="text-foreground">{new Date(viewingStaff.joining_date).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-foreground border-b pb-2">Contact Information</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium text-muted-foreground flex items-center gap-2">
                                            <Mail className="h-4 w-4" />
                                            Email:
                                        </span>
                                        <span className="text-foreground">{viewingStaff.email || 'Not provided'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium text-muted-foreground flex items-center gap-2">
                                            <Phone className="h-4 w-4" />
                                            Phone:
                                        </span>
                                        <span className="text-foreground">{viewingStaff.phone || 'Not provided'}</span>
                                    </div>
                                    <div className="flex justify-between items-start">
                                        <span className="font-medium text-muted-foreground flex items-center gap-2">
                                            <MapPin className="h-4 w-4" />
                                            Address:
                                        </span>
                                        <span className="text-foreground text-right max-w-48">{viewingStaff.address || 'Not provided'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Professional Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-foreground border-b pb-2">Professional Information</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="font-medium text-muted-foreground">Designation:</span>
                                        <span className="text-foreground">{getDesignationTitle(viewingStaff.designation_id)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-medium text-muted-foreground">Department:</span>
                                        <span className="text-foreground">{viewingStaff.department || 'Not assigned'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium text-muted-foreground flex items-center gap-2">
                                            <Award className="h-4 w-4" />
                                            Qualification:
                                        </span>
                                        <span className="text-foreground">{viewingStaff.qualification || 'Not specified'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-medium text-muted-foreground">Experience:</span>
                                        <span className="text-foreground">
                                            {viewingStaff.experience_years ? `${viewingStaff.experience_years} years` : 'Not specified'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-foreground border-b pb-2">Account & Status</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="font-medium text-muted-foreground">User ID:</span>
                                        <span className="text-foreground font-mono text-sm">{viewingStaff.user_id}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-medium text-muted-foreground">Status:</span>
                                        <Badge variant={viewingStaff.is_active ? "default" : "secondary"}>
                                            {viewingStaff.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-medium text-muted-foreground">Created:</span>
                                        <span className="text-foreground text-sm">
                                            {new Date(viewingStaff.created_at).toLocaleDateString()} {new Date(viewingStaff.created_at).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-medium text-muted-foreground">Last Updated:</span>
                                        <span className="text-foreground text-sm">
                                            {new Date(viewingStaff.updated_at).toLocaleDateString()} {new Date(viewingStaff.updated_at).toLocaleTimeString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Attendance Summary (if available) */}
                        {viewingStaff.attendances && viewingStaff.attendances.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-foreground border-b pb-2">Recent Attendance</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-muted/50 p-4 rounded-lg">
                                        <div className="text-2xl font-bold text-green-600">
                                            {viewingStaff.attendances.filter(a => a.status === 'present').length}
                                        </div>
                                        <div className="text-sm text-muted-foreground">Present</div>
                                    </div>
                                    <div className="bg-muted/50 p-4 rounded-lg">
                                        <div className="text-2xl font-bold text-red-600">
                                            {viewingStaff.attendances.filter(a => a.status === 'absent').length}
                                        </div>
                                        <div className="text-sm text-muted-foreground">Absent</div>
                                    </div>
                                    <div className="bg-muted/50 p-4 rounded-lg">
                                        <div className="text-2xl font-bold text-yellow-600">
                                            {viewingStaff.attendances.filter(a => a.status === 'leave' || a.status === 'half-day').length}
                                        </div>
                                        <div className="text-sm text-muted-foreground">Leave/Half-day</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => setShowViewDialog(false)}>
                        Close
                    </Button>
                    {hasUpdatePermission && (
                        <Button onClick={() => {
                            setShowViewDialog(false);
                            if (viewingStaff) handleEdit(viewingStaff);
                        }}>
                            Edit Staff
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Delete Staff Enrollment</DialogTitle>
                </DialogHeader>

                <p className="text-muted-foreground">
                    Are you sure you want to delete the enrollment for "{showDeleteDialog?.first_name} {showDeleteDialog?.last_name}"?
                    This action cannot be undone and will remove all associated attendance records.
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
    </>
    );
}
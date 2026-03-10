import React, { useState, useMemo } from 'react';
import CreatableSelect from 'react-select/creatable';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ViewButton, EditButton, DeleteButton, DownloadButton, TableActionGroup } from '@/components/common/TableActions';
import { Edit, Trash2, Plus, Users, Mail, Phone, Calendar, Award, MapPin, Filter, Download, FileText, FileSpreadsheet, Eye, Loader2, ChevronUp, ChevronDown, ChevronsUpDown, Search, GraduationCap, Briefcase, Landmark, Wallet } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useStaffEnrollments, useStaffEnrollment, useCreateStaffEnrollment, useUpdateStaffEnrollment, useDeleteStaffEnrollment, staffKeys } from '@/hooks/staff/useStaff';
import { useRoles } from '@/api/auth';
import { getAllDesignations, staffApi } from '@/api/staff/staff';
import { InfiniteScrollDropdown } from '@/components/dropdown';
import { usePermission } from '@/hooks/usePermission';
import type { Staff, StaffInput, DesignationListResponse, QualificationLevel } from '@/types/staff/staff';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface StaffEnrollmentTableProps {
    className?: string;
}

interface StaffFormData {
    // Basic info (sent on POST)
    first_name: string;
    last_name?: string;
    email?: string;
    phone?: string;
    gender?: 'Male' | 'Female' | 'Other';
    date_of_birth?: string;
    joining_date: string;
    qualification?: string;
    experience_years?: number;
    address?: string;
    designation_id?: string;
    department?: string;
    is_active?: boolean;
    role_id?: string;
    // Work experience (sent on PATCH)
    work_org?: string;
    work_from_date?: string;
    work_to_date?: string;
    subjects_dealt?: string;
    work_remarks?: string;
    // Bank details (sent on PATCH)
    bank_name?: string;
    bank_branch?: string;
    account_number?: string;
    ifsc_code?: string;
    account_holder_name?: string;
    account_type?: 'Savings' | 'Current';
    // Salary & PF (sent on PATCH)
    last_drawn_salary?: string; // string in form state, converted to number on submit
    current_salary?: string;    // string in form state, converted to number on submit
    pf_account_number?: string;
    uan_number?: string;
}

interface LocalQual {
    id?: string;
    level: string;
    name: string;
    passed_out_year: string;
    percentage: string;
    university: string;
}

const QUALIFICATION_LEVELS: { value: QualificationLevel; label: string }[] = [
    { value: 'Below Graduation', label: 'Below Graduation (Inter / Diploma)' },
    { value: 'Graduation', label: 'Graduation (B.Tech / B.Sc / B.Com)' },
    { value: 'Post Graduation', label: 'Post Graduation (M.Tech / MBA)' },
    { value: 'PhD', label: 'PhD (Doctorate)' },
];

type DegreeOption = { value: string; label: string };

const DEFAULT_DEGREES_BY_LEVEL: Record<string, DegreeOption[]> = {
    'Below Graduation': [
        { value: '10th (SSC)', label: '10th (SSC)' },
        { value: '12th (HSC)', label: '12th (HSC)' },
        { value: 'Inter', label: 'Inter' },
        { value: 'Diploma', label: 'Diploma' },
        { value: 'ITI', label: 'ITI' },
        { value: 'Polytechnic', label: 'Polytechnic' },
    ],
    'Graduation': [
        { value: 'B.Tech', label: 'B.Tech' },
        { value: 'B.E.', label: 'B.E.' },
        { value: 'B.Sc', label: 'B.Sc' },
        { value: 'B.Com', label: 'B.Com' },
        { value: 'B.A.', label: 'B.A.' },
        { value: 'B.Ed.', label: 'B.Ed.' },
        { value: 'B.Pharm', label: 'B.Pharm' },
        { value: 'BCA', label: 'BCA' },
        { value: 'BBA', label: 'BBA' },
        { value: 'B.Arch', label: 'B.Arch' },
    ],
    'Post Graduation': [
        { value: 'M.Tech', label: 'M.Tech' },
        { value: 'M.E.', label: 'M.E.' },
        { value: 'M.Sc', label: 'M.Sc' },
        { value: 'M.Com', label: 'M.Com' },
        { value: 'M.A.', label: 'M.A.' },
        { value: 'MBA', label: 'MBA' },
        { value: 'M.Ed.', label: 'M.Ed.' },
        { value: 'M.Pharm', label: 'M.Pharm' },
        { value: 'MCA', label: 'MCA' },
    ],
    'PhD': [
        { value: 'Ph.D', label: 'Ph.D' },
        { value: 'D.Sc', label: 'D.Sc' },
        { value: 'D.Litt', label: 'D.Litt' },
    ],
};

export function StaffEnrollmentTable({ className }: StaffEnrollmentTableProps) {
    const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState<Staff | null>(null);
    const [viewingStaff, setViewingStaff] = useState<Staff | null>(null);
    const [showViewDialog, setShowViewDialog] = useState(false);
    const [localQuals, setLocalQuals] = useState<LocalQual[]>([]);
    const [removedQualIds, setRemovedQualIds] = useState<string[]>([]);
    const [customDegreeOptions, setCustomDegreeOptions] = useState<DegreeOption[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
        new Set(['name', 'contact', 'designation', 'department', 'status'])
    );
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null);
    const [localSearch, setLocalSearch] = useState('');

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
        role_id: '',
        work_org: '',
        work_from_date: '',
        work_to_date: '',
        subjects_dealt: '',
        work_remarks: '',
        bank_name: '',
        bank_branch: '',
        account_number: '',
        ifsc_code: '',
        account_holder_name: '',
        account_type: undefined,
        last_drawn_salary: '',
        current_salary: '',
        pf_account_number: '',
        uan_number: '',
    });

    const { data: staffResponse, isLoading } = useStaffEnrollments();
    // Fetch full detail (with qualifications & new fields) when view dialog is open
    const { data: viewStaffDetail, isLoading: viewDetailLoading } = useStaffEnrollment(viewingStaff?.id || '');
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
    const queryClient = useQueryClient();

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

    const getDesignationTitle = (designationId?: string) => {
        if (!designationId) return 'Not Assigned';
        const designation = designations.find(d => d.id === designationId);
        return designation ? designation.title : 'Unknown';
    };

    // Search filter and sort
    const filteredData = useMemo(() => {
        const q = localSearch.toLowerCase().trim();
        let data = staff;
        if (q) {
            data = data.filter(s => {
                const name = (s.first_name + ' ' + (s.last_name || '')).toLowerCase();
                const desig = getDesignationTitle(s.designation_id).toLowerCase();
                const dept = (s.department || '').toLowerCase();
                const email = (s.email || '').toLowerCase();
                return name.includes(q) || desig.includes(q) || dept.includes(q) || email.includes(q);
            });
        }
        return data;
    }, [staff, localSearch]);

    const sortedData = useMemo(() => {
        if (!sortKey || !sortDir) return filteredData;
        return [...filteredData].sort((a, b) => {
            const aVal = sortKey === 'name' ? a.first_name + ' ' + (a.last_name || '') : sortKey === 'designation' ? getDesignationTitle(a.designation_id) : sortKey === 'department' ? (a.department || '') : (a as any)[sortKey] || '';
            const bVal = sortKey === 'name' ? b.first_name + ' ' + (b.last_name || '') : sortKey === 'designation' ? getDesignationTitle(b.designation_id) : sortKey === 'department' ? (b.department || '') : (b as any)[sortKey] || '';
            const cmp = aVal.toString().localeCompare(bVal.toString());
            return sortDir === 'asc' ? cmp : -cmp;
        });
    }, [filteredData, sortKey, sortDir]);

    const handleSort = (key: string) => {
        if (editingStaff) return;
        if (sortKey === key) {
            setSortDir(prev => prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc');
            if (sortDir === 'desc') setSortKey(null);
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    };

    const SortIcon = ({ col }: { col: string }) => {
        if (sortKey !== col) return <ChevronsUpDown className='h-3 w-3 ml-1 inline opacity-50' />;
        if (sortDir === 'asc') return <ChevronUp className='h-3 w-3 ml-1 inline' />;
        return <ChevronDown className='h-3 w-3 ml-1 inline' />;
    };

    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return filteredData.slice(startIndex, endIndex);
    }, [filteredData, currentPage, pageSize]);

    const totalPages = Math.ceil(filteredData.length / pageSize);

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
            role_id: '',
            work_org: '',
            work_from_date: '',
            work_to_date: '',
            subjects_dealt: '',
            work_remarks: '',
            bank_name: '',
            bank_branch: '',
            account_number: '',
            ifsc_code: '',
            account_holder_name: '',
            account_type: undefined,
            last_drawn_salary: '',
            current_salary: '',
            pf_account_number: '',
            uan_number: '',
        });
        setLocalQuals([]);
        setRemovedQualIds([]);
        setIsFormDirty(false);
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
            role_id: '',
            work_org: staff.work_org || '',
            work_from_date: staff.work_from_date || '',
            work_to_date: staff.work_to_date || '',
            subjects_dealt: staff.subjects_dealt || '',
            work_remarks: staff.work_remarks || '',
            bank_name: staff.bank_name || '',
            bank_branch: staff.bank_branch || '',
            account_number: staff.account_number || '',
            ifsc_code: staff.ifsc_code || '',
            account_holder_name: staff.account_holder_name || '',
            account_type: staff.account_type,
            last_drawn_salary: staff.last_drawn_salary || '',
            current_salary: staff.current_salary || '',
            pf_account_number: staff.pf_account_number || '',
            uan_number: staff.uan_number || '',
        });
        setLocalQuals((staff.qualifications || []).map(q => ({
            id: q.id,
            level: q.level,
            name: q.name,
            passed_out_year: q.passed_out_year?.toString() || '',
            percentage: q.percentage || '',
            university: q.university || '',
        })));
        setRemovedQualIds([]);
        setIsFormDirty(false);
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

        // Validate qualifications
        for (const q of localQuals) {
            if (!q.level || !q.name.trim()) {
                toast.error('Each qualification must have a level and degree name');
                return;
            }
        }

        try {
            let staffId: string;

            if (editingStaff) {
                await updateMutation.mutateAsync({
                    id: editingStaff.id,
                    data: {
                        ...formData,
                        current_salary: formData.current_salary ? Number(formData.current_salary) : undefined,
                        last_drawn_salary: formData.last_drawn_salary ? Number(formData.last_drawn_salary) : undefined,
                    },
                });
                staffId = editingStaff.id;

                // Delete removed qualifications
                for (const qid of removedQualIds) {
                    await staffApi.deleteQualification(staffId, qid);
                }

                // Update existing / add new qualifications
                for (const q of localQuals) {
                    const payload = {
                        level: q.level as QualificationLevel,
                        name: q.name.trim(),
                        passed_out_year: q.passed_out_year ? parseInt(q.passed_out_year) : undefined,
                        percentage: q.percentage ? parseFloat(q.percentage) : undefined,
                        university: q.university.trim() || undefined,
                    };
                    if (q.id) {
                        await staffApi.updateQualification(staffId, q.id, payload);
                    } else {
                        await staffApi.addQualification(staffId, payload);
                    }
                }
            } else {
                const created = await createMutation.mutateAsync(formData);
                staffId = created.id;

                // Add all qualifications after staff is created
                for (const q of localQuals) {
                    if (q.level && q.name.trim()) {
                        await staffApi.addQualification(staffId, {
                            level: q.level as QualificationLevel,
                            name: q.name.trim(),
                            passed_out_year: q.passed_out_year ? parseInt(q.passed_out_year) : undefined,
                            percentage: q.percentage ? parseFloat(q.percentage) : undefined,
                            university: q.university.trim() || undefined,
                        });
                    }
                }
            }

            // Refresh list so qualifications appear immediately
            queryClient.invalidateQueries({ queryKey: staffKeys.lists() });

            setShowCreateDialog(false);
            setIsFormDirty(false);
            setEditingStaff(null);
            setLocalQuals([]);
            setRemovedQualIds([]);
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

    const handleAddQual = () => {
        setLocalQuals(prev => [...prev, { level: '', name: '', passed_out_year: '', percentage: '', university: '' }]);
        setIsFormDirty(true);
    };

    const handleRemoveQual = (idx: number) => {
        const q = localQuals[idx];
        if (q.id) setRemovedQualIds(prev => [...prev, q.id!]);
        setLocalQuals(prev => prev.filter((_, i) => i !== idx));
        setIsFormDirty(true);
    };

    const handleQualChange = (idx: number, field: keyof LocalQual, value: string) => {
        setLocalQuals(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
        setIsFormDirty(true);
    };

    // Use fresh detail fetch for view dialog; fall back to list data while loading
    const displayStaff = viewStaffDetail ?? viewingStaff;

    return (
        <>
            <Card className={className}>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-2xl font-bold">Staff Enrollment</CardTitle>
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
                        <div className="flex items-center gap-2 mb-3">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search staff..."
                                value={localSearch}
                                onChange={(e) => setLocalSearch(e.target.value)}
                                className="max-w-xs"
                            />
                        </div>

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
                                        <TableHead className="px-3 py-2 text-left font-semibold border-b bg-muted w-14 text-xs text-muted-foreground">S.No.</TableHead>
                                        {filteredColumns.map(col => (
                                            ['name', 'designation', 'department'].includes(col.key) ? (
                                                <TableHead key={col.key} className="cursor-pointer select-none" onClick={() => handleSort(col.key)}>
                                                    {col.label}<SortIcon col={col.key} />
                                                </TableHead>
                                            ) : (
                                                <TableHead key={col.key}>{col.label}</TableHead>
                                            )
                                        ))}
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedData.map((staffMember, index) => (
                                        <TableRow key={staffMember.id} className="hover:bg-gray-50" style={{ height: '48px' }}>
                                            <TableCell className="px-3 align-middle text-xs text-muted-foreground">{index + 1}</TableCell>
                                            {filteredColumns.map(col => (
                                                <TableCell key={col.key} className="align-middle">
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
                                                        <StatusBadge status={staffMember.is_active} />
                                                    )}
                                                </TableCell>
                                            ))}
                                            <TableCell className="text-right">
                                                <TableActionGroup>
                                                    {hasReadPermission && (
                                                        <ViewButton
                                                            onClick={() => handleView(staffMember)}
                                                            title="View Staff Details"
                                                        />
                                                    )}
                                                    {hasUpdatePermission && (
                                                        <EditButton
                                                            onClick={() => handleEdit(staffMember)}
                                                            title="Edit Staff"
                                                        />
                                                    )}
                                                    {hasDeletePermission && (
                                                        <DeleteButton
                                                            onClick={() => handleDelete(staffMember)}
                                                            title="Delete Staff"
                                                        />
                                                    )}
                                                </TableActionGroup>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {filteredData.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={filteredColumns.length + 2} className="text-center py-8 text-gray-500">
                                                No staff enrollments found
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>

                            {/* Pagination Controls */}
                            {filteredData.length > pageSize && (
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
                                            {Math.min((currentPage - 1) * pageSize + 1, filteredData.length)}-{Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length}
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
            <Dialog
                open={showCreateDialog}
                onOpenChange={setShowCreateDialog}
                guardDirty={isFormDirty}
                onDirtyDiscard={() => setIsFormDirty(false)}
                modal={false}
            >
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>
                    {editingStaff ? 'Edit Staff Enrollment' : 'Create Staff Enrollment'}
                </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" onChange={() => setIsFormDirty(true)}>
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

                {/* Qualifications */}
                <div className="md:col-span-2 space-y-2">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                            <GraduationCap className="h-4 w-4" />
                            Qualifications
                        </h3>
                        <Button type="button" variant="outline" size="sm" onClick={handleAddQual}>
                            <Plus className="h-4 w-4 mr-1" />
                            Add Qualification
                        </Button>
                    </div>
                    {localQuals.length === 0 && (
                        <p className="text-xs text-muted-foreground">No qualifications added yet.</p>
                    )}
                    {localQuals.map((qual, idx) => (
                        <div key={idx} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-muted-foreground">Qualification {idx + 1}</span>
                                <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveQual(idx)} className="h-6 w-6 p-0">
                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-medium mb-1">Level *</label>
                                    <Select value={qual.level} onValueChange={(v) => handleQualChange(idx, 'level', v)}>
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue placeholder="Select level" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {QUALIFICATION_LEVELS.map(l => (
                                                <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">Degree / Course *</label>
                                    <CreatableSelect
                                        isClearable
                                        placeholder="e.g. B.Tech, MBA"
                                        value={qual.name ? { value: qual.name, label: qual.name } : null}
                                        options={[
                                            ...(qual.level && DEFAULT_DEGREES_BY_LEVEL[qual.level]
                                                ? DEFAULT_DEGREES_BY_LEVEL[qual.level]
                                                : Object.values(DEFAULT_DEGREES_BY_LEVEL).flat()),
                                            ...customDegreeOptions.filter(
                                                o => !Object.values(DEFAULT_DEGREES_BY_LEVEL).flat().some(d => d.value === o.value)
                                            ),
                                        ]}
                                        onChange={(opt) => {
                                            handleQualChange(idx, 'name', opt?.value ?? '');
                                            setIsFormDirty(true);
                                        }}
                                        onCreateOption={(inputValue) => {
                                            const newOpt = { value: inputValue, label: inputValue };
                                            setCustomDegreeOptions(prev =>
                                                prev.some(o => o.value === inputValue) ? prev : [...prev, newOpt]
                                            );
                                            handleQualChange(idx, 'name', inputValue);
                                            setIsFormDirty(true);
                                        }}
                                        formatCreateLabel={(input) => `Add "${input}"`}
                                        menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                                        styles={{
                                            control: (base) => ({ ...base, minHeight: '32px', height: '32px', fontSize: '12px' }),
                                            valueContainer: (base) => ({ ...base, padding: '0 8px' }),
                                            input: (base) => ({ ...base, fontSize: '12px', margin: 0, padding: 0 }),
                                            menuPortal: (base) => ({ ...base, zIndex: 9999, pointerEvents: 'auto' }),
                                            menu: (base) => ({ ...base, pointerEvents: 'auto', fontSize: '12px' }),
                                        }}
                                        menuShouldBlockScroll={false}
                                        closeMenuOnScroll={false}
                                        tabSelectsValue={false}
                                        openMenuOnFocus={true}
                                        blurInputOnSelect={true}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">Pass-out Year</label>
                                    <Input className="h-8 text-xs" type="number" min="1950" max="2100" value={qual.passed_out_year} onChange={(e) => handleQualChange(idx, 'passed_out_year', e.target.value)} placeholder="e.g. 2018" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">Percentage / CGPA</label>
                                    <Input className="h-8 text-xs" type="number" step="0.01" min="0" max="100" value={qual.percentage} onChange={(e) => handleQualChange(idx, 'percentage', e.target.value)} placeholder="e.g. 78.50" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium mb-1">University / Board</label>
                                    <Input className="h-8 text-xs" value={qual.university} onChange={(e) => handleQualChange(idx, 'university', e.target.value)} placeholder="e.g. Osmania University" />
                                </div>
                            </div>
                        </div>
                    ))}
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
                        onChange={(value) => { setIsFormDirty(true); setFormData({ ...formData, designation_id: String(value) }); }}
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
                        onChange={(value) => { setIsFormDirty(true); setFormData({ ...formData, role_id: String(value) }); }}
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

                {/* Work Experience */}
                <div className="md:col-span-2">
                    <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2 border-t pt-3">
                        <Briefcase className="h-4 w-4" />
                        Work Experience
                    </h3>
                </div>
                <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Previous Organization</label>
                    <Input value={formData.work_org || ''} onChange={(e) => { setIsFormDirty(true); setFormData({ ...formData, work_org: e.target.value }); }} placeholder="e.g. ABC School" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Subjects Dealt</label>
                    <Input value={formData.subjects_dealt || ''} onChange={(e) => { setIsFormDirty(true); setFormData({ ...formData, subjects_dealt: e.target.value }); }} placeholder="e.g. Maths, Physics" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-foreground mb-1">From Date</label>
                    <Input type="date" value={formData.work_from_date || ''} onChange={(e) => { setIsFormDirty(true); setFormData({ ...formData, work_from_date: e.target.value }); }} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-foreground mb-1">To Date</label>
                    <Input type="date" value={formData.work_to_date || ''} onChange={(e) => { setIsFormDirty(true); setFormData({ ...formData, work_to_date: e.target.value }); }} />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-1">Remarks</label>
                    <Input value={formData.work_remarks || ''} onChange={(e) => { setIsFormDirty(true); setFormData({ ...formData, work_remarks: e.target.value }); }} placeholder="Additional remarks about work experience" />
                </div>

                {/* Bank Details */}
                <div className="md:col-span-2">
                    <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2 border-t pt-3">
                        <Landmark className="h-4 w-4" />
                        Bank Details
                    </h3>
                </div>
                <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Bank Name</label>
                    <Input value={formData.bank_name || ''} onChange={(e) => { setIsFormDirty(true); setFormData({ ...formData, bank_name: e.target.value }); }} placeholder="e.g. State Bank of India" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Branch</label>
                    <Input value={formData.bank_branch || ''} onChange={(e) => { setIsFormDirty(true); setFormData({ ...formData, bank_branch: e.target.value }); }} placeholder="e.g. Hyderabad Main" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Account Number</label>
                    <Input value={formData.account_number || ''} onChange={(e) => { setIsFormDirty(true); setFormData({ ...formData, account_number: e.target.value }); }} placeholder="Enter account number" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-foreground mb-1">IFSC Code</label>
                    <Input value={formData.ifsc_code || ''} onChange={(e) => { setIsFormDirty(true); setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() }); }} placeholder="e.g. SBIN0001234" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Account Holder Name</label>
                    <Input value={formData.account_holder_name || ''} onChange={(e) => { setIsFormDirty(true); setFormData({ ...formData, account_holder_name: e.target.value }); }} placeholder="Name as per bank records" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Account Type</label>
                    <Select value={formData.account_type || ''} onValueChange={(v) => { setIsFormDirty(true); setFormData({ ...formData, account_type: v as 'Savings' | 'Current' }); }}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select account type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Savings">Savings</SelectItem>
                            <SelectItem value="Current">Current</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Salary & PF */}
                <div className="md:col-span-2">
                    <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2 border-t pt-3">
                        <Wallet className="h-4 w-4" />
                        Salary & PF
                    </h3>
                </div>
                <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Last Drawn Salary (₹)</label>
                    <Input type="number" step="0.01" min="0" value={formData.last_drawn_salary || ''} onChange={(e) => { setIsFormDirty(true); setFormData({ ...formData, last_drawn_salary: e.target.value }); }} placeholder="e.g. 45000.00" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Current Salary (₹)</label>
                    <Input type="number" step="0.01" min="0" value={formData.current_salary || ''} onChange={(e) => { setIsFormDirty(true); setFormData({ ...formData, current_salary: e.target.value }); }} placeholder="e.g. 50000.00" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-foreground mb-1">PF Account Number</label>
                    <Input value={formData.pf_account_number || ''} onChange={(e) => { setIsFormDirty(true); setFormData({ ...formData, pf_account_number: e.target.value }); }} placeholder="e.g. AP/HYD/12345" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-foreground mb-1">UAN Number</label>
                    <Input value={formData.uan_number || ''} onChange={(e) => { setIsFormDirty(true); setFormData({ ...formData, uan_number: e.target.value }); }} placeholder="12-digit UAN" />
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

        {/* View Staff Details Dialog */}
        <Dialog open={showViewDialog} onOpenChange={() => setShowViewDialog(false)}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Staff Details: {viewingStaff?.first_name} {viewingStaff?.last_name}
                    </DialogTitle>
                </DialogHeader>

                {viewDetailLoading ? (
                    <div className="flex justify-center items-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <span className="ml-2">Loading staff details...</span>
                    </div>
                ) : displayStaff && (
                    <div className="space-y-6">
                        {/* Basic Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-foreground border-b pb-2">Basic Information</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="font-medium text-muted-foreground">Full Name:</span>
                                        <span className="text-foreground">{displayStaff.first_name} {displayStaff.last_name || ''}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-medium text-muted-foreground">Gender:</span>
                                        <span className="text-foreground">{displayStaff.gender || 'Not specified'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-medium text-muted-foreground">Date of Birth:</span>
                                        <span className="text-foreground">
                                            {displayStaff.date_of_birth ? new Date(displayStaff.date_of_birth).toLocaleDateString() : 'Not specified'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-medium text-muted-foreground">Joining Date:</span>
                                        <span className="text-foreground">{new Date(displayStaff.joining_date).toLocaleDateString()}</span>
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
                                        <span className="text-foreground">{displayStaff.email || 'Not provided'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium text-muted-foreground flex items-center gap-2">
                                            <Phone className="h-4 w-4" />
                                            Phone:
                                        </span>
                                        <span className="text-foreground">{displayStaff.phone || 'Not provided'}</span>
                                    </div>
                                    <div className="flex justify-between items-start">
                                        <span className="font-medium text-muted-foreground flex items-center gap-2">
                                            <MapPin className="h-4 w-4" />
                                            Address:
                                        </span>
                                        <span className="text-foreground text-right max-w-48">{displayStaff.address || 'Not provided'}</span>
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
                                        <span className="text-foreground">{getDesignationTitle(displayStaff.designation_id)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-medium text-muted-foreground">Department:</span>
                                        <span className="text-foreground">{displayStaff.department || 'Not assigned'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium text-muted-foreground flex items-center gap-2">
                                            <Award className="h-4 w-4" />
                                            Qualification:
                                        </span>
                                        <span className="text-foreground">{displayStaff.qualification || 'Not specified'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-medium text-muted-foreground">Experience:</span>
                                        <span className="text-foreground">
                                            {displayStaff.experience_years ? `${displayStaff.experience_years} years` : 'Not specified'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-foreground border-b pb-2">Account & Status</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="font-medium text-muted-foreground">User ID:</span>
                                        <span className="text-foreground font-mono text-sm">{displayStaff.user_id}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-medium text-muted-foreground">Status:</span>
                                        <StatusBadge status={displayStaff.is_active} />
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-medium text-muted-foreground">Created:</span>
                                        <span className="text-foreground text-sm">
                                            {displayStaff.created_at ? new Date(displayStaff.created_at).toLocaleString() : '—'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-medium text-muted-foreground">Last Updated:</span>
                                        <span className="text-foreground text-sm">
                                            {displayStaff.updated_at ? new Date(displayStaff.updated_at).toLocaleString() : '—'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Qualifications */}
                        {displayStaff.qualifications && displayStaff.qualifications.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-foreground border-b pb-2 flex items-center gap-2">
                                    <GraduationCap className="h-5 w-5" />
                                    Qualifications
                                </h3>
                                <div className="space-y-2">
                                    {displayStaff.qualifications.map((q, idx) => (
                                        <div key={q.id || idx} className="flex items-start justify-between border rounded-lg p-3 bg-muted/20">
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-xs">{q.level}</Badge>
                                                    <span className="font-medium text-sm">{q.name}</span>
                                                </div>
                                                <div className="text-xs text-muted-foreground flex gap-3">
                                                    {q.university && <span>{q.university}</span>}
                                                    {q.passed_out_year && <span>Year: {q.passed_out_year}</span>}
                                                    {q.percentage && <span>{Number(q.percentage).toFixed(2)}%</span>}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Work Experience */}
                        {(displayStaff.work_org || displayStaff.work_from_date || displayStaff.subjects_dealt || displayStaff.work_remarks) && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-foreground border-b pb-2 flex items-center gap-2">
                                    <Briefcase className="h-5 w-5" />
                                    Work Experience
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {displayStaff.work_org && (
                                        <div className="flex justify-between">
                                            <span className="font-medium text-muted-foreground">Organization:</span>
                                            <span className="text-foreground">{displayStaff.work_org}</span>
                                        </div>
                                    )}
                                    {(displayStaff.work_from_date || displayStaff.work_to_date) && (
                                        <div className="flex justify-between">
                                            <span className="font-medium text-muted-foreground">Period:</span>
                                            <span className="text-foreground">
                                                {displayStaff.work_from_date ? new Date(displayStaff.work_from_date).toLocaleDateString() : '—'}
                                                {' → '}
                                                {displayStaff.work_to_date ? new Date(displayStaff.work_to_date).toLocaleDateString() : 'Present'}
                                            </span>
                                        </div>
                                    )}
                                    {displayStaff.subjects_dealt && (
                                        <div className="flex justify-between md:col-span-2">
                                            <span className="font-medium text-muted-foreground">Subjects:</span>
                                            <span className="text-foreground">{displayStaff.subjects_dealt}</span>
                                        </div>
                                    )}
                                    {displayStaff.work_remarks && (
                                        <div className="flex justify-between md:col-span-2">
                                            <span className="font-medium text-muted-foreground">Remarks:</span>
                                            <span className="text-foreground">{displayStaff.work_remarks}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Bank Details */}
                        {(displayStaff.bank_name || displayStaff.account_number || displayStaff.ifsc_code) && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-foreground border-b pb-2 flex items-center gap-2">
                                    <Landmark className="h-5 w-5" />
                                    Bank Details
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {displayStaff.bank_name && (
                                        <div className="flex justify-between">
                                            <span className="font-medium text-muted-foreground">Bank:</span>
                                            <span className="text-foreground">{displayStaff.bank_name}</span>
                                        </div>
                                    )}
                                    {displayStaff.bank_branch && (
                                        <div className="flex justify-between">
                                            <span className="font-medium text-muted-foreground">Branch:</span>
                                            <span className="text-foreground">{displayStaff.bank_branch}</span>
                                        </div>
                                    )}
                                    {displayStaff.account_holder_name && (
                                        <div className="flex justify-between">
                                            <span className="font-medium text-muted-foreground">Account Holder:</span>
                                            <span className="text-foreground">{displayStaff.account_holder_name}</span>
                                        </div>
                                    )}
                                    {displayStaff.account_type && (
                                        <div className="flex justify-between">
                                            <span className="font-medium text-muted-foreground">Account Type:</span>
                                            <Badge variant="outline">{displayStaff.account_type}</Badge>
                                        </div>
                                    )}
                                    {displayStaff.account_number && (
                                        <div className="flex justify-between">
                                            <span className="font-medium text-muted-foreground">Account No.:</span>
                                            <span className="text-foreground font-mono text-sm">{displayStaff.account_number}</span>
                                        </div>
                                    )}
                                    {displayStaff.ifsc_code && (
                                        <div className="flex justify-between">
                                            <span className="font-medium text-muted-foreground">IFSC Code:</span>
                                            <span className="text-foreground font-mono text-sm">{displayStaff.ifsc_code}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Salary & PF */}
                        {(displayStaff.last_drawn_salary || displayStaff.current_salary || displayStaff.pf_account_number || displayStaff.uan_number) && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-foreground border-b pb-2 flex items-center gap-2">
                                    <Wallet className="h-5 w-5" />
                                    Salary & PF
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {displayStaff.last_drawn_salary && (
                                        <div className="flex justify-between">
                                            <span className="font-medium text-muted-foreground">Last Drawn Salary:</span>
                                            <span className="text-foreground">₹{Number(displayStaff.last_drawn_salary).toLocaleString('en-IN')}</span>
                                        </div>
                                    )}
                                    {displayStaff.current_salary && (
                                        <div className="flex justify-between">
                                            <span className="font-medium text-muted-foreground">Current Salary:</span>
                                            <span className="text-foreground">₹{Number(displayStaff.current_salary).toLocaleString('en-IN')}</span>
                                        </div>
                                    )}
                                    {displayStaff.pf_account_number && (
                                        <div className="flex justify-between">
                                            <span className="font-medium text-muted-foreground">PF Account No.:</span>
                                            <span className="text-foreground font-mono text-sm">{displayStaff.pf_account_number}</span>
                                        </div>
                                    )}
                                    {displayStaff.uan_number && (
                                        <div className="flex justify-between">
                                            <span className="font-medium text-muted-foreground">UAN:</span>
                                            <span className="text-foreground font-mono text-sm">{displayStaff.uan_number}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Attendance Summary (if available) */}
                        {displayStaff.attendances && displayStaff.attendances.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-foreground border-b pb-2">Recent Attendance</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-muted/50 p-4 rounded-lg">
                                        <div className="text-2xl font-bold text-green-600">
                                            {displayStaff.attendances.filter(a => a.status === 'present').length}
                                        </div>
                                        <div className="text-sm text-muted-foreground">Present</div>
                                    </div>
                                    <div className="bg-muted/50 p-4 rounded-lg">
                                        <div className="text-2xl font-bold text-red-600">
                                            {displayStaff.attendances.filter(a => a.status === 'absent').length}
                                        </div>
                                        <div className="text-sm text-muted-foreground">Absent</div>
                                    </div>
                                    <div className="bg-muted/50 p-4 rounded-lg">
                                        <div className="text-2xl font-bold text-yellow-600">
                                            {displayStaff.attendances.filter(a => a.status === 'leave' || a.status === 'half-day').length}
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
                            if (displayStaff) handleEdit(displayStaff);
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
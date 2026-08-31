import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { EditButton, DeleteButton, TableActionGroup } from '@/components/common/TableActions';
import { Plus, Search, Filter, Loader2, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useFeeStudentMappings, useDeleteFeeStudentMapping } from '@/hooks/fee/useFeeMappings';
import { usePermission } from '@/hooks/usePermission';
import { useStudentsDropdown } from '@/api/hooks/students/admissions';
import { useClassSectionsDropdown } from '@/api/hooks/masters/classesandsections';
import { useAcademicYears } from '@/api/hooks/masters/academicyears';
import { useFeeTypes } from '@/hooks/fee/useFeeTypes';
import type { FeeStudentMapping } from '@/types/fee/mapping';
import { StudentMappingForm } from './StudentMappingForm';
import { BulkStudentMappingForm } from './BulkStudentMappingForm';

interface StudentMappingTableProps {
  academicYearId?: string;
}

export function StudentMappingTable({ academicYearId }: StudentMappingTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedFeeType, setSelectedFeeType] = useState<string>('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [editingMapping, setEditingMapping] = useState<FeeStudentMapping | null>(null);
  const [isBulkDirty, setIsBulkDirty] = useState(false);
  const [isCreateDirty, setIsCreateDirty] = useState(false);
  const [isEditDirty, setIsEditDirty] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const { checkPermission } = usePermission();
  const canCreate = checkPermission('fee_student_mappings', 'create');
  const canUpdate = checkPermission('fee_student_mappings', 'update');
  const canDelete = checkPermission('fee_student_mappings', 'delete');

  // Clear section when class changes
  useEffect(() => { setSelectedSection(''); }, [selectedClass]);

  // ── React Query hooks ─────────────────────────────────────────────────────
  const { data: mappingsResponse, isLoading } = useFeeStudentMappings({
    ...(academicYearId && { academic_year_id: academicYearId }),
    ...(selectedClass && { class_id: selectedClass }),
    ...(selectedSection && { section_id: selectedSection }),
    ...(selectedFeeType && { fee_type_id: selectedFeeType }),
  });
  const deleteMutation = useDeleteFeeStudentMapping();

  const { data: students = [] } = useStudentsDropdown();
  const { data: classesData = [] } = useClassSectionsDropdown();
  const { data: academicYears = [] } = useAcademicYears();
  const { data: feeTypes = [] } = useFeeTypes();

  // Normalise paginated or array response
  const mappings: FeeStudentMapping[] = Array.isArray(mappingsResponse)
    ? mappingsResponse
    : (mappingsResponse?.items ?? []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getStudentName = (studentId: string) => {
    const s = students.find(s => s.id === studentId);
    return s ? (s.display_name || s.name) : `Student ${studentId}`;
  };
  const getClassName = (classId: string) => {
    const c = classesData.find(c => c.id === classId);
    return c ? c.name : `Class ${classId}`;
  };
  const getSectionName = (classId: string, sectionId: string) => {
    const c = classesData.find(c => c.id === classId);
    if (c) { const s = c.sections.find(s => s.id === sectionId); return s ? s.name : `Section ${sectionId}`; }
    return `Section ${sectionId}`;
  };
  const getFeeTypeName = (feeTypeId: string) => {
    const ft = feeTypes.find(ft => ft.id === feeTypeId);
    return ft ? ft.type_name : `Fee Type ${feeTypeId}`;
  };

  const handleSort = (key: string) => {
    if (sortKey === key) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortKey !== colKey) return <ChevronsUpDown className="inline h-3 w-3 ml-1 opacity-50" />;
    return sortDir === 'asc' ? <ChevronUp className="inline h-3 w-3 ml-1" /> : <ChevronDown className="inline h-3 w-3 ml-1" />;
  };

  const filteredMappings = mappings.filter(m => {
    const q = searchTerm.toLowerCase();
    return getStudentName(m.student_id).toLowerCase().includes(q)
      || (m.student_admission_num || '').toLowerCase().includes(q)
      || (m.fee_type_name || '').toLowerCase().includes(q);
  });

  const displayMappings = sortKey
    ? [...filteredMappings].sort((a, b) => {
        if (sortKey === 'totalFee') {
          const diff = parseFloat(a.total_fee) - parseFloat(b.total_fee);
          return sortDir === 'asc' ? diff : -diff;
        }
        let av = '', bv = '';
        if (sortKey === 'student') { av = getStudentName(a.student_id); bv = getStudentName(b.student_id); }
        else if (sortKey === 'class') { av = getClassName(a.class_id); bv = getClassName(b.class_id); }
        else if (sortKey === 'feeType') { av = getFeeTypeName(a.fee_type_id); bv = getFeeTypeName(b.fee_type_id); }
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      })
    : filteredMappings;

  // Reset to first page when filters/sort/page size change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedClass, selectedSection, selectedFeeType, sortKey, sortDir, pageSize]);

  const totalPages = Math.max(1, Math.ceil(displayMappings.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedMappings = displayMappings.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleFormSuccess = () => {
    setIsBulkDirty(false);
    setIsCreateDirty(false);
    setIsEditDirty(false);
    setShowCreateDialog(false);
    setShowBulkDialog(false);
    setEditingMapping(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Fee Student Mappings</h2>
          <p className="text-muted-foreground">Manage fee assignments for individual students</p>
        </div>
        <div className="flex gap-2">
          {canCreate && (
          <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog} guardDirty={isBulkDirty} onDirtyDiscard={() => setIsBulkDirty(false)}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => setIsBulkDirty(false)}>
                <Plus className="w-4 h-4 mr-2" />
                Bulk Create
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl" onChange={() => setIsBulkDirty(true)}>
              <DialogHeader><DialogTitle>Bulk Create Fee Student Mappings</DialogTitle></DialogHeader>
              <BulkStudentMappingForm onSuccess={handleFormSuccess} onCancel={() => setShowBulkDialog(false)} />
            </DialogContent>
          </Dialog>
          )}

          {canCreate && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog} guardDirty={isCreateDirty} onDirtyDiscard={() => setIsCreateDirty(false)}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsCreateDirty(false)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Mapping
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl" onChange={() => setIsCreateDirty(true)}>
              <DialogHeader><DialogTitle>Create Fee Student Mapping</DialogTitle></DialogHeader>
              <StudentMappingForm academicYearId={academicYearId} onSuccess={handleFormSuccess} onCancel={() => setShowCreateDialog(false)} />
            </DialogContent>
          </Dialog>
          )}
        </div>
      </div>

      {/* Merged Card: Filters + Table */}
      <Card>
        {/* Filters Section */}
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by student name, admission number, or fee type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger><SelectValue placeholder="Filter by class" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Classes</SelectItem>
                {classesData.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedSection} onValueChange={setSelectedSection}>
              <SelectTrigger><SelectValue placeholder="Filter by section" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Sections</SelectItem>
                {selectedClass && classesData.find(c => c.id === selectedClass)?.sections.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedFeeType} onValueChange={setSelectedFeeType}>
              <SelectTrigger><SelectValue placeholder="Filter by fee type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Fee Types</SelectItem>
                {feeTypes.map(ft => <SelectItem key={ft.id} value={ft.id}>{ft.type_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>

        {/* Table Section - No gap */}
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>S.No.</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('student')}>Student <SortIcon colKey="student" /></TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('class')}>Class & Section <SortIcon colKey="class" /></TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('feeType')}>Fee Type <SortIcon colKey="feeType" /></TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('totalFee')}>Total Fee <SortIcon colKey="totalFee" /></TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex justify-center items-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <span className="ml-2">Loading mappings...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredMappings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No fee student mappings found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedMappings.map((mapping, index) => (
                  <TableRow key={mapping.id} style={{ height: '48px' }}>
                    <TableCell>{(currentPage - 1) * pageSize + index + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium">{getStudentName(mapping.student_id)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">Class: {getClassName(mapping.class_id)}</div>
                      <div className="text-sm text-muted-foreground">Section: {getSectionName(mapping.class_id, mapping.section_id)}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getFeeTypeName(mapping.fee_type_id)}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">₹{parseFloat(mapping.total_fee).toLocaleString()}</div>
                    </TableCell>
                    <TableCell>
                      <TableActionGroup>
                        {canUpdate && (
                          <EditButton onClick={() => { setIsEditDirty(false); setEditingMapping(mapping); }} title="Edit Mapping" />
                        )}
                        {canDelete && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DeleteButton onClick={() => {}} title="Delete Mapping" />
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Fee Student Mapping</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete the fee mapping for student{' '}
                                <strong>{mapping.student_admission_num}</strong>? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(mapping.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        )}
                      </TableActionGroup>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {!isLoading && displayMappings.length > 0 && (
            <div className="flex items-center justify-between flex-wrap gap-3 p-4 border-t">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span>Rows per page</span>
                  <Select value={String(pageSize)} onValueChange={(val) => setPageSize(Number(val))}>
                    <SelectTrigger className="w-16 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 10, 20, 50].map((size) => (
                        <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <span>
                  Page {currentPage} of {totalPages} ({displayMappings.length} mappings)
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editingMapping && (
        <Dialog open={!!editingMapping} onOpenChange={() => setEditingMapping(null)} guardDirty={isEditDirty} onDirtyDiscard={() => setIsEditDirty(false)}>
          <DialogContent className="max-w-2xl" onChange={() => setIsEditDirty(true)}>
            <DialogHeader><DialogTitle>Edit Fee Student Mapping</DialogTitle></DialogHeader>
            <StudentMappingForm
              mapping={editingMapping}
              academicYearId={academicYearId}
              onSuccess={handleFormSuccess}
              onCancel={() => setEditingMapping(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { EditButton, DeleteButton, TableActionGroup } from '@/components/common/TableActions';
import { Plus, Edit, Trash2, Search, Filter, Eye, Loader2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { feeStudentMappingsApi } from '@/api/fee/studentMappings';
import type { FeeStudentMapping } from '@/types/fee/mapping';
import { StudentMappingForm } from './StudentMappingForm';
import { BulkStudentMappingForm } from './BulkStudentMappingForm';
import { useStudentsDropdown } from '@/api/hooks/students/admissions';
import { useClassSectionsDropdown } from '@/api/hooks/masters/classesandsections';
import { useAcademicYears } from '@/api/hooks/masters/academicyears';
import { useFeeTypes } from '@/hooks/fee/useFeeTypes';

interface StudentMappingTableProps {
  academicYearId?: string;
}

export function StudentMappingTable({ academicYearId }: StudentMappingTableProps) {
  const [mappings, setMappings] = useState<FeeStudentMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedFeeType, setSelectedFeeType] = useState<string>('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [editingMapping, setEditingMapping] = useState<FeeStudentMapping | null>(null);
  const [deletingMapping, setDeletingMapping] = useState<FeeStudentMapping | null>(null);
  const [isBulkDirty, setIsBulkDirty] = useState(false);
  const [isCreateDirty, setIsCreateDirty] = useState(false);
  const [isEditDirty, setIsEditDirty] = useState(false);

  // Fetch mappings
  const fetchMappings = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (academicYearId) params.academic_year_id = academicYearId;
      if (selectedClass) params.class_id = selectedClass;
      if (selectedSection) params.section_id = selectedSection;
      if (selectedFeeType) params.fee_type_id = selectedFeeType;

      const response = await feeStudentMappingsApi.getAllMappings(params);
      // Handle both array response and object with items property
      const mappingsData = Array.isArray(response) ? response : (response.items || []);
      setMappings(mappingsData);
    } catch (error) {
      console.error('Error fetching mappings:', error);
      toast.error('Failed to load fee student mappings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMappings();
  }, [academicYearId, selectedClass, selectedSection, selectedFeeType]);

  // Clear section when class changes
  useEffect(() => {
    setSelectedSection('');
  }, [selectedClass]);

  // Fetch students and classes data for name resolution
  const { data: students = [] } = useStudentsDropdown();
  const { data: classesData = [] } = useClassSectionsDropdown();
  const { data: academicYears = [] } = useAcademicYears();
  const { data: feeTypes = [] } = useFeeTypes();

  // Helper functions to get names by IDs
  const getStudentName = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    return student ? (student.display_name || student.name) : `Student ${studentId}`;
  };

  const getClassName = (classId: string) => {
    const classItem = classesData.find(c => c.id === classId);
    return classItem ? classItem.name : `Class ${classId}`;
  };

  const getSectionName = (classId: string, sectionId: string) => {
    const classItem = classesData.find(c => c.id === classId);
    if (classItem) {
      const section = classItem.sections.find(s => s.id === sectionId);
      return section ? section.name : `Section ${sectionId}`;
    }
    return `Section ${sectionId}`;
  };

  const getAcademicYearName = (academicYearId: string) => {
    const academicYear = academicYears.find(ay => ay.id === academicYearId);
    return academicYear ? academicYear.title : `Academic Year ${academicYearId}`;
  };

  const getFeeTypeName = (feeTypeId: string) => {
    const feeType = feeTypes.find(ft => ft.id === feeTypeId);
    return feeType ? feeType.type_name : `Fee Type ${feeTypeId}`;
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortKey !== colKey) return <ChevronsUpDown className="inline h-3 w-3 ml-1 opacity-50" />;
    return sortDir === 'asc'
      ? <ChevronUp className="inline h-3 w-3 ml-1" />
      : <ChevronDown className="inline h-3 w-3 ml-1" />;
  };

  // Filter mappings based on search term
  const filteredMappings = mappings.filter(mapping => {
    const studentName = (getStudentName(mapping.student_id) || '').toLowerCase();
    const admissionNum = (mapping.student_admission_num || '').toLowerCase();
    const feeTypeName = (mapping.fee_type_name || '').toLowerCase();
    const searchLower = searchTerm.toLowerCase();

    return studentName.includes(searchLower) ||
           admissionNum.includes(searchLower) ||
           feeTypeName.includes(searchLower);
  });


  // Sorted display data
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

  // Handle delete mapping
  const handleDeleteMapping = async (mapping: FeeStudentMapping) => {
    try {
      await feeStudentMappingsApi.deleteMapping(mapping.id);
      toast.success('Fee student mapping deleted successfully');
      fetchMappings();
      setDeletingMapping(null);
    } catch (error) {
      console.error('Error deleting mapping:', error);
      toast.error('Failed to delete fee student mapping');
    }
  };

  // Handle create/update success
  const handleFormSuccess = () => {
    setIsBulkDirty(false);
    setIsCreateDirty(false);
    setIsEditDirty(false);
    fetchMappings();
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
          <p className="text-muted-foreground">
            Manage fee assignments for individual students
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog} guardDirty={isBulkDirty} onDirtyDiscard={() => setIsBulkDirty(false)}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => setIsBulkDirty(false)}>
                <Plus className="w-4 h-4 mr-2" />
                Bulk Create
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl" onChange={() => setIsBulkDirty(true)}>
              <DialogHeader>
                <DialogTitle>Bulk Create Fee Student Mappings</DialogTitle>
              </DialogHeader>
              <BulkStudentMappingForm
                onSuccess={handleFormSuccess}
                onCancel={() => setShowBulkDialog(false)}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog} guardDirty={isCreateDirty} onDirtyDiscard={() => setIsCreateDirty(false)}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsCreateDirty(false)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Mapping
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl" onChange={() => setIsCreateDirty(true)}>
              <DialogHeader>
                <DialogTitle>Create Fee Student Mapping</DialogTitle>
              </DialogHeader>
              <StudentMappingForm
                academicYearId={academicYearId}
                onSuccess={handleFormSuccess}
                onCancel={() => setShowCreateDialog(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
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
              <SelectTrigger>
                <SelectValue placeholder="Filter by class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Classes</SelectItem>
                {classesData.map((classItem) => (
                  <SelectItem key={classItem.id} value={classItem.id}>
                    {classItem.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedSection} onValueChange={setSelectedSection}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Sections</SelectItem>
                {selectedClass && classesData
                  .find(c => c.id === selectedClass)
                  ?.sections.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select value={selectedFeeType} onValueChange={setSelectedFeeType}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by fee type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Fee Types</SelectItem>
                {feeTypes.map((feeType) => (
                  <SelectItem key={feeType.id} value={feeType.id}>
                    {feeType.type_name}
                  </SelectItem>
                ))}
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
                <TableHead>S.No.</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('student')}>
                  Student {<SortIcon colKey="student" />}
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('class')}>
                  Class & Section {<SortIcon colKey="class" />}
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('feeType')}>
                  Fee Type {<SortIcon colKey="feeType" />}
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('totalFee')}>
                  Total Fee {<SortIcon colKey="totalFee" />}
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
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
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No fee student mappings found
                  </TableCell>
                </TableRow>
              ) : (
                displayMappings.map((mapping, index) => (
                  <TableRow key={mapping.id} style={{ height: "48px" }}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {getStudentName(mapping.student_id)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          Class: {getClassName(mapping.class_id)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Section: {getSectionName(mapping.class_id, mapping.section_id)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getFeeTypeName(mapping.fee_type_id)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">₹{parseFloat(mapping.total_fee).toLocaleString()}</div>
                    </TableCell>
                    <TableCell>
                      <TableActionGroup>
                        <EditButton
                          onClick={() => { setIsEditDirty(false); setEditingMapping(mapping); }}
                          title="Edit Mapping"
                        />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DeleteButton
                              onClick={() => setDeletingMapping(mapping)}
                              title="Delete Mapping"
                            />
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
                                onClick={() => handleDeleteMapping(mapping)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableActionGroup>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editingMapping && (
        <Dialog open={!!editingMapping} onOpenChange={() => setEditingMapping(null)} guardDirty={isEditDirty} onDirtyDiscard={() => setIsEditDirty(false)}>
          <DialogContent className="max-w-2xl" onChange={() => setIsEditDirty(true)}>
            <DialogHeader>
              <DialogTitle>Edit Fee Student Mapping</DialogTitle>
            </DialogHeader>
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
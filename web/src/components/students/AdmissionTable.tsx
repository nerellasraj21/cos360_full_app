import { Table, type TableColumn } from '@/components/common/table';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ViewButton, EditButton, ActivateButton, DeactivateButton, TableActionGroup } from '@/components/common/TableActions';
import { Loader2, Eye, Edit, CheckCircle, XCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useAdmissions, useUpdateAdmission, useToggleStudentStatus, useAdmissionTypesDropdown } from '@/api/hooks/students/admissions';
import { useClassSectionsDropdown } from '@/api/hooks/masters/classesandsections';
import { useAcademicYearsDropdown } from '@/api/hooks/masters/academicyears';
import { StateDropdown } from '@/components/dropdown/StateDropdown';
import { DistrictDropdown } from '@/components/dropdown/DistrictDropdown';
import { MandalDropdown } from '@/components/dropdown/MandalDropdown';
import { CasteDropdown } from '@/components/dropdown/CasteDropdown';
import { SubCasteDropdown } from '@/components/dropdown/SubCasteDropdown';
import { toast } from 'sonner';
import type { StudentAdmissionResponse, StudentOut } from '@/types/admission';
import type { ClassRead } from '@/types/masters/classesandsections';
import { useState } from 'react';

interface AdmissionTableData {
  id: string;
  admission_no: string;
  student_name: string;
  class_name: string;
  section_name: string;
  academic_year: string;
  admission_date: string;
  is_active: boolean;
  student_id: string;
  current_class_id: string;
  current_section_id: string;
}

interface AdmissionTableProps {
   searchQuery?: string;
   searchResults?: StudentOut[];
   hasUpdatePermission?: boolean;
}

const AdmissionTable = ({ searchQuery, searchResults, hasUpdatePermission = true }: AdmissionTableProps = {}) => {
  const navigate = useNavigate();
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isEditDirty, setIsEditDirty] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState<StudentAdmissionResponse | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [editForm, setEditForm] = useState({
    // Admission fields
    admission_date: '',
    admission_type: '',
    academic_year_id: '',
    admitted_class_id: '',
    admitted_section_id: '',
    current_class_id: '',
    current_section_id: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    state_id: '',
    district_id: '',
    mandal_id: '',
    is_previous_school: false,
    previous_school_name: '',
    previous_class: '',
    previous_school_remark: '',
    // Student fields
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    is_primary: 'not_primary',
    aadhar_number: '',
    apaar_number: '',
    nationality: '',
    mother_tongue: '',
    caste: '',
    caste_id: '',
    sub_caste: '',
    sub_caste_id: '',
    community: '',
    identification_marks: '',
    // Father fields
    father_name: '',
    father_email: '',
    father_phone: '',
    father_occupation: '',
    father_aadhar_number: '',
    father_gender: '',
    father_salary_range: '',
    // Mother fields
    mother_name: '',
    mother_email: '',
    mother_phone: '',
    mother_occupation: '',
    mother_aadhar_number: '',
    mother_gender: '',
    mother_salary_range: '',
  });

  const { data: admissionsResponse, isLoading } = useAdmissions({ skip: page * pageSize, limit: pageSize });
  const { data: classesData = [] } = useClassSectionsDropdown();
  const { data: academicYears = [] } = useAcademicYearsDropdown();
  const { data: admissionTypes = [] } = useAdmissionTypesDropdown();
  const updateMutation = useUpdateAdmission();
  const toggleStatusMutation = useToggleStudentStatus();

  // Debug: Log admissions data when it changes
  console.log('📊 Admissions Response:', admissionsResponse);
  console.log('📊 Total Count:', admissionsResponse?.total_count);
  console.log('📊 Items Count:', admissionsResponse?.items?.length);

  // Helper functions to get display names
  const getAcademicYearName = (yearId: string) => {
    const year = academicYears.find(y => String(y.id) === String(yearId));
    return year ? year.title : yearId;
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

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  };

  // Transform API data to table format
  const admissions: AdmissionTableData[] = searchQuery && searchResults
    ? searchResults.map((student: StudentOut) => ({
        id: student.id,
        admission_no: 'N/A', // Search results don't include admission number
        student_name: `${student.first_name} ${student.last_name || ''}`.trim(),
        class_name: 'N/A', // Search results don't include class info
        section_name: 'N/A',
        academic_year: 'N/A',
        admission_date: 'N/A',
        is_active: true,
        student_id: student.id,
        current_class_id: '',
        current_section_id: ''
      }))
    : admissionsResponse?.items?.map((item: StudentAdmissionResponse) => ({
        id: item.id,
        admission_no: item.admission_number || 'N/A',
        student_name: item.student ? `${item.student.first_name} ${item.student.last_name || ''}`.trim() : 'N/A',
        class_name: getClassName(item.current_class_id || ''),
        section_name: getSectionName(item.current_class_id || '', item.current_section_id || ''),
        academic_year: getAcademicYearName(item.admitted_academic_year_id || ''),
        admission_date: item.admission_date,
        is_active: item.student?.is_active ?? true,
        student_id: item.student_id || item.student?.id || '',
        current_class_id: item.current_class_id || '',
        current_section_id: item.current_section_id || ''
      })) || [];

  const columns: TableColumn<AdmissionTableData>[] = [
    {
      key: 'admission_no',
      label: 'Admission No.',
      className: 'font-medium'
    },
    {
      key: 'student_name',
      label: 'Student Name'
    },
    {
      key: 'class_name',
      label: 'Class',
      editable: true,
      renderEdit: (value, row, onChange) => (
        <Select
          value={row.current_class_id}
          onValueChange={(classId) => {
            const className = getClassName(classId);
            onChange(className);
            // Also update the class_id in the row data
            row.current_class_id = classId;
            // Reset section when class changes
            row.current_section_id = '';
            row.section_name = 'Select Section';
          }}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {classesData.map((classItem) => (
              <SelectItem key={classItem.id} value={classItem.id}>
                {classItem.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    },
    {
      key: 'section_name',
      label: 'Section',
      editable: true,
      renderEdit: (value, row, onChange) => {
        const selectedClass = classesData.find(c => c.id === row.current_class_id);
        const sections = selectedClass?.sections || [];

        return (
          <Select
            value={row.current_section_id}
            onValueChange={(sectionId) => {
              const sectionName = getSectionName(row.current_class_id, sectionId);
              onChange(sectionName);
              row.current_section_id = sectionId;
            }}
            disabled={!row.current_class_id}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Select Section" />
            </SelectTrigger>
            <SelectContent>
              {sections.map((section) => (
                <SelectItem key={section.id} value={section.id}>
                  {section.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
    },
    {
      key: 'academic_year',
      label: 'Academic Year'
    },
    {
      key: 'admission_date',
      label: 'Admission Date',
      render: (value) => new Date(value).toLocaleDateString()
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (value: boolean) => (
        <StatusBadge status={value} />
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <TableActionGroup>
          <ViewButton
            onClick={() => {
              const admission = admissionsResponse?.items?.find(item => item.id === row.id);
              if (admission) {
                setSelectedAdmission(admission);
                setViewModalOpen(true);
              }
            }}
            title="View Admission"
          />
          {hasUpdatePermission && (
            <>
              <EditButton
                onClick={() => {
                  const admission = admissionsResponse?.items?.find(item => item.id === row.id);
                  if (admission) {
                    setSelectedAdmission(admission);
                    const s = admission.student as any;
                    setEditForm({
                      // Admission fields
                      admission_date: admission.admission_date || '',
                      admission_type: admission.admission_type || '',
                      academic_year_id: admission.academic_year_id || '',
                      admitted_class_id: admission.admitted_class_id || '',
                      admitted_section_id: admission.admitted_section_id || '',
                      current_class_id: admission.current_class_id || '',
                      current_section_id: admission.current_section_id || '',
                      address_line1: admission.address_line1 || '',
                      address_line2: admission.address_line2 || '',
                      city: admission.city || '',
                      state: admission.state || '',
                      state_id: admission.state || '',  // state column stores UUID (same as state_id)
                      district_id: (admission as any).district_id || '',
                      mandal_id: (admission as any).mandal_id || '',
                      is_previous_school: admission.is_previous_school || false,
                      previous_school_name: admission.previous_school_name || '',
                      previous_class: admission.previous_class || '',
                      previous_school_remark: admission.previous_school_remark || '',
                      // Student fields
                      first_name: s?.first_name || '',
                      last_name: s?.last_name || '',
                      date_of_birth: s?.date_of_birth || '',
                      gender: s?.gender || '',
                      is_primary: s?.is_primary || 'not_primary',
                      aadhar_number: s?.aadhar_number || '',
                      apaar_number: s?.apaar_number || '',
                      nationality: s?.nationality || '',
                      mother_tongue: s?.mother_tongue || '',
                      caste: s?.caste || '',
                      caste_id: s?.caste || '',       // caste column stores UUID (same as caste_id)
                      sub_caste: s?.sub_caste || '',
                      sub_caste_id: s?.sub_caste || '', // sub_caste column stores UUID
                      community: s?.community || '',
                      identification_marks: s?.identification_marks || '',
                      // Father fields
                      father_name: s?.father?.name || '',
                      father_email: s?.father?.email || '',
                      father_phone: s?.father?.phone || '',
                      father_occupation: s?.father?.occupation || '',
                      father_aadhar_number: s?.father?.aadhar_number || '',
                      father_gender: s?.father?.gender || '',
                      father_salary_range: s?.father?.salary_range || '',
                      // Mother fields
                      mother_name: s?.mother?.name || '',
                      mother_email: s?.mother?.email || '',
                      mother_phone: s?.mother?.phone || '',
                      mother_occupation: s?.mother?.occupation || '',
                      mother_aadhar_number: s?.mother?.aadhar_number || '',
                      mother_gender: s?.mother?.gender || '',
                      mother_salary_range: s?.mother?.salary_range || '',
                    });
                    setIsEditDirty(false);
                    setEditModalOpen(true);
                  }
                }}
                title="Edit Admission"
              />
              {row.is_active ? (
                <DeactivateButton
                  onClick={() => handleToggleStatus(row)}
                  disabled={toggleStatusMutation.isPending}
                  title="Deactivate Student"
                />
              ) : (
                <ActivateButton
                  onClick={() => handleToggleStatus(row)}
                  disabled={toggleStatusMutation.isPending}
                  title="Activate Student"
                />
              )}
            </>
          )}
        </TableActionGroup>
      )
    }
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading admissions...</span>
      </div>
    );
  }

  const handleEdit = async (row: AdmissionTableData, key: string, value: any) => {
    try {
      // Find the full admission data to get all required fields
      const admission = admissionsResponse?.items?.find(item => item.id === row.id);
      if (!admission) {
        toast.error('Admission data not found');
        return;
      }

      let updateData: any = {
        admission_date: admission.admission_date,
        academic_year_id: admission.academic_year_id,
        admitted_academic_year_id: admission.admitted_academic_year_id,
        admitted_class_id: admission.admitted_class_id,
        admitted_section_id: admission.admitted_section_id,
        current_class_id: admission.current_class_id,
        current_section_id: admission.current_section_id,
        address_line1: admission.address_line1,
        address_line2: admission.address_line2,
        city: admission.city,
        state: admission.state,
        is_previous_school: admission.is_previous_school,
        previous_school_name: admission.previous_school_name,
        previous_class: admission.previous_class,
        previous_school_remark: admission.previous_school_remark
      };

      if (key === 'class_name') {
        // When class changes, update current_class_id
        updateData.current_class_id = row.current_class_id;
        // Reset section if class changed
        updateData.current_section_id = null;
      } else if (key === 'section_name') {
        // When section changes, update current_section_id
        updateData.current_class_id = row.current_class_id;
        updateData.current_section_id = row.current_section_id;
      } else {
        // Map other table keys to API fields
        const fieldMapping: Record<string, string> = {
          student_name: 'student_name',
          admission_no: 'admission_number',
          admission_date: 'admission_date',
          status: 'is_active'
        };

        const apiField = fieldMapping[key];
        if (!apiField) {
          toast.error(`Cannot edit field: ${key}`);
          return;
        }

        // Convert status to boolean
        updateData[apiField] = key === 'status' ? (value === 'Active') : value;
      }

      await updateMutation.mutateAsync({
        studentId: admission.student.id,
        data: updateData
      });
    } catch (error) {
      console.error('Error updating admission:', error);
    }
  };

  const handleToggleStatus = async (row: AdmissionTableData) => {
    try {
      const action = row.is_active ? 'disable' : 'enable';
      if (confirm(`Are you sure you want to ${action} ${row.student_name}?`)) {
        await toggleStatusMutation.mutateAsync({
          studentId: row.student_id,
          isActive: !row.is_active
        });
      }
    } catch (error) {
      console.error('Error toggling student status:', error);
    }
  };

  // Helper function to prepare details for modal
  const getAdmissionDetails = (admission: StudentAdmissionResponse) => {
    const studentData = admission.student as any;
    return [
      { label: 'Admission Number', value: admission.admission_number },
      { label: 'Admission Date', value: new Date(admission.admission_date).toLocaleDateString() },
      { label: 'Academic Year', value: getAcademicYearName(admission.academic_year_id || '') || 'N/A' },
      { label: 'Admitted Class', value: getClassName(admission.admitted_class_id || '') || 'N/A' },
      { label: 'Admitted Section', value: getSectionName(admission.admitted_class_id || '', admission.admitted_section_id || '') || 'N/A' },
      { label: 'Current Class', value: getClassName(admission.current_class_id || '') || 'N/A' },
      { label: 'Current Section', value: getSectionName(admission.current_class_id || '', admission.current_section_id || '') || 'N/A' },
      { label: 'Address Line 1', value: admission.address_line1 },
      { label: 'Address Line 2', value: admission.address_line2 || 'N/A' },
      { label: 'City', value: admission.city },
      { label: 'State', value: admission.state },
      { label: 'Student Name', value: `${studentData.first_name} ${studentData.last_name}` },
      { label: 'Date of Birth', value: new Date(studentData.date_of_birth).toLocaleDateString() },
      { label: 'Gender', value: studentData.gender },
      { label: 'Aadhar Number', value: studentData.aadhar_number || 'N/A' },
      { label: 'APAAR Number', value: studentData.apaar_number || 'N/A' },
      { label: 'Caste', value: studentData.caste || 'N/A' },
      { label: 'Sub Caste', value: studentData.sub_caste || 'N/A' },
      { label: 'Community', value: studentData.community || 'N/A' },
      { label: 'Nationality', value: studentData.nationality },
      { label: 'Mother Tongue', value: studentData.mother_tongue },
      { label: 'Identification Marks', value: studentData.identification_marks || 'N/A' },
      { label: 'Father Name', value: studentData.father?.name || 'N/A' },
      { label: 'Father Email', value: studentData.father?.email || 'N/A' },
      { label: 'Father Phone', value: studentData.father?.phone || 'N/A' },
      { label: 'Father Occupation', value: studentData.father?.occupation || 'N/A' },
      { label: 'Father Aadhar', value: studentData.father?.aadhar_number || 'N/A' },
      { label: 'Father Gender', value: studentData.father?.gender || 'N/A' },
      { label: 'Mother Name', value: studentData.mother?.name || 'N/A' },
      { label: 'Mother Email', value: studentData.mother?.email || 'N/A' },
      { label: 'Mother Phone', value: studentData.mother?.phone || 'N/A' },
      { label: 'Mother Occupation', value: studentData.mother?.occupation || 'N/A' },
      { label: 'Mother Aadhar', value: studentData.mother?.aadhar_number || 'N/A' },
      { label: 'Mother Gender', value: studentData.mother?.gender || 'N/A' },
      ...(admission.is_previous_school ? [
        { label: 'Previous School Name', value: admission.previous_school_name },
        { label: 'Previous Class', value: admission.previous_class },
        { label: 'Previous School Remark', value: admission.previous_school_remark || 'N/A' }
      ] : [])
    ];
  };

  return (
    <div className="space-y-4">
      <Table
        columns={columns}
        data={admissions}
        onEdit={handleEdit}
        isEditing={true}
        pagination={{
          page,
          pageSize,
          total: admissionsResponse?.total_count || 0,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange,
        }}
      />

      {/* View Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Admission Details - {selectedAdmission?.admission_number}</DialogTitle>
          </DialogHeader>
          {selectedAdmission && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <tbody>
                    {getAdmissionDetails(selectedAdmission).map((detail, index) => (
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
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Edit Admission - {selectedAdmission?.admission_number}</DialogTitle>
          </DialogHeader>
          {selectedAdmission && (
            <div className="space-y-4 overflow-y-auto pr-1" onChange={() => setIsEditDirty(true)}>

              {/* Admission Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-admission-date">Admission Date</Label>
                  <Input
                    id="edit-admission-date"
                    type="date"
                    value={editForm.admission_date}
                    onChange={(e) => setEditForm(prev => ({ ...prev, admission_date: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-admission-type">Admission Type</Label>
                  <Select
                    value={editForm.admission_type}
                    onValueChange={(value) => setEditForm(prev => ({ ...prev, admission_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {admissionTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-academic-year">Academic Year</Label>
                  <Select
                    value={editForm.academic_year_id}
                    onValueChange={(value) => setEditForm(prev => ({ ...prev, academic_year_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select academic year" />
                    </SelectTrigger>
                    <SelectContent>
                      {academicYears.map((year) => (
                        <SelectItem key={String(year.id)} value={String(year.id)}>
                          {year.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>{/* spacer */}</div>
              </div>

              {/* Admitted To */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-admitted-class">Admitted Class</Label>
                  <Select
                    value={editForm.admitted_class_id}
                    onValueChange={(value) => {
                      setEditForm(prev => ({
                        ...prev,
                        admitted_class_id: value,
                        admitted_section_id: ''
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classesData.map((classItem) => (
                        <SelectItem key={String(classItem.id)} value={String(classItem.id)}>
                          {classItem.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="edit-admitted-section">Admitted Section</Label>
                  <Select
                    value={editForm.admitted_section_id}
                    onValueChange={(value) => setEditForm(prev => ({ ...prev, admitted_section_id: value }))}
                    disabled={!editForm.admitted_class_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      {editForm.admitted_class_id && classesData
                        .find(c => String(c.id) === String(editForm.admitted_class_id))
                        ?.sections.map((section) => (
                          <SelectItem key={String(section.id)} value={String(section.id)}>
                            {section.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Current Placement */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-class">Current Class</Label>
                  <Select
                    value={editForm.current_class_id}
                    onValueChange={(value) => {
                      setEditForm(prev => ({
                        ...prev,
                        current_class_id: value,
                        current_section_id: '' // Reset section when class changes
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classesData.map((classItem) => (
                        <SelectItem key={String(classItem.id)} value={String(classItem.id)}>
                          {classItem.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="edit-section">Current Section</Label>
                  <Select
                    value={editForm.current_section_id}
                    onValueChange={(value) => setEditForm(prev => ({ ...prev, current_section_id: value }))}
                    disabled={!editForm.current_class_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      {editForm.current_class_id && classesData
                        .find(c => String(c.id) === String(editForm.current_class_id))
                        ?.sections.map((section) => (
                          <SelectItem key={String(section.id)} value={String(section.id)}>
                            {section.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-address1">Address Line 1</Label>
                  <Input
                    id="edit-address1"
                    value={editForm.address_line1}
                    onChange={(e) => setEditForm(prev => ({ ...prev, address_line1: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-address2">Address Line 2</Label>
                  <Input
                    id="edit-address2"
                    value={editForm.address_line2}
                    onChange={(e) => setEditForm(prev => ({ ...prev, address_line2: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-city">City</Label>
                  <Input
                    id="edit-city"
                    value={editForm.city}
                    onChange={(e) => setEditForm(prev => ({ ...prev, city: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-state">State</Label>
                  <StateDropdown
                    id="edit-state"
                    value={editForm.state_id}
                    onChange={(value) => setEditForm(prev => ({
                      ...prev,
                      state_id: value || '',
                      state: value || '',  // keep state in sync (UUID, same as create form)
                      district_id: '',
                      mandal_id: ''
                    }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-district">District (Optional)</Label>
                  <DistrictDropdown
                    id="edit-district"
                    stateId={editForm.state_id || undefined}
                    value={editForm.district_id}
                    onChange={(value) => setEditForm(prev => ({
                      ...prev,
                      district_id: value || '',
                      mandal_id: ''
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-mandal">Mandal (Optional)</Label>
                  <MandalDropdown
                    id="edit-mandal"
                    districtId={editForm.district_id || undefined}
                    value={editForm.mandal_id}
                    onChange={(value) => setEditForm(prev => ({ ...prev, mandal_id: value || '' }))}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-previous-school"
                  checked={editForm.is_previous_school}
                  onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, is_previous_school: checked as boolean }))}
                />
                <Label htmlFor="edit-previous-school">Has Previous School</Label>
              </div>

              {editForm.is_previous_school && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-prev-school">Previous School Name</Label>
                      <Input
                        id="edit-prev-school"
                        value={editForm.previous_school_name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, previous_school_name: e.target.value }))}
                      />
                    </div>

                    <div>
                      <Label htmlFor="edit-prev-class">Previous Class</Label>
                      <Input
                        id="edit-prev-class"
                        value={editForm.previous_class}
                        onChange={(e) => setEditForm(prev => ({ ...prev, previous_class: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="edit-prev-remark">Previous School Remark</Label>
                    <Textarea
                      id="edit-prev-remark"
                      value={editForm.previous_school_remark}
                      onChange={(e) => setEditForm(prev => ({ ...prev, previous_school_remark: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {/* Student Details */}
              <p className="text-sm font-semibold text-muted-foreground pt-2">Student Details</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-first-name">First Name</Label>
                  <Input id="edit-first-name" value={editForm.first_name} onChange={(e) => setEditForm(prev => ({ ...prev, first_name: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="edit-last-name">Last Name</Label>
                  <Input id="edit-last-name" value={editForm.last_name} onChange={(e) => setEditForm(prev => ({ ...prev, last_name: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-dob">Date of Birth</Label>
                  <Input id="edit-dob" type="date" value={editForm.date_of_birth} onChange={(e) => setEditForm(prev => ({ ...prev, date_of_birth: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="edit-gender">Gender</Label>
                  <Select value={editForm.gender} onValueChange={(v) => setEditForm(prev => ({ ...prev, gender: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-is-primary">Primary Status</Label>
                  <Select value={editForm.is_primary} onValueChange={(v) => setEditForm(prev => ({ ...prev, is_primary: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_primary">Not Primary</SelectItem>
                      <SelectItem value="primary">Primary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>{/* spacer */}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-aadhar">Aadhar Number</Label>
                  <Input id="edit-aadhar" value={editForm.aadhar_number} onChange={(e) => setEditForm(prev => ({ ...prev, aadhar_number: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="edit-apaar">APAAR Number</Label>
                  <Input id="edit-apaar" value={editForm.apaar_number} onChange={(e) => setEditForm(prev => ({ ...prev, apaar_number: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-nationality">Nationality</Label>
                  <Input id="edit-nationality" value={editForm.nationality} onChange={(e) => setEditForm(prev => ({ ...prev, nationality: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="edit-mother-tongue">Mother Tongue</Label>
                  <Input id="edit-mother-tongue" value={editForm.mother_tongue} onChange={(e) => setEditForm(prev => ({ ...prev, mother_tongue: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <CasteDropdown
                    id="edit-caste"
                    value={editForm.caste_id}
                    onChange={(value) => setEditForm(prev => ({ ...prev, caste_id: value || '', caste: value || '', sub_caste_id: '', sub_caste: '' }))}
                  />
                </div>
                <div>
                  <SubCasteDropdown
                    id="edit-sub-caste"
                    casteId={editForm.caste_id || undefined}
                    value={editForm.sub_caste_id}
                    onChange={(value) => setEditForm(prev => ({ ...prev, sub_caste_id: value || '', sub_caste: value || '' }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-community">Community</Label>
                  <Input id="edit-community" value={editForm.community} onChange={(e) => setEditForm(prev => ({ ...prev, community: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="edit-id-marks">Identification Marks</Label>
                  <Input id="edit-id-marks" value={editForm.identification_marks} onChange={(e) => setEditForm(prev => ({ ...prev, identification_marks: e.target.value }))} />
                </div>
              </div>

              {/* Father Details */}
              <p className="text-sm font-semibold text-muted-foreground pt-2">Father's Details</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-father-name">Name</Label>
                  <Input id="edit-father-name" value={editForm.father_name} onChange={(e) => setEditForm(prev => ({ ...prev, father_name: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="edit-father-email">Email</Label>
                  <Input id="edit-father-email" type="email" value={editForm.father_email} onChange={(e) => setEditForm(prev => ({ ...prev, father_email: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-father-phone">Phone</Label>
                  <Input id="edit-father-phone" value={editForm.father_phone} onChange={(e) => setEditForm(prev => ({ ...prev, father_phone: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="edit-father-occupation">Occupation</Label>
                  <Input id="edit-father-occupation" value={editForm.father_occupation} onChange={(e) => setEditForm(prev => ({ ...prev, father_occupation: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-father-aadhar">Aadhar Number</Label>
                  <Input id="edit-father-aadhar" value={editForm.father_aadhar_number} onChange={(e) => setEditForm(prev => ({ ...prev, father_aadhar_number: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="edit-father-gender">Gender (Optional)</Label>
                  <Select value={editForm.father_gender} onValueChange={(v) => setEditForm(prev => ({ ...prev, father_gender: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-father-salary">Salary Range (Optional)</Label>
                  <Select value={editForm.father_salary_range} onValueChange={(v) => setEditForm(prev => ({ ...prev, father_salary_range: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select salary range" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="below_1l">Below 1L</SelectItem>
                      <SelectItem value="1l_3l">1L - 3L</SelectItem>
                      <SelectItem value="3l_5l">3L - 5L</SelectItem>
                      <SelectItem value="5l_10l">5L - 10L</SelectItem>
                      <SelectItem value="above_10l">Above 10L</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Mother Details */}
              <p className="text-sm font-semibold text-muted-foreground pt-2">Mother's Details</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-mother-name">Name</Label>
                  <Input id="edit-mother-name" value={editForm.mother_name} onChange={(e) => setEditForm(prev => ({ ...prev, mother_name: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="edit-mother-email">Email</Label>
                  <Input id="edit-mother-email" type="email" value={editForm.mother_email} onChange={(e) => setEditForm(prev => ({ ...prev, mother_email: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-mother-phone">Phone</Label>
                  <Input id="edit-mother-phone" value={editForm.mother_phone} onChange={(e) => setEditForm(prev => ({ ...prev, mother_phone: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="edit-mother-occupation">Occupation</Label>
                  <Input id="edit-mother-occupation" value={editForm.mother_occupation} onChange={(e) => setEditForm(prev => ({ ...prev, mother_occupation: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-mother-aadhar">Aadhar Number</Label>
                  <Input id="edit-mother-aadhar" value={editForm.mother_aadhar_number} onChange={(e) => setEditForm(prev => ({ ...prev, mother_aadhar_number: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="edit-mother-gender">Gender (Optional)</Label>
                  <Select value={editForm.mother_gender} onValueChange={(v) => setEditForm(prev => ({ ...prev, mother_gender: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-mother-salary">Salary Range (Optional)</Label>
                  <Select value={editForm.mother_salary_range} onValueChange={(v) => setEditForm(prev => ({ ...prev, mother_salary_range: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select salary range" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="below_1l">Below 1L</SelectItem>
                      <SelectItem value="1l_3l">1L - 3L</SelectItem>
                      <SelectItem value="3l_5l">3L - 5L</SelectItem>
                      <SelectItem value="5l_10l">5L - 10L</SelectItem>
                      <SelectItem value="above_10l">Above 10L</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={async () => {
                if (selectedAdmission) {
                  try {
                    const updateData = {
                      // Admission fields
                      admission_date: editForm.admission_date || selectedAdmission.admission_date,
                      admission_type: editForm.admission_type || undefined,
                      academic_year_id: editForm.academic_year_id || selectedAdmission.academic_year_id,
                      admitted_academic_year_id: selectedAdmission.admitted_academic_year_id,
                      admitted_class_id: editForm.admitted_class_id || selectedAdmission.admitted_class_id,
                      admitted_section_id: editForm.admitted_section_id || selectedAdmission.admitted_section_id,
                      current_class_id: editForm.current_class_id || selectedAdmission.current_class_id,
                      current_section_id: editForm.current_section_id || selectedAdmission.current_section_id,
                      address_line1: editForm.address_line1,
                      address_line2: editForm.address_line2,
                      city: editForm.city,
                      state: editForm.state_id || editForm.state,  // use state_id (UUID) as state value
                      state_id: editForm.state_id || undefined,
                      district_id: editForm.district_id || undefined,
                      mandal_id: editForm.mandal_id || undefined,
                      is_previous_school: editForm.is_previous_school,
                      previous_school_name: editForm.previous_school_name,
                      previous_class: editForm.previous_class,
                      previous_school_remark: editForm.previous_school_remark,
                      // Student fields
                      first_name: editForm.first_name || undefined,
                      last_name: editForm.last_name || undefined,
                      date_of_birth: editForm.date_of_birth || undefined,
                      gender: editForm.gender || undefined,
                      is_primary: editForm.is_primary || undefined,
                      aadhar_number: editForm.aadhar_number || undefined,
                      apaar_number: editForm.apaar_number || undefined,
                      nationality: editForm.nationality || undefined,
                      mother_tongue: editForm.mother_tongue || undefined,
                      caste: editForm.caste_id || editForm.caste || undefined,
                      caste_id: editForm.caste_id || undefined,
                      sub_caste: editForm.sub_caste_id || editForm.sub_caste || undefined,
                      sub_caste_id: editForm.sub_caste_id || undefined,
                      community: editForm.community || undefined,
                      identification_marks: editForm.identification_marks || undefined,
                      // Father fields
                      father_name: editForm.father_name || undefined,
                      father_email: editForm.father_email || undefined,
                      father_phone: editForm.father_phone || undefined,
                      father_occupation: editForm.father_occupation || undefined,
                      father_aadhar_number: editForm.father_aadhar_number || undefined,
                      father_gender: editForm.father_gender || undefined,
                      father_salary_range: editForm.father_salary_range || undefined,
                      // Mother fields
                      mother_name: editForm.mother_name || undefined,
                      mother_email: editForm.mother_email || undefined,
                      mother_phone: editForm.mother_phone || undefined,
                      mother_occupation: editForm.mother_occupation || undefined,
                      mother_aadhar_number: editForm.mother_aadhar_number || undefined,
                      mother_gender: editForm.mother_gender || undefined,
                      mother_salary_range: editForm.mother_salary_range || undefined,
                    };

                    await updateMutation.mutateAsync({
                      studentId: selectedAdmission.student.id,
                      data: updateData
                    });
                    setIsEditDirty(false);
                    setEditModalOpen(false);
                  } catch (error) {
                    console.error('Error updating admission:', error);
                  }
                }
              }}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Updating...' : 'Update Admission'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdmissionTable;

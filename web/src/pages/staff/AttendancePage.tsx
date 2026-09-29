import React from 'react';
import AttendanceComponent from '../../components/common/AttendanceComponent';
import { useQuery } from '@tanstack/react-query';
import type { Teacher } from '../../types/attendance';
import { ClipboardCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';


const mockTeachers: Teacher[] = [
  { id: 1, name: 'John Smith', employee_id: 'T001' },
  { id: 2, name: 'Mary Johnson', employee_id: 'T002' },
  { id: 3, name: 'Robert Williams', employee_id: 'T003' },
  { id: 4, name: 'Patricia Brown', employee_id: 'T004' },
  { id: 5, name: 'Michael Davis', employee_id: 'T005' },
];

const TeacherAttendancePage: React.FC = () => {

  const teachersQuery = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {

      return mockTeachers;
    },
  });

  const handleSave = (attendanceData: any[]) => {
    console.log('Teacher Attendance saved:', attendanceData);
    console.log(`Total records saved: ${attendanceData.length}`);
    

    const absentCount = attendanceData.filter(record => record.status === 'Absent').length;
    const remarksCount = attendanceData.filter(record => record.remarks.trim() !== '').length;
    
    console.log(`Absent teachers: ${absentCount}`);
    console.log(`Teachers with remarks: ${remarksCount}`);
  };

  if (teachersQuery.isLoading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (teachersQuery.error) {
    return <div className="text-red-500 text-center">Error loading data</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <PageHeader title="Teacher Attendance" icon={<ClipboardCheck className="h-5 w-5" />} />
      
      <AttendanceComponent
        type="teacher"
        data={teachersQuery.data || []}
        onSave={handleSave}
        useLocalStorage={true}
      />
    </div>
  );
};

export default TeacherAttendancePage;
import React from 'react';
import AttendanceComponent from '../../components/common/AttendanceComponent';
import { useQuery } from '@tanstack/react-query';
import type { Student, Class, Section } from '../../types/attendance';


const mockStudents: Student[] = [
  { id: 1, name: 'Raj', roll_number: 1, class_id: 1, section_id: 1 },
  { id: 2, name: 'Ajay', roll_number: 2, class_id: 1, section_id: 1 },
  { id: 3, name: 'Sushant', roll_number: 3, class_id: 1, section_id: 1 },
  { id: 4, name: 'Sisira', roll_number: 4, class_id: 1, section_id: 1 },
  { id: 5, name: 'Archana', roll_number: 5, class_id: 1, section_id: 1 },
];

const mockClasses: Class[] = [
  { id: 1, name: 'First' },
  { id: 2, name: 'Second' },
  { id: 3, name: 'Third' },
];

const mockSections: Section[] = [
  { id: 1, name: 'A', class_id: 1 },
  { id: 2, name: 'B', class_id: 1 },
  { id: 3, name: 'A', class_id: 2 },
  { id: 4, name: 'B', class_id: 2 },
];

const StudentAttendancePage: React.FC = () => {

  const studentsQuery = useQuery({
    queryKey: ['students'],
    queryFn: async () => {

      return mockStudents;
    },
  });

  const classesQuery = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {

      return mockClasses;
    },
  });

  const sectionsQuery = useQuery({
    queryKey: ['sections'],
    queryFn: async () => {

      return mockSections;
    },
  });

  const handleSave = (attendanceData: any[]) => {
    console.log('Student Attendance saved:', attendanceData);
    console.log(`Total records saved: ${attendanceData.length}`);
    

    const absentCount = attendanceData.filter(record => record.status === 'Absent').length;
    const remarksCount = attendanceData.filter(record => record.remarks.trim() !== '').length;
    
    console.log(`Absent students: ${absentCount}`);
    console.log(`Students with remarks: ${remarksCount}`);
  };

  if (studentsQuery.isLoading || classesQuery.isLoading || sectionsQuery.isLoading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (studentsQuery.error || classesQuery.error || sectionsQuery.error) {
    return <div className="text-red-500 text-center">Error loading data</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Student Attendance</h1>
      
      <AttendanceComponent
        type="student"
        data={studentsQuery.data || []}
        classes={classesQuery.data || []}
        sections={sectionsQuery.data || []}
        onSave={handleSave}
        useLocalStorage={true}
      />
    </div>
  );
};

export default StudentAttendancePage;
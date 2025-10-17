// Test component to verify authentication system
import React from 'react';
import { useAuthStore } from '@/lib/authStore';
import { useIsParent, useSelectedStudent, useAvailableStudents } from '@/hooks/useStudentContext';
import { StudentSelector } from '@/components/common/StudentSelector';

export const AuthTest: React.FC = () => {
  const { 
    user, 
    isAuthenticated, 
    selectedStudent, 
    availableStudents, 
    selectStudent 
  } = useAuthStore();
  
  const isParent = useIsParent();
  const currentStudent = useSelectedStudent();
  const students = useAvailableStudents();

  if (!isAuthenticated) {
    return (
      <div className="p-4 border rounded-lg bg-red-50">
        <h3 className="font-semibold text-red-800">Not Authenticated</h3>
        <p className="text-red-600">Please log in to test the authentication system.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold">Authentication System Test</h2>
      
      {/* User Info */}
      <div className="p-4 border rounded-lg bg-blue-50">
        <h3 className="font-semibold text-blue-800">User Information</h3>
        <div className="mt-2 space-y-1 text-sm">
          <p><strong>Username:</strong> {user?.username}</p>
          <p><strong>Email:</strong> {user?.email || 'N/A'}</p>
          <p><strong>Role:</strong> {user?.role?.name}</p>
          <p><strong>Is Parent:</strong> {isParent ? 'Yes' : 'No'}</p>
          <p><strong>Is Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</p>
        </div>
      </div>

      {/* Parent Profile */}
      {user?.parent_profile && (
        <div className="p-4 border rounded-lg bg-green-50">
          <h3 className="font-semibold text-green-800">Parent Profile</h3>
          <div className="mt-2 space-y-1 text-sm">
            <p><strong>Name:</strong> {user.parent_profile.name}</p>
            <p><strong>Email:</strong> {user.parent_profile.email || 'N/A'}</p>
            <p><strong>Phone:</strong> {user.parent_profile.phone || 'N/A'}</p>
          </div>
        </div>
      )}

      {/* Student Information */}
      <div className="p-4 border rounded-lg bg-purple-50">
        <h3 className="font-semibold text-purple-800">Student Context</h3>
        <div className="mt-2 space-y-2">
          <p className="text-sm"><strong>Available Students:</strong> {students.length}</p>
          
          {students.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Student Selector:</p>
              <StudentSelector
                students={students}
                selectedStudent={currentStudent}
                onStudentChange={selectStudent}
                className="w-full max-w-md"
              />
            </div>
          )}

          {currentStudent && (
            <div className="mt-3 p-3 bg-white rounded border">
              <p className="text-sm font-medium">Selected Student:</p>
              <div className="mt-1 space-y-1 text-xs">
                <p><strong>Name:</strong> {currentStudent.name}</p>
                <p><strong>Admission Number:</strong> {currentStudent.admission_number}</p>
                <p><strong>Class:</strong> {currentStudent.class_name}</p>
                <p><strong>Academic Year:</strong> {currentStudent.academic_year}</p>
                <p><strong>Active:</strong> {currentStudent.is_active ? 'Yes' : 'No'}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Available Students List */}
      {students.length > 0 && (
        <div className="p-4 border rounded-lg bg-yellow-50">
          <h3 className="font-semibold text-yellow-800">All Available Students</h3>
          <div className="mt-2 space-y-2">
            {students.map((student) => (
              <div 
                key={student.id} 
                className={`p-2 rounded border text-sm ${
                  currentStudent?.id === student.id 
                    ? 'bg-yellow-200 border-yellow-400' 
                    : 'bg-white border-gray-200'
                }`}
              >
                <p><strong>{student.name}</strong></p>
                <p className="text-xs text-gray-600">
                  {student.admission_number} • {student.class_name} • {student.academic_year}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
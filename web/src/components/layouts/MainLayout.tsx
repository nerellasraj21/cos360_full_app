// Main layout component with student selector integration
import React from 'react';
import { Outlet } from '@tanstack/react-router';
import { useAuthStore } from '@/lib/authStore';
import { useParentStudents } from '@/api/parent';
import { StudentSelector } from '@/components/common/StudentSelector';
import { Button } from '@/components/ui/button';
import { LogOut, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children?: React.ReactNode;
  showStudentSelector?: boolean;
  className?: string;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  showStudentSelector = true,
  className,
}) => {
  const {
    user,
    selectedStudent,
    availableStudents,
    selectStudent,
    setAvailableStudents,
    logout,
    isAuthenticated,
  } = useAuthStore();

  // Fetch parent students if user is a parent
  const { data: parentStudentsData, isLoading: studentsLoading } = useParentStudents();

  // Update available students when data is fetched
  React.useEffect(() => {
    if (parentStudentsData && typeof parentStudentsData === 'object' && 'students' in parentStudentsData) {
      const data = parentStudentsData as { students: any[] };
      if (data.students && Array.isArray(data.students)) {
        setAvailableStudents(data.students);
      }
    }
  }, [parentStudentsData, setAvailableStudents]);

  const handleLogout = () => {
    logout();
  };

  const isParent = user?.parent_profile || availableStudents.length > 0;

  if (!isAuthenticated) {
    return <Outlet />;
  }

  return (
    <div className={cn("min-h-screen bg-background", className)}>
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          {/* Logo/Brand */}
          <div className="mr-4 flex">
            <a className="mr-6 flex items-center space-x-2" href="/">
              <span className="hidden font-bold sm:inline-block">
                COS360
              </span>
            </a>
          </div>

          {/* Navigation */}
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            {/* Student Selector - Only show for parents */}
            {showStudentSelector && isParent && (
              <div className="flex items-center space-x-2">
                {studentsLoading ? (
                  <div className="h-10 w-[280px] animate-pulse rounded-md bg-muted" />
                ) : (
                  <StudentSelector
                    students={availableStudents}
                    selectedStudent={selectedStudent}
                    onStudentChange={selectStudent}
                  />
                )}
              </div>
            )}

            {/* User Info and Actions */}
            <div className="flex items-center space-x-2">
              {/* User Info */}
              <div className="hidden md:flex md:flex-col md:items-end">
                <span className="text-sm font-medium">
                  {user?.parent_profile?.name || user?.username}
                </span>
                {selectedStudent && (
                  <span className="text-xs text-muted-foreground">
                    Managing: {selectedStudent.name}
                  </span>
                )}
              </div>

              {/* Logout Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="h-8 w-8 px-0"
              >
                <LogOut className="h-4 w-4" />
                <span className="sr-only">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children || <Outlet />}
      </main>
    </div>
  );
};
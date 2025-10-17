// Student selector dropdown component
import React from 'react';
import { Check, ChevronsUpDown, User, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { Student } from '@/types/auth';

interface StudentSelectorProps {
  students: Student[];
  selectedStudent: Student | null;
  onStudentChange: (student: Student) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const StudentSelector: React.FC<StudentSelectorProps> = ({
  students,
  selectedStudent,
  onStudentChange,
  className,
  placeholder = "Select student...",
  disabled = false,
}) => {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState('');

  // Don't render if no students available
  if (students.length === 0) {
    return null;
  }

  // Auto-select first student if none selected
  React.useEffect(() => {
    if (!selectedStudent && students.length > 0) {
      onStudentChange(students[0]);
    }
  }, [students, selectedStudent, onStudentChange]);

  const handleSelect = (student: Student) => {
    onStudentChange(student);
    setOpen(false);
    setSearchValue('');
  };


  // Filter students based on search
  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchValue.toLowerCase()) ||
    student.admission_number.toLowerCase().includes(searchValue.toLowerCase()) ||
    student.first_name?.toLowerCase().includes(searchValue.toLowerCase()) ||
    student.last_name?.toLowerCase().includes(searchValue.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-[280px] justify-between",
            className
          )}
          disabled={disabled}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="flex-shrink-0 text-sm">
              {selectedStudent?.gender === 'Male' ? '👦' :
               selectedStudent?.gender === 'Female' ? '👧' : '🧑'}
            </div>
            {selectedStudent ? (
              <div className="flex flex-col items-start min-w-0 flex-1">
                <span className="font-medium text-sm truncate">{selectedStudent.name}</span>
                <span className="text-xs text-muted-foreground truncate">
                  {selectedStudent.class_name}
                  {selectedStudent.section_name && ` - ${selectedStudent.section_name}`}
                </span>
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0">
        <Command>
          <CommandInput
            placeholder="Search students..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
          <CommandList>
            {filteredStudents.length === 0 ? (
              <CommandEmpty>No students found.</CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredStudents.map((student) => (
                  <CommandItem
                    key={student.id}
                    onSelect={() => handleSelect(student)}
                    className="p-3"
                  >
                    <div className="flex items-start gap-3 w-full">
                      <Check
                        className={cn(
                          "mt-1 h-4 w-4 flex-shrink-0",
                          selectedStudent?.id === student.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 text-lg">
                          {student.gender === 'Male' ? '👦' :
                           student.gender === 'Female' ? '👧' : '🧑'}
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{student.name}</span>
                            {selectedStudent?.id === student.id && (
                              <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                                Selected
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <GraduationCap className="h-3 w-3" />
                            <span className="truncate">
                              {student.class_name}
                              {student.section_name && ` - ${student.section_name}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                            <span className="font-mono">{student.admission_number}</span>
                            <div className="flex items-center gap-1">
                              <GraduationCap className="h-3 w-3" />
                              <span>{student.class_name}{student.section_name && ` - ${student.section_name}`}</span>
                            </div>
                            {student.gender && (
                              <span className="capitalize">{student.gender}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Select, DatePicker, Table, message, ConfigProvider, theme } from 'antd';
import { format } from 'date-fns';
import type {
  Student,
  Teacher,
  Class,
  Section,
  AttendanceData
} from '../../types/attendance';
import dayjs from 'dayjs';

interface AttendanceComponentProps {
  type: 'student' | 'teacher';
  data: Student[] | Teacher[];
  classes?: Class[];
  sections?: Section[];
  onSave?: (attendanceData: any[]) => void;
  useLocalStorage?: boolean;
}

const AttendanceComponent: React.FC<AttendanceComponentProps> = ({
  type,
  data,
  classes = [],
  sections = [],
  onSave,
  useLocalStorage = true
}) => {

  const isDarkMode = document.documentElement.classList.contains('dark');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedClass, setSelectedClass] = useState<number | undefined>();
  const [selectedSection, setSelectedSection] = useState<number | undefined>();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceData>({});
  const [isEditing, setIsEditing] = useState(false);
  const [hasExistingData, setHasExistingData] = useState(false);
  const [isLoading, setIsLoading] = useState(false);


  const filteredSections = sections.filter(section =>
    !selectedClass || section.class_id === selectedClass
  );


  const getStorageKey = () => {
    if (type === 'student') {
      return `attendance_${type}_${selectedDate}_${selectedClass}_${selectedSection}`;
    }
    return `attendance_${type}_${selectedDate}`;
  };


  const loadAttendanceData = () => {
    if (!useLocalStorage) return;

    const storageKey = getStorageKey();
    const savedData = localStorage.getItem(storageKey);

    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setAttendanceRecords(parsedData);
        setHasExistingData(true);
        setIsEditing(false);
      } catch (error) {
        console.error('Error parsing saved attendance data:', error);
        initializeDefaultRecords();
      }
    } else {
      initializeDefaultRecords();
    }
  };


  const initializeDefaultRecords = () => {
    const defaultRecords: AttendanceData = {};
    data.forEach((person) => {
      defaultRecords[person.id] = { status: 'Present', remarks: '' };
    });
    setAttendanceRecords(defaultRecords);
    setHasExistingData(false);
    setIsEditing(true);
  };


  useEffect(() => {
    if (type === 'teacher' || (selectedClass && selectedSection)) {
      loadAttendanceData();
    }
  }, [selectedDate, selectedClass, selectedSection, data, type, useLocalStorage]);

  const handleStatusChange = (personId: number, status: 'Present' | 'Absent') => {
    setAttendanceRecords(prev => ({
      ...prev,
      [personId]: { ...prev[personId], status }
    }));
  };

  const handleRemarksChange = (personId: number, remarks: string) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [personId]: { ...prev[personId], remarks }
    }));
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);

      if (useLocalStorage) {

        const storageKey = getStorageKey();
        localStorage.setItem(storageKey, JSON.stringify(attendanceRecords));


        const recordsToSave = Object.entries(attendanceRecords)
          .filter(([_, record]) => record.status === 'Absent' || record.remarks.trim() !== '')
          .map(([personId, record]) => ({
            [type === 'student' ? 'student_id' : 'teacher_id']: parseInt(personId),
            date: selectedDate,
            status: record.status,
            remarks: record.remarks,
            ...(type === 'student' && { class_id: selectedClass, section_id: selectedSection })
          }));

        message.success('Attendance saved successfully!');
        setIsEditing(false);
        setHasExistingData(true);

        if (onSave) {
          onSave(recordsToSave);
        }
      } else {

        message.error('API integration not implemented yet');
      }
    } catch (error) {
      message.error('Failed to save attendance');
      console.error('Save error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleClearData = () => {
    if (useLocalStorage) {
      const storageKey = getStorageKey();
      localStorage.removeItem(storageKey);
      initializeDefaultRecords();
      message.success('Attendance data cleared!');
    }
  };

  const handleViewSavedData = () => {
    if (useLocalStorage) {
      const storageKey = getStorageKey();
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        console.log('Saved attendance data:', JSON.parse(savedData));
        message.info('Check console for saved data');
      } else {
        message.info('No saved data found');
      }
    }
  };

  const columns = [
    {
      title: 'Seq',
      dataIndex: 'seq',
      key: 'seq',
      width: 60,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: type === 'student' ? 'Student Name' : 'Teacher Name',
      dataIndex: 'name',
      key: 'name',
    },
    ...(type === 'student' ? [{
      title: 'Roll Number',
      dataIndex: 'roll_number',
      key: 'roll_number',
    }] : [{
      title: 'Employee ID',
      dataIndex: 'employee_id',
      key: 'employee_id',
    }]),
    {
      title: 'Attendance',
      key: 'attendance',
      render: (_: any, record: Student | Teacher) => (
        <Select
          value={attendanceRecords[record.id]?.status || 'Present'}
          onChange={(value) => handleStatusChange(record.id, value)}
          disabled={!isEditing}
          style={{ width: 120 }}
          options={[
            { value: 'Present', label: 'Present' },
            { value: 'Absent', label: 'Absent' },
          ]}
        />
      ),
    },
    {
      title: 'Remarks',
      key: 'remarks',
      render: (_: any, record: Student | Teacher) => (
        <input
          type="text"
          value={attendanceRecords[record.id]?.remarks || ''}
          onChange={(e) => handleRemarksChange(record.id, e.target.value)}
          disabled={!isEditing}
          className="w-full px-2 py-1 border border-input rounded bg-background text-foreground placeholder:text-muted-foreground disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
          placeholder="Optional remarks"
        />
      ),
    },
  ];

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorBgContainer: isDarkMode ? 'hsl(var(--card))' : 'hsl(var(--card))',
          colorText: isDarkMode ? 'hsl(var(--card-foreground))' : 'hsl(var(--card-foreground))',
          colorBorder: isDarkMode ? 'hsl(var(--border))' : 'hsl(var(--border))',
          colorBgElevated: isDarkMode ? 'hsl(var(--popover))' : 'hsl(var(--popover))',
          colorTextPlaceholder: isDarkMode ? 'hsl(var(--muted-foreground))' : 'hsl(var(--muted-foreground))',
        },
      }}
    >
      <div className="p-6 bg-card text-card-foreground rounded-lg shadow-sm border border-border">
        <div className="mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            {type === 'student' && (
              <>
                <div className="flex items-center gap-2">
                  <label className="font-medium text-foreground">Class:</label>
                  <Select
                    placeholder="Select Class"
                    value={selectedClass}
                    onChange={(value) => {
                      setSelectedClass(value);
                      setSelectedSection(undefined);
                    }}
                    style={{ width: 150 }}
                    options={classes.map(cls => ({ value: cls.id, label: cls.name }))}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="font-medium text-foreground">Section:</label>
                  <Select
                    placeholder="Select Section"
                    value={selectedSection}
                    onChange={setSelectedSection}
                    style={{ width: 150 }}
                    disabled={!selectedClass}
                    options={filteredSections.map(section => ({ value: section.id, label: section.name }))}
                  />
                </div>
              </>
            )}
            <div className="flex items-center gap-2">
              <label className="font-medium text-foreground">Date:</label>
              <DatePicker
                value={selectedDate ? dayjs(selectedDate) : null}
                onChange={(date) => setSelectedDate(date ? date.format('YYYY-MM-DD') : '')}
                format="DD-MM-YYYY"
              />
            </div>
          </div>
        </div>


        {(type === 'teacher' || (selectedClass && selectedSection)) && (
          <>
            <Table
              columns={columns}
              dataSource={data}
              rowKey="id"
              pagination={false}
              loading={isLoading}
              size="small"
            />

            <div className="mt-4 flex gap-2">
              {isEditing ? (
                <Button

                  onClick={handleSave}

                >
                  Save
                </Button>
              ) : hasExistingData ? (
                <Button onClick={handleEdit}>
                  Edit
                </Button>
              ) : null}

              {useLocalStorage && (
                <>
                  <Button
                    onClick={handleViewSavedData}
                    disabled={isLoading}
                  >
                    View Saved Data
                  </Button>
                  {hasExistingData && (
                    <Button

                      onClick={handleClearData}
                      disabled={isLoading}
                    >
                      Clear Data
                    </Button>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {type === 'student' && (!selectedClass || !selectedSection) && (
          <div className="text-center py-8 text-muted-foreground">
            Please select class and section to view attendance
          </div>
        )}
      </div>
    </ConfigProvider>
  );
};

export default AttendanceComponent;
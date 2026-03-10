import './timetable.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { fetchSubjects } from '@/api/masters/subjects';
import type { Subject } from '@/types/masters/subject';
import type { FrontendTimetableRead, FrontendTimetableCreate, TimetableSlotOut } from '@/types/masters/timetable';
import { useFrontendTimetable, useCreateFrontendTimetableMutation, useUpdateFrontendTimetableMutation } from '@/api/timetable';
import { useClassesDropdown, useSectionsByClassId } from '@/hooks/masters/useClassesAndSections';
import { useMappingsByClass } from '@/api/hooks/masters/classsubjectmappings';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Select, { type SingleValue } from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Trash2, Save, Edit, Download, ChevronDown, Copy, LayoutGrid } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select as UiSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as htmlToImage from 'html-to-image';
import { useAcademicYearStore } from '@/lib/academicYearStore';
import { toast } from 'sonner';


const BASE_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const SATURDAY = 'Saturday';
// Default special event labels (users can create custom ones like "Assembly", "Prayer", etc.)
const SPECIAL_LABELS = [
    { value: 'SNACKS', label: 'Snacks' },
    { value: 'LUNCH', label: 'Lunch' },
    { value: 'DISPERSAL', label: 'Dispersal' },
];

type SelectOption = { value: string; label: string } | null;

function transformFrontendTimetableToRows(data: FrontendTimetableRead, includeSaturday: boolean): any[] {
   const rows: any[] = [];

   for (const item of data.timetable_data) {
      const row: any = {
         time: { from: item.time.from, to: item.time.to },
         type: item.type
      };

      if (item.type === 'subject') {
         row.subjects = item.subjects || {};
      } else {
         row.label = item.label;
      }

      rows.push(row);
   }

   return rows;
}

function transformRowsToFrontendTimetableCreate(rows: any[], sectionId: string, includeSaturday: boolean): FrontendTimetableCreate {
  const timetable_data: any[] = [];

  for (const row of rows) {
    const item: any = {
      time: {
        from: row.time.from,
        to: row.time.to
      },
      type: row.type
    };

    if (row.type === 'subject') {
      item.subjects = row.subjects;
    } else {
      item.label = row.label;
    }

    timetable_data.push(item);
  }

  return {
    section_id: sectionId,
    timetable_data
  };
}

function TimeRangeInput({
    value,
    onChange,
    wide
}: {
    value: { from: string; to: string };
    onChange: (field: 'from' | 'to', time: string) => void;
    wide?: boolean;
}) {
    return (
        <div className={wide ? "flex items-center justify-center gap-1 w-44" : "flex items-center justify-center gap-1 w-full"}>
            <Input
                type="time"
                value={value.from}
                onChange={(e) => onChange('from', e.target.value)}
                className="w-full p-1 h-8 text-xs border-input bg-card text-foreground"
                aria-label="From time"
            />
            <span className="text-muted-foreground text-lg">-</span>
            <Input
                type="time"
                value={value.to}
                onChange={(e) => onChange('to', e.target.value)}
                className="w-full p-1 h-8 text-xs border-input bg-card text-foreground"
                aria-label="To time"
            />
        </div>
    );
}

function getEmptySubjectRow(includeSaturday: boolean = false) {
    const days = includeSaturday ? [...BASE_DAYS, SATURDAY] : BASE_DAYS;
    return {
        time: { from: '', to: '' },
        type: 'subject',
        subjects: Object.fromEntries(days.map((d) => [d, ''])),
    };
}

function getEmptySpecialRow() {
    return {
        time: { from: '', to: '' },
        type: 'special',
        label: SPECIAL_LABELS[0].value,
    };
}

function formatTime12hr(time: string) {
    if (!time) return '';
    const [h, m] = time.split(":");
    let hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${m} ${ampm}`;
}

export default function TimeTableEditor() {
    const queryClient = useQueryClient();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [subjectsLoading, setSubjectsLoading] = useState(true);
    const [selectedClass, setSelectedClass] = useState<SelectOption>(null);
    const [selectedSection, setSelectedSection] = useState<SelectOption>(null);
    const [includeSaturday, setIncludeSaturday] = useState(false);
    const [rows, setRows] = useState<any[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [showRepeatAllDialog, setShowRepeatAllDialog] = useState(false);
    const [showRepeatOneDialog, setShowRepeatOneDialog] = useState(false);
    const [repeatSourceDay, setRepeatSourceDay] = useState('Monday');
    const [repeatSubjectId, setRepeatSubjectId] = useState('');
    const [savedTimetables, setSavedTimetables] = useState<Record<string, any>>({});
    const [timetableData, setTimetableData] = useState<FrontendTimetableRead | null>(null);
    const tableRef = useRef<HTMLTableElement>(null);
    const selectedAcademicYearId = useAcademicYearStore(state => state.selectedAcademicYearId);

    // Custom events state (for user-created special event types)
    const [customEvents, setCustomEvents] = useState<Array<{value: string, label: string}>>([]);

    // Combined special labels (defaults + custom)
    const allSpecialLabels = useMemo(() => {
        return [...SPECIAL_LABELS, ...customEvents];
    }, [customEvents]);

    // Helper to validate event names
    const isValidEventName = (name: string): boolean => {
        if (!name || name.trim().length === 0) return false;
        if (name.length > 50) return false;
        if (!/^[a-zA-Z0-9\s]+$/.test(name)) return false; // Alphanumeric + spaces only
        return true;
    };

    // Helper to add custom event
    const addCustomEvent = (eventName: string) => {
        const trimmed = eventName.trim();

        if (!isValidEventName(trimmed)) {
            toast.error('Event name must be 1-50 alphanumeric characters');
            return null;
        }

        // Convert to uppercase with underscores for value
        const value = trimmed.toUpperCase().replace(/\s+/g, '_');

        // Check for duplicates
        const isDuplicate = [...SPECIAL_LABELS, ...customEvents].some(e => e.value === value);
        if (isDuplicate) {
            toast.error('This event already exists');
            return null;
        }

        // Capitalize first letter of each word for label
        const label = trimmed.replace(/\b\w/g, l => l.toUpperCase());

        const newEvent = { value, label };
        setCustomEvents(prev => [...prev, newEvent]);
        toast.success(`Created custom event: ${label}`);
        return newEvent;
    };

    // Mutations
    const createFrontendTimetableMutation = useCreateFrontendTimetableMutation();
    const updateFrontendTimetableMutation = useUpdateFrontendTimetableMutation();

    // Invalidate query on success
    useEffect(() => {
        if (createFrontendTimetableMutation.isSuccess) {
            queryClient.invalidateQueries({ queryKey: ['timetable', 'frontend', selectedSection?.value] });
            setIsEditing(false);
        }
    }, [createFrontendTimetableMutation.isSuccess, queryClient, selectedSection]);

    useEffect(() => {
        if (updateFrontendTimetableMutation.isSuccess) {
            queryClient.invalidateQueries({ queryKey: ['timetable', 'frontend', selectedSection?.value] });
            setIsEditing(false);
        }
    }, [updateFrontendTimetableMutation.isSuccess, queryClient, selectedSection]);


    const getTimetableKey = (classId: string, sectionId: string) => {
        return `${classId}-${sectionId}`;
    };


    const isClassAndSectionSelected = selectedClass && selectedSection;


    const getDefaultTimetable = () => [];

    const activeDays = useMemo(() => {
        return includeSaturday ? [...BASE_DAYS, SATURDAY] : BASE_DAYS;
    }, [includeSaturday]);

    // Use hooks for data fetching
    const { data: classesData, isLoading: classesLoading } = useClassesDropdown();
    const { data: sectionsData, isLoading: sectionsLoading } = useSectionsByClassId(selectedClass?.value || '');
    const { data: frontendTimetableData, isLoading: frontendLoading, error: frontendError, isError: isFrontendError } = useFrontendTimetable(selectedSection?.value || '');
    const { data: classMappings } = useMappingsByClass(selectedClass?.value || '', { active_only: true });


    useEffect(() => {
        fetchSubjects({ active_only: true })
            .then(response => {
                setSubjects(response?.items || []);
                setSubjectsLoading(false);
            })
            .catch(() => {
                setSubjects([]);
                setSubjectsLoading(false);
            });
    }, []);

    // Load timetable data when section changes
    useEffect(() => {
        console.log('useEffect triggered: frontendTimetableData:', !!frontendTimetableData, 'isFrontendError:', isFrontendError, 'frontendError:', frontendError?.message, 'selectedSection:', selectedSection?.value);
        if (frontendTimetableData) {
            setTimetableData(frontendTimetableData);

            // Auto-detect if Saturday was saved in this timetable
            const hasSaturday = frontendTimetableData.timetable_data.some(
                item => item.type === 'subject' && item.subjects && SATURDAY in item.subjects
            );
            setIncludeSaturday(hasSaturday);

            const transformedRows = transformFrontendTimetableToRows(frontendTimetableData, hasSaturday);
            setRows(transformedRows);
            setIsEditing(false);

            // Extract custom events from loaded timetable data
            const defaultValues = SPECIAL_LABELS.map(l => l.value);
            const extractedEvents: Array<{value: string, label: string}> = [];

            frontendTimetableData.timetable_data.forEach(item => {
                if (item.type === 'special' && item.label && !defaultValues.includes(item.label)) {
                    const existing = extractedEvents.find(e => e.value === item.label);
                    if (!existing) {
                        // Convert ASSEMBLY to Assembly
                        const label = item.label.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        extractedEvents.push({
                            value: item.label,
                            label: label
                        });
                    }
                }
            });

            if (extractedEvents.length > 0) {
                setCustomEvents(extractedEvents);
            }

            console.log('Set isEditing to false (data exists)');
        } else if (isFrontendError && frontendError?.message === 'Timetable not found for this section') {
            // 404 error, timetable not found
            setTimetableData(null);
            setRows([]);
            setIsEditing(true);
            console.log('Set isEditing to true (404 error)');
        } else if (selectedSection && !isFrontendError) {
            // No existing data, set to null
            setTimetableData(null);
            setRows([]);
            setIsEditing(true);
            console.log('Set isEditing to true (no data, no error)');
        }
    }, [frontendTimetableData, selectedSection, isFrontendError, frontendError]);

    const classOptions = useMemo(() => {
        if (!classesData) return [];
        return classesData.map(cls => ({ value: cls.id, label: cls.name }));
    }, [classesData]);

    const sectionOptions = useMemo(() => {
        if (!sectionsData) return [];
        return sectionsData.map(section => ({ value: section.id, label: section.name }));
    }, [sectionsData]);

    // Filter subjects to those mapped to the selected class (and section if selected).
    // Mappings with no section_id are class-wide; mappings with a section_id are section-specific.
    const classSubjectIds = useMemo(() => {
        if (!classMappings || !selectedClass) return null;
        const sectionFiltered = classMappings.filter(
            (m) => !m.section_id || !selectedSection || m.section_id === selectedSection.value
        );
        return new Set(sectionFiltered.map((m) => m.subject_id));
    }, [classMappings, selectedClass, selectedSection]);

    const subjectOptions = useMemo(() => {
        const all = (subjects || []).map((s) => ({ value: s.id, label: s.name }));
        if (!classSubjectIds) return all;
        return all.filter((s) => classSubjectIds.has(s.value));
    }, [subjects, classSubjectIds]);

    const getSubjectNameById = (id: string) => {
        const subject = subjects.find(s => s.id === id);
        return subject ? subject.name : '';
    };

    // Display helper for Saturday cells — value can be a subject UUID, a special label, or free text
    const getSaturdayCellDisplay = (value: string): string => {
        if (!value) return 'Holiday';
        const subject = subjects.find(s => s.id === value);
        if (subject) return subject.name;
        const special = allSpecialLabels.find(l => l.value === value);
        if (special) return special.label;
        return value; // free-text entered by admin
    };

    const handleClassChange = (option: SingleValue<SelectOption>) => {
        setSelectedClass(option);
        setSelectedSection(null); // Reset section when class changes
        setRows([]); // Clear rows when class changes
        setIsEditing(false);
    };

    const handleSectionChange = (option: SingleValue<SelectOption>) => {
        setSelectedSection(option);
        setRows([]);
        setIsEditing(false);
        setIncludeSaturday(false);
    };

    const handleRowChange = (idx: number, key: string, value: any) => {
        setRows((prev) => {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], [key]: value };
            return updated;
        });
    };

    const handleSubjectChange = (rowIdx: number, day: string, value: string) => {
        setRows((prev) => {
            const updated = [...prev];
            updated[rowIdx] = {
                ...updated[rowIdx],
                subjects: { ...updated[rowIdx].subjects, [day]: value },
            };
            return updated;
        });
    };

    const addRow = (type: 'subject' | 'special') => {
        console.log('addRow called with type:', type, 'includeSaturday:', includeSaturday);
        const newRow = type === 'subject' ? getEmptySubjectRow(includeSaturday) : getEmptySpecialRow();
        console.log('newRow:', newRow);
        setRows((prev) => {
            const updated = [
                ...prev,
                newRow,
            ];
            console.log('rows after add:', updated);
            return updated;
        });
    };

    const deleteRow = (idx: number) => {
        setRows((prev) => prev.filter((_, i) => i !== idx));
    };

    // Days that have at least one subject filled in
    const daysWithData = useMemo(() => {
        return activeDays.filter(day =>
            rows.some(r => r.type === 'subject' && r.subjects?.[day])
        );
    }, [rows, activeDays]);

    // Subjects that currently appear in any row (for "Repeat One Subject" picker)
    const subjectsInRows = useMemo(() => {
        const ids = new Set<string>();
        rows.forEach(row => {
            if (row.type === 'subject') {
                activeDays.forEach(day => {
                    const val = row.subjects?.[day];
                    if (val) ids.add(val);
                });
            }
        });
        return subjectOptions.filter(s => ids.has(s.value));
    }, [rows, activeDays, subjectOptions]);

    const handleRepeatAll = () => {
        setRows((prev) => prev.map(row => {
            if (row.type !== 'subject') return row;
            const sourceValue = row.subjects?.[repeatSourceDay] || '';
            const newSubjects = { ...row.subjects };
            activeDays.forEach(day => {
                if (day !== repeatSourceDay) newSubjects[day] = sourceValue;
            });
            return { ...row, subjects: newSubjects };
        }));
        setShowRepeatAllDialog(false);
        toast.success(`${repeatSourceDay}'s schedule applied to all days`);
    };

    const handleRepeatOneSubject = () => {
        if (!repeatSubjectId) return;
        setRows((prev) => prev.map(row => {
            if (row.type !== 'subject') return row;
            const hasSubject = activeDays.some(day => row.subjects?.[day] === repeatSubjectId);
            if (!hasSubject) return row;
            const newSubjects = { ...row.subjects };
            activeDays.forEach(day => { newSubjects[day] = repeatSubjectId; });
            return { ...row, subjects: newSubjects };
        }));
        setShowRepeatOneDialog(false);
        const label = subjectOptions.find(s => s.value === repeatSubjectId)?.label || '';
        toast.success(`${label} applied to all days`);
    };

    const handleSaturdayToggle = (checked: boolean) => {
        setIncludeSaturday(checked);

        setRows((prev) => prev.map(row => {
            if (row.type === 'subject') {
                const newSubjects = { ...row.subjects };
                if (checked && !newSubjects[SATURDAY]) {
                    newSubjects[SATURDAY] = '';
                } else if (!checked && newSubjects[SATURDAY] !== undefined) {
                    delete newSubjects[SATURDAY];
                }
                return { ...row, subjects: newSubjects };
            }
            return row;
        }));
    };

    const handleTimeChange = (rowIdx: number, field: 'from' | 'to', value: string) => {
        setRows((prev) => {
            const updated = [...prev];
            const newTime = { ...updated[rowIdx].time, [field]: value };
            updated[rowIdx] = { ...updated[rowIdx], time: newTime };
            return updated;
        });
    };

    const getFileName = (extension: string) => {
        const className = selectedClass?.label || 'Unknown';
        const sectionName = selectedSection?.label || 'Unknown';
        return `Timetable - ${className} - ${sectionName}.${extension}`;
    };

    const generateTableData = () => {
        const headers = ['Time', ...activeDays];
        const data = [headers];

        rows.forEach(row => {
            const timeStr = row.time.from && row.time.to
                ? `${formatTime12hr(row.time.from)} - ${formatTime12hr(row.time.to)}`
                : '--';

            if (row.type === 'subject') {
                const rowData = [timeStr];
                activeDays.forEach(day => {
                    const subject = row.subjects[day];
                    if (day === SATURDAY) {
                        rowData.push(getSaturdayCellDisplay(subject));
                    } else {
                        rowData.push(getSubjectNameById(subject) || '--');
                    }
                });
                data.push(rowData);
            } else {
                const specialLabel = allSpecialLabels.find(opt => opt.value === row.label)?.label || row.label || '--';
                const rowData = [timeStr, ...Array(activeDays.length).fill(specialLabel)];
                data.push(rowData);
            }
        });

        return data;
    };

    const handleSavePng = async () => {
        if (!tableRef.current) return;
        const node = tableRef.current;
        try {
            const fileName = getFileName('png');
            const dataUrl = await htmlToImage.toPng(node, {
                backgroundColor: getComputedStyle(document.body).getPropertyValue('--color-background') || '#fff',
                pixelRatio: 2,
                style: {
                    margin: '0',
                    borderRadius: '12px',
                },
                filter: (el) => {

                    if (el.classList && (el.classList.contains('timetable-action-btns') || el.classList.contains('react-select__control'))) return false;
                    return true;
                },
            });
            const link = document.createElement('a');
            link.download = fileName;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            alert('Failed to export PNG');
        }
    };

    const handleSaveCsv = () => {
        try {
            const data = generateTableData();
            const csvContent = data.map(row =>
                row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
            ).join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = getFileName('csv');
            link.click();
            URL.revokeObjectURL(link.href);
        } catch (err) {
            alert('Failed to export CSV');
        }
    };

    const handleSaveExcel = () => {
        try {
            const data = generateTableData();


            const htmlTable = `
                <table>
                    ${data.map(row =>
                `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`
            ).join('')}
                </table>
            `;

            const blob = new Blob([htmlTable], {
                type: 'application/vnd.ms-excel;charset=utf-8;'
            });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = getFileName('xls');
            link.click();
            URL.revokeObjectURL(link.href);
        } catch (err) {
            alert('Failed to export Excel');
        }
    };

    console.log('Rendering component: isEditing:', isEditing, 'isClassAndSectionSelected:', isClassAndSectionSelected, 'rows length:', rows.length, 'frontendLoading:', frontendLoading, 'isFrontendError:', isFrontendError);

    return (
        <>
        <PageHeader title="Time Table Management" icon={<LayoutGrid className="h-5 w-5" />} />
        <Card className="p-4">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    {isClassAndSectionSelected && (
                        <Button
                            variant={isEditing ? 'secondary' : 'default'}
                            size="sm"
                            onClick={() => {
                                if (isEditing) {
                                    const data = transformRowsToFrontendTimetableCreate(rows, selectedSection!.value, includeSaturday);
                                    if (timetableData) {
                                        // Update
                                        updateFrontendTimetableMutation.mutate({ sectionId: selectedSection!.value, data });
                                    } else {
                                        // Create
                                        createFrontendTimetableMutation.mutate(data);
                                    }
                                }
                                setIsEditing((v) => !v);
                            }}
                            className="min-w-[80px]"
                        >
                            {isEditing ? <Save className="w-4 h-4 mr-1" /> : <Edit className="w-4 h-4 mr-1" />}
                            {isEditing ? 'Save' : 'Edit'}
                        </Button>
                    )}
                    {!isEditing && isClassAndSectionSelected && rows.length > 0 && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="min-w-[120px]"
                                >
                                    <Download className="w-4 h-4 mr-1" />
                                    Export
                                    <ChevronDown className="w-4 h-4 ml-1" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                <DropdownMenuItem onClick={handleSavePng}>
                                    <Download className="w-4 h-4 mr-2" />
                                    Save as PNG
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleSaveCsv}>
                                    <Download className="w-4 h-4 mr-2" />
                                    Save as CSV
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleSaveExcel}>
                                    <Download className="w-4 h-4 mr-2" />
                                    Save as Excel
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                    {isEditing && isClassAndSectionSelected && (
                        <div className="flex items-center gap-2 ml-4">
                            <input
                                type="checkbox"
                                id="saturday-toggle"
                                checked={includeSaturday}
                                onChange={(e) => handleSaturdayToggle(e.target.checked)}
                                className="w-4 h-4 text-primary bg-background border-input rounded focus:ring-primary focus:ring-2"
                            />
                            <label htmlFor="saturday-toggle" className="text-sm font-medium text-foreground cursor-pointer">
                                Include Saturday
                            </label>
                        </div>
                    )}
                </div>
                <h2 className="text-2xl font-bold text-center flex-1">TIMETABLE</h2>
                <div className="flex gap-4">
                    <Select
                        options={classOptions}
                        value={selectedClass}
                        onChange={handleClassChange}
                        placeholder="Select Class"
                        className="w-44"
                        classNamePrefix="react-select"
                        menuPlacement="auto"
                        menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                        styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                        isLoading={classesLoading}
                    />
                    <Select
                        options={sectionOptions}
                        value={selectedSection}
                        onChange={handleSectionChange}
                        placeholder="Select Section"
                        className="w-36"
                        classNamePrefix="react-select"
                        isDisabled={!selectedClass}
                        menuPlacement="auto"
                        menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                        styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                        isLoading={sectionsLoading}
                    />
                </div>
            </div>
            {!isClassAndSectionSelected ? (
                <div className="border rounded-lg bg-muted/30 p-8 text-center">
                    <div className="text-muted-foreground text-lg">
                        Please select a class and section to view or create a timetable
                    </div>
                    <div className="text-sm text-muted-foreground mt-2">
                        {!selectedClass && "Start by selecting a class"}
                        {selectedClass && !selectedSection && "Now select a section"}
                    </div>
                </div>
            ) : frontendLoading ? (
                <div className="border rounded-lg bg-muted/30 p-8 text-center">
                    <div className="text-muted-foreground text-lg">
                        Loading timetable data...
                    </div>
                </div>
            ) : isFrontendError && frontendError?.message !== 'Timetable not found for this section' ? (
                <div className="border rounded-lg bg-muted/30 p-8 text-center">
                    <div className="text-destructive text-lg">
                        Error loading timetable: {frontendError?.message}
                    </div>
                </div>
            ) : (
                <div className="border rounded-lg bg-muted/30 overflow-x-auto">
                    <table ref={!isEditing ? tableRef : undefined} className="w-full text-sm table-fixed align-middle timetable-table">
                        <colgroup>
                            <col style={{ width: '12rem' }} />
                            {activeDays.map((_, i) => (
                                <col key={i} style={{ width: '10.5rem' }} />
                            ))}
                            {isEditing && <col style={{ width: '4.5rem' }} />}
                        </colgroup>
                        <thead>
                            <tr className="border-b">
                                <th className="p-2 font-medium text-left text-muted-foreground">Time</th>
                                {activeDays.map((day) => {
                                    const saturdayIsAllEmpty = day === SATURDAY && !isEditing &&
                                        rows.filter(r => r.type === 'subject').every(r => !r.subjects?.[SATURDAY]);
                                    return (
                                        <th key={day} className={`p-2 font-medium text-left text-muted-foreground ${day === SATURDAY ? 'bg-muted/30' : ''}`}>
                                            {day}
                                            {saturdayIsAllEmpty && (
                                                <span className="text-xs text-muted-foreground ml-1">(Holiday)</span>
                                            )}
                                        </th>
                                    );
                                })}
                                {isEditing && <th className="p-2 font-medium text-center text-muted-foreground">Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, rowIdx) => (
                                <tr key={rowIdx} className="border-b last:border-none hover:bg-muted/50 align-middle" style={{ height: '44px' }}>

                                    <td className="align-middle p-1">
                                        {isEditing ? (
                                            <TimeRangeInput
                                                value={row.time}
                                                onChange={(field, value) => handleTimeChange(rowIdx, field, value)}
                                                wide
                                            />
                                        ) : (
                                            <span className="font-semibold text-foreground bg-muted/40 rounded px-2 py-1 inline-block min-w-[120px] text-center">
                                                {row.time.from && row.time.to
                                                    ? `${formatTime12hr(row.time.from)} - ${formatTime12hr(row.time.to)}`
                                                    : '--'}
                                            </span>
                                        )}
                                    </td>

                                    {row.type === 'subject' ? (
                                        activeDays.map((day) => (
                                            <td key={day} className={`align-middle ${day === SATURDAY ? 'bg-muted/20' : ''}`}>
                                                {isEditing ? (
                                                    day === SATURDAY ? (
                                                        // Saturday: CreatableSelect — subjects + special events + free text
                                                        <CreatableSelect
                                                            options={[
                                                                { label: 'Subjects', options: subjectOptions },
                                                                { label: 'Events', options: allSpecialLabels },
                                                            ]}
                                                            value={(() => {
                                                                const val = row.subjects[day];
                                                                if (!val) return null;
                                                                const subOpt = subjectOptions.find(o => o.value === val);
                                                                if (subOpt) return subOpt;
                                                                const specOpt = allSpecialLabels.find(o => o.value === val);
                                                                if (specOpt) return specOpt;
                                                                return { value: val, label: val };
                                                            })()}
                                                            onChange={(opt) => handleSubjectChange(rowIdx, day, opt ? opt.value : '')}
                                                            onCreateOption={(inputValue) => {
                                                                const trimmed = inputValue.trim();
                                                                if (trimmed) handleSubjectChange(rowIdx, day, trimmed);
                                                            }}
                                                            isClearable
                                                            placeholder="Subject / Event / Holiday..."
                                                            formatCreateLabel={(v) => `Use "${v}"`}
                                                            classNamePrefix="react-select"
                                                            menuPlacement="auto"
                                                            menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                                                            styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                                        />
                                                    ) : (
                                                        <Select
                                                            options={subjectOptions}
                                                            value={subjectOptions.find((opt) => opt.value === row.subjects[day]) || null}
                                                            onChange={(opt) => handleSubjectChange(rowIdx, day, opt ? opt.value : '')}
                                                            isClearable
                                                            placeholder="Select..."
                                                            classNamePrefix="react-select"
                                                            menuPlacement="auto"
                                                            menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                                                            styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                                        />
                                                    )
                                                ) : (
                                                    <span className={`block px-2 py-1 text-left bg-card/80 rounded text-foreground ${day === SATURDAY && !row.subjects[day] ? 'text-muted-foreground italic' : ''}`}>
                                                        {day === SATURDAY
                                                            ? getSaturdayCellDisplay(row.subjects[day])
                                                            : (getSubjectNameById(row.subjects[day]) || <span className="text-muted-foreground">--</span>)
                                                        }
                                                    </span>
                                                )}
                                            </td>
                                        ))
                                    ) : (
                                        <td colSpan={activeDays.length} className="align-middle text-center p-1 bg-muted/50">
                                            {isEditing ? (
                                                <CreatableSelect
                                                    options={allSpecialLabels}
                                                    value={allSpecialLabels.find((opt) => opt.value === row.label) || null}
                                                    onCreateOption={(inputValue) => {
                                                        const newEvent = addCustomEvent(inputValue);
                                                        if (newEvent) {
                                                            handleRowChange(rowIdx, 'label', newEvent.value);
                                                        }
                                                    }}
                                                    onChange={(opt) => handleRowChange(rowIdx, 'label', opt ? opt.value : allSpecialLabels[0].value)}
                                                    placeholder="Select or create event..."
                                                    formatCreateLabel={(inputValue) => `Create "${inputValue}"`}
                                                    className="w-full"
                                                    classNamePrefix="react-select"
                                                    menuPlacement="auto"
                                                    menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                                                    styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                                />
                                            ) : (
                                                <span className="block px-2 py-1 text-center bg-card/80 rounded text-foreground font-semibold">
                                                    {allSpecialLabels.find((opt) => opt.value === row.label)?.label || row.label || '--'}
                                                </span>
                                            )}
                                        </td>
                                    )}

                                    {isEditing && (
                                        <td className="align-middle text-center">
                                            <div className="timetable-action-btns">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:text-destructive"
                                                    onClick={() => deleteRow(rowIdx)}
                                                    title="Delete row"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {isClassAndSectionSelected && (
                <div className="mt-4 flex gap-2">
                    {isEditing && <>
                        <Button onClick={() => addRow('subject')}>+ Add Subject Row</Button>
                        <Button variant="secondary" onClick={() => addRow('special')}>+ Add Special Row</Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setRepeatSourceDay(daysWithData[0] || 'Monday');
                                setShowRepeatAllDialog(true);
                            }}
                            disabled={daysWithData.length === 0}
                            title="Copy a day's full schedule to all other days"
                        >
                            <Copy className="w-4 h-4 mr-1" />
                            Repeat All for Week
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setRepeatSubjectId('');
                                setShowRepeatOneDialog(true);
                            }}
                            disabled={subjectsInRows.length === 0}
                            title="Repeat one subject across all days"
                        >
                            <Copy className="w-4 h-4 mr-1" />
                            Repeat One Subject
                        </Button>
                    </>}
                </div>
            )}
        </Card>

        {/* Repeat All Subjects Dialog */}
        <Dialog open={showRepeatAllDialog} onOpenChange={setShowRepeatAllDialog}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>Repeat All Subjects for Week</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                        Select the day to copy from. All its subject selections will be applied to every other active day.
                    </p>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Copy from day</label>
                        <UiSelect value={repeatSourceDay} onValueChange={setRepeatSourceDay}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select day" />
                            </SelectTrigger>
                            <SelectContent>
                                {daysWithData.map(day => (
                                    <SelectItem key={day} value={day}>{day}</SelectItem>
                                ))}
                            </SelectContent>
                        </UiSelect>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setShowRepeatAllDialog(false)}>Cancel</Button>
                    <Button onClick={handleRepeatAll} disabled={!repeatSourceDay}>Apply to All Days</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Repeat One Subject Dialog */}
        <Dialog open={showRepeatOneDialog} onOpenChange={setShowRepeatOneDialog}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>Repeat One Subject for Week</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                        Select a subject. For every period that already has this subject on any day, it will be applied to all days in that period.
                    </p>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Subject</label>
                        <UiSelect value={repeatSubjectId} onValueChange={setRepeatSubjectId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select subject" />
                            </SelectTrigger>
                            <SelectContent>
                                {subjectsInRows.map(s => (
                                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </UiSelect>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setShowRepeatOneDialog(false)}>Cancel</Button>
                    <Button onClick={handleRepeatOneSubject} disabled={!repeatSubjectId}>Apply to All Days</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    );
} 
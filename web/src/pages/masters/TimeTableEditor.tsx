import './timetable.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchSubjects } from '@/api/masters/subjects';
import { fetchClassesAndSections } from '@/api/masters/classesandsections';
import type { Subject, ClassAndSection } from '@/types/masters';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Select, { type SingleValue } from 'react-select';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Trash2, Save, Pencil, Download, ChevronDown } from 'lucide-react';
import * as htmlToImage from 'html-to-image';

const BASE_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const SATURDAY = 'Saturday';
const SPECIAL_LABELS = [
    { value: 'SNACKS', label: 'Snacks' },
    { value: 'LUNCH', label: 'Lunch' },
    { value: 'DISPERSAL', label: 'Dispersal' },
];
const TYPE_OPTIONS = [
    { value: 'subject', label: 'Subject' },
    { value: 'special', label: 'Special' },
];

type SelectOption = { value: string; label: string } | null;


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
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [classesAndSections, setClassesAndSections] = useState<ClassAndSection[]>([]);
    const [selectedClass, setSelectedClass] = useState<SelectOption>(null);
    const [selectedSection, setSelectedSection] = useState<SelectOption>(null);
    const [includeSaturday, setIncludeSaturday] = useState(false);
    const [rows, setRows] = useState<any[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [savedTimetables, setSavedTimetables] = useState<Record<string, any>>({});
    const tableRef = useRef<HTMLTableElement>(null);


    const getTimetableKey = (className: string, sectionName: string) => {
        return `${className}-${sectionName}`;
    };


    const isClassAndSectionSelected = selectedClass && selectedSection;


    const getDefaultTimetable = () => [
        { ...getEmptySubjectRow(false), time: { from: '09:00', to: '09:15' } },
        { ...getEmptySpecialRow(), time: { from: '09:55', to: '10:10' }, label: 'SNACKS' },
    ];

    const activeDays = useMemo(() => {
        return includeSaturday ? [...BASE_DAYS, SATURDAY] : BASE_DAYS;
    }, [includeSaturday]);

    useEffect(() => {
        fetchSubjects().then(setSubjects);
        fetchClassesAndSections().then(setClassesAndSections);
    }, []);

    const classOptions = useMemo(() => {
        const classNames = [...new Set(classesAndSections.map(item => item.class_name))];
        return classNames.map(name => ({ value: name, label: name }));
    }, [classesAndSections]);

    const sectionOptions = useMemo(() => {
        if (!selectedClass) return [];
        return classesAndSections
            .filter(item => item.class_name === selectedClass.value)
            .map(item => ({ value: item.section_name, label: item.section_name }));
    }, [selectedClass, classesAndSections]);

    const subjectOptions = subjects.map((s) => ({ value: s.name, label: s.name }));

    const handleClassChange = (option: SingleValue<SelectOption>) => {
        setSelectedClass(option);
        setSelectedSection(null); // Reset section when class changes
        setRows([]); // Clear rows when class changes
        setIsEditing(false);
    };

    const handleSectionChange = (option: SingleValue<SelectOption>) => {
        setSelectedSection(option);

        if (option && selectedClass) {
            const timetableKey = getTimetableKey(selectedClass.value, option.value);
            const existingTimetable = savedTimetables[timetableKey];

            if (existingTimetable) {

                setRows(existingTimetable.rows);
                setIncludeSaturday(existingTimetable.includeSaturday || false);
                setIsEditing(false);
            } else {

                setRows(getDefaultTimetable());
                setIncludeSaturday(false);
                setIsEditing(true);
            }
        } else {
            setRows([]);
            setIsEditing(false);
        }
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
        setRows((prev) => [
            ...prev,
            type === 'subject' ? getEmptySubjectRow(includeSaturday) : getEmptySpecialRow(),
        ]);
    };

    const deleteRow = (idx: number) => {
        setRows((prev) => prev.filter((_, i) => i !== idx));
    };

    const handleTypeChange = (rowIdx: number, type: 'subject' | 'special') => {
        setRows((prev) => {
            const updated = [...prev];
            const template = type === 'subject' ? getEmptySubjectRow(includeSaturday) : getEmptySpecialRow();
            updated[rowIdx] = { ...template, time: updated[rowIdx].time };
            return updated;
        });
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
                    if (day === SATURDAY && !subject) {
                        rowData.push('Holiday');
                    } else {
                        rowData.push(subject || '--');
                    }
                });
                data.push(rowData);
            } else {
                const specialLabel = SPECIAL_LABELS.find(opt => opt.value === row.label)?.label || '--';
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

    return (
        <Card className="p-4">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    {isClassAndSectionSelected && (
                        <Button
                            variant={isEditing ? 'secondary' : 'default'}
                            size="sm"
                            onClick={() => {
                                if (isEditing) {

                                    const timetableKey = getTimetableKey(selectedClass!.value, selectedSection!.value);
                                    setSavedTimetables(prev => ({
                                        ...prev,
                                        [timetableKey]: {
                                            rows: [...rows],
                                            includeSaturday,
                                            lastModified: new Date().toISOString()
                                        }
                                    }));
                                }
                                setIsEditing((v) => !v);
                            }}
                            className="min-w-[80px]"
                        >
                            {isEditing ? <Save className="w-4 h-4 mr-1" /> : <Pencil className="w-4 h-4 mr-1" />}
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
            ) : (
                <div className={isEditing ? 'border rounded-lg overflow-x-auto' : 'border rounded-lg bg-muted/30'}>
                    <table ref={!isEditing ? tableRef : undefined} className="w-full text-sm table-fixed align-middle timetable-table">
                        <colgroup>
                            <col style={{ width: '12rem' }} />
                            {activeDays.map((_, i) => (
                                <col key={i} style={{ width: '10.5rem' }} />
                            ))}
                            {isEditing && <col style={{ width: '6.5rem' }} />}
                            {isEditing && <col style={{ width: '4.5rem' }} />}
                        </colgroup>
                        <thead>
                            <tr className="border-b">
                                <th className="p-2 font-medium text-left text-muted-foreground">Time</th>
                                {activeDays.map((day) => (
                                    <th key={day} className={`p-2 font-medium text-left text-muted-foreground ${day === SATURDAY ? 'bg-muted/30' : ''}`}>
                                        {day}
                                        {day === SATURDAY && !isEditing && (
                                            <span className="text-xs text-muted-foreground ml-1">(Holiday)</span>
                                        )}
                                    </th>
                                ))}
                                {isEditing && <th className="p-2 font-medium text-center text-muted-foreground">Type</th>}
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
                                                ) : (
                                                    <span className={`block px-2 py-1 text-left bg-card/80 rounded text-foreground ${day === SATURDAY && !row.subjects[day] ? 'text-muted-foreground italic' : ''}`}>
                                                        {day === SATURDAY && !row.subjects[day] ? 'Holiday' : (row.subjects[day] || <span className="text-muted-foreground">--</span>)}
                                                    </span>
                                                )}
                                            </td>
                                        ))
                                    ) : (
                                        <td colSpan={activeDays.length} className="align-middle text-center p-1 bg-muted/50">
                                            {isEditing ? (
                                                <Select
                                                    options={SPECIAL_LABELS}
                                                    value={SPECIAL_LABELS.find((opt) => opt.value === row.label) || null}
                                                    onChange={(opt) => handleRowChange(rowIdx, 'label', opt ? opt.value : SPECIAL_LABELS[0].value)}
                                                    className="w-full"
                                                    classNamePrefix="react-select"
                                                    menuPlacement="auto"
                                                    menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                                                    styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                                />
                                            ) : (
                                                <span className="block px-2 py-1 text-center bg-card/80 rounded text-foreground font-semibold">
                                                    {SPECIAL_LABELS.find((opt) => opt.value === row.label)?.label || '--'}
                                                </span>
                                            )}
                                        </td>
                                    )}

                                    {isEditing && (
                                        <td className="align-middle text-center">
                                            <Select
                                                options={TYPE_OPTIONS}
                                                value={TYPE_OPTIONS.find((opt) => opt.value === row.type) || TYPE_OPTIONS[0]}
                                                onChange={(opt) => handleTypeChange(rowIdx, opt ? (opt.value as 'subject' | 'special') : 'subject')}
                                                className="timetable-type-select min-w-[5.5rem] max-w-[6.5rem]"
                                                classNamePrefix="react-select"
                                                menuPlacement="auto"
                                                menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                                                styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                                isSearchable={false}
                                            />
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
                    </>}
                </div>
            )}
        </Card>
    );
} 
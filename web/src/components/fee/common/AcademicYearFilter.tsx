import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAcademicYearStore } from '@/lib/academicYearStore';
import { useEffect } from 'react';

interface AcademicYearFilterProps {
    value: number;
    onValueChange: (value: number) => void;
    className?: string;
}

export function AcademicYearFilter({ value, onValueChange, className }: AcademicYearFilterProps) {
    const { academicYears, fetchAndSetAcademicYears } = useAcademicYearStore();

    useEffect(() => {
        if (academicYears.length === 0) {
            fetchAndSetAcademicYears();
        }
    }, [academicYears.length, fetchAndSetAcademicYears]);

    const handleValueChange = (stringValue: string) => {
        const numericValue = parseInt(stringValue, 10);
        onValueChange(numericValue);
    };

    return (
        <div className={className}>
            <Select value={value.toString()} onValueChange={handleValueChange}>
                <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select Academic Year" />
                </SelectTrigger>
                <SelectContent>
                    {academicYears.map((year) => (
                        <SelectItem key={year.id} value={year.id.toString()}>
                            {year.name} {year.is_active && '(Active)'}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
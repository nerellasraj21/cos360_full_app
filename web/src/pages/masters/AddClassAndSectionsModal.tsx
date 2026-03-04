import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ClassCreate, SectionCreate } from '@/types/masters/classesandsections';
import { useAcademicYearStore } from '@/lib/academicYearStore';
import { toast } from 'sonner';

interface AddClassAndSectionsModalProps {
  onSubmit: (data: ClassCreate) => void;
  isPending?: boolean;
}

const defaultSection: SectionCreate = { name: '' };

export function AddClassAndSectionsModal({ onSubmit, isPending }: AddClassAndSectionsModalProps) {
   const [isOpen, setIsOpen] = useState(false);
   const [isDirty, setIsDirty] = useState(false);
   const [step, setStep] = useState(0);
   const selectedAcademicYearId = useAcademicYearStore(state => state.selectedAcademicYearId);

   const [classData, setClassData] = useState({
     name: '',
     short_code: '',
     academic_year_id: selectedAcademicYearId || '',
     is_active: true,
   });
   const [sections, setSections] = useState<SectionCreate[]>([{ ...defaultSection }]);
   const [startLetter, setStartLetter] = useState('A');
   const [endLetter, setEndLetter] = useState('D');

   // Update academic_year_id when selectedAcademicYearId changes
   useEffect(() => {
     console.log('AddClassAndSectionsModal: selectedAcademicYearId changed:', selectedAcademicYearId);
     setClassData(prev => ({
       ...prev,
       academic_year_id: selectedAcademicYearId || '',
     }));
   }, [selectedAcademicYearId]);

  const handleClassChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const fieldName = name === 'class_name' ? 'name' : name === 'class_code' ? 'short_code' : name;
    setIsDirty(true);
    setClassData((prev) => ({
      ...prev,
      [fieldName]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSectionChange = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setIsDirty(true);
    setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, name: value } : s)));
  };

  const addSection = () => setSections((prev) => [...prev, { ...defaultSection }]);
  const removeSection = (idx: number) => setSections((prev) => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);

  const generateSectionsAlphabetically = () => {
    const start = startLetter.toUpperCase().charCodeAt(0);
    const end = endLetter.toUpperCase().charCodeAt(0);

    if (start > end) {
      toast.error('Start letter must come before end letter');
      return;
    }

    if (start < 65 || start > 90 || end < 65 || end > 90) {
      toast.error('Please use letters A-Z only');
      return;
    }

    const newSections: SectionCreate[] = [];
    for (let i = start; i <= end; i++) {
      newSections.push({ name: String.fromCharCode(i) });
    }

    setSections(newSections);
    toast.success(`Generated ${newSections.length} sections from ${startLetter} to ${endLetter}`);
  };

  const handleNext = () => setStep((s) => s + 1);
  const handleBack = () => setStep((s) => s - 1);
  const handleView = () => setStep(2);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    console.log('AddClassAndSectionsModal: Submitting with classData:', classData);
    console.log('AddClassAndSectionsModal: selectedAcademicYearId:', selectedAcademicYearId);

    // Validate required fields
    if (!classData.name.trim()) {
      toast.error('Class name is required');
      return;
    }
    if (!classData.short_code.trim()) {
      toast.error('Class code is required');
      return;
    }
    if (!classData.academic_year_id || !isValidUUID(classData.academic_year_id)) {
      console.error('AddClassAndSectionsModal: Invalid academic_year_id:', classData.academic_year_id);
      toast.error('Valid academic year is required');
      return;
    }
    if (sections.length === 0 || sections.some(s => !s.name.trim())) {
      toast.error('At least one section with name is required');
      return;
    }

    const submitData = { ...classData, sections };
    console.log('AddClassAndSectionsModal: Submitting data:', submitData);
    onSubmit(submitData);
    setIsOpen(false);
    setIsDirty(false);
    setStep(0);
    setClassData({ name: '', short_code: '', academic_year_id: selectedAcademicYearId || '', is_active: true });
    setSections([{ ...defaultSection }]);
    setStartLetter('A');
    setEndLetter('D');
  };

  // UUID validation helper
  const isValidUUID = (uuid: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  const isClassStepValid = classData.name && classData.short_code ;
  const isSectionsStepValid = sections.every((s) => s.name.trim()) && sections.length > 0;

  const handleDiscard = () => {
    setIsDirty(false);
    setStep(0);
    setClassData({ name: '', short_code: '', academic_year_id: selectedAcademicYearId || '', is_active: true });
    setSections([{ ...defaultSection }]);
    setStartLetter('A');
    setEndLetter('D');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen} guardDirty={isDirty} onDirtyDiscard={handleDiscard}>
      <DialogTrigger asChild>
        <Button>Add Class & Sections</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {step === 0 && 'Enter Class Details'}
            {step === 1 && 'Add Sections'}
            {step === 2 && 'Summary'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[calc(90vh-8rem)]">
          <div className="flex-1 overflow-y-auto px-1">
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="class_name">Class Name</Label>
                <Input id="class_name" name="class_name" value={classData.name} onChange={handleClassChange} required />
              </div>
              <div>
                <Label htmlFor="class_code">Class Code</Label>
                <Input id="class_code" name="class_code" value={classData.short_code} onChange={handleClassChange} required />
              </div>

              <div className="flex items-center gap-2 mt-2">
                <Label htmlFor="is_active">Active</Label>
                <Input id="is_active" name="is_active" type="checkbox" checked={classData.is_active} onChange={handleClassChange} className="w-4 h-4" />
              </div>
            </div>
          )}
          {step === 1 && (
            <div className="space-y-4">
              {/* Alphabetical Section Generation */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="mb-3 font-semibold text-sm">Quick Add Sections Alphabetically</div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="startLetter" className="text-sm">From:</Label>
                    <Input
                      id="startLetter"
                      value={startLetter}
                      onChange={(e) => setStartLetter(e.target.value.toUpperCase().slice(0, 1))}
                      className="w-16 text-center"
                      placeholder="A"
                      maxLength={1}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="endLetter" className="text-sm">To:</Label>
                    <Input
                      id="endLetter"
                      value={endLetter}
                      onChange={(e) => setEndLetter(e.target.value.toUpperCase().slice(0, 1))}
                      className="w-16 text-center"
                      placeholder="D"
                      maxLength={1}
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={generateSectionsAlphabetically}
                    variant="outline"
                    size="sm"
                    className="ml-2"
                  >
                    Generate Sections
                  </Button>
                </div>
                <div className="text-xs text-gray-600">
                  This will create sections from {startLetter} to {endLetter} (e.g., A, B, C, D)
                </div>
              </div>

              {/* Manual Section Management */}
              <div>
                <div className="mb-2 font-semibold">Manual Sections</div>
                <div className="max-h-60 overflow-y-auto border rounded-md p-3 bg-white">
                  {sections.map((section, idx) => (
                    <div key={idx} className="flex items-center gap-2 mb-2">
                      <Input
                        placeholder={`Section ${idx + 1}`}
                        value={section.name}
                        onChange={(e) => handleSectionChange(idx, e)}
                        required
                      />
                      <Button type="button" variant="outline" onClick={() => addSection()} title="Add Section">+</Button>
                      <Button type="button" variant="destructive" onClick={() => removeSection(idx)} title="Remove Section" disabled={sections.length === 1}>×</Button>
                    </div>
                  ))}
                  {sections.length === 0 && (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      No sections added yet. Use the alphabetical generator above or add manually.
                    </div>
                  )}
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  Total sections: {sections.length}
                </div>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-2">
              <div><b>Class Name:</b> {classData.name}</div>
              <div><b>Class Code:</b> {classData.short_code}</div>
              <div><b>Year:</b> {classData.academic_year_id}</div>
              <div><b>Active:</b> {classData.is_active ? 'Yes' : 'No'}</div>
              <div><b>Sections:</b>
                <div className="max-h-40 overflow-y-auto border rounded-md p-3 bg-gray-50 mt-2">
                  {sections.length > 0 ? (
                    <ul className="list-disc ml-6 space-y-1">
                      {sections.map((s, i) => <li key={i} className="text-sm">{s.name}</li>)}
                    </ul>
                  ) : (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      No sections added
                    </div>
                  )}
                </div>
                <div className="mt-1 text-xs text-gray-600">
                  Total sections: {sections.length}
                </div>
              </div>
            </div>
          )}
          </div>
          <DialogFooter className="mt-4 flex flex-row gap-2 justify-end">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            {step > 0 && step < 2 && (
              <Button type="button" variant="secondary" onClick={handleBack}>Back</Button>
            )}
            {step === 0 && (
              <Button type="button" onClick={handleNext} disabled={!isClassStepValid}>Next</Button>
            )}
            {step === 1 && (
              <Button type="button" onClick={handleView} disabled={!isSectionsStepValid}>View</Button>
            )}
            {step === 2 && (
              <>
                <Button type="button" variant="secondary" onClick={() => setStep(0)}>
                  Edit
                </Button>
                <Button type="submit" disabled={isPending}>Submit</Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 
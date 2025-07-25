import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ClassAndSectionInput, SectionInput } from '@/types/masters/classesandsections';
import { useAcademicYearStore } from '@/lib/academicYearStore';

interface AddClassAndSectionsModalProps {
  onSubmit: (data: ClassAndSectionInput) => void;
  isPending?: boolean;
}

const defaultSection: SectionInput = { section_name: '' };

export function AddClassAndSectionsModal({ onSubmit, isPending }: AddClassAndSectionsModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  const selectedAcademicYearId = useAcademicYearStore(state => state.selectedAcademicYearId);

  const [classData, setClassData] = useState({
    class_name: '',
    class_code: '',
    academic_year_id: selectedAcademicYearId,
    is_active: true,
  });
  const [sections, setSections] = useState<SectionInput[]>([{ ...defaultSection }]);

  const handleClassChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setClassData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSectionChange = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, section_name: value } : s)));
  };

  const addSection = () => setSections((prev) => [...prev, { ...defaultSection }]);
  const removeSection = (idx: number) => setSections((prev) => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);

  const handleNext = () => setStep((s) => s + 1);
  const handleBack = () => setStep((s) => s - 1);
  const handleView = () => setStep(2);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...classData, sections });
    setIsOpen(false);
    setStep(0);
    setClassData({ class_name: '', class_code: '', academic_year_id: selectedAcademicYearId, is_active: true });
    setSections([{ ...defaultSection }]);
  };

  const isClassStepValid = classData.class_name && classData.class_code ;
  const isSectionsStepValid = sections.every((s) => s.section_name.trim()) && sections.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>Add Class & Sections</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {step === 0 && 'Enter Class Details'}
            {step === 1 && 'Add Sections'}
            {step === 2 && 'Summary'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="class_name">Class Name</Label>
                <Input id="class_name" name="class_name" value={classData.class_name} onChange={handleClassChange} required />
              </div>
              <div>
                <Label htmlFor="class_code">Class Code</Label>
                <Input id="class_code" name="class_code" value={classData.class_code} onChange={handleClassChange} required />
              </div>

              <div className="flex items-center gap-2 mt-2">
                <Label htmlFor="is_active">Active</Label>
                <Input id="is_active" name="is_active" type="checkbox" checked={classData.is_active} onChange={handleClassChange} className="w-4 h-4" />
              </div>
            </div>
          )}
          {step === 1 && (
            <div>
              <div className="mb-2 font-semibold">Sections</div>
              {sections.map((section, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <Input
                    placeholder={`Section ${idx + 1}`}
                    value={section.section_name}
                    onChange={(e) => handleSectionChange(idx, e)}
                    required
                  />
                  <Button type="button" variant="outline" onClick={() => addSection()} title="Add Section">+</Button>
                  <Button type="button" variant="destructive" onClick={() => removeSection(idx)} title="Remove Section" disabled={sections.length === 1}>×</Button>
                </div>
              ))}
            </div>
          )}
          {step === 2 && (
            <div className="space-y-2">
              <div><b>Class Name:</b> {classData.class_name}</div>
              <div><b>Class Code:</b> {classData.class_code}</div>
              <div><b>Year:</b> {classData.academic_year_id}</div>
              <div><b>Active:</b> {classData.is_active ? 'Yes' : 'No'}</div>
              <div><b>Sections:</b>
                <ul className="list-disc ml-6">
                  {sections.map((s, i) => <li key={i}>{s.section_name}</li>)}
                </ul>
              </div>
            </div>
          )}
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
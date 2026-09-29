import React, { useState, useEffect } from 'react';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, X } from 'lucide-react';
import type { SectionRead, SectionUpdate } from '@/types/masters/classesandsections';
import { toast } from 'sonner';

interface EditSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionData: SectionRead | null;
  className: string;
  onSubmit: (sectionId: string, data: SectionUpdate) => void;
  onAddSections?: (sections: { name: string; is_active: boolean }[]) => void;
  isPending?: boolean;
}

export function EditSectionModal({
  isOpen,
  onClose,
  sectionData,
  className,
  onSubmit,
  onAddSections,
  isPending
}: EditSectionModalProps) {
  const isAddMode = sectionData === null;

  // Edit mode state
  const [isDirty, setIsDirty] = useState(false);
  const [formData, setFormData] = useState({ name: '', is_active: true });

  // Add mode state
  const [sections, setSections] = useState<{ name: string; is_active: boolean }[]>([{ name: '', is_active: true }]);
  const [startLetter, setStartLetter] = useState('A');
  const [endLetter, setEndLetter] = useState('D');

  useEffect(() => {
    if (sectionData) {
      setFormData({ name: sectionData.name, is_active: sectionData.is_active ?? true });
    } else {
      setFormData({ name: '', is_active: true });
      setSections([{ name: '', is_active: true }]);
      setStartLetter('A');
      setEndLetter('D');
    }
    setIsDirty(false);
  }, [sectionData, isOpen]);

  // Edit mode handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setIsDirty(true);
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // Add mode handlers
  const handleSectionNameChange = (idx: number, value: string) => {
    setIsDirty(true);
    setSections(prev => prev.map((s, i) => i === idx ? { ...s, name: value } : s));
  };

  const addSectionRow = () => setSections(prev => [...prev, { name: '', is_active: true }]);

  const removeSectionRow = (idx: number) => {
    if (sections.length > 1) setSections(prev => prev.filter((_, i) => i !== idx));
  };

  const generateAlphabetically = () => {
    const start = startLetter.toUpperCase().charCodeAt(0);
    const end = endLetter.toUpperCase().charCodeAt(0);
    if (start > end) { toast.error('Start letter must come before end letter'); return; }
    if (start < 65 || end > 90) { toast.error('Please use letters A-Z only'); return; }
    const generated = Array.from({ length: end - start + 1 }, (_, i) => ({
      name: String.fromCharCode(start + i),
      is_active: true,
    }));
    setSections(generated);
    toast.success(`Generated ${generated.length} sections`);
  };

  const resetForm = () => {
    setFormData({ name: '', is_active: true });
    setSections([{ name: '', is_active: true }]);
    setStartLetter('A');
    setEndLetter('D');
    setIsDirty(false);
  };

  const handleClose = () => { resetForm(); onClose(); };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.error('Section name is required'); return; }
    onSubmit(sectionData?.id ?? '', formData);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valid = sections.filter(s => s.name.trim());
    if (valid.length === 0) { toast.error('At least one section name is required'); return; }
    onAddSections?.(valid);
    resetForm();
    onClose();
  };

  if (isAddMode) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }} guardDirty={isDirty} onDirtyDiscard={resetForm}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Sections to {className}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddSubmit}>
            <div className="space-y-4 py-2">
              {/* Alphabetical generator */}
              <div className="border rounded-lg p-4 bg-muted/50 space-y-3">
                <div className="font-semibold text-sm">Quick Add Alphabetically</div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm whitespace-nowrap">From:</Label>
                    <Input
                      value={startLetter}
                      onChange={(e) => setStartLetter(e.target.value.toUpperCase().slice(0, 1))}
                      className="w-14 text-center"
                      maxLength={1}
                      placeholder="A"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm whitespace-nowrap">To:</Label>
                    <Input
                      value={endLetter}
                      onChange={(e) => setEndLetter(e.target.value.toUpperCase().slice(0, 1))}
                      className="w-14 text-center"
                      maxLength={1}
                      placeholder="D"
                    />
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={generateAlphabetically}>
                    Generate
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Creates sections {startLetter}–{endLetter} (e.g., A, B, C, D)
                </p>
              </div>

              {/* Manual list */}
              <div className="space-y-2">
                <div className="font-semibold text-sm">Sections</div>
                <div className="border rounded-md p-3 bg-background max-h-56 overflow-y-auto space-y-2">
                  {sections.map((section, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        placeholder={`Section name (e.g., ${String.fromCharCode(65 + idx)})`}
                        value={section.name}
                        onChange={(e) => handleSectionNameChange(idx, e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={addSectionRow}
                        title="Add row"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive/80"
                        onClick={() => removeSectionRow(idx)}
                        disabled={sections.length === 1}
                        title="Remove row"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Total: {sections.filter(s => s.name.trim()).length} section(s)</p>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isPending || sections.every(s => !s.name.trim())}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {isPending ? 'Adding...' : `Add ${sections.filter(s => s.name.trim()).length} Section(s)`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }} guardDirty={isDirty} onDirtyDiscard={resetForm}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Section</DialogTitle>
          <p className="text-sm text-muted-foreground">Class: {className}</p>
        </DialogHeader>
        <form onSubmit={handleEditSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Section Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="col-span-3"
                required
                placeholder="e.g., A, B, C"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="is_active" className="text-right">Active</Label>
              <div className="col-span-3 flex items-center space-x-2">
                <Input
                  id="is_active"
                  name="is_active"
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                  className="w-4 h-4"
                />
                <Label htmlFor="is_active" className="text-sm font-normal">Section is active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isPending ? 'Saving...' : 'Update Section'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

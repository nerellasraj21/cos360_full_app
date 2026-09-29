import React, { useState, useEffect } from 'react';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ClassRead, ClassUpdate } from '@/types/masters/classesandsections';
import { useAcademicYearStore } from '@/lib/academicYearStore';
import { toast } from 'sonner';

interface EditClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  classData: ClassRead | null;
  onSubmit: (classId: string, data: ClassUpdate) => void;
  isPending?: boolean;
}

export function EditClassModal({ isOpen, onClose, classData, onSubmit, isPending }: EditClassModalProps) {
  const { selectedAcademicYearId } = useAcademicYearStore();
  const [isDirty, setIsDirty] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    short_code: '',
    description: '',
    is_active: true,
    academic_year_id: selectedAcademicYearId || '',
  });

  useEffect(() => {
    if (classData) {
      setFormData({
        name: classData.name,
        short_code: classData.short_code || '',
        description: classData.description || '',
        is_active: classData.is_active ?? true,
        academic_year_id: classData.academic_year_id,
      });
      setIsDirty(false);
    }
  }, [classData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    setIsDirty(true);
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Class name is required');
      return;
    }
    if (!formData.short_code.trim()) {
      toast.error('Class code is required');
      return;
    }
    if (!formData.academic_year_id) {
      toast.error('Academic year is required');
      return;
    }

    if (classData) {
      onSubmit(classData.id, formData);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      short_code: '',
      description: '',
      is_active: true,
      academic_year_id: selectedAcademicYearId || '',
    });
    setIsDirty(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }} guardDirty={isDirty} onDirtyDiscard={resetForm}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Class</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Class Name
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="short_code" className="text-right">
                Class Code
              </Label>
              <Input
                id="short_code"
                name="short_code"
                value={formData.short_code}
                onChange={handleInputChange}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="col-span-3"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="is_active" className="text-right">
                Active
              </Label>
              <div className="col-span-3 flex items-center space-x-2">
                <Input
                  id="is_active"
                  name="is_active"
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                  className="w-4 h-4"
                />
                <Label htmlFor="is_active" className="text-sm font-normal">
                  Class is active
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Updating...' : 'Update Class'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
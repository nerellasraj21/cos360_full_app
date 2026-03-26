import React, { useState, useEffect } from 'react';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import type { SectionRead, SectionUpdate } from '@/types/masters/classesandsections';
import { toast } from 'sonner';

interface EditSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionData: SectionRead | null;
  className: string;
  onSubmit: (sectionId: string, data: SectionUpdate) => void;
  isPending?: boolean;
}

export function EditSectionModal({
  isOpen,
  onClose,
  sectionData,
  className,
  onSubmit,
  isPending
}: EditSectionModalProps) {
  const [isDirty, setIsDirty] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    is_active: true,
  });

  useEffect(() => {
    if (sectionData) {
      setFormData({
        name: sectionData.name,
        is_active: sectionData.is_active ?? true,
      });
    } else {
      setFormData({
        name: '',
        is_active: true,
      });
    }
    setIsDirty(false);
  }, [sectionData]);

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
      toast.error('Section name is required');
      return;
    }

    onSubmit(sectionData?.id ?? '', formData);
  };

  const resetForm = () => {
    setFormData({ name: '', is_active: true });
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
          <DialogTitle>
            {sectionData ? 'Edit Section' : 'Add New Section'}
          </DialogTitle>
          <p className="text-sm text-gray-600">Class: {className}</p>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Section Name
              </Label>
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
                  Section is active
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isPending ? 'Saving...' : (sectionData ? 'Update Section' : 'Add Section')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
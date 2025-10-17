import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  }, [sectionData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;

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

    if (sectionData) {
      onSubmit(sectionData.id, formData);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      is_active: true,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
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
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : (sectionData ? 'Update Section' : 'Add Section')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
import React, { useState } from 'react';
import { Plus, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useCreateSubjectCategory } from '@/api/hooks/masters/subjectCategories';
import { usePermission } from '@/hooks/usePermission';
import { cn } from '@/lib/utils';

export interface CreateCategoryPopoverProps {
  /**
   * Callback when a new category is created
   * @param categoryId - The ID of the newly created category
   * @param categoryName - The name of the newly created category
   */
  onCategoryCreated?: (categoryId: string, categoryName: string) => void;

  /**
   * Additional CSS classes for the trigger button
   */
  className?: string;

  /**
   * Whether the trigger button is disabled
   */
  disabled?: boolean;
}

/**
 * CreateCategoryPopover Component
 *
 * A popover component for creating new subject categories inline.
 * Used alongside the category dropdown in the Subject form.
 *
 * Features:
 * - Permission-based visibility (requires subject_categories.create)
 * - Simple form with name input
 * - Auto-selects newly created category
 * - Query invalidation for dropdown refresh
 */
export const CreateCategoryPopover: React.FC<CreateCategoryPopoverProps> = ({
  onCategoryCreated,
  className,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { checkPermission } = usePermission();
  const hasCreatePermission = checkPermission('subject_categories', 'create');

  const createCategoryMutation = useCreateSubjectCategory();

  // Don't render if user doesn't have permission
  if (!hasCreatePermission) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const trimmedName = categoryName.trim();
    if (!trimmedName) {
      setError('Category name is required');
      return;
    }

    setError(null);

    createCategoryMutation.mutate(
      { name: trimmedName },
      {
        onSuccess: (data) => {
          // Call the callback with the new category info
          if (onCategoryCreated && data?.id) {
            onCategoryCreated(data.id.toString(), data.name);
          }
          // Reset form and close popover
          setCategoryName('');
          setIsOpen(false);
        },
        onError: (err) => {
          setError(err.message || 'Failed to create category');
        },
      }
    );
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reset form when closing
      setCategoryName('');
      setError(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Prevent form submission on Enter if empty
    if (e.key === 'Enter' && !categoryName.trim()) {
      e.preventDefault();
    }
    // Close on Escape
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange} modal={true}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn('h-10 w-10 shrink-0', className)}
          disabled={disabled}
          title="Create new category"
          aria-label="Create new category"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80"
        align="start"
        side="right"
        sideOffset={8}
        onOpenAutoFocus={(e) => {
          // Prevent the popover from stealing focus from the dialog
          e.preventDefault();
          // Manually focus the input after a short delay
          setTimeout(() => {
            const input = document.getElementById('category-name');
            input?.focus();
          }, 0);
        }}
        onPointerDownOutside={(e) => {
          e.preventDefault();
        }}
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
        onFocusOutside={(e) => {
          e.preventDefault();
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Create New Category</h4>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-name">Category Name</Label>
              <Input
                id="category-name"
                value={categoryName}
                onChange={(e) => {
                  setCategoryName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Enter category name"
                disabled={createCategoryMutation.isPending}
                aria-invalid={!!error}
                aria-describedby={error ? 'category-error' : undefined}
              />
              {error && (
                <p
                  id="category-error"
                  className="text-sm text-destructive"
                  role="alert"
                >
                  {error}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
                disabled={createCategoryMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createCategoryMutation.isPending || !categoryName.trim()}
              >
                {createCategoryMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create'
                )}
              </Button>
            </div>
          </div>
        </form>
        </div>
      </PopoverContent>
    </Popover>
  );
};

CreateCategoryPopover.displayName = 'CreateCategoryPopover';

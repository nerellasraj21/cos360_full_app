import { X } from 'lucide-react';

interface CloseButtonProps {
  onClose: () => void;
  position?: 'sticky' | 'absolute';
  className?: string;
}

export function CloseButton({ onClose, position = 'sticky', className = '' }: CloseButtonProps) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      className={`rounded-full p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer ${position === 'sticky' ? 'sticky top-0 z-10' : 'absolute right-3 top-3 z-20'} ${className}`}
    >
      <X size={20} />
    </button>
  );
}

import { Eye, Edit, Trash2, Download, Ban, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ActionButtonProps {
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}

export function ViewButton({ onClick, disabled, title = 'View details' }: ActionButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className="h-8 w-8 p-0"
    >
      <Eye className="h-4 w-4" />
    </Button>
  );
}

export function EditButton({ onClick, disabled, title = 'Edit' }: ActionButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className="h-8 w-8 p-0"
    >
      <Edit className="h-4 w-4" />
    </Button>
  );
}

export function DeleteButton({ onClick, disabled, title = 'Delete' }: ActionButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className="h-8 w-8 p-0 text-destructive hover:text-destructive/80"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

export function DownloadButton({ onClick, disabled, title = 'Download' }: ActionButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className="h-8 w-8 p-0"
    >
      <Download className="h-4 w-4" />
    </Button>
  );
}

export function DeactivateButton({ onClick, disabled, title = 'Deactivate' }: ActionButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className="h-8 w-8 p-0"
    >
      <Ban className="h-4 w-4" />
    </Button>
  );
}

export function ActivateButton({ onClick, disabled, title = 'Activate' }: ActionButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className="h-8 w-8 p-0 text-green-500 hover:text-green-600"
    >
      <CheckCircle className="h-4 w-4" />
    </Button>
  );
}

export function TableActionGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-1">{children}</div>;
}

import { Eye, Edit, Trash2, Download, Ban, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ActionButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  title?: string;
}

export function ViewButton({ onClick, disabled, isLoading, title = 'View details' }: ActionButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled || isLoading}
      title={title}
      aria-label={title}
      className="h-8 w-8 p-0"
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
    </Button>
  );
}

export function EditButton({ onClick, disabled, isLoading, title = 'Edit' }: ActionButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled || isLoading}
      title={title}
      aria-label={title}
      className="h-8 w-8 p-0"
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit className="h-4 w-4" />}
    </Button>
  );
}

export function DeleteButton({ onClick, disabled, isLoading, title = 'Delete' }: ActionButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled || isLoading}
      title={title}
      aria-label={title}
      className="h-8 w-8 p-0 text-destructive hover:text-destructive/80"
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </Button>
  );
}

export function DownloadButton({ onClick, disabled, isLoading, title = 'Download' }: ActionButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled || isLoading}
      title={title}
      aria-label={title}
      className="h-8 w-8 p-0"
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
    </Button>
  );
}

export function DeactivateButton({ onClick, disabled, isLoading, title = 'Deactivate' }: ActionButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled || isLoading}
      title={title}
      aria-label={title}
      className="h-8 w-8 p-0"
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
    </Button>
  );
}

export function ActivateButton({ onClick, disabled, isLoading, title = 'Activate' }: ActionButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled || isLoading}
      title={title}
      aria-label={title}
      className="h-8 w-8 p-0 text-green-500 hover:text-green-600"
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
    </Button>
  );
}

export function TableActionGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-1">{children}</div>;
}

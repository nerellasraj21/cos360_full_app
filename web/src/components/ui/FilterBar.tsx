import { Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterBarProps {
  children: React.ReactNode;
  className?: string;
}

export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <div className={cn('flex flex-col gap-2 mb-4', className)}>
      <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <Filter className="h-3.5 w-3.5" />
        <span>Filters</span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {children}
      </div>
    </div>
  );
}

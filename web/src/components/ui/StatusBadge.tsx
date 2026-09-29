import { cn } from '@/lib/utils';

interface StatusConfig {
  label: string;
  className: string;
}

const STATUS_MAP: Record<string, StatusConfig> = {
  active:          { label: 'Active',     className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  inactive:        { label: 'Inactive',   className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  pending:         { label: 'Pending',    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  approved:        { label: 'Approved',   className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  rejected:        { label: 'Rejected',   className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  paid:            { label: 'Paid',       className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  unpaid:          { label: 'Unpaid',     className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  partial:         { label: 'Partial',    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  cancelled:       { label: 'Cancelled',  className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  present:         { label: 'Present',    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  absent:          { label: 'Absent',     className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  late:            { label: 'Late',       className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  leave:           { label: 'Leave',      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  'half-day':      { label: 'Half Day',   className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  half_day:        { label: 'Half Day',   className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  suspended:       { label: 'Suspended',  className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  terminated:      { label: 'Terminated', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  completed:       { label: 'Completed',  className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  processed:       { label: 'Processed',  className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  requested:       { label: 'Requested',  className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  bounced:         { label: 'Bounced',    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  draft:           { label: 'Draft',      className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  pending_approval:{ label: 'Pending',    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
};

interface StatusBadgeProps {
  status: string | boolean | null | undefined;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const key = typeof status === 'boolean' ? (status ? 'active' : 'inactive') : (status ?? '').toLowerCase();
  const config = STATUS_MAP[key] ?? { label: key || '—', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        config.className,
        className
      )}
    >
      {label ?? config.label}
    </span>
  );
}

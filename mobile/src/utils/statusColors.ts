/**
 * Status color utilities for React Native.
 * Mirrors the web frontend's StatusBadge color map.
 */

export type StatusKey =
  | 'active' | 'inactive'
  | 'pending' | 'pending_approval'
  | 'approved' | 'rejected'
  | 'paid' | 'unpaid' | 'partial'
  | 'cancelled' | 'completed'
  | 'present' | 'absent' | 'late' | 'leave' | 'half-day'
  | 'suspended' | 'terminated'
  | 'processed' | 'requested' | 'bounced'
  | 'draft'
  | string;

export interface StatusColors {
  bg: string;
  text: string;
  border: string;
}

const STATUS_MAP: Record<string, StatusColors> = {
  active:           { bg: '#dcfce7', text: '#16a34a', border: '#86efac' },
  inactive:         { bg: '#f1f5f9', text: '#64748b', border: '#cbd5e1' },
  pending:          { bg: '#fef9c3', text: '#854d0e', border: '#fde047' },
  pending_approval: { bg: '#fef9c3', text: '#854d0e', border: '#fde047' },
  approved:         { bg: '#dcfce7', text: '#16a34a', border: '#86efac' },
  rejected:         { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' },
  paid:             { bg: '#dcfce7', text: '#16a34a', border: '#86efac' },
  unpaid:           { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' },
  partial:          { bg: '#ffedd5', text: '#9a3412', border: '#fdba74' },
  cancelled:        { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' },
  completed:        { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
  present:          { bg: '#dcfce7', text: '#16a34a', border: '#86efac' },
  absent:           { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' },
  late:             { bg: '#fef9c3', text: '#854d0e', border: '#fde047' },
  leave:            { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
  'half-day':       { bg: '#ffedd5', text: '#9a3412', border: '#fdba74' },
  suspended:        { bg: '#fef9c3', text: '#854d0e', border: '#fde047' },
  terminated:       { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' },
  processed:        { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
  requested:        { bg: '#f3e8ff', text: '#7c3aed', border: '#c4b5fd' },
  bounced:          { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' },
  draft:            { bg: '#f1f5f9', text: '#64748b', border: '#cbd5e1' },
};

const STATUS_MAP_DARK: Record<string, StatusColors> = {
  active:           { bg: '#166534', text: '#bbf7d0', border: '#15803d' },
  inactive:         { bg: '#1e293b', text: '#94a3b8', border: '#334155' },
  pending:          { bg: '#78350f', text: '#fde68a', border: '#92400e' },
  pending_approval: { bg: '#78350f', text: '#fde68a', border: '#92400e' },
  approved:         { bg: '#166534', text: '#bbf7d0', border: '#15803d' },
  rejected:         { bg: '#7f1d1d', text: '#fecaca', border: '#991b1b' },
  paid:             { bg: '#166534', text: '#bbf7d0', border: '#15803d' },
  unpaid:           { bg: '#7f1d1d', text: '#fecaca', border: '#991b1b' },
  partial:          { bg: '#7c2d12', text: '#fed7aa', border: '#9a3412' },
  cancelled:        { bg: '#7f1d1d', text: '#fecaca', border: '#991b1b' },
  completed:        { bg: '#1e3a5f', text: '#bfdbfe', border: '#1d4ed8' },
  present:          { bg: '#166534', text: '#bbf7d0', border: '#15803d' },
  absent:           { bg: '#7f1d1d', text: '#fecaca', border: '#991b1b' },
  late:             { bg: '#78350f', text: '#fde68a', border: '#92400e' },
  leave:            { bg: '#1e3a5f', text: '#bfdbfe', border: '#1d4ed8' },
  'half-day':       { bg: '#7c2d12', text: '#fed7aa', border: '#9a3412' },
  suspended:        { bg: '#78350f', text: '#fde68a', border: '#92400e' },
  terminated:       { bg: '#7f1d1d', text: '#fecaca', border: '#991b1b' },
  processed:        { bg: '#1e3a5f', text: '#bfdbfe', border: '#1d4ed8' },
  requested:        { bg: '#4c1d95', text: '#e9d5ff', border: '#5b21b6' },
  bounced:          { bg: '#7f1d1d', text: '#fecaca', border: '#991b1b' },
  draft:            { bg: '#1e293b', text: '#94a3b8', border: '#334155' },
};

const DEFAULT_COLORS: StatusColors = { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
const DEFAULT_COLORS_DARK: StatusColors = { bg: '#1e293b', text: '#94a3b8', border: '#334155' };

export function getStatusColors(status: StatusKey): StatusColors {
  return STATUS_MAP[status.toLowerCase()] ?? DEFAULT_COLORS;
}

export function getStatusColorsDark(status: StatusKey): StatusColors {
  return STATUS_MAP_DARK[status.toLowerCase()] ?? DEFAULT_COLORS_DARK;
}

/** Human-readable label for a status key */
export function getStatusLabel(status: StatusKey): string {
  const labels: Record<string, string> = {
    active: 'Active', inactive: 'Inactive',
    pending: 'Pending', pending_approval: 'Pending Approval',
    approved: 'Approved', rejected: 'Rejected',
    paid: 'Paid', unpaid: 'Unpaid', partial: 'Partial',
    cancelled: 'Cancelled', completed: 'Completed',
    present: 'Present', absent: 'Absent', late: 'Late',
    leave: 'On Leave', 'half-day': 'Half Day',
    suspended: 'Suspended', terminated: 'Terminated',
    processed: 'Processed', requested: 'Requested',
    bounced: 'Bounced', draft: 'Draft',
  };
  return labels[status.toLowerCase()] ?? status.charAt(0).toUpperCase() + status.slice(1);
}

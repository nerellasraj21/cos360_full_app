import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ViewButton } from '@/components/common/TableActions';
import { PermissionGuard } from '@/components/common';
import { Eye, Loader2, ShieldX } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useLogs, useLogDetail } from '@/api/hooks/communication/communication';
import type { Channel, NotificationStatus, NotificationLog, LogFilters } from '@/types/communication';

// ─── Status badge ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  NotificationStatus,
  { label: string; icon: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  sent: { label: 'Sent', icon: '✅', variant: 'default' },
  delivered: { label: 'Delivered', icon: '✅', variant: 'default' },
  failed: { label: 'Failed', icon: '❌', variant: 'destructive' },
  queued: { label: 'Queued', icon: '⏳', variant: 'secondary' },
};

const CHANNEL_ICONS: Record<Channel, string> = {
  sms: '📱',
  whatsapp: '💬',
  email: '📧',
};

function StatusBadge({ status }: { status: NotificationStatus }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, icon: '•', variant: 'secondary' as const };
  return (
    <Badge variant={cfg.variant} className="gap-1">
      <span aria-hidden="true">{cfg.icon}</span>
      {cfg.label}
    </Badge>
  );
}

// ─── Log detail drawer ────────────────────────────────────────────────────────
function LogDetailModal({ logId, onClose }: { logId: string; onClose: () => void }) {
  const { data: detail, isLoading } = useLogDetail(logId);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle id="log-detail-title">Notification Detail</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2 text-sm">Loading…</span>
          </div>
        ) : !detail ? (
          <p className="text-sm text-muted-foreground py-4">Detail not available.</p>
        ) : (
          <div className="space-y-3 text-sm">
            <table className="w-full">
              <tbody>
                {[
                  ['Recipient', detail.recipient_name],
                  ['Channel', `${CHANNEL_ICONS[detail.channel]} ${detail.channel.toUpperCase()}`],
                  ['Phone', detail.recipient_phone ?? '—'],
                  ['Email', detail.recipient_email ?? '—'],
                  ['Status', null],
                  ['Provider ID', detail.provider_message_id ?? '—'],
                  ['Triggered By', detail.triggered_by],
                  ['Target Group', detail.target_type.replace(/_/g, ' ')],
                  ['Sent At', new Date(detail.created_at).toLocaleString()],
                ].map(([label, value]) => (
                  <tr key={label as string} className="border-b last:border-0">
                    <th
                      scope="row"
                      className="py-2 pr-4 text-left font-medium text-muted-foreground w-36 align-top"
                    >
                      {label}
                    </th>
                    <td className="py-2 align-top">
                      {label === 'Status' ? (
                        <StatusBadge status={detail.status} />
                      ) : (
                        value
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {detail.error_message && (
              <div
                role="alert"
                className="rounded-md border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 p-3"
              >
                <p className="text-xs font-medium text-red-700 dark:text-red-300">Error</p>
                <p className="text-sm text-red-800 dark:text-red-200 mt-0.5">{detail.error_message}</p>
              </div>
            )}

            {detail.message && (
              <div>
                <p className="font-medium mb-1">Message</p>
                <div className="rounded-md bg-muted/40 border p-3 text-sm font-mono whitespace-pre-wrap">
                  {detail.message}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Logs Tab ────────────────────────────────────────────────────────────
export default function LogsTab() {
  return (
    <PermissionGuard
      resource="communications"
      action="list"
      fallback={
        <div className="p-6">
          <div className="flex items-center justify-center min-h-[300px]">
            <Card className="w-full max-w-md">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <ShieldX className="h-16 w-16 text-muted-foreground mx-auto" />
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
                    <p className="text-muted-foreground mt-2">
                      You don't have permission to view communication logs.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      }
    >
      <LogsTabContent />
    </PermissionGuard>
  );
}

function LogsTabContent() {
  const [channelFilter, setChannelFilter] = useState<Channel | ''>('');
  const [statusFilter, setStatusFilter] = useState<NotificationStatus | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  const filters: LogFilters = {
    channel: channelFilter || undefined,
    status: statusFilter || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    page,
    page_size: 20,
  };

  const { data, isLoading } = useLogs(filters);
  const logs = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={channelFilter}
          onChange={(e) => { setChannelFilter(e.target.value as Channel | ''); setPage(1); }}
          className="border rounded-md px-3 py-2 text-sm bg-background"
          aria-label="Filter by channel"
        >
          <option value="">All Channels</option>
          <option value="sms">SMS</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="email">Email</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as NotificationStatus | ''); setPage(1); }}
          className="border rounded-md px-3 py-2 text-sm bg-background"
          aria-label="Filter by status"
        >
          <option value="">All Status</option>
          <option value="queued">Queued</option>
          <option value="sent">Sent</option>
          <option value="delivered">Delivered</option>
          <option value="failed">Failed</option>
        </select>

        <div className="flex items-center gap-2">
          <label htmlFor="date-from" className="text-sm text-muted-foreground whitespace-nowrap">
            From
          </label>
          <input
            id="date-from"
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="border rounded-md px-3 py-2 text-sm bg-background"
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="date-to" className="text-sm text-muted-foreground whitespace-nowrap">
            To
          </label>
          <input
            id="date-to"
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="border rounded-md px-3 py-2 text-sm bg-background"
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2 text-sm text-muted-foreground">Loading logs…</span>
        </div>
      ) : logs.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground text-sm">No logs found.</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th scope="col" className="text-left px-4 py-3 font-medium">Recipient</th>
                  <th scope="col" className="text-left px-4 py-3 font-medium">Channel</th>
                  <th scope="col" className="text-left px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="text-left px-4 py-3 font-medium">Target Group</th>
                  <th scope="col" className="text-left px-4 py-3 font-medium hidden lg:table-cell">Triggered By</th>
                  <th scope="col" className="text-left px-4 py-3 font-medium">Date/Time</th>
                  <th scope="col" className="text-left px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <LogRow
                    key={log.id}
                    log={log}
                    zebra={i % 2 !== 0}
                    onView={() => setSelectedLogId(log.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card layout */}
          <div className="md:hidden space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{log.recipient_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {CHANNEL_ICONS[log.channel]} {log.channel.toUpperCase()}
                    </p>
                  </div>
                  <StatusBadge status={log.status} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {log.target_type.replace(/_/g, ' ')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(log.created_at).toLocaleString()}
                </p>
                <ViewButton onClick={() => setSelectedLogId(log.id)} title="View Log" />
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ←
              </Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = i + 1;
                return (
                  <Button
                    key={p}
                    variant={page === p ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                );
              })}
              {totalPages > 5 && <span className="text-muted-foreground">…</span>}
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                →
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Log detail modal */}
      {selectedLogId && (
        <LogDetailModal
          logId={selectedLogId}
          onClose={() => setSelectedLogId(null)}
        />
      )}
    </div>
  );
}

// ─── Table row ────────────────────────────────────────────────────────────────
function LogRow({
  log,
  zebra,
  onView,
}: {
  log: NotificationLog;
  zebra: boolean;
  onView: () => void;
}) {
  return (
    <tr className={`border-t h-12 ${zebra ? 'bg-muted/20' : ''}`}>
      <td className="px-4 py-2">
        <div>
          <p className="font-medium">{log.recipient_name}</p>
          <p className="text-xs text-muted-foreground">
            {log.recipient_phone ?? log.recipient_email ?? ''}
          </p>
        </div>
      </td>
      <td className="px-4 py-2 whitespace-nowrap">
        {CHANNEL_ICONS[log.channel]} {log.channel.toUpperCase()}
      </td>
      <td className="px-4 py-2">
        <StatusBadge status={log.status} />
      </td>
      <td className="px-4 py-2 text-muted-foreground">
        {log.target_type.replace(/_/g, ' ')}
      </td>
      <td className="px-4 py-2 text-muted-foreground hidden lg:table-cell">
        {log.triggered_by}
      </td>
      <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
        {new Date(log.created_at).toLocaleString()}
      </td>
      <td className="px-4 py-2">
        <ViewButton onClick={onView} title={`View log for ${log.recipient_name}`} />
      </td>
    </tr>
  );
}

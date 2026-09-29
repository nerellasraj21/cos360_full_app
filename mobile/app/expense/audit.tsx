import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import { useExpenseGlobalAuditLogsProtected } from '@/hooks/use-expense-protected';
import type { ExpenseAuditLog } from '@/src/types/expense';
import { ScreenAccessGate } from '@/components/ScreenAccessGate';

const ORANGE = '#F97316';

const ACTION_COLORS: Record<string, string> = {
  create: '#10B981',
  update: '#3B82F6',
  approve: '#8B5CF6',
  reject: '#EF4444',
  pay: '#F59E0B',
  cancel: '#6B7280',
  delete: '#EF4444',
};

const ACTION_CATEGORIES = ['All', 'transaction', 'approval', 'payment', 'document'];

function getActionColor(action: string) {
  return ACTION_COLORS[action?.toLowerCase()] ?? ORANGE;
}

function formatDate(val?: string) {
  if (!val) return '—';
  return new Date(val).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function AuditLogItem({ item, colors, theme }: { item: ExpenseAuditLog; colors: any; theme: string }) {
  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const color = getActionColor(item.action);
  const timestamp = item.created_at || item.timestamp;
  const username = item.actor_username || item.user_id || '—';
  const role = item.actor_role || item.user_role || '—';
  const notes = item.action_notes || item.notes;

  return (
    <View style={[styles.logCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
      <View style={styles.logTop}>
        <View style={[styles.actionBadge, { backgroundColor: color + '20' }]}>
          <Text style={[styles.actionText, { color }]}>{item.action?.toUpperCase()}</Text>
        </View>
        {item.action_category && (
          <View style={[styles.catBadge, { backgroundColor: borderCol }]}>
            <Text style={[styles.catText, { color: colors['muted-foreground'] }]}>{item.action_category}</Text>
          </View>
        )}
        <Text style={[styles.timestamp, { color: colors['muted-foreground'] }]}>{formatDate(timestamp)}</Text>
      </View>
      <View style={styles.logMeta}>
        <Ionicons name="person-outline" size={12} color={colors['muted-foreground']} />
        <Text style={[styles.metaText, { color: colors['muted-foreground'] }]}>{username}</Text>
        <Text style={[styles.roleBadge, { color: colors['muted-foreground'] }]}>· {role}</Text>
      </View>
      {notes ? (
        <Text style={[styles.notes, { color: colors['muted-foreground'] }]} numberOfLines={2}>{notes}</Text>
      ) : null}
      <Text style={[styles.txnId, { color: colors['muted-foreground'] }]} numberOfLines={1}>
        Txn: {item.transaction_id}
      </Text>
    </View>
  );
}

function ExpenseAuditScreenContent() {
  const { colors, theme } = useTheme();
  const [actionFilter, setActionFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);

  const inputBg = theme === 'dark' ? '#0f0f23' : '#f8fafc';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const chipBg = theme === 'dark' ? '#1a1a2e' : '#f1f5f9';

  const categoryParam = actionFilter === 'All' ? undefined : actionFilter;
  const { data: raw, isLoading } = useExpenseGlobalAuditLogsProtected({
    limit: 100,
    action_category: categoryParam,
  });

  const hasDateFilter = !!(dateFrom.trim() || dateTo.trim());

  const logs: ExpenseAuditLog[] = useMemo(() => {
    const all: ExpenseAuditLog[] = Array.isArray(raw)
      ? raw
      : (raw as any)?.items ?? [];

    return all.filter(l => {
      // Text search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesSearch =
          l.action?.toLowerCase().includes(q) ||
          (l.actor_username || l.user_id || '').toLowerCase().includes(q) ||
          l.transaction_id?.toLowerCase().includes(q) ||
          (l.action_notes || l.notes || '').toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      // Date range filter (client-side)
      const ts = l.created_at || l.timestamp;
      if (ts) {
        const logDate = ts.slice(0, 10); // "YYYY-MM-DD"
        if (dateFrom.trim() && logDate < dateFrom.trim()) return false;
        if (dateTo.trim() && logDate > dateTo.trim()) return false;
      }

      return true;
    });
  }, [raw, search, dateFrom, dateTo]);

  return (
    <AppLayout title="Expense Audit Trail">
      {/* Search + date-filter toggle */}
      <View style={[styles.searchRow, { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 }]}>
        <View style={[styles.searchBox, { backgroundColor: inputBg, borderColor: borderCol }]}>
          <Ionicons name="search-outline" size={14} color={colors['muted-foreground']} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search by action, user, txn ID..."
            placeholderTextColor={colors['muted-foreground']}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}
              accessibilityLabel="Close">
              <Ionicons name="close-circle" size={16} color={colors['muted-foreground']} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={[
            styles.dateToggleBtn,
            { backgroundColor: hasDateFilter ? ORANGE : chipBg, borderColor: hasDateFilter ? ORANGE : borderCol },
          ]}
          onPress={() => setShowDateFilter(v => !v)}
              accessibilityLabel="Select date"
        >
          <Ionicons name="calendar-outline" size={16} color={hasDateFilter ? 'white' : colors['muted-foreground']} />
        </TouchableOpacity>
      </View>

      {/* Date range filter panel */}
      {showDateFilter && (
        <View style={[styles.datePanel, { backgroundColor: inputBg, borderColor: borderCol }]}>
          <View style={styles.datePanelRow}>
            <View style={styles.dateField}>
              <Text style={[styles.dateLabel, { color: colors['muted-foreground'] }]}>From</Text>
              <TextInput
                style={[styles.dateInput, { color: colors.foreground, borderColor: borderCol, backgroundColor: inputBg }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors['muted-foreground']}
                value={dateFrom}
                onChangeText={setDateFrom}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.dateField}>
              <Text style={[styles.dateLabel, { color: colors['muted-foreground'] }]}>To</Text>
              <TextInput
                style={[styles.dateInput, { color: colors.foreground, borderColor: borderCol, backgroundColor: inputBg }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors['muted-foreground']}
                value={dateTo}
                onChangeText={setDateTo}
                keyboardType="numeric"
              />
            </View>
            {hasDateFilter && (
              <TouchableOpacity
                style={[styles.clearDateBtn, { borderColor: borderCol }]}
                onPress={() => { setDateFrom(''); setDateTo(''); }}
              >
                <Text style={{ color: ORANGE, fontSize: 12, fontWeight: '600' }}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
          {hasDateFilter && (
            <Text style={[styles.filterSummary, { color: ORANGE }]}>
              {logs.length} result{logs.length !== 1 ? 's' : ''} in date range
            </Text>
          )}
        </View>
      )}

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {ACTION_CATEGORIES.map(cat => {
          const active = actionFilter === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, { backgroundColor: active ? ORANGE : chipBg, borderColor: active ? ORANGE : borderCol }]}
              onPress={() => setActionFilter(cat)}
            >
              <Text style={[styles.chipText, { color: active ? 'white' : colors['muted-foreground'] }]}>
                {cat === 'All' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* List */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={ORANGE} />
          </View>
        ) : logs.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="document-text-outline" size={40} color={colors['muted-foreground']} />
            <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>No audit logs found</Text>
          </View>
        ) : (
          logs.map(item => (
            <AuditLogItem key={item.id} item={item} colors={colors} theme={theme} />
          ))
        )}
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row', gap: 8 },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, height: 38,
  },
  searchInput: { flex: 1, fontSize: 13, padding: 0 },
  dateToggleBtn: {
    width: 38, height: 38, borderRadius: 10, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
  },
  datePanel: {
    marginHorizontal: 16, marginBottom: 8, borderRadius: 10,
    borderWidth: 1, padding: 12,
  },
  datePanelRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  dateField: { flex: 1 },
  dateLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  dateInput: {
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 10,
    paddingVertical: 8, fontSize: 13,
  },
  clearDateBtn: {
    height: 36, paddingHorizontal: 12, borderWidth: 1,
    borderRadius: 8, justifyContent: 'center', alignItems: 'center',
  },
  filterSummary: { fontSize: 11, fontWeight: '600', marginTop: 6 },
  chipsRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 10 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: '600' },
  listContent: { padding: 16, paddingTop: 4, paddingBottom: 32, gap: 10 },
  logCard: {
    borderRadius: 12, borderWidth: 1, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  logTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  actionBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  actionText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  catBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
  catText: { fontSize: 11 },
  timestamp: { fontSize: 11, marginLeft: 'auto' },
  logMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  metaText: { fontSize: 12 },
  roleBadge: { fontSize: 12 },
  notes: { fontSize: 12, marginTop: 4, marginBottom: 4 },
  txnId: { fontSize: 10, marginTop: 4 },
  centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, fontSize: 14 },
});


// Screen-level access control - see docs/USER_ROLES_WORKFLOW.md.
export default function ExpenseAuditScreen() {
  return (
    <ScreenAccessGate
      title="Expense Audit"
      resources={['expense_audit']}
    >
      <ExpenseAuditScreenContent />
    </ScreenAccessGate>
  );
}

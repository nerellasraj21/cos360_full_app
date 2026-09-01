import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { AppLayout } from '@/components';
import { useAcademicYear, useTheme } from '@/contexts';
import { holidaysApi, HolidayRead } from '@/src/api/masters';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const TODAY = new Date();

function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  if (start === end) {
    return `${s.getDate()} ${MONTH_NAMES[s.getMonth()].slice(0, 3)} ${s.getFullYear()}`;
  }
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${s.getDate()}–${e.getDate()} ${MONTH_NAMES[s.getMonth()].slice(0, 3)} ${s.getFullYear()}`;
  }
  return `${s.getDate()} ${MONTH_NAMES[s.getMonth()].slice(0, 3)} – ${e.getDate()} ${MONTH_NAMES[e.getMonth()].slice(0, 3)} ${e.getFullYear()}`;
}

function isUpcoming(holiday: HolidayRead): boolean {
  return new Date(holiday.end_date) >= TODAY;
}

function isPast(holiday: HolidayRead): boolean {
  return new Date(holiday.end_date) < TODAY;
}

function getDuration(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function holidayColor(holiday: HolidayRead): string {
  if (holiday.color) return holiday.color;
  // Deterministic color from name hash
  const colors = ['#556ee6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899'];
  let hash = 0;
  for (const c of holiday.name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffff;
  return colors[Math.abs(hash) % colors.length];
}

function buildMonthGrid(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const rows: (Date | null)[][] = [];
  let day = 1 - firstDay;
  for (let row = 0; row < 6; row++) {
    const week: (Date | null)[] = [];
    for (let col = 0; col < 7; col++) {
      week.push(day > 0 && day <= daysInMonth ? new Date(year, month, day) : null);
      day++;
    }
    rows.push(week);
    if (day > daysInMonth) break;
  }
  return rows;
}

function getHolidaysForDate(dateStr: string, allHolidays: HolidayRead[]): HolidayRead[] {
  return allHolidays.filter(h => h.start_date <= dateStr && dateStr <= h.end_date);
}

export default function CalendarScreen() {
  const { colors, theme } = useTheme();
  const { activeAcademicYearId } = useAcademicYear();
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [calYear, setCalYear]   = useState(TODAY.getFullYear());
  const [calMonth, setCalMonth] = useState(TODAY.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const cardBg   = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  const { data: holidays = [], isLoading, error, refetch } = useQuery<HolidayRead[]>({
    queryKey: ['holidays', activeAcademicYearId],
    queryFn: () => holidaysApi.getHolidays({
      academic_year_id: activeAcademicYearId ?? undefined,
      active_only: true,
      limit: 100,
    }),
  });

  const filtered = useMemo(() => {
    const sorted = [...holidays].sort((a, b) =>
      new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );
    if (filter === 'upcoming') return sorted.filter(isUpcoming);
    if (filter === 'past')     return sorted.filter(isPast);
    return sorted;
  }, [holidays, filter]);

  // Group by month
  const grouped = useMemo(() => {
    const map = new Map<string, HolidayRead[]>();
    for (const h of filtered) {
      const d = new Date(h.start_date);
      const key = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(h);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const upcomingCount = holidays.filter(isUpcoming).length;
  const nextHoliday   = [...holidays]
    .filter(isUpcoming)
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())[0];

  return (
    <AppLayout title="School Calendar">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Banner */}
        <View style={[styles.banner, { backgroundColor: '#556ee6' }]}>
          <View style={styles.bannerDecor} />
          <View style={styles.bannerDecor2} />
          <View style={styles.bannerIcon}>
            <Ionicons name="calendar" size={28} color="white" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>School Calendar</Text>
            <Text style={styles.bannerSub}>
              {nextHoliday
                ? `Next holiday: ${nextHoliday.name} on ${formatDateRange(nextHoliday.start_date, nextHoliday.start_date)}`
                : 'No upcoming holidays'}
            </Text>
          </View>
        </View>

        {/* Stats row */}
        {!isLoading && (
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <Text style={[styles.statNum, { color: colors.foreground }]}>{holidays.length}</Text>
              <Text style={[styles.statLabel, { color: colors['muted-foreground'] }]}>Total</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#556ee618', borderColor: '#556ee640' }]}>
              <Text style={[styles.statNum, { color: '#556ee6' }]}>{upcomingCount}</Text>
              <Text style={[styles.statLabel, { color: '#556ee6' }]}>Upcoming</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <Text style={[styles.statNum, { color: colors['muted-foreground'] }]}>{holidays.length - upcomingCount}</Text>
              <Text style={[styles.statLabel, { color: colors['muted-foreground'] }]}>Past</Text>
            </View>
          </View>
        )}

        {/* Filter chips + view toggle */}
        <View style={styles.filterRow}>
          <View style={{ flexDirection: 'row', gap: 8, flex: 1, flexWrap: 'wrap' }}>
            {(['upcoming', 'all', 'past'] as const).map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, filter === f && { backgroundColor: '#556ee6' }]}
                onPress={() => setFilter(f)}
              >
                <Text style={{ color: filter === f ? 'white' : colors['muted-foreground'], fontSize: 13, fontWeight: '600' }}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.viewToggle}>
            {(['list', 'grid'] as const).map(v => (
              <TouchableOpacity
                key={v}
                style={[styles.viewBtn, viewMode === v && { backgroundColor: '#556ee6' }]}
                onPress={() => setViewMode(v)}
              >
                <Ionicons
                  name={v === 'list' ? 'list' : 'grid'}
                  size={16}
                  color={viewMode === v ? 'white' : colors['muted-foreground']}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── GRID VIEW ─────────────────────────────────────────────────── */}
        {viewMode === 'grid' && !isLoading && (
          <View style={[styles.gridContainer, { backgroundColor: theme === 'dark' ? '#1a1a2e' : '#fff', borderColor: theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9' }]}>
            {/* Month navigation */}
            <View style={styles.gridNav}>
              <TouchableOpacity
                style={styles.gridNavBtn}
                onPress={() => {
                  if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
                  else setCalMonth(m => m - 1);
                  setSelectedDay(null);
                }}
              accessibilityLabel="Go back"
              >
                <Ionicons name="chevron-back" size={20} color="#556ee6" />
              </TouchableOpacity>
              <Text style={[styles.gridMonthLabel, { color: colors.foreground }]}>
                {MONTH_NAMES[calMonth]} {calYear}
              </Text>
              <TouchableOpacity
                style={styles.gridNavBtn}
                onPress={() => {
                  if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
                  else setCalMonth(m => m + 1);
                  setSelectedDay(null);
                }}
              accessibilityLabel="Next"
              >
                <Ionicons name="chevron-forward" size={20} color="#556ee6" />
              </TouchableOpacity>
            </View>

            {/* Day-of-week headers */}
            <View style={styles.gridDayHeaders}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <Text key={d} style={[styles.gridDayHeader, { color: colors['muted-foreground'] }]}>{d}</Text>
              ))}
            </View>

            {/* Calendar cells */}
            {buildMonthGrid(calYear, calMonth).map((week, wi) => (
              <View key={wi} style={styles.gridWeek}>
                {week.map((date, di) => {
                  if (!date) return <View key={di} style={styles.gridCell} />;
                  const ds = date.toISOString().slice(0, 10);
                  const dayHols = getHolidaysForDate(ds, holidays);
                  const isToday = ds === TODAY.toISOString().slice(0, 10);
                  const isSel   = ds === selectedDay;
                  return (
                    <TouchableOpacity
                      key={di}
                      style={[
                        styles.gridCell,
                        isToday && { backgroundColor: '#556ee6', borderRadius: 8 },
                        isSel && !isToday && { backgroundColor: '#556ee620', borderRadius: 8 },
                      ]}
                      onPress={() => setSelectedDay(dayHols.length > 0 ? (isSel ? null : ds) : null)}
                      activeOpacity={dayHols.length > 0 ? 0.5 : 1}
                    >
                      <Text style={[styles.gridDayNum, { color: isToday ? 'white' : colors.foreground }]}>
                        {date.getDate()}
                      </Text>
                      <View style={styles.gridDots}>
                        {dayHols.slice(0, 3).map((h, hi) => (
                          <View key={hi} style={[styles.gridDot, { backgroundColor: holidayColor(h) }]} />
                        ))}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            {/* Tooltip for selected day */}
            {selectedDay && (() => {
              const dayHols = getHolidaysForDate(selectedDay, holidays);
              if (!dayHols.length) return null;
              return (
                <View style={[styles.gridTooltip, { borderColor: theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9' }]}>
                  <Text style={[styles.gridTooltipDate, { color: colors['muted-foreground'] }]}>
                    {new Date(selectedDay).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </Text>
                  {dayHols.map(h => (
                    <View key={h.id} style={styles.gridTooltipRow}>
                      <View style={[styles.gridTooltipDot, { backgroundColor: holidayColor(h) }]} />
                      <Text style={[styles.gridTooltipName, { color: colors.foreground }]} numberOfLines={1}>{h.name}</Text>
                    </View>
                  ))}
                </View>
              );
            })()}
          </View>
        )}

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#556ee6" />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Ionicons name="alert-circle" size={48} color={colors['muted-foreground']} />
            <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>Failed to load holidays</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={{ color: 'white', fontWeight: '600' }}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : viewMode === 'grid' ? null : grouped.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="calendar-outline" size={48} color={colors['muted-foreground']} />
            <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
              {filter === 'upcoming' ? 'No upcoming holidays' :
               filter === 'past'     ? 'No past holidays' :
               'No holidays found'}
            </Text>
          </View>
        ) : (
          grouped.map(([month, items]) => (
            <View key={month}>
              {/* Month header */}
              <View style={styles.monthHeader}>
                <Text style={[styles.monthLabel, { color: colors['muted-foreground'] }]}>
                  {month.toUpperCase()}
                </Text>
              </View>

              {items.map((holiday) => {
                const color    = holidayColor(holiday);
                const duration = getDuration(holiday.start_date, holiday.end_date);
                const upcoming = isUpcoming(holiday);
                return (
                  <View
                    key={holiday.id}
                    style={[
                      styles.holidayCard,
                      { backgroundColor: cardBg, borderColor: borderCol },
                      !upcoming && { opacity: 0.6 },
                    ]}
                  >
                    <View style={[styles.colorBar, { backgroundColor: color }]} />
                    <View style={{ flex: 1 }}>
                      <View style={styles.cardTopRow}>
                        <Text style={[styles.holidayName, { color: colors.foreground }]} numberOfLines={1}>
                          {holiday.name}
                        </Text>
                        {duration > 1 && (
                          <View style={[styles.durationBadge, { backgroundColor: color + '22' }]}>
                            <Text style={[styles.durationText, { color }]}>{duration}d</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.holidayDate, { color: colors['muted-foreground'] }]}>
                        {formatDateRange(holiday.start_date, holiday.end_date)}
                      </Text>
                      {holiday.description ? (
                        <Text style={[styles.holidayDesc, { color: colors['muted-foreground'] }]} numberOfLines={2}>
                          {holiday.description}
                        </Text>
                      ) : null}
                    </View>
                    {upcoming && (
                      <View style={[styles.upcomingDot, { backgroundColor: color }]} />
                    )}
                  </View>
                );
              })}
            </View>
          ))
        )}

        <View style={{ height: 48 }} />
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  banner: {
    borderRadius: 18, padding: 18,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginBottom: 16, overflow: 'hidden',
  },
  bannerDecor: {
    position: 'absolute', top: -30, right: -30,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  bannerDecor2: {
    position: 'absolute', bottom: -40, right: 60,
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  bannerIcon: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  bannerTitle: { color: 'white', fontSize: 18, fontWeight: '700', marginBottom: 2 },
  bannerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 11, lineHeight: 16, flex: 1 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statCard: {
    flex: 1, borderRadius: 12, borderWidth: 1,
    padding: 10, alignItems: 'center',
  },
  statNum: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 11, fontWeight: '500', marginTop: 2 },

  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },

  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: { fontSize: 14, textAlign: 'center' },
  retryBtn: {
    backgroundColor: '#556ee6',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },

  monthHeader: {
    marginBottom: 8,
    marginTop: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  monthLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },

  holidayCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    overflow: 'hidden',
    gap: 12,
    padding: 12,
  },
  colorBar: {
    width: 4,
    borderRadius: 2,
    alignSelf: 'stretch',
    minHeight: 40,
    marginLeft: -12,
    marginVertical: -12,
    marginRight: 0,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  holidayName: { fontSize: 14, fontWeight: '700', flex: 1 },
  holidayDate: { fontSize: 12, marginBottom: 3 },
  holidayDesc: { fontSize: 11, lineHeight: 16 },
  durationBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 6,
  },
  durationText: { fontSize: 11, fontWeight: '700' },
  upcomingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 5,
  },

  // View toggle
  viewToggle: { flexDirection: 'row', gap: 4, alignSelf: 'flex-start' },
  viewBtn: {
    width: 32, height: 32, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },

  // Grid calendar
  gridContainer: {
    borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 16,
  },
  gridNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10,
  },
  gridNavBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#556ee618', justifyContent: 'center', alignItems: 'center',
  },
  gridMonthLabel: { fontSize: 15, fontWeight: '700' },
  gridDayHeaders: { flexDirection: 'row', marginBottom: 4 },
  gridDayHeader: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600' },
  gridWeek: { flexDirection: 'row', marginBottom: 2 },
  gridCell: { flex: 1, minHeight: 42, alignItems: 'center', paddingVertical: 4 },
  gridDayNum: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  gridDots: { flexDirection: 'row', gap: 2, flexWrap: 'wrap', justifyContent: 'center' },
  gridDot: { width: 5, height: 5, borderRadius: 3 },

  // Tooltip
  gridTooltip: {
    borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 8, gap: 4,
  },
  gridTooltipDate: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  gridTooltipRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  gridTooltipDot: { width: 8, height: 8, borderRadius: 4 },
  gridTooltipName: { fontSize: 13, fontWeight: '600', flex: 1 },
});

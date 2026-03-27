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
import { useAuth, useTheme } from '@/contexts';
import { timetableApi, TimetableDataItem, subjectsApi } from '@/src/api';
import { studentAdmissionsApi } from '@/src/api/students';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_KEYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TODAY_IDX = Math.min(new Date().getDay() - 1, 5); // Mon=0 … Sat=5; clamp to 0-5

export default function TimetableScreen() {
  const { colors, theme, } = useTheme();
  const { role, selectedStudent, studentId, user } = useAuth();

  const roleName = role?.name?.toLowerCase() ?? '';
  const isStudent = roleName === 'student';
  const isParent  = ['parent', 'guardian', 'father', 'mother'].includes(roleName);

  const [selectedDay, setSelectedDay] = useState(Math.max(0, TODAY_IDX));

  const cardBg    = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  // ── Resolve sectionId ─────────────────────────────────────────────────────
  // For parent: selectedStudent.section_id
  // For student: fetch their own admission record to get section_id
  const parentSectionId = isParent ? (selectedStudent?.section_id ?? null) : null;

  // For student role: fetch own admission to get section_id
  const { data: myAdmission, isLoading: admissionLoading } = useQuery({
    queryKey: ['my-admission-for-timetable'],
    queryFn: () => studentAdmissionsApi.myAdmission(),
    enabled: isStudent,
  });

  const sectionId: string | null =
    isParent  ? parentSectionId :
    isStudent ? (myAdmission?.current_section_id ?? myAdmission?.admitted_section_id ?? null) :
    null;

  const isSectionLoading = isStudent && admissionLoading;

  // ── Fetch timetable ───────────────────────────────────────────────────────
  const { data: timetableData, isLoading: ttLoading, error } = useQuery({
    queryKey: ['timetable-viewer', sectionId],
    queryFn: () => timetableApi.getFrontendTimetable(sectionId!),
    enabled: !!sectionId,
  });

  const slots: TimetableDataItem[] = timetableData?.timetable_data ?? [];

  // ── Fetch subjects to resolve UUIDs → names ───────────────────────────────
  const { data: subjectsList = [] } = useQuery({
    queryKey: ['subjects-for-timetable'],
    queryFn: () => subjectsApi.getSubjects({ active_only: true }),
    enabled: !!sectionId && !!timetableData,
  });

  const subjectMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of subjectsList) m.set(s.id, s.name);
    return m;
  }, [subjectsList]);

  // Periods for selected day
  const dayKey = DAY_KEYS[selectedDay];
  const periodsForDay = useMemo(() => {
    return slots.filter((slot) => {
      if (slot.type === 'special') {
        // Universal special (no subjects dict) → show every day
        // Day-specific special (has subjects entries) → only show if this day included
        const hasSubjectsDict = slot.subjects && Object.keys(slot.subjects).length > 0;
        return !hasSubjectsDict || !!slot.subjects![dayKey];
      }
      return !!slot.subjects?.[dayKey];
    });
  }, [slots, dayKey]);

  const isLoading = isSectionLoading || ttLoading;

  // ── No section for staff/non-student ─────────────────────────────────────
  const isStaffOrAdmin = !isStudent && !isParent;

  return (
    <AppLayout title="My Timetable">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Banner */}
        <View style={[styles.banner, { backgroundColor: '#7C3AED' }]}>
          <View style={styles.bannerDecor} />
          <View style={styles.bannerDecor2} />
          <View style={styles.bannerIcon}>
            <Ionicons name="time" size={28} color="white" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Class Timetable</Text>
            <Text style={styles.bannerSub}>
              {isParent && selectedStudent
                ? `${selectedStudent.first_name}'s schedule`
                : isStudent
                ? 'Your weekly class schedule'
                : 'Weekly class schedule'}
            </Text>
          </View>
        </View>

        {isStaffOrAdmin ? (
          <View style={styles.centered}>
            <Ionicons name="information-circle-outline" size={48} color={colors['muted-foreground']} />
            <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
              Timetable viewer is available for students and parents only.
              {'\n'}Staff timetable is available in the Masters section.
            </Text>
          </View>
        ) : isParent && !selectedStudent ? (
          <View style={styles.centered}>
            <Ionicons name="person-outline" size={48} color={colors['muted-foreground']} />
            <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
              No student selected.{'\n'}Use the selector in the header.
            </Text>
          </View>
        ) : isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#7C3AED" />
          </View>
        ) : !sectionId ? (
          <View style={styles.centered}>
            <Ionicons name="alert-circle-outline" size={48} color={colors['muted-foreground']} />
            <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
              No class section assigned yet.
            </Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Ionicons name="alert-circle" size={48} color={colors['muted-foreground']} />
            <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
              Failed to load timetable
            </Text>
          </View>
        ) : (
          <>
            {/* Day selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll}>
              {DAY_SHORT.map((d, i) => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.dayChip,
                    selectedDay === i && { backgroundColor: '#7C3AED' },
                    i === TODAY_IDX && selectedDay !== i && styles.todayChipBorder,
                  ]}
                  onPress={() => setSelectedDay(i)}
                >
                  <Text style={{ color: selectedDay === i ? 'white' : colors['muted-foreground'], fontWeight: '700', fontSize: 13 }}>
                    {d}
                  </Text>
                  {i === TODAY_IDX && (
                    <View style={[styles.todayDot, { backgroundColor: selectedDay === i ? 'white' : '#7C3AED' }]} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.dayHeading, { color: colors.foreground }]}>
              {DAYS[selectedDay]}
            </Text>

            {periodsForDay.length === 0 ? (
              <View style={styles.centered}>
                <Ionicons name="sunny-outline" size={48} color={colors['muted-foreground']} />
                <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
                  No periods scheduled
                </Text>
              </View>
            ) : (
              periodsForDay.map((slot, idx) => {
                const subjectId = slot.type === 'subject' ? slot.subjects?.[dayKey] : null;
                return (
                  <View
                    key={idx}
                    style={[
                      styles.periodCard,
                      { backgroundColor: cardBg, borderColor: borderCol },
                    ]}
                  >
                    <View style={[styles.timeBox, { backgroundColor: '#7C3AED18' }]}>
                      <Text style={[styles.timeFrom, { color: '#7C3AED' }]}>{slot.time.from}</Text>
                      <View style={styles.timeDivider} />
                      <Text style={[styles.timeTo, { color: '#7C3AED' }]}>{slot.time.to}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      {slot.type === 'special' ? (
                        <>
                          <Text style={[styles.subjectName, { color: colors.foreground }]}>
                            {slot.label ?? 'Special Period'}
                          </Text>
                          <View style={[styles.typeBadge, { backgroundColor: '#F59E0B18' }]}>
                            <Text style={[styles.typeBadgeText, { color: '#F59E0B' }]}>SPECIAL</Text>
                          </View>
                        </>
                      ) : subjectId ? (
                        <>
                          <Text style={[styles.subjectName, { color: colors.foreground }]}>
                            {subjectMap.get(subjectId) ?? subjectId}
                          </Text>
                          <View style={[styles.typeBadge, { backgroundColor: '#7C3AED18' }]}>
                            <Text style={[styles.typeBadgeText, { color: '#7C3AED' }]}>SUBJECT</Text>
                          </View>
                        </>
                      ) : null}
                    </View>
                    <Text style={[styles.periodNum, { color: colors['muted-foreground'] }]}>
                      P{idx + 1}
                    </Text>
                  </View>
                );
              })
            )}

            {slots.length === 0 && (
              <View style={styles.centered}>
                <Ionicons name="calendar-clear-outline" size={48} color={colors['muted-foreground']} />
                <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
                  No timetable has been set up yet.{'\n'}Contact your class teacher.
                </Text>
              </View>
            )}
          </>
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
  bannerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 11, lineHeight: 16 },

  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 22 },

  dayScroll: { marginBottom: 14 },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
    alignItems: 'center',
    gap: 3,
  },
  todayChipBorder: {
    borderWidth: 1.5,
    borderColor: '#7C3AED',
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },

  dayHeading: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },

  periodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 12,
    marginBottom: 8,
  },
  timeBox: {
    width: 58,
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
  },
  timeFrom: { fontSize: 12, fontWeight: '700' },
  timeDivider: {
    width: 20, height: 1,
    backgroundColor: '#7C3AED40',
    marginVertical: 3,
  },
  timeTo: { fontSize: 12, fontWeight: '700' },
  subjectName: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: { fontSize: 10, fontWeight: '700' },
  periodNum: { fontSize: 12, fontWeight: '600' },
});

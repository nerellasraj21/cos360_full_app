import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';

const GRADING_LINKS = [
  {
    id: 'exams',
    title: 'All Exams',
    description: 'View, create, and manage exams',
    icon: 'school',
    color: '#556EE6',
    route: '/exam/list',
  },
  {
    id: 'marks',
    title: 'Mark Entry',
    description: 'Enter subject marks per student',
    icon: 'pencil',
    color: '#3B82F6',
    route: '/exam/marks',
  },
  {
    id: 'results',
    title: 'Results',
    description: 'Compute and publish exam results',
    icon: 'bar-chart',
    color: '#10B981',
    route: '/exam/results',
  },
  {
    id: 'hall-tickets',
    title: 'Hall Tickets',
    description: 'Manage eligibility and publish',
    icon: 'card',
    color: '#8B5CF6',
    route: '/exam/hall-tickets',
  },
  {
    id: 'dates',
    title: 'Exam Dates',
    description: 'Schedule subject-wise exam timetable',
    icon: 'calendar',
    color: '#14B8A6',
    route: '/exam/dates',
  },
  {
    id: 'permissions',
    title: 'Mark Permissions',
    description: 'Grant teachers permission to enter marks',
    icon: 'key',
    color: '#6366F1',
    route: '/exam/permissions',
  },
  {
    id: 'my-marks',
    title: 'My Marks',
    description: 'View your own marks (Student / Parent)',
    icon: 'document-text',
    color: '#EC4899',
    route: '/exam/my-marks',
  },
  {
    id: 'grade-schemes',
    title: 'Grade Schemes',
    description: 'Manage exam & subject grade bands',
    icon: 'ribbon',
    color: '#F59E0B',
    route: '/exam/grade-schemes',
  },
  {
    id: 'remark-sets',
    title: 'Remark Grade Sets',
    description: 'Configure remark-based grading',
    icon: 'chatbubble-ellipses',
    color: '#F97316',
    route: '/exam/remark-sets',
  },
  {
    id: 'board-patterns',
    title: 'Board Patterns',
    description: 'Define board exam patterns',
    icon: 'library',
    color: '#0EA5E9',
    route: '/exam/board-patterns',
  },
  {
    id: 'settings',
    title: 'Exam Settings',
    description: 'Default board, attendance threshold, grace marks',
    icon: 'settings',
    color: '#64748B',
    route: '/exam/settings',
  },
];

export default function GradingDashboardScreen() {
  const { colors, theme } = useTheme();
  const router = useRouter();

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  return (
    <AppLayout title="Grading & Results">
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={[styles.subtitle, { color: colors['muted-foreground'] }]}>
          Select an area to manage
        </Text>

        {GRADING_LINKS.map((link) => (
          <TouchableOpacity
            key={link.id}
            style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}
            onPress={() => router.push(link.route as any)}
            activeOpacity={0.75}
          >
            <View style={[styles.iconBox, { backgroundColor: link.color + '20' }]}>
              <Ionicons name={link.icon as any} size={24} color={link.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>{link.title}</Text>
              <Text style={[styles.cardDesc, { color: colors['muted-foreground'] }]}>
                {link.description}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors['muted-foreground']} />
          </TouchableOpacity>
        ))}

        <View style={{ height: 48 }} />
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  subtitle: { fontSize: 14, marginBottom: 20 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  cardDesc: { fontSize: 13, lineHeight: 18 },
});

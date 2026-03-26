import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { getSchoolName } from '@/constants/school';
import StudentSelector from './StudentSelector';
import AppDrawer from './navigation/AppDrawer';

const HEADER_BG = '#556ee6';

interface AppHeaderProps {
  title?: string;
  showSearch?: boolean;
  showMenu?: boolean;
  headerRight?: React.ReactNode;
}

export default function AppHeader({
  title = 'Dashboard',
  showSearch = true,
  showMenu = true,
  headerRight,
}: AppHeaderProps) {
  const { role, selectedStudent, availableStudents, selectStudent, user, menu } = useAuth();
  const schoolName = getSchoolName();
  const [showStudentSelector, setShowStudentSelector] = React.useState(false);
  const [showDrawer, setShowDrawer] = React.useState(false);

  const isParent =
    role?.name?.toLowerCase() === 'parent' ||
    role?.name?.toLowerCase() === 'guardian' ||
    role?.name?.toLowerCase() === 'father' ||
    role?.name?.toLowerCase() === 'mother';

  const initial = schoolName ? schoolName.charAt(0).toUpperCase() : '🏫';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        {/* Left: Logo + school name */}
        <View style={styles.leftSection}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoInitial}>{initial}</Text>
          </View>
          <View style={styles.schoolInfo}>
            <Text style={styles.schoolName} numberOfLines={1}>
              {schoolName}
            </Text>
            <TouchableOpacity
              style={styles.subtitleRow}
              onPress={isParent && availableStudents.length > 0 ? () => setShowStudentSelector(true) : undefined}
              disabled={!isParent || availableStudents.length === 0}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              {isParent && selectedStudent ? (
                <>
                  <Text style={styles.subtitleText} numberOfLines={1}>
                    {selectedStudent.first_name} {selectedStudent.last_name}
                  </Text>
                  {availableStudents.length > 1 && (
                    <Ionicons name="chevron-down" size={12} color="rgba(255,255,255,0.7)" style={{ marginLeft: 3 }} />
                  )}
                </>
              ) : (
                <Text style={styles.subtitleText}>{title}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Right: action buttons */}
        <View style={styles.rightSection}>
          {headerRight}
          {showSearch && (
            <TouchableOpacity
              style={[styles.iconButton, { opacity: 0.4 }]}
              disabled={true}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="search-outline" size={22} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
          )}
          {showMenu && (
            <TouchableOpacity
              style={[styles.iconButton, styles.menuButton]}
              onPress={() => setShowDrawer(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="menu" size={24} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Student Selector */}
      {isParent && availableStudents.length > 0 && (
        <StudentSelector
          students={availableStudents}
          selectedStudent={selectedStudent}
          onStudentChange={selectStudent}
          placeholder="Select student"
          open={showStudentSelector}
          onClose={() => setShowStudentSelector(false)}
        />
      )}

      {/* App Drawer */}
      <AppDrawer
        visible={showDrawer}
        onClose={() => setShowDrawer(false)}
        menuItems={menu || []}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: HEADER_BG,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  logoInitial: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
  },
  schoolInfo: {
    flex: 1,
  },
  schoolName: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  subtitleText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    fontWeight: '400',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  iconButton: {
    padding: 8,
    borderRadius: 10,
  },
  menuButton: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginLeft: 4,
  },
});

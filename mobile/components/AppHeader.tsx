import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/contexts';
import { useAuth } from '@/contexts/AuthContext';
import { getSchoolName } from '@/constants/school';
import StudentSelector from './StudentSelector';
import AppDrawer from './navigation/AppDrawer';

interface AppHeaderProps {
  title?: string;
  showSearch?: boolean;
  showMenu?: boolean;
}

export default function AppHeader({
  title = 'Dashboard',
  showSearch = true,
  showMenu = true
}: AppHeaderProps) {
  const { colors } = useTheme();
  const { role, selectedStudent, availableStudents, selectStudent, user, menu } = useAuth();
  const schoolName = getSchoolName();
  const [showStudentSelector, setShowStudentSelector] = React.useState(false);
  const [showDrawer, setShowDrawer] = React.useState(false);

  const isParent = role?.name?.toLowerCase() === 'parent' ||
                   role?.name?.toLowerCase() === 'guardian' ||
                   role?.name?.toLowerCase() === 'father' ||
                   role?.name?.toLowerCase() === 'mother';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#1e3a8a' }]} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.leftSection}>
          <View style={styles.logoContainer}>
            <View style={[styles.logo, { backgroundColor: colors.background }]}>
              <Text style={styles.logoText}>🏫</Text>
            </View>
            <View style={styles.schoolInfo}>
              <View style={styles.schoolTextContainer}>
                <Text style={styles.schoolName}>{schoolName}</Text>
                <Text style={styles.schoolSubtitle}>School</Text>
              </View>
              <TouchableOpacity
                style={styles.arrowButton}
                onPress={isParent && availableStudents.length > 0 ? () => setShowStudentSelector(true) : undefined}
                disabled={!isParent || availableStudents.length === 0}
              >
                <Text style={styles.arrowText}>▼</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        
        <View style={styles.rightSection}>
          {showSearch && (
            <TouchableOpacity style={styles.iconButton}>
              <IconSymbol name="magnifyingglass" size={24} color="white" />
            </TouchableOpacity>
          )}
          {showMenu && (
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => setShowDrawer(true)}
            >
              <IconSymbol name="line.horizontal.3" size={24} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Student Selector Modal - triggered by school name arrow */}
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
  container: {
    backgroundColor: '#1e3a8a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  leftSection: {
    flex: 1,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoText: {
    fontSize: 20,
  },
  schoolInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  schoolTextContainer: {
    flexDirection: 'column',
  },
  schoolName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  schoolSubtitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  arrowButton: {
    padding: 4,
    marginLeft: 4,
    minWidth: 24,
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    marginLeft: 8,
  },
});
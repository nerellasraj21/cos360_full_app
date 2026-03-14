import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    FlatList,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CustomDropdown } from '@/components/ui/dropdown';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { studentTransportApi, studentAdmissionsApi, routesApi, routeStopsApi } from '@/src/api';
import { useTheme } from '@/contexts';
import { ReadOrListPermissionGuard, CreatePermissionGuard, UpdatePermissionGuard, DeletePermissionGuard } from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';

interface TransportAssignment {
  id: string;
  student_id: string;
  route_id: string;
  stop_id: string;
  pickup_time?: string;
  drop_time?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  student_name?: string;
  route_name?: string;
  stop_name?: string;
  fees?: number;
}

export default function StudentTransportScreen() {
  const router = useRouter();
  // const colorScheme = useColorScheme();
  // const theme = colorScheme === 'dark' ? 'dark' : 'light';
  const { theme, colors } = useTheme();
  const themeColors = Colors[theme];
  const queryClient = useQueryClient();

  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [selectedStop, setSelectedStop] = useState<string>('');

  // Fetch transport assignments
  const { data: transportData, isLoading, refetch } = useQuery({
    queryKey: ['student-transport', selectedStudent],
    queryFn: async () => {
      const response = await studentTransportApi.getStudentTransports();
      if (selectedStudent) {
        return response.filter((assignment: any) => assignment.student_id === selectedStudent);
      }
      return response;
    },
  });

  // Fetch students for dropdown
  const { data: studentsData } = useQuery({
    queryKey: ['students-dropdown'],
    queryFn: async () => {
      const response = await studentAdmissionsApi.getStudentAdmissions();
      return response.items.map((student: any) => ({
        label: `${student.student.first_name} ${student.student.last_name} (${student.admission_number})`,
        value: student.id
      }));
    },
  });

  // Fetch routes for dropdown
  const { data: routesData } = useQuery({
    queryKey: ['routes-dropdown'],
    queryFn: async () => {
      const data = await routesApi.getRoutesDropdown();
      return data.map((route: any) => ({
        label: route.label,
        value: route.id
      }));
    },
  });

  // Fetch route stops for selected route
  const { data: stopsData } = useQuery({
    queryKey: ['route-stops', selectedRoute],
    queryFn: async () => {
      if (!selectedRoute) return [];
      const response = await routeStopsApi.getRouteStops();
      return response.filter((stop: any) => stop.route_id === selectedRoute).map((stop: any) => ({
        label: stop.stop_name,
        value: stop.id
      }));
    },
    enabled: !!selectedRoute,
  });

  // Mutation for creating transport assignment
  const createTransportMutation = useMutation({
    mutationFn: studentTransportApi.createStudentTransport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-transport'] });
      Alert.alert('Success', 'Transport assignment created successfully!');
      setSelectedRoute('');
      setSelectedStop('');
    },
    onError: (error) => {
      Alert.alert('Error', 'Failed to create transport assignment. Please try again.');
      console.error('Create transport error:', error);
    },
  });

  const handleCreateAssignment = () => {
    if (!selectedStudent || !selectedRoute || !selectedStop) {
      Alert.alert('Error', 'Please select student, route, and stop');
      return;
    }

    createTransportMutation.mutate({
      student_id: selectedStudent,
      route_id: selectedRoute,
      stop_id: selectedStop,
    } as any);
  };

  const renderTransportItem = ({ item }: { item: TransportAssignment }) => (
    <View style={[styles.transportCard, { backgroundColor: themeColors.card }]}>
      <View style={styles.transportHeader}>
        <View style={styles.transportInfo}>
          <ThemedText style={styles.studentName}>{item.student_name}</ThemedText>
          <ThemedText style={styles.routeName}>{item.route_name}</ThemedText>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.is_active ? '#10B981' : '#EF4444' }]}>
          <ThemedText style={styles.statusText}>
            {item.is_active ? 'Active' : 'Inactive'}
          </ThemedText>
        </View>
      </View>

      <View style={styles.transportDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="location" size={16} color={themeColors['muted-foreground']} />
          <ThemedText style={styles.detailText}>Stop: {item.stop_name}</ThemedText>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="time" size={16} color={themeColors['muted-foreground']} />
          <ThemedText style={styles.detailText}>
            Pickup: {item.pickup_time} | Drop: {item.drop_time}
          </ThemedText>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="cash" size={16} color={themeColors['muted-foreground']} />
          <ThemedText style={[styles.detailText, styles.feesText]}>
            ₹{item.fees}/month
          </ThemedText>
        </View>
      </View>

      <View style={styles.transportActions}>
        <UpdatePermissionGuard 
          resource={PERMISSION_RESOURCES.STUDENT_TRANSPORT}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: themeColors.primary }]}
            onPress={() => Alert.alert('Edit', 'Edit functionality would be implemented')}
          >
            <Ionicons name="create" size={16} color="white" />
            <ThemedText style={styles.actionButtonText}>Edit</ThemedText>
          </TouchableOpacity>
        </UpdatePermissionGuard>

        <DeletePermissionGuard 
          resource={PERMISSION_RESOURCES.STUDENT_TRANSPORT}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
            onPress={() => Alert.alert('Remove', 'Remove functionality would be implemented')}
          >
            <Ionicons name="trash" size={16} color="white" />
            <ThemedText style={styles.actionButtonText}>Remove</ThemedText>
          </TouchableOpacity>
        </DeletePermissionGuard>
      </View>
    </View>
  );

  const renderAssignmentForm = () => (
    <CreatePermissionGuard 
      resource={PERMISSION_RESOURCES.STUDENT_TRANSPORT}>
      <View style={[styles.formCard, { backgroundColor: themeColors.card }]}>
        <ThemedText type="subtitle" style={styles.formTitle}>
          Assign Transport
        </ThemedText>

        <View style={styles.formField}>
          <ThemedText style={styles.fieldLabel}>Student *</ThemedText>
          <CustomDropdown
            data={studentsData || []}
            placeholder="Select student"
            value={selectedStudent}
            onChange={(value) => setSelectedStudent(value as string)}
            style={{ backgroundColor: themeColors.background }}
          />
        </View>

        <View style={styles.formField}>
          <ThemedText style={styles.fieldLabel}>Route *</ThemedText>
          <CustomDropdown
            data={routesData || []}
            placeholder="Select route"
            value={selectedRoute}
            onChange={(value) => {
              setSelectedRoute(value as string);
              setSelectedStop(''); // Reset stop when route changes
            }}
            style={{ backgroundColor: themeColors.background }}
          />
        </View>

        <View style={styles.formField}>
          <ThemedText style={styles.fieldLabel}>Stop *</ThemedText>
          <CustomDropdown
            data={stopsData || []}
            placeholder={selectedRoute ? "Select stop" : "Select route first"}
            value={selectedStop}
            onChange={(value) => setSelectedStop(value as string)}
            style={{ backgroundColor: themeColors.background }}
            disabled={!selectedRoute}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.assignButton,
            {
              backgroundColor: createTransportMutation.isPending ? themeColors['muted'] : themeColors.primary
            }
          ]}
          onPress={handleCreateAssignment}
          disabled={createTransportMutation.isPending || !selectedStudent || !selectedRoute || !selectedStop}
        >
          <Ionicons name="bus" size={20} color="white" />
          <ThemedText style={styles.assignButtonText}>
            {createTransportMutation.isPending ? 'Assigning...' : 'Assign Transport'}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </CreatePermissionGuard>
  );

  return (
    <ReadOrListPermissionGuard 
      resource={PERMISSION_RESOURCES.STUDENT_TRANSPORT}
      fallback={
        <ThemedView style={styles.container}>
          <View style={styles.accessDeniedContainer}>
            <Ionicons name="lock-closed" size={48} color={themeColors['muted-foreground']} />
            <ThemedText style={styles.accessDeniedText}>
              You don't have permission to access student transport
            </ThemedText>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ThemedText style={styles.backButtonText}>Go Back</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      }
    >
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: themeColors.card }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={themeColors['card-foreground']} />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.headerTitle}>
            Student Transport
          </ThemedText>
        </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Assignment Form */}
        {renderAssignmentForm()}

        {/* Transport Assignments List */}
        <View style={[styles.assignmentsCard, { backgroundColor: themeColors.card }]}>
          <ThemedText type="subtitle" style={styles.assignmentsTitle}>
            Transport Assignments
          </ThemedText>

          <FlatList
            data={transportData}
            renderItem={renderTransportItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.assignmentsList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="bus" size={48} color={themeColors['muted-foreground']} />
                <ThemedText style={styles.emptyText}>
                  {selectedStudent ? 'No transport assignments found for selected student' : 'No transport assignments found'}
                </ThemedText>
                <ThemedText style={styles.emptySubtext}>
                  Create a new transport assignment using the form above
                </ThemedText>
              </View>
            }
          />
        </View>
      </ScrollView>
      </ThemedView>
    </ReadOrListPermissionGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  formCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    marginBottom: 16,
  },
  formField: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  assignButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  assignmentsCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  assignmentsTitle: {
    marginBottom: 16,
  },
  assignmentsList: {
    paddingBottom: 16,
  },
  transportCard: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  transportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  transportInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  routeName: {
    fontSize: 14,
    opacity: 0.8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  transportDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    marginLeft: 8,
    opacity: 0.8,
  },
  feesText: {
    color: '#10B981',
    fontWeight: '600',
  },
  transportActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 6,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.7,
  },
  emptySubtext: {
    marginTop: 4,
    textAlign: 'center',
    fontSize: 12,
    opacity: 0.5,
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  accessDeniedText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
    opacity: 0.7,
  },
  backButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
});
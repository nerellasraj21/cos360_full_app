import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  TextInput,
  Keyboard,
} from 'react-native';
import { IconSymbol } from './ui/icon-symbol';
import { ParentStudent } from '../src/api/students';

interface StudentSelectorProps {
  students: ParentStudent[];
  selectedStudent: ParentStudent | null;
  onStudentChange: (student: ParentStudent) => void | Promise<void>;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  open?: boolean;
  onClose?: () => void;
}

export default function StudentSelector({
  students,
  selectedStudent,
  onStudentChange,
  placeholder = 'Select a student',
  disabled = false,
  open: externalOpen,
  onClose,
}: StudentSelectorProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);

  // Use external control if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = onClose ? (value: boolean) => { if (!value) onClose(); } : setInternalOpen;

  // Filter students based on search query
  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.admission_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.class_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = async (student: ParentStudent) => {
    await onStudentChange(student);
    setOpen(false);
    setSearchQuery('');
    Keyboard.dismiss();
  };

  const handleOpen = () => {
    if (!disabled) {
      setOpen(true);
      // Focus search input after modal opens
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setSearchQuery('');
    Keyboard.dismiss();
  };

  const renderStudentItem = ({ item }: { item: ParentStudent }) => (
    <TouchableOpacity
      style={[
        styles.studentItem,
        selectedStudent?.id === item.id && styles.selectedStudentItem,
      ]}
      onPress={() => handleSelect(item)}
    >
      <View style={styles.studentInfo}>
        <View style={styles.studentMain}>
          <Text style={styles.studentName}>{item.name}</Text>
          <Text style={styles.studentDetails}>
            {item.gender} • Age: {item.date_of_birth ? new Date().getFullYear() - new Date(item.date_of_birth).getFullYear() : 'N/A'}
            {item.class_name && item.class_name !== 'Unknown Class' && ` • ${item.class_name}`}
          </Text>
        </View>
        {selectedStudent?.id === item.id && (
          <IconSymbol name="checkmark" size={20} color="#556ee6" />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      {/* <TouchableOpacity
        style={[styles.selector, disabled && styles.disabled]}
        onPress={handleOpen}
        disabled={disabled}
      >
        <View style={styles.selectorContent}>
          <View style={styles.selectedStudentInfo}>
            {selectedStudent ? (
              <>
                <Text style={styles.selectedStudentName} numberOfLines={1}>
                  {selectedStudent.name}
                </Text>
                <Text style={styles.selectedStudentDetails} numberOfLines={1}>
                  {selectedStudent.admission_number} • {selectedStudent.class_name}
                  {selectedStudent.section_name && ` • ${selectedStudent.section_name}`}
                </Text>
              </>
            ) : (
              <Text style={styles.placeholder}>{placeholder}</Text>
            )}
          </View>
          <IconSymbol
            name="chevron.down"
            size={16}
            color={disabled ? '#9ca3af' : '#6b7280'}
          />
        </View>
      </TouchableOpacity> */}

      <Modal
        visible={open}
        animationType="fade"
        transparent={true}
        onRequestClose={handleClose}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleClose}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Student</Text>
              <TouchableOpacity onPress={handleClose}>
                <IconSymbol name="xmark" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* <View style={styles.searchContainer}>
              <IconSymbol name="magnifyingglass" size={20} color="#6b7280" />
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder="Search students..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View> */}

            <FlatList
              data={filteredStudents}
              keyExtractor={(item) => item.id}
              renderItem={renderStudentItem}
              style={styles.studentList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    {searchQuery ? 'No students found' : 'No students available'}
                  </Text>
                </View>
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selector: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
  },
  disabled: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedStudentInfo: {
    flex: 1,
    marginRight: 8,
  },
  selectedStudentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  selectedStudentDetails: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  placeholder: {
    fontSize: 14,
    color: '#9ca3af',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#111827',
  },
  studentList: {
    maxHeight: 300,
  },
  studentItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  selectedStudentItem: {
    backgroundColor: '#f0f9ff',
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  studentMain: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  studentDetails: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
});
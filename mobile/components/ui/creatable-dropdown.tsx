import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '@/contexts';

export interface CreatableOption {
  value: string;
  label: string;
}

interface CreatableDropdownProps {
  options: CreatableOption[];
  value: string | null;
  onChange: (value: string) => void;
  onCreateOption?: (inputValue: string) => CreatableOption | null;
  placeholder?: string;
  formatCreateLabel?: (inputValue: string) => string;
  disabled?: boolean;
  style?: object;
  containerStyle?: object;
}

export const CreatableDropdown: React.FC<CreatableDropdownProps> = ({
  options,
  value,
  onChange,
  onCreateOption,
  placeholder = 'Select or create...',
  formatCreateLabel = (v) => `Create "${v}"`,
  disabled = false,
  style,
  containerStyle,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const searchRef = useRef<TextInput>(null);
  const { colors } = useTheme();

  const selectedOption = useMemo(
    () => options.find((o) => o.value === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, searchText]);

  const exactMatch = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return true;
    return options.some((o) => o.label.toLowerCase() === q);
  }, [options, searchText]);

  const showCreate = searchText.trim().length > 0 && !exactMatch && !!onCreateOption;

  const openModal = useCallback(() => {
    if (!disabled) {
      setSearchText('');
      setModalVisible(true);
    }
  }, [disabled]);

  const closeModal = useCallback(() => {
    Keyboard.dismiss();
    setModalVisible(false);
    setSearchText('');
  }, []);

  const handleSelect = useCallback(
    (option: CreatableOption) => {
      onChange(option.value);
      closeModal();
    },
    [onChange, closeModal]
  );

  const handleCreate = useCallback(() => {
    if (!onCreateOption || !searchText.trim()) return;
    const newOption = onCreateOption(searchText.trim());
    if (newOption) {
      onChange(newOption.value);
    }
    closeModal();
  }, [onCreateOption, searchText, onChange, closeModal]);

  return (
    <View style={[containerStyle]}>
      {/* Trigger */}
      <TouchableOpacity
        activeOpacity={disabled ? 1 : 0.7}
        onPress={openModal}
        style={[
          styles.trigger,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
          style,
        ]}
      >
        <Text
          style={[
            styles.triggerText,
            {
              color: selectedOption
                ? colors['card-foreground']
                : colors['muted-foreground'],
            },
          ]}
          numberOfLines={1}
        >
          {selectedOption?.label ?? placeholder}
        </Text>
        {!disabled && (
          <Ionicons
            name="chevron-down"
            size={14}
            color={colors['muted-foreground']}
          />
        )}
      </TouchableOpacity>

      {/* Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={closeModal}
        >
          <View
            style={[
              styles.sheet,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onStartShouldSetResponder={() => true}
          >
            {/* Search input */}
            <View
              style={[
                styles.searchRow,
                { borderBottomColor: colors.border },
              ]}
            >
              <Ionicons
                name="search"
                size={16}
                color={colors['muted-foreground']}
                style={styles.searchIcon}
              />
              <TextInput
                ref={searchRef}
                style={[
                  styles.searchInput,
                  { color: colors['card-foreground'] },
                ]}
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Search or type to create..."
                placeholderTextColor={colors['muted-foreground']}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={showCreate ? handleCreate : undefined}
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => setSearchText('')}>
                  <Ionicons
                    name="close-circle"
                    size={16}
                    color={colors['muted-foreground']}
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Options list */}
            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => String(item.value)}
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <TouchableOpacity
                    style={[
                      styles.optionRow,
                      { borderBottomColor: colors.border },
                      isSelected && {
                        backgroundColor: colors.accent + '30',
                      },
                    ]}
                    onPress={() => handleSelect(item)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        {
                          color: isSelected
                            ? colors.primary
                            : colors['card-foreground'],
                          fontWeight: isSelected ? '600' : '400',
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark"
                        size={16}
                        color={colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                !showCreate ? (
                  <Text
                    style={[
                      styles.emptyText,
                      { color: colors['muted-foreground'] },
                    ]}
                  >
                    No options found
                  </Text>
                ) : null
              }
            />

            {/* Create option */}
            {showCreate && (
              <TouchableOpacity
                style={[
                  styles.createRow,
                  {
                    borderTopColor: colors.border,
                    backgroundColor: colors.primary + '15',
                  },
                ]}
                onPress={handleCreate}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={16}
                  color={colors.primary}
                  style={styles.createIcon}
                />
                <Text style={[styles.createText, { color: colors.primary }]}>
                  {formatCreateLabel(searchText.trim())}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 36,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 6,
  },
  triggerText: {
    flex: 1,
    fontSize: 13,
    marginRight: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheet: {
    width: '100%',
    maxHeight: 380,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  list: {
    maxHeight: 260,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: {
    fontSize: 14,
    flex: 1,
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
    fontSize: 14,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  createIcon: {
    marginRight: 8,
  },
  createText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default CreatableDropdown;

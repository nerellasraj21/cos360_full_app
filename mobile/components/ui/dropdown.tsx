import { Colors, ComponentStyles, Radius } from '@/constants/theme';
import { useTheme } from '@/contexts';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';

export interface DropdownOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

export interface DropdownProps {
  data: DropdownOption[];
  placeholder?: string;
  value?: string | number | null;
  onChange: (value: string | number | null, option?: DropdownOption) => void;
  search?: boolean;
  multiSelect?: boolean;
  disabled?: boolean;
  error?: string;
  required?: boolean;
  style?: any;
  containerStyle?: any;
  placeholderStyle?: any;
  selectedTextStyle?: any;
  inputSearchStyle?: any;
  iconStyle?: any;
  labelField?: string;
  valueField?: string;
  searchPlaceholder?: string;
  maxHeight?: number;
  renderLeftIcon?: (visible?: boolean) => React.ReactElement | null;
  renderRightIcon?: (visible?: boolean) => React.ReactElement | null;
  renderItem?: (item: any, selected?: boolean) => React.ReactElement | null;
}

export const CustomDropdown: React.FC<DropdownProps> = React.memo(({
  data,
  placeholder = 'Select an option...',
  value,
  onChange,
  search = true,
  multiSelect = false,
  disabled = false,
  error,
  required = false,
  style,
  containerStyle,
  placeholderStyle,
  selectedTextStyle,
  inputSearchStyle,
  iconStyle,
  labelField = 'label',
  valueField = 'value',
  searchPlaceholder = 'Search...',
  maxHeight = 300,
  renderLeftIcon,
  renderRightIcon,
  renderItem,
}) => {
  const { theme, colors } = useTheme();
  const themeColors = colors;
  const themeStyles = ComponentStyles[theme];

  const dropdownStyle = useMemo(() => ({
    ...styles.dropdown,
    backgroundColor: themeStyles.picker.backgroundColor,
    borderColor: error ? themeColors.destructive : themeStyles.picker.borderColor,
    borderWidth: themeStyles.picker.borderWidth,
    borderRadius: themeStyles.picker.borderRadius,
    ...style,
  }), [themeStyles, themeColors, error, style]);

  const containerStyles = useMemo(() => ({
    ...styles.container,
    ...containerStyle,
    zIndex: 9999,
    elevation: 10,
  }), [containerStyle]);

  const placeholderStyles = useMemo(() => ({
    ...styles.placeholder,
    color: themeColors['muted-foreground'],
    ...placeholderStyle,
  }), [themeColors, placeholderStyle]);

  const selectedTextStyles = useMemo(() => ({
    ...styles.selectedText,
    color: themeColors['card-foreground'],
    ...selectedTextStyle,
  }), [themeColors, selectedTextStyle]);

  const inputSearchStyles = useMemo(() => ({
    ...styles.inputSearch,
    color: themeColors['card-foreground'],
    backgroundColor: themeStyles.textInput.backgroundColor,
    borderColor: themeStyles.textInput.borderColor,
    borderWidth: themeStyles.textInput.borderWidth,
    borderRadius: themeStyles.textInput.borderRadius,
    ...inputSearchStyle,
  }), [themeColors, themeStyles, inputSearchStyle]);

  const iconStyles = useMemo(() => ({
    ...styles.icon,
    ...iconStyle,
  }), [iconStyle]);

  const itemContainerStyle = useMemo(() => ({
    backgroundColor: themeColors.card,
    borderBottomColor: themeColors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  }), [themeColors]);

  const itemTextStyle = useMemo(() => ({
    color: themeColors['card-foreground'],
    fontSize: 16,
  }), [themeColors]);

  const selectedItemTextStyle = useMemo(() => ({
    color: themeColors.primary,
    fontSize: 16,
    fontWeight: '600',
  }), [themeColors]);

  const handleChange = (item: DropdownOption) => {
    if (multiSelect) {
      // Handle multi-select logic if needed
      onChange(item.value, item);
    } else {
      onChange(item.value, item);
    }
  };

  const handleChangeText = (text: string) => {
    // Handle search text change if needed
    console.log('Search text:', text);
  };

  return (
    <View style={containerStyles}>
      <Dropdown
        style={dropdownStyle}
        placeholderStyle={placeholderStyles}
        selectedTextStyle={selectedTextStyles}
        inputSearchStyle={inputSearchStyles}
        iconStyle={iconStyles}
        data={data}
        search={search}
        maxHeight={maxHeight}
        labelField={labelField}
        valueField={valueField}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        value={value}
        onChange={handleChange}
        onChangeText={handleChangeText}
        renderLeftIcon={renderLeftIcon}
        renderRightIcon={renderRightIcon}
        renderItem={renderItem || ((item, selected) => {
          return (
            <View style={[styles.itemContainer, itemContainerStyle]}>
              <Text style={selected ? selectedItemTextStyle : itemTextStyle}>
                {item.label}
              </Text>
            </View>
          );
        })}
        disable={disabled}
        itemContainerStyle={itemContainerStyle}
        itemTextStyle={itemTextStyle}
        activeColor={themeColors.accent}
        containerStyle={{
          backgroundColor: themeColors.card,
          borderColor: themeColors.border,
          borderWidth: 1,
          borderRadius: Radius.default,
          elevation: 20,
          zIndex: 9999,
        }}
        flatListProps={{
          showsVerticalScrollIndicator: true,
          nestedScrollEnabled: true,
        }}
      />

      {error && (
        <Text style={[styles.errorText, { color: themeColors.destructive }]}>
          {error}
        </Text>
      )}

      {required && !value && (
        <Text style={[styles.requiredText, { color: themeColors.destructive }]}>
          This field is required
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  dropdown: {
    height: 50,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  placeholder: {
    fontSize: 16,
  },
  selectedText: {
    fontSize: 16,
  },
  inputSearch: {
    height: 40,
    fontSize: 16,
    paddingHorizontal: 12,
    marginHorizontal: 8,
    marginVertical: 8,
  },
  icon: {
    width: 20,
    height: 20,
  },
  itemContainer: {
    padding: 12,
    minHeight: 44,
  },
  selectedStyle: {
    backgroundColor: 'transparent',
  },
  errorText: {
    fontSize: 14,
    marginTop: 4,
  },
  requiredText: {
    fontSize: 14,
    marginTop: 4,
  },
});

export default CustomDropdown;
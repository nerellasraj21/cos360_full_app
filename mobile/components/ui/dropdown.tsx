import { Colors, ComponentStyles, Radius } from '@/constants/theme';
import { useTheme } from '@/contexts';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Dropdown, MultiSelect } from 'react-native-element-dropdown';

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
  // Style for the dropdown's *popup* box (the floating list/search panel),
  // as opposed to `containerStyle` which styles the field's own wrapper.
  // Needed because the popup's width is measured from the trigger field
  // itself — in a narrow flex column (e.g. a 3-up filter row) that leaves
  // too little room for the search input, so it renders squeezed/overflowing.
  // Pass an explicit width here (paired with mode="modal") to override it.
  dropdownContainerStyle?: any;
  placeholderStyle?: any;
  selectedTextStyle?: any;
  inputSearchStyle?: any;
  iconStyle?: any;
  labelField?: string;
  valueField?: string;
  searchPlaceholder?: string;
  maxHeight?: number;
  mode?: 'default' | 'modal' | 'auto';
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
  dropdownContainerStyle,
  placeholderStyle,
  selectedTextStyle,
  inputSearchStyle,
  iconStyle,
  labelField = 'label',
  valueField = 'value',
  searchPlaceholder = 'Search...',
  maxHeight = 300,
  mode = 'modal',
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
        mode={mode}
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
          ...dropdownContainerStyle,
        }}
        flatListProps={{
          showsVerticalScrollIndicator: true,
          persistentScrollbar: true,
          indicatorStyle: 'black',
          nestedScrollEnabled: true,
          style: { borderRadius: Radius.default },
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

export interface MultiSelectDropdownProps {
  data: DropdownOption[];
  value: (string | number)[];
  onChange: (values: (string | number)[]) => void;
  placeholder?: string;
  search?: boolean;
  searchPlaceholder?: string;
  disabled?: boolean;
  error?: string;
  containerStyle?: any;
  maxHeight?: number;
  labelField?: string;
  valueField?: string;
}

export const CustomMultiSelect: React.FC<MultiSelectDropdownProps> = React.memo(({
  data,
  value,
  onChange,
  placeholder = 'Select options...',
  search = true,
  searchPlaceholder = 'Search...',
  disabled = false,
  error,
  containerStyle,
  maxHeight = 300,
  labelField = 'label',
  valueField = 'value',
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
  }), [themeStyles, themeColors, error]);

  const containerStyles = useMemo(() => ({
    ...styles.container,
    ...containerStyle,
    zIndex: 9999,
    elevation: 10,
  }), [containerStyle]);

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
    fontWeight: '600' as const,
  }), [themeColors]);

  return (
    <View style={containerStyles}>
      <MultiSelect
        style={dropdownStyle}
        placeholderStyle={{ ...styles.placeholder, color: themeColors['muted-foreground'] }}
        selectedTextStyle={{ ...styles.selectedText, color: themeColors['card-foreground'] }}
        inputSearchStyle={{
          ...styles.inputSearch,
          color: themeColors['card-foreground'],
          backgroundColor: themeStyles.textInput.backgroundColor,
          borderColor: themeStyles.textInput.borderColor,
          borderWidth: themeStyles.textInput.borderWidth,
          borderRadius: themeStyles.textInput.borderRadius,
        }}
        iconStyle={styles.icon}
        data={data}
        search={search}
        maxHeight={maxHeight}
        labelField={labelField}
        valueField={valueField}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        value={value as string[]}
        onChange={(vals: (string | number)[]) => onChange(vals)}
        disable={disabled}
        activeColor={themeColors.accent}
        selectedStyle={styles.selectedStyle}
        renderItem={(item: any, selected?: boolean) => (
          <View style={[styles.itemContainer, itemContainerStyle]}>
            <Text style={selected ? selectedItemTextStyle : itemTextStyle}>
              {item.label}
            </Text>
          </View>
        )}
        itemContainerStyle={itemContainerStyle}
        itemTextStyle={itemTextStyle}
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
          persistentScrollbar: true,
          indicatorStyle: 'black',
          nestedScrollEnabled: true,
          style: { borderRadius: Radius.default },
        }}
      />

      {error && (
        <Text style={[styles.errorText, { color: themeColors.destructive }]}>
          {error}
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
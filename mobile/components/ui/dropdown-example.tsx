import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CustomDropdown as Dropdown, DropdownOption } from './dropdown';

// Example data
const sampleData: DropdownOption[] = [
  { label: 'Option 1', value: '1' },
  { label: 'Option 2', value: '2' },
  { label: 'Option 3', value: '3' },
  { label: 'Option 4', value: '4' },
  { label: 'Option 5', value: '5' },
];

const largeData: DropdownOption[] = Array.from({ length: 50 }, (_, i) => ({
  label: `Item ${i + 1}`,
  value: `${i + 1}`,
}));

export const DropdownExamples: React.FC = () => {
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState<string | null>(null);
  const [multiValue, setMultiValue] = useState<string | null>(null);
  const [largeValue, setLargeValue] = useState<string | null>(null);

  const handleChange = (value: string | number | null, option?: DropdownOption) => {
    setSelectedValue(value as string);
    console.log('Selected:', value, option);
  };

  const handleSearchChange = (value: string | number | null, option?: DropdownOption) => {
    setSearchValue(value as string);
    console.log('Search Selected:', value, option);
  };

  const handleMultiChange = (value: string | number | null, option?: DropdownOption) => {
    setMultiValue(value as string);
    console.log('Multi Selected:', value, option);
  };

  const handleLargeChange = (value: string | number | null, option?: DropdownOption) => {
    setLargeValue(value as string);
    console.log('Large Selected:', value, option);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dropdown Component Examples</Text>

      {/* Basic Dropdown */}
      <View style={styles.example}>
        <Text style={styles.label}>Basic Dropdown:</Text>
        <Dropdown
          data={sampleData}
          placeholder="Select an option"
          value={selectedValue}
          onChange={handleChange}
        />
      </View>

      {/* Dropdown with Search */}
      <View style={styles.example}>
        <Text style={styles.label}>Dropdown with Search:</Text>
        <Dropdown
          data={sampleData}
          placeholder="Search and select"
          value={searchValue}
          onChange={handleSearchChange}
          search={true}
          searchPlaceholder="Type to search..."
        />
      </View>

      {/* Large Dataset Dropdown */}
      <View style={styles.example}>
        <Text style={styles.label}>Large Dataset (50 items):</Text>
        <Dropdown
          data={largeData}
          placeholder="Select from large list"
          value={largeValue}
          onChange={handleLargeChange}
          search={true}
          maxHeight={200}
        />
      </View>

      {/* Dropdown with Error */}
      <View style={styles.example}>
        <Text style={styles.label}>Dropdown with Error:</Text>
        <Dropdown
          data={sampleData}
          placeholder="Select an option"
          value={null}
          onChange={() => {}}
          error="This field is required"
          required={true}
        />
      </View>

      {/* Custom Styled Dropdown */}
      <View style={styles.example}>
        <Text style={styles.label}>Custom Styled Dropdown:</Text>
        <Dropdown
          data={sampleData}
          placeholder="Custom styled"
          value={selectedValue}
          onChange={handleChange}
          style={{
            backgroundColor: '#f0f8ff',
            borderColor: '#4169e1',
            borderWidth: 2,
          }}
          selectedTextStyle={{
            color: '#4169e1',
            fontWeight: 'bold',
          }}
        />
      </View>

      {/* Disabled Dropdown */}
      <View style={styles.example}>
        <Text style={styles.label}>Disabled Dropdown:</Text>
        <Dropdown
          data={sampleData}
          placeholder="Disabled dropdown"
          value="1"
          onChange={() => {}}
          disabled={true}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  example: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
});

export default DropdownExamples;
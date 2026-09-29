import React, { useState } from 'react';
import {
  AcademicYearsDropdown,
  ClassesDropdown,
  SectionsByClassDropdown,
  SubjectCategoriesDropdown,
  SubjectsDropdown,
  SubjectsByCategoryDropdown,
  TransportRoutesDropdown,
  HolidaysDropdown,
} from '../index';
import type { DropdownOption } from '../../../types/dropdown';

export const DropdownUsageExamples: React.FC = () => {

  const [academicYear, setAcademicYear] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedSubjectByCategory, setSelectedSubjectByCategory] = useState<string>('');
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [selectedHoliday, setSelectedHoliday] = useState<string>('');

  const handleChange = (setter: (value: string) => void) => 
    (value: string | number, option: DropdownOption) => {
      console.log('Selected:', { value, option });
      setter(String(value));
    };

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Dropdown System Examples</h1>
      
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Basic Dropdowns</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Academic Year</label>
            <AcademicYearsDropdown
              value={academicYear}
              onChange={handleChange(setAcademicYear)}
              placeholder="Select Academic Year"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Class</label>
            <ClassesDropdown
              value={selectedClass}
              onChange={handleChange(setSelectedClass)}
              placeholder="Select Class"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Subject Category</label>
            <SubjectCategoriesDropdown
              value={selectedCategory}
              onChange={handleChange(setSelectedCategory)}
              placeholder="Select Subject Category"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Subject</label>
            <SubjectsDropdown
              value={selectedSubject}
              onChange={handleChange(setSelectedSubject)}
              placeholder="Select Subject"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Transport Route</label>
            <TransportRoutesDropdown
              value={selectedRoute}
              onChange={handleChange(setSelectedRoute)}
              placeholder="Select Transport Route"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Holiday</label>
            <HolidaysDropdown
              value={selectedHoliday}
              onChange={handleChange(setSelectedHoliday)}
              placeholder="Select Holiday"
            />
          </div>
        </div>
      </section>

      {/* Cascading Dropdowns */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Cascading Dropdowns</h2>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Class (for sections)</label>
              <ClassesDropdown
                value={selectedClass}
                onChange={(value, option) => {
                  setSelectedClass(String(value));
                  setSelectedSection(''); // Reset dependent dropdown
                  console.log('Class selected:', { value, option });
                }}
                placeholder="Select Class First"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Section</label>
              <SectionsByClassDropdown
                classId={selectedClass}
                value={selectedSection}
                onChange={handleChange(setSelectedSection)}
                placeholder="Select Section"
              />
              {!selectedClass && (
                <p className="text-sm text-muted-foreground mt-1">
                  Please select a class first
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Subject Category (for subjects)</label>
              <SubjectCategoriesDropdown
                value={selectedCategory}
                onChange={(value, option) => {
                  setSelectedCategory(String(value));
                  setSelectedSubjectByCategory(''); // Reset dependent dropdown
                  console.log('Category selected:', { value, option });
                }}
                placeholder="Select Category First"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Subject by Category</label>
              <SubjectsByCategoryDropdown
                categoryId={selectedCategory}
                value={selectedSubjectByCategory}
                onChange={handleChange(setSelectedSubjectByCategory)}
                placeholder="Select Subject"
              />
              {!selectedCategory && (
                <p className="text-sm text-gray-500 mt-1">
                  Please select a category first
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Form Integration Example */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Form Integration Example</h2>
        
        <form className="space-y-4 p-4 border rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Academic Year <span className="text-red-500">*</span>
              </label>
              <AcademicYearsDropdown
                value={academicYear}
                onChange={handleChange(setAcademicYear)}
                required
                error={!academicYear ? 'Academic year is required' : undefined}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Class <span className="text-red-500">*</span>
              </label>
              <ClassesDropdown
                value={selectedClass}
                onChange={handleChange(setSelectedClass)}
                required
                error={!selectedClass ? 'Class is required' : undefined}
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={!academicYear || !selectedClass}
            onClick={(e) => {
              e.preventDefault();
              console.log('Form submitted:', {
                academicYear,
                selectedClass,
                selectedSection,
              });
            }}
          >
            Submit Form
          </button>
        </form>
      </section>

      {/* Current Selections Display */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Current Selections</h2>
        <div className="p-4 bg-gray-50 rounded-lg">
          <pre className="text-sm">
            {JSON.stringify({
              academicYear,
              selectedClass,
              selectedSection,
              selectedCategory,
              selectedSubject,
              selectedSubjectByCategory,
              selectedRoute,
              selectedHoliday,
            }, null, 2)}
          </pre>
        </div>
      </section>
    </div>
  );
};

export default DropdownUsageExamples;
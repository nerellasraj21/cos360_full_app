# Student Admission Form - Feature Requests

## Page 1 - Basic Student Information

### 1. Remove Academic Year Selection from Page 1

In page 1 of the student admission form, there is an option to select the academic year which is not required. Pick the academic year from the header instead. Current Academic Year and Admitted Academic Year should be the same and picked from the header.

### 2. Fix Tab Navigation for Dropdowns

When the Tab key is used to navigate between fields, the dropdowns won't show the values.

### 3. Optimize Class/Section Input (UX Enhancement)

Class, Section and Current Class, Current Section can be the same, so propose a solution by considering yourself as a UX engineer so that the user will not spend multiple clicks.

### 4. Move Primary Status Dropdown

Move the Primary Status dropdown from the second screen to the first screen.

### 5. Auto-Generate Admission Number (Backend Investigation Required)

Get the last admission number from backend and add +1 to the existing admission number. The sequence must be different for Primary & Non-Primary type of admissions.

**Note**: This feature might not be available in the backend. Propose a solution and I will check with the backend team and update on this.

### 6. Change Mother Tongue to Dropdown

Mother tongue is added as "Telugu" by default. It should be a dropdown with multiple languages.

---

## Page 2 - Parent Details

### 7. Implement Caste and Sub-Caste from Masters (Backend Investigation Required)

Caste and sub-caste must be captured from masters. This is not implemented in the backend. Add this feature and give me a handover document for the backend, so that I will review and implement in the backend.

### 8. Add Parent Search by Phone Number

While adding the Parent details, give an option to search the parent (both) by phone number. If the phone number matches, fill the Parent details automatically.

### 9. Add Salary Range Dropdown (Backend Investigation Required)

In the Parent Details, add a dropdown for salary range for income tracking purposes. This is not there in the backend, so we need to propose a feature to add.

---

## Page 3 - Address Details

### 10. Add Location Fields (Backend Investigation Required)

In the Address Details screen, add State (Dropdown), City, District, Mandal, and Pincode fields. Need to check in the backend if these fields and master data exist.

---

## Page 4 - Previous School Details

### 11. Remove "Experience" from Label

In the Previous School Details page, remove the word "experience" from the label.

---

## Features Requiring Backend Investigation

The following features require backend investigation and implementation:

1. **Admission Number Auto-Generation** (Feature #5)

   - Check if endpoint exists to get next admission number
   - Implement separate sequences for Primary and Non-Primary admissions
   - Provide endpoint specifications

2. **Caste & Sub-Caste Masters** (Feature #7)

   - Create master tables for castes and sub-castes
   - Create API endpoints to fetch master data
   - Update student schema to use foreign keys
   - Provide complete implementation handover document

3. **Parent Salary Range** (Feature #9)

   - Add salary_range field to parent table
   - Update parent APIs to accept and return this field
   - Provide field specifications

4. **Location/Address Fields** (Feature #10)
   - Check if location master tables exist (states, districts, mandals)
   - Verify if address schema has these fields
   - Create endpoints for cascading location data
   - Implement pincode-to-location lookup
   - Provide complete API specifications

```

```

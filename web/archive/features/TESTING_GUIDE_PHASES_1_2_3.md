# Testing Guide - Student Admission Features (Phases 1-3)

**Date**: February 4, 2026
**Status**: Ready for Testing
**TypeScript**: ✅ 0 Compilation Errors

---

## 🎯 What We're Testing

1. **Phase 1**: Admission Type + Salary Range Dropdowns
2. **Phase 2**: Caste → Sub-Caste Cascading (2-level)
3. **Phase 3**: State → District → Mandal Cascading (3-level)

---

## ⚠️ Prerequisites

### 1. Backend Must Be Running

```bash
# Verify backend is running
curl http://localhost:8000/api/v1/health

# Or check in browser
http://localhost:8000/docs
```

### 2. Master Data Must Be Populated

**CRITICAL**: Before testing cascading dropdowns, master data must exist in the database.

#### Option A: Use Backend API to Populate (Recommended)

```bash
# 1. Populate Castes
curl -X POST http://localhost:8000/api/v1/masters/castes/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "cschema: test_tenant" \
  -d '{
    "name": "General",
    "code": "GEN",
    "is_active": true
  }'

curl -X POST http://localhost:8000/api/v1/masters/castes/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "cschema: test_tenant" \
  -d '{
    "name": "OBC",
    "code": "OBC",
    "is_active": true
  }'

# 2. Populate Sub-Castes (use caste_id from step 1)
curl -X POST http://localhost:8000/api/v1/masters/castes/sub-castes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "cschema: test_tenant" \
  -d '{
    "caste_id": "CASTE_UUID_HERE",
    "name": "General Sub-Caste 1",
    "code": "GSC1",
    "is_active": true
  }'

# 3. Populate States
curl -X POST http://localhost:8000/api/v1/masters/locations/states \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "cschema: test_tenant" \
  -d '{
    "name": "Andhra Pradesh",
    "code": "AP",
    "is_active": true
  }'

curl -X POST http://localhost:8000/api/v1/masters/locations/states \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "cschema: test_tenant" \
  -d '{
    "name": "Telangana",
    "code": "TS",
    "is_active": true
  }'

# 4. Populate Districts (use state_id from step 3)
curl -X POST http://localhost:8000/api/v1/masters/locations/districts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "cschema: test_tenant" \
  -d '{
    "state_id": "STATE_UUID_HERE",
    "name": "Guntur",
    "code": "GTR",
    "is_active": true
  }'

# 5. Populate Mandals (use district_id from step 4)
curl -X POST http://localhost:8000/api/v1/masters/locations/mandals \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "cschema: test_tenant" \
  -d '{
    "district_id": "DISTRICT_UUID_HERE",
    "name": "Tenali",
    "is_active": true
  }'
```

#### Option B: Use Database Directly

```sql
-- Insert sample data directly into database
-- (SQL scripts provided by backend team)
```

#### Option C: Wait for Phase 4

Phase 4 will provide UI to manage master data, but you can test other features first.

---

## 🚀 Start Development Server

```bash
cd "c:\Users\nerel\Documents\Workspace\React Workspace\COS360_Frontend\cos360_frontend"

# Start dev server
npm run dev

# Server should start at: http://localhost:5173
```

---

## 📋 Testing Checklist

### ✅ Phase 1: Admission Type & Salary Range

#### Test 1.1: Admission Type Selector

1. Navigate to: `/students/admission`
2. You should be on **Step 1: Academic Details**
3. **Verify**: "Admission Type" dropdown exists
4. **Verify**: Has 2 options:
   - "Non-Primary Admission"
   - "Primary Admission"
5. **Verify**: Default selection is "Non-Primary Admission"
6. **Test**: Change to "Primary Admission"
7. **Test**: Change back to "Non-Primary"

**Expected Result**: Dropdown works smoothly, no errors

#### Test 1.2: Salary Range Dropdown

1. Navigate to **Step 3: Parent Details**
2. Scroll to **Father's Information** section
3. **Verify**: "Salary Range (Optional)" dropdown exists after Occupation field
4. **Verify**: Dropdown has 6 options:
   - "-- Select Salary Range --" (placeholder)
   - "Below ₹1 Lakh"
   - "₹1 - ₹3 Lakhs"
   - "₹3 - ₹5 Lakhs"
   - "₹5 - ₹10 Lakhs"
   - "Above ₹10 Lakhs"
5. **Test**: Select "₹3 - ₹5 Lakhs" for father
6. Scroll to **Mother's Information** section
7. **Verify**: Same "Salary Range (Optional)" dropdown exists
8. **Test**: Select "₹1 - ₹3 Lakhs" for mother

**Expected Result**: Both dropdowns work, selections save

---

### ✅ Phase 2: Caste Cascading Dropdowns

#### Test 2.1: Caste Dropdown (Level 1)

1. Navigate to **Step 2: Student Details**
2. Scroll to find "Caste (Optional)" field
3. **Verify**: It's now a dropdown (not a text input)
4. **Test**: Click the dropdown

**If Dropdown is Empty**:
- ❌ Master data not populated yet
- ✅ Should show: "No castes available. Please contact admin to add master data."
- **Action**: Populate master data (see Prerequisites above)

**If Dropdown Has Data**:
- ✅ Should show list of castes
- **Test**: Select "General" (or any caste)
- **Note the caste ID**: Check browser DevTools Network tab

#### Test 2.2: Sub-Caste Dropdown (Level 2 - Cascading)

1. **Verify**: "Sub-Caste (Optional)" dropdown is initially **disabled**
2. **Verify**: Helper text says: "Please select a caste first"
3. **Test**: Select a caste from "Caste" dropdown
4. **Verify**: "Sub-Caste" dropdown becomes **enabled**
5. **Verify**: Loading spinner briefly appears (if API is slow)
6. **Verify**: Sub-caste options load for selected caste

**If Sub-Caste Dropdown is Empty**:
- ❌ No sub-castes exist for this caste
- ✅ Should show: "No sub-castes available for this caste."
- **Action**: Add sub-castes for this caste via backend API

**If Sub-Caste Has Data**:
- ✅ Should show list of sub-castes
- **Test**: Select a sub-caste
- **Note the sub-caste ID**: Check browser DevTools

#### Test 2.3: Cascade Clear Logic

1. Select a caste (e.g., "General")
2. Select a sub-caste (e.g., "General SC1")
3. **Test**: Change the caste to different one (e.g., "OBC")
4. **Verify**: Sub-caste selection automatically **clears**
5. **Verify**: Sub-caste dropdown loads new options for "OBC"
6. **Test**: Select a new sub-caste
7. **Verify**: No errors in console

**Expected Result**: Changing parent clears child automatically

---

### ✅ Phase 3: Location Cascading Dropdowns (3-Level)

#### Test 3.1: State Dropdown (Level 1)

1. Navigate to **Step 4: Address Details**
2. Scroll to find "State (Optional)" field
3. **Verify**: It's now a dropdown (replaced old text input)
4. **Test**: Click the dropdown

**If Dropdown is Empty**:
- ❌ Master data not populated yet
- ✅ Should show: "No states available. Please contact admin to add master data."
- **Action**: Populate states via backend API

**If Dropdown Has Data**:
- ✅ Should show list of states
- **Test**: Select "Andhra Pradesh" (or any state)
- **Note the state ID**: Check browser DevTools

#### Test 3.2: District Dropdown (Level 2 - Cascading)

1. **Verify**: "District (Optional)" dropdown is initially **disabled**
2. **Verify**: Helper text says: "Please select a state first"
3. **Test**: Select a state from "State" dropdown
4. **Verify**: "District" dropdown becomes **enabled**
5. **Verify**: Loading spinner briefly appears
6. **Verify**: District options load for selected state

**If District Dropdown is Empty**:
- ❌ No districts exist for this state
- ✅ Should show: "No districts available for this state."
- **Action**: Add districts for this state

**If District Has Data**:
- ✅ Should show list of districts
- **Test**: Select a district (e.g., "Guntur")

#### Test 3.3: Mandal Dropdown (Level 3 - Cascading)

1. **Verify**: "Mandal (Optional)" dropdown is initially **disabled**
2. **Verify**: Helper text says: "Please select a district first"
3. **Test**: Select a district from "District" dropdown
4. **Verify**: "Mandal" dropdown becomes **enabled**
5. **Verify**: Loading spinner briefly appears
6. **Verify**: Mandal options load for selected district

**If Mandal Dropdown is Empty**:
- ❌ No mandals exist for this district
- ✅ Should show: "No mandals available for this district."
- **Action**: Add mandals for this district

**If Mandal Has Data**:
- ✅ Should show list of mandals
- **Test**: Select a mandal (e.g., "Tenali")

#### Test 3.4: 3-Level Cascade Clear Logic

**Test A: Change State Clears District and Mandal**
1. Select: State = "Andhra Pradesh"
2. Select: District = "Guntur"
3. Select: Mandal = "Tenali"
4. **Test**: Change State to "Telangana"
5. **Verify**: District selection **clears** automatically
6. **Verify**: Mandal selection **clears** automatically
7. **Verify**: District and Mandal dropdowns are **disabled**

**Test B: Change District Clears Mandal**
1. Select: State = "Andhra Pradesh"
2. Select: District = "Guntur"
3. Select: Mandal = "Tenali"
4. **Test**: Change District to "Krishna"
5. **Verify**: Mandal selection **clears** automatically
6. **Verify**: Mandal dropdown shows new options for Krishna district

**Expected Result**: Parent changes clear all children correctly

#### Test 3.5: Pincode Field

1. **Verify**: "Pincode (Optional)" field exists
2. **Test**: Enter "52200" (5 digits)
3. **Verify**: Error message: "Pincode must be 6 digits"
4. **Test**: Enter "522001" (6 digits)
5. **Verify**: No error, validation passes
6. **Test**: Enter "abc123"
7. **Verify**: Error message appears

**Expected Result**: Only 6-digit numeric pincodes accepted

---

### ✅ Complete Form Submission Test

#### Test 4.1: Fill Complete Form

**Step 1: Academic Details**
- ✅ Admission Date: Select today's date
- ✅ Admission Type: Select "Primary"
- ✅ Class: Select a class
- ✅ Section: Select a section
- ✅ Check "Current Class/Section same as Admission" (existing feature)
- Click **Next**

**Step 2: Student Details**
- ✅ First Name: "John"
- ✅ Last Name: "Doe"
- ✅ Date of Birth: "2015-05-15"
- ✅ Gender: "Male"
- ✅ Caste: Select a caste
- ✅ Sub-Caste: Select a sub-caste
- ✅ Fill other fields (nationality, mother tongue, etc.)
- Click **Next**

**Step 3: Parent Details**
- ✅ Father Name: "John Doe Sr."
- ✅ Father Email: "john@example.com"
- ✅ Father Phone: "9876543210"
- ✅ Father Occupation: "Engineer"
- ✅ **Father Salary Range**: Select "₹3 - ₹5 Lakhs"
- ✅ Mother Name: "Jane Doe"
- ✅ Mother Email: "jane@example.com"
- ✅ Mother Phone: "9876543211"
- ✅ Mother Occupation: "Teacher"
- ✅ **Mother Salary Range**: Select "₹1 - ₹3 Lakhs"
- Click **Next**

**Step 4: Address Details**
- ✅ Address Line 1: "123 Main Street"
- ✅ City: "Guntur"
- ✅ **State**: Select "Andhra Pradesh"
- ✅ **District**: Select "Guntur"
- ✅ **Mandal**: Select "Tenali"
- ✅ **Pincode**: "522001"
- Click **Next**

**Step 5: Previous School**
- ✅ Fill as needed (or skip if not applicable)
- Click **Next**

**Step 6: Review & Submit**
- ✅ Review all details
- ✅ Verify new fields are shown:
  - Admission Type: "Primary"
  - Father Salary: "₹3 - ₹5 Lakhs"
  - Mother Salary: "₹1 - ₹3 Lakhs"
  - Caste: Selected caste name
  - Sub-Caste: Selected sub-caste name
  - State: "Andhra Pradesh"
  - District: "Guntur"
  - Mandal: "Tenali"
  - Pincode: "522001"

#### Test 4.2: Inspect Network Request

1. Open **Browser DevTools** (F12)
2. Go to **Network** tab
3. Click **Create Admission** button
4. Find the POST request to `/students/admission`
5. **Verify Request Payload** contains:

```json
{
  "admission_type": "primary",
  "admission_date": "2026-02-04",
  "state_id": "state-uuid-here",
  "district_id": "district-uuid-here",
  "mandal_id": "mandal-uuid-here",
  "pincode": "522001",
  "student": {
    "first_name": "John",
    "last_name": "Doe",
    "caste_id": "caste-uuid-here",
    "sub_caste_id": "sub-caste-uuid-here",
    "father": {
      "name": "John Doe Sr.",
      "salary_range": "3l_5l"
    },
    "mother": {
      "name": "Jane Doe",
      "salary_range": "1l_3l"
    }
  }
}
```

6. **Verify**: All new fields are UUIDs (not text)
7. **Verify**: Backend responds with 200/201 status
8. **Verify**: Success toast appears
9. **Verify**: Form resets or navigates away

**Expected Result**: All new fields submitted correctly with UUIDs

---

## 🐛 Common Issues & Solutions

### Issue 1: "Module not found" Error

**Symptom**: Import errors for dropdown components

**Solution**:
```bash
# Restart dev server
npm run dev
```

### Issue 2: Dropdowns Show Empty/No Options

**Symptom**: Dropdowns have no options

**Cause**: Master data not populated

**Solution**: Populate master data via backend API (see Prerequisites)

**Temporary Workaround**: Helper text should explain the issue to users

### Issue 3: Cascading Doesn't Work

**Symptom**: Child dropdown doesn't enable

**Possible Causes**:
1. Parent not selected yet (working as designed)
2. API error (check Network tab)
3. No data for parent (check API response)

**Solution**:
- Verify parent selection
- Check console for errors
- Check API response in Network tab

### Issue 4: Form Submission Fails

**Symptom**: Backend rejects submission

**Possible Causes**:
1. Invalid UUIDs
2. Required fields missing
3. Backend validation error

**Solution**:
1. Check Network tab for error response
2. Verify all required fields filled
3. Check backend logs

### Issue 5: Sub-Caste/Mandal Doesn't Clear

**Symptom**: Values persist when parent changes

**Cause**: Bug in cascade logic

**Solution**: Check browser console for errors, report to dev team

---

## ✅ Success Criteria

### Phase 1 ✅
- [ ] Admission type dropdown works
- [ ] Default is "non_primary"
- [ ] Salary range dropdowns show 5 options
- [ ] Both parent salary ranges save correctly
- [ ] No console errors

### Phase 2 ✅
- [ ] Caste dropdown loads
- [ ] Sub-caste initially disabled
- [ ] Sub-caste enables when caste selected
- [ ] Sub-castes load for selected caste
- [ ] Changing caste clears sub-caste
- [ ] Form submits with caste_id and sub_caste_id (UUIDs)
- [ ] No console errors

### Phase 3 ✅
- [ ] State dropdown loads
- [ ] District initially disabled
- [ ] Mandal initially disabled
- [ ] District enables when state selected
- [ ] Mandal enables when district selected
- [ ] Districts load for selected state
- [ ] Mandals load for selected district
- [ ] Changing state clears district and mandal
- [ ] Changing district clears mandal
- [ ] Pincode validation works (6 digits)
- [ ] Form submits with all 3 location UUIDs
- [ ] No console errors

### Overall ✅
- [ ] Complete form submission works
- [ ] All new fields in payload
- [ ] Backend accepts submission
- [ ] Success message appears
- [ ] No TypeScript errors
- [ ] No runtime errors
- [ ] Good user experience

---

## 📊 Test Results Template

Use this template to document your testing:

```markdown
## Test Results - Phase 1-3

**Date**: [DATE]
**Tester**: [NAME]
**Environment**: Development

### Phase 1: Admission Type & Salary Range
- [ ] Test 1.1: Admission Type - PASS/FAIL
- [ ] Test 1.2: Salary Range - PASS/FAIL
- **Issues Found**: [List any issues]

### Phase 2: Caste Cascading
- [ ] Test 2.1: Caste Dropdown - PASS/FAIL
- [ ] Test 2.2: Sub-Caste Dropdown - PASS/FAIL
- [ ] Test 2.3: Cascade Clear Logic - PASS/FAIL
- **Issues Found**: [List any issues]

### Phase 3: Location Cascading
- [ ] Test 3.1: State Dropdown - PASS/FAIL
- [ ] Test 3.2: District Dropdown - PASS/FAIL
- [ ] Test 3.3: Mandal Dropdown - PASS/FAIL
- [ ] Test 3.4: 3-Level Cascade Clear - PASS/FAIL
- [ ] Test 3.5: Pincode Validation - PASS/FAIL
- **Issues Found**: [List any issues]

### Complete Form Submission
- [ ] Test 4.1: Fill Complete Form - PASS/FAIL
- [ ] Test 4.2: Network Request Inspection - PASS/FAIL
- **Issues Found**: [List any issues]

### Overall Assessment
- **Status**: PASS/FAIL
- **Ready for Production**: YES/NO
- **Blocking Issues**: [List critical issues]
- **Non-Blocking Issues**: [List minor issues]
```

---

## 🎯 Next Steps After Testing

### If All Tests Pass ✅
1. Document test results
2. Demo to stakeholders
3. Deploy to staging
4. Plan Phase 4 (Master Data UI)

### If Tests Fail ❌
1. Document all issues with screenshots
2. Provide error messages from console
3. Share Network tab API responses
4. Report back for fixes

---

## 📞 Need Help?

**Before Reporting Issues**:
1. ✅ Check console for errors
2. ✅ Check Network tab for API errors
3. ✅ Verify master data populated
4. ✅ Try in incognito mode
5. ✅ Clear browser cache

**When Reporting Issues**:
- Include screenshot
- Include console errors
- Include Network tab response
- Include steps to reproduce

---

**Happy Testing! 🚀**

*This guide will help ensure all features work correctly before moving to Phase 4.*

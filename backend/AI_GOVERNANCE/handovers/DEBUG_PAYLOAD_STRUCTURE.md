# Debug: Student Admission Payload Structure Issue

**Error**: `student: Field required` (repeated 10 times)
**Status**: 422 Unprocessable Entity
**Root Cause**: Frontend is not sending the `student` nested object correctly

---

## Quick Debug Steps

### Step 1: Log the Actual Payload

In your `admissions.ts` file (around line 52), add this logging **before** the axios call:

```typescript
export const createStudentAdmission = async (data: StudentAdmissionCreate) => {
  // ADD THIS LOGGING
  console.log("=== PAYLOAD BEING SENT ===");
  console.log(JSON.stringify(data, null, 2));
  console.log("=========================");

  try {
    const response = await api.post('/students/admission/', data);
    return response.data;
  } catch (error) {
    // existing error handling
  }
};
```

### Step 2: Check What's Logged

Look at the console output. You should see something like:

**❌ WRONG (What you're probably sending):**
```json
{
  "admission_date": "2024-01-15",
  "address_line1": "123 Main St",
  "city": "Hyderabad",
  "state": "Telangana",
  "student_first_name": "John",
  "student_last_name": "Doe",
  "father_name": "John Sr.",
  "mother_name": "Jane"
}
```
**Problem**: Flat structure - no nested `student` object!

**✅ CORRECT (What backend expects):**
```json
{
  "admission_date": "2024-01-15",
  "address_line1": "123 Main St",
  "city": "Hyderabad",
  "state": "Telangana",
  "student": {
    "first_name": "John",
    "last_name": "Doe",
    "date_of_birth": "2010-05-15",
    "gender": "Male",
    "father": {
      "name": "John Sr.",
      "email": "father@example.com",
      "relation_to_student": "Father"
    },
    "mother": {
      "name": "Jane",
      "email": "mother@example.com",
      "relation_to_student": "Mother"
    }
  }
}
```

---

## Common Issues & Fixes

### Issue 1: Form Has Flat Field Names

If your form has flat fields like:
```typescript
{
  student_first_name: "John",
  student_last_name: "Doe",
  father_name: "John Sr.",
  mother_name: "Jane"
}
```

**Fix**: Transform to nested structure before sending:

```typescript
// In MultiStepAdmissionForm.tsx onSubmit function
const onSubmit = async (formData: any) => {
  // Transform flat form data to nested API structure
  const apiPayload = {
    // Admission fields (flat)
    admission_date: formData.admission_date,
    admission_type: formData.admission_type,
    address_line1: formData.address_line1,
    address_line2: formData.address_line2 || null,
    city: formData.city,
    state: formData.state,

    // Student nested object
    student: {
      first_name: formData.student_first_name,
      last_name: formData.student_last_name,
      date_of_birth: formData.student_date_of_birth,
      gender: formData.student_gender,
      aadhar_number: formData.student_aadhar_number || null,
      apaar_number: formData.student_apaar_number || null,
      caste: formData.student_caste || null,
      sub_caste: formData.student_sub_caste || null,
      community: formData.student_community || null,
      nationality: formData.student_nationality || "Indian",
      mother_tongue: formData.student_mother_tongue || "Telugu",
      identification_marks: formData.student_identification_marks || null,

      // Father nested object
      father: {
        name: formData.father_name,
        email: formData.father_email, // REQUIRED
        phone: formData.father_phone || null,
        occupation: formData.father_occupation || null,
        aadhar_number: formData.father_aadhar_number || null,
        gender: formData.father_gender || null,
        relation_to_student: "Father",
        salary_range: formData.father_salary_range || null
      },

      // Mother nested object
      mother: {
        name: formData.mother_name,
        email: formData.mother_email, // REQUIRED
        phone: formData.mother_phone || null,
        occupation: formData.mother_occupation || null,
        aadhar_number: formData.mother_aadhar_number || null,
        gender: formData.mother_gender || null,
        relation_to_student: "Mother",
        salary_range: formData.mother_salary_range || null
      }
    }
  };

  console.log("Transformed payload:", apiPayload);
  await createStudentAdmission(apiPayload);
};
```

### Issue 2: Missing Data Transformation

If you're using a multi-step form with separate state for each step:

```typescript
// Combine all steps
const onSubmit = async () => {
  const apiPayload = {
    ...step1Data, // admission info
    student: {
      ...step2Data.student, // student info
      father: step3Data.father,
      mother: step3Data.mother
    }
  };

  await createStudentAdmission(apiPayload);
};
```

### Issue 3: Using FormData Instead of JSON

If you're using `FormData`:

```typescript
// ❌ WRONG - FormData creates flat structure
const formData = new FormData();
formData.append('student_first_name', 'John');
formData.append('father_name', 'John Sr.');

// ✅ CORRECT - Use plain JavaScript object
const payload = {
  student: {
    first_name: 'John',
    father: { name: 'John Sr.' }
  }
};
```

---

## Verification Checklist

After implementing the fix:

1. ✅ Log the payload before sending - verify it has `student` key at root level
2. ✅ Verify `student` object contains `first_name`, `last_name`, `date_of_birth`, `gender`
3. ✅ Verify `student.father` object exists with `name`, `email`, `relation_to_student`
4. ✅ Verify `student.mother` object exists with `name`, `email`, `relation_to_student`
5. ✅ Verify `father.email !== mother.email`
6. ✅ Submit form and check for 201 Created response instead of 422

---

## Example: Complete Working Payload

Copy this and test in Swagger/Postman first to verify backend is working:

```json
{
  "admission_date": "2024-01-15",
  "address_line1": "123 Main Street",
  "address_line2": null,
  "city": "Hyderabad",
  "state": "Telangana",
  "student": {
    "first_name": "John",
    "last_name": "Doe",
    "date_of_birth": "2010-05-15",
    "gender": "Male",
    "father": {
      "name": "John Doe Sr.",
      "email": "father@example.com",
      "relation_to_student": "Father"
    },
    "mother": {
      "name": "Jane Doe",
      "email": "mother@example.com",
      "relation_to_student": "Mother"
    }
  }
}
```

If this works in Swagger but not in your frontend, it confirms the issue is in how the frontend constructs the payload.

---

## Next Steps

1. Add the console.log to see what you're actually sending
2. Share the logged payload output
3. Share your form submission code from `MultiStepAdmissionForm.tsx` (around line 245)
4. Share your form field names/structure

Once I see the actual payload and code, I can provide the exact transformation logic you need.

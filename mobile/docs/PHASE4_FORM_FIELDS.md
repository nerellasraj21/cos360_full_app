# Phase 4 — Extended Form Fields

**Prepared for:** App Developer
**Scope:** Extend 2 existing forms with missing fields
**Status: ⏳ Pending**

> Apply after Phase 3 is complete and tested.

---

## What Gets Extended

| # | File | Missing Fields |
|---|---|---|
| 1 | `app/students/admission.tsx` | Aadhar, APAAR, caste+sub-caste, full parent details (occupation, salary, Aadhar), admission date/type, class/section at admission |
| 2 | `app/staff/enrollment.tsx` | Work experience, bank details, salary & PF, qualifications |

---

## Extension 1 — Student Admission Form

### 1a — Update the student type

In `src/api/students.ts` (or wherever `StudentAdmission` is defined), add the missing fields:

```ts
export interface StudentAdmission {
  // existing fields stay as-is, ADD these:
  aadhar_number?: string;
  apaar_id?: string;
  caste?: string;
  sub_caste?: string;
  caste_category?: 'OC' | 'BC' | 'MBC' | 'SC' | 'ST' | 'OBC';
  community?: string;

  // Admission metadata
  admission_date?: string;
  admission_type?: 'new' | 'transfer' | 're-admission';
  admitted_class_id?: string;
  admitted_section_id?: string;

  // Extended parent details
  father_aadhar?: string;
  father_occupation?: string;
  father_salary_range?: string;
  mother_aadhar?: string;
  mother_occupation?: string;
  mother_salary_range?: string;
}
```

### 1b — Add fields to the form modal in `app/students/admission.tsx`

Open the create/edit modal. Find the `formData` state and add the new fields:

```ts
// Extend formData state with:
const [formData, setFormData] = useState({
  // ... existing fields ...
  aadhar_number: '',
  apaar_id: '',
  caste: '',
  sub_caste: '',
  caste_category: '',
  community: '',
  admission_date: '',
  admission_type: 'new',
  father_aadhar: '',
  father_occupation: '',
  father_salary_range: '',
  mother_aadhar: '',
  mother_occupation: '',
  mother_salary_range: '',
});
```

**Add these fields to the modal `<ScrollView>` — after the existing personal details section:**

```tsx
{/* ── Section: Identity Documents ── */}
<Text style={[styles.sectionHeader, { color: colors['muted-foreground'] }]}>
  IDENTITY DOCUMENTS
</Text>

<View style={styles.formRow}>
  <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
    <Text style={[styles.label, { color: colors.foreground }]}>Aadhar Number</Text>
    <TextInput
      style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
      placeholder="12 digit Aadhar"
      placeholderTextColor={colors['muted-foreground']}
      value={formData.aadhar_number}
      onChangeText={t => setFormData(f => ({ ...f, aadhar_number: t }))}
      keyboardType="numeric"
      maxLength={12}
    />
  </View>
  <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
    <Text style={[styles.label, { color: colors.foreground }]}>APAAR ID</Text>
    <TextInput
      style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
      placeholder="APAAR / ABC ID"
      placeholderTextColor={colors['muted-foreground']}
      value={formData.apaar_id}
      onChangeText={t => setFormData(f => ({ ...f, apaar_id: t }))}
    />
  </View>
</View>

{/* ── Section: Caste & Community ── */}
<Text style={[styles.sectionHeader, { color: colors['muted-foreground'] }]}>
  CASTE & COMMUNITY
</Text>

<View style={styles.formGroup}>
  <Text style={[styles.label, { color: colors.foreground }]}>Category</Text>
  <View style={styles.chipRow}>
    {['OC', 'BC', 'MBC', 'SC', 'ST', 'OBC'].map(cat => (
      <TouchableOpacity
        key={cat}
        style={[
          styles.chip,
          { borderColor: formData.caste_category === cat ? '#556ee6' : colors.border },
          formData.caste_category === cat && { backgroundColor: '#556ee618' },
        ]}
        onPress={() => setFormData(f => ({ ...f, caste_category: cat }))}
      >
        <Text style={{
          color: formData.caste_category === cat ? '#556ee6' : colors['muted-foreground'],
          fontSize: 12, fontWeight: '600',
        }}>
          {cat}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
</View>

<View style={styles.formRow}>
  <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
    <Text style={[styles.label, { color: colors.foreground }]}>Caste</Text>
    <TextInput
      style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
      placeholder="Caste name"
      placeholderTextColor={colors['muted-foreground']}
      value={formData.caste}
      onChangeText={t => setFormData(f => ({ ...f, caste: t }))}
    />
  </View>
  <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
    <Text style={[styles.label, { color: colors.foreground }]}>Sub Caste</Text>
    <TextInput
      style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
      placeholder="Sub caste"
      placeholderTextColor={colors['muted-foreground']}
      value={formData.sub_caste}
      onChangeText={t => setFormData(f => ({ ...f, sub_caste: t }))}
    />
  </View>
</View>

{/* ── Section: Admission Details ── */}
<Text style={[styles.sectionHeader, { color: colors['muted-foreground'] }]}>
  ADMISSION DETAILS
</Text>

<View style={styles.formRow}>
  <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
    <Text style={[styles.label, { color: colors.foreground }]}>Admission Date</Text>
    <TextInput
      style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
      placeholder="YYYY-MM-DD"
      placeholderTextColor={colors['muted-foreground']}
      value={formData.admission_date}
      onChangeText={t => setFormData(f => ({ ...f, admission_date: t }))}
    />
  </View>
  <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
    <Text style={[styles.label, { color: colors.foreground }]}>Admission Type</Text>
    <View style={styles.chipRow}>
      {['new', 'transfer', 're-admission'].map(type => (
        <TouchableOpacity
          key={type}
          style={[
            styles.chip,
            { borderColor: formData.admission_type === type ? '#10B981' : colors.border },
            formData.admission_type === type && { backgroundColor: '#10B98118' },
          ]}
          onPress={() => setFormData(f => ({ ...f, admission_type: type }))}
        >
          <Text style={{
            color: formData.admission_type === type ? '#10B981' : colors['muted-foreground'],
            fontSize: 11, fontWeight: '600',
          }}>
            {type}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
</View>

{/* ── Section: Father Extended ── */}
<Text style={[styles.sectionHeader, { color: colors['muted-foreground'] }]}>
  FATHER DETAILS (EXTENDED)
</Text>

<View style={styles.formRow}>
  <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
    <Text style={[styles.label, { color: colors.foreground }]}>Father Aadhar</Text>
    <TextInput
      style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
      placeholder="12 digit"
      placeholderTextColor={colors['muted-foreground']}
      value={formData.father_aadhar}
      onChangeText={t => setFormData(f => ({ ...f, father_aadhar: t }))}
      keyboardType="numeric"
      maxLength={12}
    />
  </View>
  <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
    <Text style={[styles.label, { color: colors.foreground }]}>Occupation</Text>
    <TextInput
      style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
      placeholder="e.g. Farmer, Govt."
      placeholderTextColor={colors['muted-foreground']}
      value={formData.father_occupation}
      onChangeText={t => setFormData(f => ({ ...f, father_occupation: t }))}
    />
  </View>
</View>

<View style={styles.formGroup}>
  <Text style={[styles.label, { color: colors.foreground }]}>Father Salary Range</Text>
  <View style={styles.chipRow}>
    {['< 1L', '1L-3L', '3L-5L', '5L-10L', '> 10L'].map(range => (
      <TouchableOpacity
        key={range}
        style={[
          styles.chip,
          { borderColor: formData.father_salary_range === range ? '#F59E0B' : colors.border },
          formData.father_salary_range === range && { backgroundColor: '#F59E0B18' },
        ]}
        onPress={() => setFormData(f => ({ ...f, father_salary_range: range }))}
      >
        <Text style={{
          color: formData.father_salary_range === range ? '#F59E0B' : colors['muted-foreground'],
          fontSize: 11, fontWeight: '600',
        }}>
          {range}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
</View>

{/* ── Section: Mother Extended ── */}
<Text style={[styles.sectionHeader, { color: colors['muted-foreground'] }]}>
  MOTHER DETAILS (EXTENDED)
</Text>

<View style={styles.formRow}>
  <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
    <Text style={[styles.label, { color: colors.foreground }]}>Mother Aadhar</Text>
    <TextInput
      style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
      placeholder="12 digit"
      placeholderTextColor={colors['muted-foreground']}
      value={formData.mother_aadhar}
      onChangeText={t => setFormData(f => ({ ...f, mother_aadhar: t }))}
      keyboardType="numeric"
      maxLength={12}
    />
  </View>
  <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
    <Text style={[styles.label, { color: colors.foreground }]}>Occupation</Text>
    <TextInput
      style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
      placeholder="e.g. Homemaker, Teacher"
      placeholderTextColor={colors['muted-foreground']}
      value={formData.mother_occupation}
      onChangeText={t => setFormData(f => ({ ...f, mother_occupation: t }))}
    />
  </View>
</View>

<View style={styles.formGroup}>
  <Text style={[styles.label, { color: colors.foreground }]}>Mother Salary Range</Text>
  <View style={styles.chipRow}>
    {['< 1L', '1L-3L', '3L-5L', '5L-10L', '> 10L'].map(range => (
      <TouchableOpacity
        key={range}
        style={[
          styles.chip,
          { borderColor: formData.mother_salary_range === range ? '#F59E0B' : colors.border },
          formData.mother_salary_range === range && { backgroundColor: '#F59E0B18' },
        ]}
        onPress={() => setFormData(f => ({ ...f, mother_salary_range: range }))}
      >
        <Text style={{
          color: formData.mother_salary_range === range ? '#F59E0B' : colors['muted-foreground'],
          fontSize: 11, fontWeight: '600',
        }}>
          {range}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
</View>
```

**Also add these style entries to the StyleSheet:**
```ts
sectionHeader: {
  fontSize: 11,
  fontWeight: '700',
  letterSpacing: 0.8,
  marginTop: 20,
  marginBottom: 10,
},
chipRow: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 6,
},
chip: {
  borderWidth: 1,
  borderRadius: 16,
  paddingHorizontal: 10,
  paddingVertical: 5,
},
```

---

## Extension 2 — Staff Enrollment Form

### 2a — Update the staff type

In `src/api/staff.ts` (or wherever `Staff` is defined), add:

```ts
export interface Staff {
  // existing fields stay as-is, ADD these:

  // Work Experience
  work_experience_years?: number;
  previous_employer?: string;
  previous_designation?: string;

  // Bank Details
  bank_name?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
  bank_branch?: string;

  // Salary & PF
  current_salary?: number;     // Decimal → backend returns as string, use Number()
  last_drawn_salary?: number;  // same
  pf_number?: string;
  esi_number?: string;

  // Qualifications (array)
  qualifications?: StaffQualification[];
}

export interface StaffQualification {
  degree_name: string;
  institution?: string;
  year_of_passing?: number;
  percentage?: number;
}
```

> **Warning:** `current_salary` and `last_drawn_salary` are Decimal on the backend — they return as strings (e.g. `"45000.00"`). Always use `Number(staff.current_salary)` for display and arithmetic.

### 2b — Add fields to the form modal in `app/staff/enrollment.tsx`

Extend `formData` state:

```ts
const [formData, setFormData] = useState({
  // ... existing fields ...
  work_experience_years: '',
  previous_employer: '',
  previous_designation: '',
  bank_name: '',
  bank_account_number: '',
  bank_ifsc: '',
  bank_branch: '',
  current_salary: '',
  last_drawn_salary: '',
  pf_number: '',
  esi_number: '',
  qualifications: [] as { degree_name: string; institution: string; year_of_passing: string; percentage: string }[],
});
```

**Add these form field groups inside the modal `<ScrollView>`:**

```tsx
{/* ── Section: Work Experience ── */}
<Text style={[styles.sectionHeader, { color: colors['muted-foreground'] }]}>
  WORK EXPERIENCE
</Text>

<View style={styles.formRow}>
  <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
    <Text style={[styles.label, { color: colors.foreground }]}>Years of Experience</Text>
    <TextInput
      style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
      placeholder="e.g. 5"
      placeholderTextColor={colors['muted-foreground']}
      value={formData.work_experience_years}
      onChangeText={t => setFormData(f => ({ ...f, work_experience_years: t }))}
      keyboardType="numeric"
    />
  </View>
  <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
    <Text style={[styles.label, { color: colors.foreground }]}>Previous Designation</Text>
    <TextInput
      style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
      placeholder="e.g. Senior Teacher"
      placeholderTextColor={colors['muted-foreground']}
      value={formData.previous_designation}
      onChangeText={t => setFormData(f => ({ ...f, previous_designation: t }))}
    />
  </View>
</View>

<View style={styles.formGroup}>
  <Text style={[styles.label, { color: colors.foreground }]}>Previous Employer</Text>
  <TextInput
    style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
    placeholder="School or organization name"
    placeholderTextColor={colors['muted-foreground']}
    value={formData.previous_employer}
    onChangeText={t => setFormData(f => ({ ...f, previous_employer: t }))}
  />
</View>

{/* ── Section: Bank Details ── */}
<Text style={[styles.sectionHeader, { color: colors['muted-foreground'] }]}>
  BANK DETAILS
</Text>

<View style={styles.formRow}>
  <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
    <Text style={[styles.label, { color: colors.foreground }]}>Bank Name</Text>
    <TextInput
      style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
      placeholder="e.g. SBI"
      placeholderTextColor={colors['muted-foreground']}
      value={formData.bank_name}
      onChangeText={t => setFormData(f => ({ ...f, bank_name: t }))}
    />
  </View>
  <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
    <Text style={[styles.label, { color: colors.foreground }]}>IFSC Code</Text>
    <TextInput
      style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
      placeholder="e.g. SBIN0001234"
      placeholderTextColor={colors['muted-foreground']}
      value={formData.bank_ifsc}
      onChangeText={t => setFormData(f => ({ ...f, bank_ifsc: t.toUpperCase() }))}
      autoCapitalize="characters"
    />
  </View>
</View>

<View style={styles.formRow}>
  <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
    <Text style={[styles.label, { color: colors.foreground }]}>Account Number</Text>
    <TextInput
      style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
      placeholder="Bank account no."
      placeholderTextColor={colors['muted-foreground']}
      value={formData.bank_account_number}
      onChangeText={t => setFormData(f => ({ ...f, bank_account_number: t }))}
      keyboardType="numeric"
    />
  </View>
  <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
    <Text style={[styles.label, { color: colors.foreground }]}>Branch</Text>
    <TextInput
      style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
      placeholder="Branch name"
      placeholderTextColor={colors['muted-foreground']}
      value={formData.bank_branch}
      onChangeText={t => setFormData(f => ({ ...f, bank_branch: t }))}
    />
  </View>
</View>

{/* ── Section: Salary & PF ── */}
<Text style={[styles.sectionHeader, { color: colors['muted-foreground'] }]}>
  SALARY & PF
</Text>

<View style={styles.formRow}>
  <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
    <Text style={[styles.label, { color: colors.foreground }]}>Current Salary (₹)</Text>
    <TextInput
      style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
      placeholder="e.g. 45000"
      placeholderTextColor={colors['muted-foreground']}
      value={formData.current_salary}
      onChangeText={t => setFormData(f => ({ ...f, current_salary: t }))}
      keyboardType="numeric"
    />
  </View>
  <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
    <Text style={[styles.label, { color: colors.foreground }]}>Last Drawn Salary (₹)</Text>
    <TextInput
      style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
      placeholder="e.g. 42000"
      placeholderTextColor={colors['muted-foreground']}
      value={formData.last_drawn_salary}
      onChangeText={t => setFormData(f => ({ ...f, last_drawn_salary: t }))}
      keyboardType="numeric"
    />
  </View>
</View>

<View style={styles.formRow}>
  <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
    <Text style={[styles.label, { color: colors.foreground }]}>PF Number</Text>
    <TextInput
      style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
      placeholder="PF / EPF number"
      placeholderTextColor={colors['muted-foreground']}
      value={formData.pf_number}
      onChangeText={t => setFormData(f => ({ ...f, pf_number: t }))}
    />
  </View>
  <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
    <Text style={[styles.label, { color: colors.foreground }]}>ESI Number</Text>
    <TextInput
      style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
      placeholder="ESI number"
      placeholderTextColor={colors['muted-foreground']}
      value={formData.esi_number}
      onChangeText={t => setFormData(f => ({ ...f, esi_number: t }))}
    />
  </View>
</View>

{/* ── Section: Qualifications ── */}
<Text style={[styles.sectionHeader, { color: colors['muted-foreground'] }]}>
  QUALIFICATIONS
</Text>

{formData.qualifications.map((q, idx) => (
  <View key={idx} style={[styles.qualCard, { borderColor: colors.border }]}>
    <View style={styles.qualCardHeader}>
      <Text style={[styles.qualCardTitle, { color: colors.foreground }]}>
        Qualification {idx + 1}
      </Text>
      <TouchableOpacity
        onPress={() => setFormData(f => ({
          ...f,
          qualifications: f.qualifications.filter((_, i) => i !== idx),
        }))}
      >
        <Ionicons name="close-circle" size={20} color="#EF4444" />
      </TouchableOpacity>
    </View>
    <TextInput
      style={[styles.input, { color: colors.foreground, borderColor: colors.border, marginBottom: 6 }]}
      placeholder="Degree name (e.g. B.Ed, M.A)"
      placeholderTextColor={colors['muted-foreground']}
      value={q.degree_name}
      onChangeText={t => setFormData(f => ({
        ...f,
        qualifications: f.qualifications.map((item, i) =>
          i === idx ? { ...item, degree_name: t } : item
        ),
      }))}
    />
    <View style={styles.formRow}>
      <TextInput
        style={[styles.input, { flex: 1, marginRight: 6, color: colors.foreground, borderColor: colors.border }]}
        placeholder="Institution"
        placeholderTextColor={colors['muted-foreground']}
        value={q.institution}
        onChangeText={t => setFormData(f => ({
          ...f,
          qualifications: f.qualifications.map((item, i) =>
            i === idx ? { ...item, institution: t } : item
          ),
        }))}
      />
      <TextInput
        style={[styles.input, { width: 80, marginLeft: 6, color: colors.foreground, borderColor: colors.border }]}
        placeholder="Year"
        placeholderTextColor={colors['muted-foreground']}
        value={q.year_of_passing}
        onChangeText={t => setFormData(f => ({
          ...f,
          qualifications: f.qualifications.map((item, i) =>
            i === idx ? { ...item, year_of_passing: t } : item
          ),
        }))}
        keyboardType="numeric"
        maxLength={4}
      />
    </View>
  </View>
))}

<TouchableOpacity
  style={[styles.addQualBtn, { borderColor: '#556ee6' }]}
  onPress={() => setFormData(f => ({
    ...f,
    qualifications: [...f.qualifications, { degree_name: '', institution: '', year_of_passing: '', percentage: '' }],
  }))}
>
  <Ionicons name="add" size={16} color="#556ee6" />
  <Text style={{ color: '#556ee6', fontSize: 13, fontWeight: '600' }}>Add Qualification</Text>
</TouchableOpacity>
```

**Add salary conversion in the submit handler:**

```ts
// In handleSubmit(), when building the payload to send to the API:
const payload = {
  ...formData,
  current_salary: formData.current_salary ? Number(formData.current_salary) : undefined,
  last_drawn_salary: formData.last_drawn_salary ? Number(formData.last_drawn_salary) : undefined,
  work_experience_years: formData.work_experience_years ? Number(formData.work_experience_years) : undefined,
  qualifications: formData.qualifications.map(q => ({
    degree_name: q.degree_name,
    institution: q.institution || undefined,
    year_of_passing: q.year_of_passing ? Number(q.year_of_passing) : undefined,
  })),
};
```

**Also add these style entries:**
```ts
sectionHeader: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginTop: 20, marginBottom: 10 },
qualCard: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
qualCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
qualCardTitle: { fontSize: 13, fontWeight: '600' },
addQualBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 10, padding: 10, justifyContent: 'center', marginTop: 4, borderStyle: 'dashed' },
```

---

## What to Test After Phase 4

### Student Admission Form
- [ ] Open Students → Admission → tap edit on any student
- [ ] Scroll to bottom of form — new sections visible: Identity, Caste, Admission Details, Father Extended, Mother Extended
- [ ] Fill Aadhar (12 digits) → saves without error
- [ ] Select caste category chip → chip highlights
- [ ] Fill admission date (YYYY-MM-DD format) → saves
- [ ] Fill father occupation and salary range → saves
- [ ] **If save returns 422:** one of the new fields has a wrong name — check API field names against backend `StudentAdmissionUpdate` schema

### Staff Enrollment Form
- [ ] Open Staff → Enrollment → tap edit on any staff
- [ ] Scroll to bottom — new sections visible: Work Experience, Bank Details, Salary & PF, Qualifications
- [ ] Fill current salary → saves
- [ ] View the staff card → salary shows as a number (not `"45000.00"` string)
- [ ] Tap "Add Qualification" → new row appears → fill degree name + institution → saves
- [ ] Add 2 qualifications → both save → both show on next edit
- [ ] Tap X on a qualification → it removes from the list
- [ ] **If salary shows as `"45000.00"`:** you forgot `Number(staff.current_salary)` in the display code

---

## Document Update Tracker

After completing each phase, mark these docs as updated:

### After Phase 1 is fixed:
- [ ] `docs/PHASE1_FIXES.md` → change status to `✅ ALL FIXES APPLIED`

### After Phase 2 is built:
- [ ] `docs/PHASE2_NEW_SCREENS.md` → change status to `✅ COMPLETE`
- [ ] `docs/FRONTEND_REQUIREMENTS.md` → update Implementation Status table:
  - Fee Collection → ✅ Complete
  - My Marks → ✅ Complete

### After Phase 3 is built:
- [ ] `docs/PHASE3_ADMIN_SCREENS.md` → change status to `✅ COMPLETE`
- [ ] `docs/FRONTEND_REQUIREMENTS.md` → update Implementation Status table:
  - Transport Pricing → ✅ Complete
  - Fee Reports → ✅ Complete
  - Communication Compose → ✅ Complete
  - Communication Templates → ✅ Complete
  - Communication Logs → ✅ Complete
  - Exam Grading Dashboard → ✅ Complete

### After Phase 4 is built:
- [ ] `docs/PHASE4_FORM_FIELDS.md` → change status to `✅ COMPLETE`
- [ ] `docs/FRONTEND_REQUIREMENTS.md` → update Implementation Status table:
  - Student Admission (extended fields) → ✅ Complete
  - Staff Enrollment (extended fields) → ✅ Complete

---

## Checklist

- [ ] Student type updated with new fields (`src/api/students.ts`)
- [ ] Student admission form extended with Identity section
- [ ] Student admission form extended with Caste section
- [ ] Student admission form extended with Admission Details section
- [ ] Student admission form extended with Father Extended section
- [ ] Student admission form extended with Mother Extended section
- [ ] ⚠️ Student admission form extended with Address section (State→District→Mandal)
- [ ] ⚠️ Student admission form — profile photo field added
- [ ] ⚠️ Student admission form — father/mother gender field added
- [ ] Student form tested — all sections save without error
- [ ] Staff type updated with new fields (`src/api/staff.ts`)
- [ ] ⚠️ Staff work experience rebuilt as dynamic array (multiple entries, from/to dates)
- [ ] ⚠️ Staff UAN Number field added
- [ ] Staff enrollment form extended with Bank Details section
- [ ] Staff enrollment form extended with Salary & PF section (with Number() conversion)
- [ ] Staff enrollment form extended with Qualifications section (add/remove)
- [ ] Staff form tested — qualifications save and load correctly
- [ ] Salary displays as number on staff card (not string)

---

## ⚠️ GAP 1 — Student Admission: Missing Address Section (added Mar 2026)

> `FRONTEND_REQUIREMENTS.md §6.2.1` requires a cascading **State → District → Mandal** address section. This was omitted from the original Extension 1.

### Add to `StudentAdmission` type:

```ts
street?: string;
state_id?: string;
district_id?: string;
mandal_id?: string;
pincode?: string;
```

### Add to `formData` state:

```ts
street: '',
state_id: '',
district_id: '',
mandal_id: '',
pincode: '',
```

### Add to the modal `<ScrollView>` after ADMISSION DETAILS section:

```tsx
{/* ── Section: Address ── */}
<Text style={[styles.sectionHeader, { color: colors['muted-foreground'] }]}>
  ADDRESS
</Text>

<View style={styles.formGroup}>
  <Text style={[styles.label, { color: colors.foreground }]}>Street / Door No.</Text>
  <TextInput
    style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
    placeholder="House no., street name"
    placeholderTextColor={colors['muted-foreground']}
    value={formData.street}
    onChangeText={t => setFormData(f => ({ ...f, street: t }))}
  />
</View>

{/* State dropdown */}
<View style={styles.formGroup}>
  <Text style={[styles.label, { color: colors.foreground }]}>State</Text>
  <CustomDropdown
    data={states.map(s => ({ value: s.id, label: s.name }))}
    value={formData.state_id}
    onChange={(value) => setFormData(f => ({
      ...f,
      state_id: String(value || ''),
      district_id: '',   // reset child
      mandal_id: '',     // reset grandchild
    }))}
    placeholder="Select state"
  />
</View>

{/* District dropdown — enabled only when state selected */}
<View style={styles.formGroup}>
  <Text style={[styles.label, { color: colors.foreground }]}>District</Text>
  <CustomDropdown
    data={districts.map(d => ({ value: d.id, label: d.name }))}
    value={formData.district_id}
    onChange={(value) => setFormData(f => ({
      ...f,
      district_id: String(value || ''),
      mandal_id: '',     // reset grandchild
    }))}
    placeholder={formData.state_id ? 'Select district' : 'Select state first'}
    disabled={!formData.state_id}
  />
</View>

{/* Mandal dropdown — enabled only when district selected */}
<View style={styles.formGroup}>
  <Text style={[styles.label, { color: colors.foreground }]}>Mandal / Taluk</Text>
  <CustomDropdown
    data={mandals.map(m => ({ value: m.id, label: m.name }))}
    value={formData.mandal_id}
    onChange={(value) => setFormData(f => ({ ...f, mandal_id: String(value || '') }))}
    placeholder={formData.district_id ? 'Select mandal' : 'Select district first'}
    disabled={!formData.district_id}
  />
</View>

<View style={styles.formGroup}>
  <Text style={[styles.label, { color: colors.foreground }]}>Pincode</Text>
  <TextInput
    style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
    placeholder="6 digit pincode"
    placeholderTextColor={colors['muted-foreground']}
    value={formData.pincode}
    onChangeText={t => setFormData(f => ({ ...f, pincode: t }))}
    keyboardType="numeric"
    maxLength={6}
  />
</View>
```

### Add cascading queries near the top of the component:

```ts
// States — always loaded
const { data: states = [] } = useQuery({
  queryKey: ['states'],
  queryFn: () => mastersApi.getStates(),
});

// Districts — load when state selected
const { data: districts = [] } = useQuery({
  queryKey: ['districts', formData.state_id],
  queryFn: () => mastersApi.getDistricts(formData.state_id),
  enabled: !!formData.state_id,
});

// Mandals — load when district selected
const { data: mandals = [] } = useQuery({
  queryKey: ['mandals', formData.district_id],
  queryFn: () => mastersApi.getMandals(formData.district_id),
  enabled: !!formData.district_id,
});
```

API functions to add to `src/api/masters.ts` (or equivalent):

```ts
getStates: async () => {
  const res = await apiClient.get('/masters/states/');
  return res.data.items || res.data;
},
getDistricts: async (stateId: string) => {
  const res = await apiClient.get('/masters/districts/', { params: { state_id: stateId } });
  return res.data.items || res.data;
},
getMandals: async (districtId: string) => {
  const res = await apiClient.get('/masters/mandals/', { params: { district_id: districtId } });
  return res.data.items || res.data;
},
```

Also populate address fields in `handleEdit`:

```ts
street: student.street ?? '',
state_id: student.state_id ?? '',
district_id: student.district_id ?? '',
mandal_id: student.mandal_id ?? '',
pincode: student.pincode ?? '',
```

---

## ⚠️ GAP 2 — Student Admission: Missing Profile Photo + Parent Gender (added Mar 2026)

> `FRONTEND_REQUIREMENTS.md §6.2.1` also requires a **Profile Photo** field (expo-image-picker) and a **Gender** field for Father and Mother.

### Profile Photo

Add to `formData`:

```ts
profile_photo_uri: '',   // local URI from image picker
```

Add to the Identity Documents section:

```tsx
<View style={styles.formGroup}>
  <Text style={[styles.label, { color: colors.foreground }]}>Profile Photo</Text>
  <TouchableOpacity
    style={[styles.photoPicker, { borderColor: colors.border }]}
    onPress={async () => {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setFormData(f => ({ ...f, profile_photo_uri: result.assets[0].uri }));
      }
    }}
  >
    {formData.profile_photo_uri ? (
      <Image source={{ uri: formData.profile_photo_uri }} style={styles.photoPreview} />
    ) : (
      <>
        <Ionicons name="camera" size={24} color={colors['muted-foreground']} />
        <Text style={{ color: colors['muted-foreground'], fontSize: 12, marginTop: 4 }}>
          Tap to select photo
        </Text>
      </>
    )}
  </TouchableOpacity>
</View>
```

Add import: `import * as ImagePicker from 'expo-image-picker';`

Add styles:

```ts
photoPicker: {
  borderWidth: 1, borderStyle: 'dashed', borderRadius: 12,
  height: 100, alignItems: 'center', justifyContent: 'center',
},
photoPreview: { width: 100, height: 100, borderRadius: 12 },
```

### Father/Mother Gender

Add to `formData`:

```ts
father_gender: '',
mother_gender: '',
```

Add gender chip selectors inside the FATHER DETAILS and MOTHER DETAILS sections:

```tsx
<View style={styles.formGroup}>
  <Text style={[styles.label, { color: colors.foreground }]}>Gender</Text>
  <View style={styles.chipRow}>
    {['Male', 'Female', 'Other'].map(g => (
      <TouchableOpacity
        key={g}
        style={[
          styles.chip,
          { borderColor: formData.father_gender === g ? '#556ee6' : colors.border },
          formData.father_gender === g && { backgroundColor: '#556ee618' },
        ]}
        onPress={() => setFormData(f => ({ ...f, father_gender: g }))}
      >
        <Text style={{ color: formData.father_gender === g ? '#556ee6' : colors['muted-foreground'], fontSize: 12, fontWeight: '600' }}>
          {g}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
</View>
```

Do the same for `mother_gender`.

---

## ⚠️ GAP 3 — Staff Enrollment: Work Experience Must Be a Dynamic Array (added Mar 2026)

> The original Extension 2 added flat fields (`work_experience_years`, `previous_employer`, `previous_designation`). `FRONTEND_REQUIREMENTS.md §6.3.1` requires a **dynamic array** supporting multiple past employers, each with From/To dates and a description.

### Replace flat work experience fields in the type with an array:

```ts
export interface StaffWorkExperience {
  employer_name: string;
  role: string;
  from_date: string;     // YYYY-MM-DD
  to_date?: string;      // YYYY-MM-DD — null if current job
  description?: string;
}

// In Staff interface, replace work_experience_years/previous_employer/previous_designation with:
work_experience?: StaffWorkExperience[];
```

### Replace flat fields in `formData` state:

```ts
// REMOVE: work_experience_years, previous_employer, previous_designation
// ADD:
work_experience: [] as { employer_name: string; role: string; from_date: string; to_date: string; description: string }[],
```

### Replace the WORK EXPERIENCE section in the form modal:

```tsx
{/* ── Section: Work Experience ── */}
<Text style={[styles.sectionHeader, { color: colors['muted-foreground'] }]}>
  WORK EXPERIENCE
</Text>

{formData.work_experience.map((exp, idx) => (
  <View key={idx} style={[styles.qualCard, { borderColor: colors.border }]}>
    <View style={styles.qualCardHeader}>
      <Text style={[styles.qualCardTitle, { color: colors.foreground }]}>
        Experience {idx + 1}
      </Text>
      <TouchableOpacity onPress={() => setFormData(f => ({
        ...f,
        work_experience: f.work_experience.filter((_, i) => i !== idx),
      }))}>
        <Ionicons name="close-circle" size={20} color="#EF4444" />
      </TouchableOpacity>
    </View>

    <TextInput
      style={[styles.input, { color: colors.foreground, borderColor: colors.border, marginBottom: 6 }]}
      placeholder="Employer / School Name"
      value={exp.employer_name}
      onChangeText={t => setFormData(f => ({
        ...f,
        work_experience: f.work_experience.map((e, i) => i === idx ? { ...e, employer_name: t } : e),
      }))}
    />
    <TextInput
      style={[styles.input, { color: colors.foreground, borderColor: colors.border, marginBottom: 6 }]}
      placeholder="Role / Designation"
      value={exp.role}
      onChangeText={t => setFormData(f => ({
        ...f,
        work_experience: f.work_experience.map((e, i) => i === idx ? { ...e, role: t } : e),
      }))}
    />
    <View style={styles.formRow}>
      <TextInput
        style={[styles.input, { flex: 1, marginRight: 6, color: colors.foreground, borderColor: colors.border }]}
        placeholder="From (YYYY-MM-DD)"
        value={exp.from_date}
        onChangeText={t => setFormData(f => ({
          ...f,
          work_experience: f.work_experience.map((e, i) => i === idx ? { ...e, from_date: t } : e),
        }))}
      />
      <TextInput
        style={[styles.input, { flex: 1, marginLeft: 6, color: colors.foreground, borderColor: colors.border }]}
        placeholder="To (or leave blank)"
        value={exp.to_date}
        onChangeText={t => setFormData(f => ({
          ...f,
          work_experience: f.work_experience.map((e, i) => i === idx ? { ...e, to_date: t } : e),
        }))}
      />
    </View>
    <TextInput
      style={[styles.input, styles.textarea, { color: colors.foreground, borderColor: colors.border }]}
      placeholder="Brief description (optional)"
      value={exp.description}
      onChangeText={t => setFormData(f => ({
        ...f,
        work_experience: f.work_experience.map((e, i) => i === idx ? { ...e, description: t } : e),
      }))}
      multiline
      numberOfLines={3}
      textAlignVertical="top"
    />
  </View>
))}

<TouchableOpacity
  style={[styles.addQualBtn, { borderColor: '#3B82F6' }]}
  onPress={() => setFormData(f => ({
    ...f,
    work_experience: [...f.work_experience, { employer_name: '', role: '', from_date: '', to_date: '', description: '' }],
  }))}
>
  <Ionicons name="add" size={16} color="#3B82F6" />
  <Text style={{ color: '#3B82F6', fontSize: 13, fontWeight: '600' }}>Add Work Experience</Text>
</TouchableOpacity>
```

Also update the submit payload to send the array (not flat fields):

```ts
const payload = {
  ...formData,
  work_experience: formData.work_experience.map(e => ({
    employer_name: e.employer_name,
    role: e.role,
    from_date: e.from_date || undefined,
    to_date: e.to_date || undefined,
    description: e.description || undefined,
  })).filter(e => e.employer_name),  // skip empty rows
  current_salary: formData.current_salary ? Number(formData.current_salary) : undefined,
  last_drawn_salary: formData.last_drawn_salary ? Number(formData.last_drawn_salary) : undefined,
};
```

---

## ⚠️ GAP 4 — Staff Enrollment: Missing UAN Number (added Mar 2026)

> `FRONTEND_REQUIREMENTS.md §6.3.1` lists **UAN Number** under Salary & PF. It was omitted from the original Extension 2.

Add to `Staff` type:

```ts
uan_number?: string;
```

Add to `formData`:

```ts
uan_number: '',
```

Add to the SALARY & PF section (after PF Number field):

```tsx
<View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
  <Text style={[styles.label, { color: colors.foreground }]}>UAN Number</Text>
  <TextInput
    style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
    placeholder="UAN number"
    placeholderTextColor={colors['muted-foreground']}
    value={formData.uan_number}
    onChangeText={t => setFormData(f => ({ ...f, uan_number: t }))}
  />
</View>
```

---

Last updated: March 2026

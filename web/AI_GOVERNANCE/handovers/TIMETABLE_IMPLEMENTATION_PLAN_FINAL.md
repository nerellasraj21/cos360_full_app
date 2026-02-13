# TimeTable Enhancement - Final Implementation Plan

## Requirements Summary

### 1. Hide Type Column (But Keep in Database)
- Remove Type dropdown column from UI
- Type is automatically set based on which button user clicks
- "Add Subject Row" → `type: 'subject'`
- "Add Special Row" → `type: 'special'`
- Users cannot change type after row is created

### 2. Add Custom Events
- Allow users to create custom special events inline
- Events like "Assembly", "Prayer", "Break", etc.
- Use CreatableSelect for inline creation

---

## Implementation Todo List

### ✅ **Task 1: Remove Type Column from UI** (10 minutes)

**File**: [TimeTableEditor.tsx](src/pages/masters/TimeTableEditor.tsx)

**Changes:**

1. **Remove Type column header** (Line 582):
```typescript
// DELETE THIS LINE:
{isEditing && <th className="p-2 font-medium text-center text-muted-foreground">Type</th>}
```

2. **Remove Type column width** (Line 568):
```typescript
// DELETE THIS LINE:
{isEditing && <col style={{ width: '6.5rem' }} />}
```

3. **Remove Type dropdown cell** (Lines 649-663):
```typescript
// DELETE THIS ENTIRE BLOCK:
{isEditing && (
  <td className="align-middle text-center">
    <Select
      options={TYPE_OPTIONS}
      value={TYPE_OPTIONS.find((opt) => opt.value === row.type) || TYPE_OPTIONS[0]}
      onChange={(opt) => handleTypeChange(rowIdx, opt ? (opt.value as 'subject' | 'special') : 'subject')}
      className="timetable-type-select min-w-[5.5rem] max-w-[6.5rem]"
      classNamePrefix="react-select"
      menuPlacement="auto"
      menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
      styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
      isSearchable={false}
    />
  </td>
)}
```

4. **Remove `handleTypeChange` function** (Lines 294-301):
```typescript
// DELETE THIS ENTIRE FUNCTION:
const handleTypeChange = (rowIdx: number, type: 'subject' | 'special') => {
  setRows((prev) => {
    const updated = [...prev];
    const template = type === 'subject' ? getEmptySubjectRow(includeSaturday) : getEmptySpecialRow();
    updated[rowIdx] = { ...template, time: updated[rowIdx].time };
    return updated;
  });
};
```

5. **Remove `TYPE_OPTIONS` constant** (Lines 26-29):
```typescript
// DELETE THIS:
const TYPE_OPTIONS = [
  { value: 'subject', label: 'Subject' },
  { value: 'special', label: 'Special' },
];
```

**Result**: Type column completely removed from UI, but type field still exists in data structure.

---

### ✅ **Task 2: Update Table Column Layout** (2 minutes)

**File**: [TimeTableEditor.tsx](src/pages/masters/TimeTableEditor.tsx)

**Before** (Line 563-570):
```typescript
<colgroup>
  <col style={{ width: '12rem' }} />
  {activeDays.map((_, i) => (
    <col key={i} style={{ width: '10.5rem' }} />
  ))}
  {isEditing && <col style={{ width: '6.5rem' }} />}  // ← Type column
  {isEditing && <col style={{ width: '4.5rem' }} />}  // ← Actions column
</colgroup>
```

**After**:
```typescript
<colgroup>
  <col style={{ width: '12rem' }} />
  {activeDays.map((_, i) => (
    <col key={i} style={{ width: '10.5rem' }} />
  ))}
  {isEditing && <col style={{ width: '4.5rem' }} />}  // ← Only Actions column
</colgroup>
```

**Result**: More space for day columns, cleaner layout.

---

### ✅ **Task 3: Update Table Headers** (2 minutes)

**File**: [TimeTableEditor.tsx](src/pages/masters/TimeTableEditor.tsx)

**Before** (Lines 572-584):
```typescript
<thead>
  <tr className="border-b">
    <th className="p-2 font-medium text-left text-muted-foreground">Time</th>
    {activeDays.map((day) => (
      <th key={day} className={`p-2 font-medium text-left text-muted-foreground ${day === SATURDAY ? 'bg-muted/30' : ''}`}>
        {day}
        {day === SATURDAY && !isEditing && (
          <span className="text-xs text-muted-foreground ml-1">(Holiday)</span>
        )}
      </th>
    ))}
    {isEditing && <th className="p-2 font-medium text-center text-muted-foreground">Type</th>}  // ← REMOVE
    {isEditing && <th className="p-2 font-medium text-center text-muted-foreground">Actions</th>}
  </tr>
</thead>
```

**After**:
```typescript
<thead>
  <tr className="border-b">
    <th className="p-2 font-medium text-left text-muted-foreground">Time</th>
    {activeDays.map((day) => (
      <th key={day} className={`p-2 font-medium text-left text-muted-foreground ${day === SATURDAY ? 'bg-muted/30' : ''}`}>
        {day}
        {day === SATURDAY && !isEditing && (
          <span className="text-xs text-muted-foreground ml-1">(Holiday)</span>
        )}
      </th>
    ))}
    {isEditing && <th className="p-2 font-medium text-center text-muted-foreground">Actions</th>}
  </tr>
</thead>
```

**Result**: Only Time, Days, and Actions columns visible.

---

### ✅ **Task 4: Add Custom Events State** (5 minutes)

**File**: [TimeTableEditor.tsx](src/pages/masters/TimeTableEditor.tsx)

**Location**: After line 149

**Add:**
```typescript
// Custom events state (for user-created special event types)
const [customEvents, setCustomEvents] = useState<Array<{value: string, label: string}>>([]);

// Combined special labels (defaults + custom)
const allSpecialLabels = useMemo(() => {
  return [...SPECIAL_LABELS, ...customEvents];
}, [customEvents]);

// Helper to validate event names
const isValidEventName = (name: string): boolean => {
  if (!name || name.trim().length === 0) return false;
  if (name.length > 50) return false;
  if (!/^[a-zA-Z0-9\s]+$/.test(name)) return false; // Alphanumeric + spaces only
  return true;
};

// Helper to add custom event
const addCustomEvent = (eventName: string) => {
  const trimmed = eventName.trim();

  if (!isValidEventName(trimmed)) {
    toast.error('Event name must be 1-50 alphanumeric characters');
    return null;
  }

  // Convert to uppercase with underscores for value
  const value = trimmed.toUpperCase().replace(/\s+/g, '_');

  // Check for duplicates
  const isDuplicate = [...SPECIAL_LABELS, ...customEvents].some(e => e.value === value);
  if (isDuplicate) {
    toast.error('This event already exists');
    return null;
  }

  // Capitalize first letter of each word for label
  const label = trimmed.replace(/\b\w/g, l => l.toUpperCase());

  const newEvent = { value, label };
  setCustomEvents(prev => [...prev, newEvent]);
  toast.success(`Created custom event: ${label}`);
  return newEvent;
};
```

**Result**: State management for custom events ready.

---

### ✅ **Task 5: Install CreatableSelect** (1 minute)

**File**: [TimeTableEditor.tsx](src/pages/masters/TimeTableEditor.tsx)

**Update imports** (Line 11):

**Before**:
```typescript
import Select, { type SingleValue } from 'react-select';
```

**After**:
```typescript
import Select, { type SingleValue } from 'react-select';
import CreatableSelect from 'react-select/creatable';
```

**Result**: CreatableSelect component available.

---

### ✅ **Task 6: Replace Special Event Dropdown** (10 minutes)

**File**: [TimeTableEditor.tsx](src/pages/masters/TimeTableEditor.tsx)

**Location**: Lines 629-646

**Before**:
```typescript
{isEditing ? (
  <Select
    options={SPECIAL_LABELS}
    value={SPECIAL_LABELS.find((opt) => opt.value === row.label) || null}
    onChange={(opt) => handleRowChange(rowIdx, 'label', opt ? opt.value : SPECIAL_LABELS[0].value)}
    className="w-full"
    classNamePrefix="react-select"
    menuPlacement="auto"
    menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
    styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
  />
) : (
  <span className="block px-2 py-1 text-center bg-card/80 rounded text-foreground font-semibold">
    {SPECIAL_LABELS.find((opt) => opt.value === row.label)?.label || '--'}
  </span>
)}
```

**After**:
```typescript
{isEditing ? (
  <CreatableSelect
    options={allSpecialLabels}
    value={allSpecialLabels.find((opt) => opt.value === row.label) || null}
    onCreateOption={(inputValue) => {
      const newEvent = addCustomEvent(inputValue);
      if (newEvent) {
        handleRowChange(rowIdx, 'label', newEvent.value);
      }
    }}
    onChange={(opt) => handleRowChange(rowIdx, 'label', opt ? opt.value : allSpecialLabels[0].value)}
    placeholder="Select or create event..."
    formatCreateLabel={(inputValue) => `Create "${inputValue}"`}
    className="w-full"
    classNamePrefix="react-select"
    menuPlacement="auto"
    menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
    styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
  />
) : (
  <span className="block px-2 py-1 text-center bg-card/80 rounded text-foreground font-semibold">
    {allSpecialLabels.find((opt) => opt.value === row.label)?.label || row.label || '--'}
  </span>
)}
```

**Result**: Users can now create custom events like "Assembly", "Prayer", etc.

---

### ✅ **Task 7: Extract Custom Events from Loaded Data** (10 minutes)

**File**: [TimeTableEditor.tsx](src/pages/masters/TimeTableEditor.tsx)

**Location**: Inside the useEffect at line 204, after setting rows

**Add this code** (around line 210):
```typescript
// Extract custom events from loaded timetable data
if (frontendTimetableData) {
  setTimetableData(frontendTimetableData);
  const transformedRows = transformFrontendTimetableToRows(frontendTimetableData, includeSaturday);
  setRows(transformedRows);
  setIsEditing(false);

  // NEW CODE - Extract custom special events
  const defaultValues = SPECIAL_LABELS.map(l => l.value);
  const extractedEvents: Array<{value: string, label: string}> = [];

  frontendTimetableData.timetable_data.forEach(item => {
    if (item.type === 'special' && item.label && !defaultValues.includes(item.label)) {
      const existing = extractedEvents.find(e => e.value === item.label);
      if (!existing) {
        // Convert ASSEMBLY to Assembly
        const label = item.label.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        extractedEvents.push({
          value: item.label,
          label: label
        });
      }
    }
  });

  if (extractedEvents.length > 0) {
    setCustomEvents(extractedEvents);
  }
  // END NEW CODE

  console.log('Set isEditing to false (data exists)');
}
```

**Result**: Custom events are loaded from saved timetables.

---

### ✅ **Task 8: Add Missing Import** (1 minute)

**File**: [TimeTableEditor.tsx](src/pages/masters/TimeTableEditor.tsx)

**Add to imports** (around line 16):
```typescript
import { toast } from 'sonner';
```

**Result**: Toast notifications work for custom events.

---

### ✅ **Task 9: Update Add Special Row Comment** (1 minute)

**File**: [TimeTableEditor.tsx](src/pages/masters/TimeTableEditor.tsx)

**Location**: Line 21-25

**Update comment**:
```typescript
// Default special event labels (users can create custom ones)
const SPECIAL_LABELS = [
    { value: 'SNACKS', label: 'Snacks' },
    { value: 'LUNCH', label: 'Lunch' },
    { value: 'DISPERSAL', label: 'Dispersal' },
];
```

**Result**: Documentation is clear.

---

## Summary of Changes

### What's Being Removed:
1. ❌ Type dropdown column from UI
2. ❌ `TYPE_OPTIONS` constant
3. ❌ `handleTypeChange` function
4. ❌ Type column header
5. ❌ Type column width definition

### What's Being Added:
1. ✅ `customEvents` state for user-created events
2. ✅ `allSpecialLabels` computed value
3. ✅ `addCustomEvent()` function with validation
4. ✅ `isValidEventName()` validation function
5. ✅ CreatableSelect import
6. ✅ CreatableSelect component for special events
7. ✅ Custom event extraction from loaded data
8. ✅ Toast notifications

### What Stays the Same:
- ✅ Type field in data structure (required by backend)
- ✅ "Add Subject Row" button (sets `type: 'subject'` automatically)
- ✅ "Add Special Row" button (sets `type: 'special'` automatically)
- ✅ All existing functionality

---

## Before vs After UI

### Before (Current):
```
+-------------+----------+----------+-----+----------+---------+
| Time        | Monday   | Tuesday  | ... | Type     | Actions |
+-------------+----------+----------+-----+----------+---------+
| 9:00-10:00  | Math     | Science  | ... | Subject  | [Del]   |
| 10:00-10:15 | Snacks ▼           ...   | Special  | [Del]   |
+-------------+----------+----------+-----+----------+---------+
                                           ↑
                                    Confusing column!
```

### After (New):
```
+-------------+----------+----------+-----+---------+
| Time        | Monday   | Tuesday  | ... | Actions |
+-------------+----------+----------+-----+---------+
| 9:00-10:00  | Math     | Science  | ... | [Del]   |
| 10:00-10:15 | Snacks ▼ (or create)|... | [Del]   |
+-------------+----------+----------+-----+---------+
                    ↑
         Can create "Assembly", "Prayer", etc.
```

---

## User Workflow

### Adding a Subject Row:
1. Click "Add Subject Row" button
2. Time inputs + dropdowns for each day appear
3. Type is automatically `'subject'` (hidden from user)

### Adding a Special Row:
1. Click "Add Special Row" button
2. Time inputs + one dropdown spanning all days appears
3. Type is automatically `'special'` (hidden from user)
4. **NEW**: Can type "Assembly" and create custom event
5. **NEW**: "Assembly" saved and available in future dropdowns

---

## Implementation Checklist

- [ ] **Task 1**: Remove Type column UI elements (5 deletions)
- [ ] **Task 2**: Update table column layout
- [ ] **Task 3**: Update table headers
- [ ] **Task 4**: Add custom events state management
- [ ] **Task 5**: Import CreatableSelect
- [ ] **Task 6**: Replace special event dropdown
- [ ] **Task 7**: Extract custom events from loaded data
- [ ] **Task 8**: Add toast import
- [ ] **Task 9**: Update comments

---

## Testing Checklist

### Type Column Removal:
- [ ] Type column is not visible in edit mode
- [ ] Subject rows work correctly (type = 'subject' in data)
- [ ] Special rows work correctly (type = 'special' in data)
- [ ] Saved timetables load correctly
- [ ] Export (PNG/CSV/Excel) works without Type column

### Custom Events:
- [ ] Can type "Assembly" in special event dropdown
- [ ] "Create 'Assembly'" option appears
- [ ] Clicking creates the event and selects it
- [ ] Custom event appears in dropdown for other rows
- [ ] Validation prevents empty names
- [ ] Validation prevents duplicate names
- [ ] Validation prevents special characters
- [ ] Toast notifications appear for success/error
- [ ] Saving timetable includes custom events
- [ ] Loading timetable restores custom events
- [ ] Export includes custom event names

---

## Estimated Time

- **Removing Type Column**: 15 minutes
- **Adding Custom Events**: 30 minutes
- **Testing**: 15 minutes
- **Total**: ~60 minutes

---

## Files Modified

Only **1 file** changes:
- [TimeTableEditor.tsx](src/pages/masters/TimeTableEditor.tsx)

**Lines changed**: ~120 lines
- Deletions: ~30 lines (Type column removal)
- Additions: ~90 lines (Custom events feature)

---

## Database Impact

**✅ NO DATABASE CHANGES REQUIRED**

- Type field remains in data structure (backend requirement)
- Custom events use existing `label` field (accepts any string)
- No migrations needed
- No API changes needed

---

## Ready to Implement?

Please confirm:
- ✅ Hide Type column from UI
- ✅ Keep type in database (auto-set based on button)
- ✅ Add custom events with CreatableSelect
- ✅ Validate event names (1-50 chars, alphanumeric + spaces)
- ✅ Toast notifications for feedback

**If approved, I'll implement all changes in one go.**

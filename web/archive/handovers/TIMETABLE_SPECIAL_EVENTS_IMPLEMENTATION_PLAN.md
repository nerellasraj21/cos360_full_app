# TimeTable Special Events - Implementation Plan

## User Requirements

1. **Type Column Question**: Can the "Type" dropdown column be removed without database issues?
2. **Add Custom Events**: When adding a special row, allow users to create new event types inline from the dropdown

---

## Analysis: Type Column Removal

### Current Implementation
- **Location**: [TimeTableEditor.tsx:649-663](src/pages/masters/TimeTableEditor.tsx#L649-L663)
- **Purpose**: Allows switching between 'subject' rows and 'special' rows
- **Options**:
  - `subject` - Creates a row with subjects for each day
  - `special` - Creates a row with a single event spanning all days (Snacks, Lunch, etc.)

### Database Impact Assessment

**Answer: ❌ DO NOT REMOVE - It would break functionality, not cause direct database issues**

**Why it's needed:**
1. The backend expects `type: 'subject' | 'special'` in the timetable data structure
2. The `type` field determines how the backend interprets the row:
   - `type: 'subject'` → Row has `subjects: { Monday: 'id', Tuesday: 'id', ... }`
   - `type: 'special'` → Row has `label: 'SNACKS' | 'LUNCH' | 'DISPERSAL'`
3. Without the Type column, users can't:
   - Add new special event rows
   - Convert a subject row to special row (or vice versa)
   - Fix mistakes where they selected the wrong type

**Recommendation:**
Keep the Type column. It's essential for functionality and doesn't clutter the UI significantly.

---

## Feature: Inline Custom Event Creation

### Current Limitation
**File**: [TimeTableEditor.tsx:21-25](src/pages/masters/TimeTableEditor.tsx#L21-L25)

```typescript
const SPECIAL_LABELS = [
    { value: 'SNACKS', label: 'Snacks' },
    { value: 'LUNCH', label: 'Lunch' },
    { value: 'DISPERSAL', label: 'Dispersal' },
];
```

Currently hardcoded - users can only select from these 3 predefined events.

### Proposed Solution

Add a **"Create Custom Event"** option in the dropdown with an inline input field that:
1. Appears as the first option in the dropdown
2. Allows users to type a new event name
3. Automatically saves to the timetable when selected
4. Persists across timetable edits (stored in component state during edit session)

---

## Implementation Plan

### Phase 1: Add Custom Event State Management

**Location**: [TimeTableEditor.tsx:137-149](src/pages/masters/TimeTableEditor.tsx#L137-L149)

**Changes:**
1. Add state for custom events:
   ```typescript
   const [customEvents, setCustomEvents] = useState<Array<{value: string, label: string}>>([]);
   ```

2. Create combined event options:
   ```typescript
   const allSpecialLabels = useMemo(() => {
     return [...SPECIAL_LABELS, ...customEvents];
   }, [customEvents]);
   ```

3. Add helper to create new custom event:
   ```typescript
   const addCustomEvent = (eventName: string) => {
     const value = eventName.toUpperCase().replace(/\s+/g, '_');
     const newEvent = { value, label: eventName };
     setCustomEvents(prev => [...prev, newEvent]);
     return newEvent;
   };
   ```

### Phase 2: Create Creatable Select Component

**New Component**: `CreatableSpecialEventSelect`

**Features:**
- Built using `react-select/creatable` instead of regular `react-select`
- Shows existing options + ability to create new
- Validates input (no duplicates, reasonable length)
- Formats the value automatically (converts to UPPERCASE_WITH_UNDERSCORES)

**Usage:**
```typescript
import CreatableSelect from 'react-select/creatable';

<CreatableSelect
  options={allSpecialLabels}
  value={allSpecialLabels.find((opt) => opt.value === row.label) || null}
  onCreateOption={(inputValue) => {
    const newEvent = addCustomEvent(inputValue);
    handleRowChange(rowIdx, 'label', newEvent.value);
  }}
  onChange={(opt) => handleRowChange(rowIdx, 'label', opt ? opt.value : SPECIAL_LABELS[0].value)}
  placeholder="Select or create event..."
  formatCreateLabel={(inputValue) => `Create "${inputValue}"`}
  // ... other props
/>
```

### Phase 3: Update Special Row Dropdown

**Location**: [TimeTableEditor.tsx:629-646](src/pages/masters/TimeTableEditor.tsx#L629-L646)

**Before:**
```typescript
<Select
  options={SPECIAL_LABELS}
  value={SPECIAL_LABELS.find((opt) => opt.value === row.label) || null}
  onChange={(opt) => handleRowChange(rowIdx, 'label', opt ? opt.value : SPECIAL_LABELS[0].value)}
  // ...
/>
```

**After:**
```typescript
<CreatableSelect
  options={allSpecialLabels}
  value={allSpecialLabels.find((opt) => opt.value === row.label) || null}
  onCreateOption={(inputValue) => {
    const newEvent = addCustomEvent(inputValue);
    handleRowChange(rowIdx, 'label', newEvent.value);
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
```

### Phase 4: Persistence Strategy

**Option A: Session-Only (Simpler)**
- Custom events stored in component state
- Lost on page refresh
- Saved with the timetable in the `label` field

**Option B: Persist to Database (Better UX)**
- Store custom events in a new table `custom_timetable_events`
- Fetch on component mount
- Shared across all timetables in the school

**Recommendation**: Start with Option A, upgrade to Option B later if needed.

### Phase 5: Extract Custom Events from Existing Data

When loading a timetable, extract any labels not in the default list:

```typescript
useEffect(() => {
  if (frontendTimetableData) {
    // ... existing code ...

    // Extract custom events from loaded data
    const defaultValues = SPECIAL_LABELS.map(l => l.value);
    const extractedEvents: Array<{value: string, label: string}> = [];

    frontendTimetableData.timetable_data.forEach(item => {
      if (item.type === 'special' && item.label && !defaultValues.includes(item.label)) {
        const existing = extractedEvents.find(e => e.value === item.label);
        if (!existing) {
          extractedEvents.push({
            value: item.label,
            label: item.label.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
          });
        }
      }
    });

    setCustomEvents(extractedEvents);
  }
}, [frontendTimetableData]);
```

### Phase 6: Input Validation

Add validation for custom event names:

```typescript
const isValidEventName = (name: string): boolean => {
  if (!name || name.trim().length === 0) return false;
  if (name.length > 50) return false;
  if (!/^[a-zA-Z0-9\s]+$/.test(name)) return false; // Alphanumeric + spaces only
  return true;
};

const addCustomEvent = (eventName: string) => {
  const trimmed = eventName.trim();

  if (!isValidEventName(trimmed)) {
    toast.error('Event name must be 1-50 alphanumeric characters');
    return null;
  }

  const value = trimmed.toUpperCase().replace(/\s+/g, '_');

  // Check for duplicates
  const isDuplicate = [...SPECIAL_LABELS, ...customEvents].some(e => e.value === value);
  if (isDuplicate) {
    toast.error('This event already exists');
    return null;
  }

  const newEvent = { value, label: trimmed };
  setCustomEvents(prev => [...prev, newEvent]);
  toast.success(`Created custom event: ${trimmed}`);
  return newEvent;
};
```

---

## Implementation Todo List

### ✅ **Phase 1: Setup** (15 minutes)
- [ ] Add `customEvents` state to TimeTableEditor component
- [ ] Create `allSpecialLabels` memoized computed value
- [ ] Create `addCustomEvent` helper function with validation
- [ ] Create `isValidEventName` validation function

### ✅ **Phase 2: Install Dependencies** (2 minutes)
- [ ] Verify `react-select` is already installed (it is)
- [ ] Import `CreatableSelect` from `react-select/creatable`

### ✅ **Phase 3: Update Special Row Dropdown** (10 minutes)
- [ ] Replace `Select` with `CreatableSelect` at line 631
- [ ] Update `options` prop to use `allSpecialLabels`
- [ ] Add `onCreateOption` handler
- [ ] Add `formatCreateLabel` for better UX
- [ ] Update placeholder text

### ✅ **Phase 4: Extract Custom Events from Loaded Data** (15 minutes)
- [ ] Add logic in the `useEffect` (around line 204) to extract custom labels
- [ ] Filter out default labels (SNACKS, LUNCH, DISPERSAL)
- [ ] Convert values back to readable format (ASSEMBLY → Assembly)
- [ ] Update `customEvents` state

### ✅ **Phase 5: Display Custom Events in View Mode** (5 minutes)
- [ ] Update view mode rendering (line 642) to use `allSpecialLabels`
- [ ] Ensure custom events display correctly when not editing

### ✅ **Phase 6: Testing** (10 minutes)
- [ ] Test creating new custom event ("Assembly", "Break", "Prayer", etc.)
- [ ] Test saving timetable with custom events
- [ ] Test loading timetable with custom events
- [ ] Test validation (empty names, duplicates, special characters)
- [ ] Test that custom events persist during edit session
- [ ] Test export functionality includes custom events

### ✅ **Phase 7: Polish** (5 minutes)
- [ ] Add toast notifications for success/error
- [ ] Ensure proper styling matches existing UI
- [ ] Test keyboard navigation in CreatableSelect
- [ ] Verify z-index doesn't cause dropdown issues

---

## Files to Modify

1. **[TimeTableEditor.tsx](src/pages/masters/TimeTableEditor.tsx)** - Main implementation file
   - Lines 21-25: Update SPECIAL_LABELS constant (add comment explaining it's defaults)
   - Line 11: Add import for CreatableSelect
   - Lines 137-149: Add new state and functions
   - Line 204+: Add custom event extraction logic
   - Line 631-646: Replace Select with CreatableSelect

---

## Expected User Experience

### Before:
1. Click "Add Special Row"
2. Select from only 3 options: Snacks, Lunch, Dispersal
3. If you need "Assembly" or "Prayer" - tough luck!

### After:
1. Click "Add Special Row"
2. See dropdown with: Snacks, Lunch, Dispersal
3. **Type "Assembly"** in the search box
4. See option: **"Create 'Assembly'"**
5. Click it - Assembly is now added and selected
6. Assembly appears in the dropdown for future rows
7. Save timetable - Assembly is stored as `ASSEMBLY` in the label field
8. Next time you edit - Assembly is still available in the dropdown

---

## Database Impact

**No database schema changes required!**

Custom events are stored in the existing `label` field as strings. The backend already accepts any string value for `label` - it's not restricted to the 3 default options.

**Existing field:**
```typescript
{
  type: 'special',
  label: 'SNACKS' | 'LUNCH' | 'DISPERSAL' | 'ASSEMBLY' | 'PRAYER' | any_string
}
```

---

## Alternative Approaches Considered

### Approach 1: Modal Dialog for Custom Events
**Pros**: More control over validation, clearer UX
**Cons**: Extra click, slower workflow, more code

### Approach 2: Backend API for Custom Events
**Pros**: Shared across school, persistent storage
**Cons**: Requires backend changes, API calls, more complexity

### Approach 3: Inline Text Input
**Pros**: Simplest implementation
**Cons**: Poor UX, no dropdown to select existing events

**Selected**: CreatableSelect (inline creation) - Best balance of UX and simplicity

---

## Future Enhancements (Not in Current Scope)

1. **Persist to Database**: Store custom events in `custom_timetable_events` table
2. **School-Wide Events**: Share custom events across all classes/sections
3. **Event Icons**: Allow adding icons/colors to custom events
4. **Event Categories**: Group events (Academic, Non-Academic, Break, etc.)
5. **Bulk Import**: Import events from CSV
6. **Delete Custom Events**: UI to remove unused custom events

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| User creates too many events | Low | Add limit (max 20 custom events) |
| Duplicate events (ASSEMBLY vs Assembly) | Low | Normalize to UPPERCASE before comparison |
| Invalid characters in names | Low | Validation regex + error messages |
| Custom events lost on refresh | Medium | Extract from loaded timetable data |
| Backend rejects unknown labels | Low | Backend already accepts any string |

---

## Success Criteria

- [ ] Users can create custom special events inline
- [ ] Custom events persist when saving timetable
- [ ] Custom events reload when editing existing timetable
- [ ] Validation prevents invalid event names
- [ ] Toast notifications provide feedback
- [ ] No breaking changes to existing timetables
- [ ] Export (PNG/CSV/Excel) includes custom events correctly
- [ ] Type column remains functional

---

## Estimated Time

- **Development**: 45-60 minutes
- **Testing**: 15-20 minutes
- **Total**: ~1.5 hours

---

## Questions for Review

1. **Should we add a limit on custom events?** (Suggested: 20 max)
2. **Should we add ability to delete custom events?** (Nice to have, not critical)
3. **Should custom events be capitalized automatically?** (Suggested: Yes - "assembly" → "Assembly")
4. **Should we eventually persist to database?** (Future enhancement)

---

## Type Column - Final Recommendation

**DO NOT REMOVE THE TYPE COLUMN**

**Why:**
- Essential for distinguishing subject rows from special rows
- Required by backend data structure
- Only appears in edit mode (not cluttering view mode)
- Provides flexibility to fix mistakes
- Alternative would require separate "Add Subject" and "Add Special" buttons for every row edit

**If you still want to remove it:**
- You'd need to make rows immutable (can't change type after creation)
- Would need two separate add buttons (one for subject, one for special)
- More UI clutter, less flexibility
- Not recommended

---

## Ready to Implement?

Once you approve this plan, I'll implement the custom event creation feature in the following order:

1. Add state and helper functions
2. Import CreatableSelect
3. Replace dropdown in special rows
4. Add extraction logic for existing data
5. Add validation and error handling
6. Test thoroughly

**Estimated PR size**: ~100 lines changed in 1 file (TimeTableEditor.tsx)

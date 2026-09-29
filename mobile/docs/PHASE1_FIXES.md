# Phase 1 — Fix Broken Things

**Prepared for:** App Developer
**Scope:** 3 bug fixes in existing screens
**Status: ✅ COMPLETE (+ post-fix: time picker added)**

> **Before you start:** Apply each fix one at a time and test on device before moving to the next.
> The Communication tab fix is intentionally deferred to Phase 3 (the screen files must exist first).

---

## Fix List

| # | File | Problem | Risk |
| --- | --- | --- | --- |
| 1 | `src/api/exam.ts` | Hall ticket endpoint is `/generate` (old) — backend expects `/compute` | API call fails silently |
| 2 | `app/transport/route-stops.tsx` + type | `pickup_time` and `drop_time` fields missing from form and display | Stops saved without times |
| 3 | `app/transport/student-transport.tsx` + type | `pricing_id` missing; `stop_id` is a free-text input instead of dropdown; `is_active` field must be removed | Wrong data saved to backend |

---

## Fix 1 — Hall Ticket Endpoint: `/generate` → `/compute`

**File:** `src/api/exam.ts`

**Problem:** The backend renamed the compute endpoint. Calls to `/hall-tickets/generate` now return 404.

**What to find:** Look for `examHallTicketsApi` in `src/api/exam.ts`. Find the function that computes eligibility. It will contain a URL like `/hall-tickets/generate` or similar.

**Change:**
```ts
// ❌ OLD
POST /exams/{examId}/hall-tickets/generate

// ✅ NEW
POST /exams/{examId}/hall-tickets/compute
```

**Exact diff (find this line and replace):**
```ts
// Find the computeEligibility function and change the URL:

// BEFORE:
const response = await apiClient.post(`/exams/${examId}/hall-tickets/generate`);

// AFTER:
const response = await apiClient.post(`/exams/${examId}/hall-tickets/compute`);
```

> **Note:** If the function name is `generate` or `generateEligibility`, rename it to `computeEligibility` for clarity. The `hall-tickets.tsx` screen already calls it as `examHallTicketsApi.computeEligibility(selectedExamId)` — so the API function name must match.

**No UI changes needed.** `app/exam/hall-tickets.tsx` is already correct.

**Test:** Open Exam → Hall Tickets → select an exam → tap Compute. Should succeed (no 404/500).

---

## Fix 2 — Route Stops: Add `pickup_time` and `drop_time`

Two files need changes: the type definition and the screen.

### 2a — Update the `RouteStop` type

**File:** Wherever `RouteStop` is defined — likely `src/api/transport.ts` or `src/types/transport.ts`.

Find the `RouteStop` interface and add two fields:

```ts
export interface RouteStop {
  id: string;
  route_id: string;
  name: string;
  number: number;
  reaching_time: string;  // keep this — arrival time for the stop
  fees: number;
  is_active: boolean;
  // ADD THESE TWO:
  pickup_time?: string;   // morning pickup time e.g. "07:30:00"
  drop_time?: string;     // afternoon drop time e.g. "14:00:00"
  created_at?: string;
  updated_at?: string;
}
```

Also update `RouteStopCreateRequest` and `RouteStopUpdateRequest` if they exist separately:

```ts
export interface RouteStopCreateRequest {
  route_id: string;
  name: string;
  number: number;
  reaching_time: string;
  fees: number;
  is_active: boolean;
  pickup_time?: string;  // ADD
  drop_time?: string;    // ADD
}
```

### 2b — Update `app/transport/route-stops.tsx`

**Change 1 — Add fields to `formData` state (line ~28):**

```ts
// BEFORE:
const [formData, setFormData] = useState({
  route_id: '',
  name: '',
  number: 1,
  reaching_time: '07:00:00',
  fees: 0,
  is_active: true,
});

// AFTER:
const [formData, setFormData] = useState({
  route_id: '',
  name: '',
  number: 1,
  reaching_time: '07:00:00',
  pickup_time: '',      // ADD
  drop_time: '',        // ADD
  fees: 0,
  is_active: true,
});
```

**Change 2 — Populate fields in `handleEdit` (line ~80):**

```ts
// BEFORE:
const handleEdit = (stop: RouteStop) => {
  setEditingStop(stop);
  setFormData({
    route_id: stop.route_id,
    name: stop.name,
    number: stop.number,
    reaching_time: stop.reaching_time,
    fees: stop.fees,
    is_active: stop.is_active,
  });
  setIsModalVisible(true);
};

// AFTER:
const handleEdit = (stop: RouteStop) => {
  setEditingStop(stop);
  setFormData({
    route_id: stop.route_id,
    name: stop.name,
    number: stop.number,
    reaching_time: stop.reaching_time,
    pickup_time: stop.pickup_time ?? '',   // ADD
    drop_time: stop.drop_time ?? '',       // ADD
    fees: stop.fees,
    is_active: stop.is_active,
  });
  setIsModalVisible(true);
};
```

**Change 3 — Add form fields in the modal `<ScrollView>` after the Reaching Time row:**

```tsx
{/* ADD THIS BLOCK after the existing formRow with reaching_time and fees */}
<View style={styles.formRow}>
  <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
    <ThemedText style={styles.label}>Pickup Time</ThemedText>
    <TextInput
      style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
      placeholder="07:30:00"
      placeholderTextColor={colors['muted-foreground']}
      value={formData.pickup_time}
      onChangeText={(text) => setFormData(prev => ({ ...prev, pickup_time: text }))}
    />
  </View>
  <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
    <ThemedText style={styles.label}>Drop Time</ThemedText>
    <TextInput
      style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
      placeholder="14:00:00"
      placeholderTextColor={colors['muted-foreground']}
      value={formData.drop_time}
      onChangeText={(text) => setFormData(prev => ({ ...prev, drop_time: text }))}
    />
  </View>
</View>
```

**Change 4 — Show the times in the stop card (`renderRouteStopItem`):**

Find the detail rows section and add after the existing time row:

```tsx
{/* Existing row */}
<View style={styles.detailRow}>
  <Ionicons name="time" size={16} color={colors['muted-foreground']} />
  <ThemedText style={styles.detailText}>
    Stop #{item.number} • {item.reaching_time}
  </ThemedText>
</View>

{/* ADD THESE TWO */}
{item.pickup_time ? (
  <View style={styles.detailRow}>
    <Ionicons name="arrow-up-circle" size={16} color={colors['muted-foreground']} />
    <ThemedText style={styles.detailText}>
      Pickup: {item.pickup_time}
    </ThemedText>
  </View>
) : null}
{item.drop_time ? (
  <View style={styles.detailRow}>
    <Ionicons name="arrow-down-circle" size={16} color={colors['muted-foreground']} />
    <ThemedText style={styles.detailText}>
      Drop: {item.drop_time}
    </ThemedText>
  </View>
) : null}
```

**Test:** Open Transport → Route Stops → Add stop → fill pickup/drop time → save → check the card shows the times.

---

## Fix 3 — Student Transport: `pricing_id`, stop dropdown, remove `is_active`

Three sub-issues in this screen. Apply all three together.

### 3a — Update the `StudentTransport` type

**File:** `src/api/transport.ts` or `src/types/transport.ts` — wherever `StudentTransport` is defined.

```ts
export interface StudentTransport {
  id: string;
  student_id: string;
  route_id: string;
  stop_id: string;
  trip_type: string;
  academic_year_id: string;
  fare_amount: number;
  pricing_id?: string;        // ADD — links to transport pricing
  // REMOVE is_active — no DB column for this
  created_at?: string;
  updated_at?: string;
}

export interface StudentTransportCreateRequest {
  student_id: string;
  route_id: string;
  stop_id: string;
  trip_type: string;
  academic_year_id: string;
  fare_amount: number;
  pricing_id?: string;   // ADD
  // DO NOT include is_active
}

export interface StudentTransportUpdateRequest {
  student_id?: string;
  route_id?: string;
  stop_id?: string;
  trip_type?: string;
  academic_year_id?: string;
  fare_amount?: number;
  pricing_id?: string;   // ADD
  // DO NOT include is_active
}
```

### 3b — Update `app/transport/student-transport.tsx`

**Change 1 — Update `formData` state — remove `is_active`, add `pricing_id`:**

```ts
// BEFORE:
const [formData, setFormData] = useState({
  student_id: '',
  route_id: '',
  stop_id: '',
  trip_type: 'first trip',
  academic_year_id: '',
  fare_amount: 0,
  is_active: true,    // ← REMOVE
});

// AFTER:
const [formData, setFormData] = useState({
  student_id: '',
  route_id: '',
  stop_id: '',
  trip_type: 'first trip',
  academic_year_id: '',
  fare_amount: 0,
  pricing_id: '',     // ADD
});
```

**Change 2 — Update `handleEdit` — remove `is_active`, add `pricing_id`:**

```ts
// BEFORE:
const handleEdit = (transport: StudentTransport) => {
  setEditingTransport(transport);
  setFormData({
    student_id: transport.student_id,
    route_id: transport.route_id,
    stop_id: transport.stop_id,
    trip_type: transport.trip_type,
    academic_year_id: transport.academic_year_id,
    fare_amount: transport.fare_amount,
    is_active: transport.is_active,   // ← REMOVE
  });
  setIsModalVisible(true);
};

// AFTER:
const handleEdit = (transport: StudentTransport) => {
  setEditingTransport(transport);
  setFormData({
    student_id: transport.student_id,
    route_id: transport.route_id,
    stop_id: transport.stop_id,
    trip_type: transport.trip_type,
    academic_year_id: transport.academic_year_id,
    fare_amount: transport.fare_amount,
    pricing_id: transport.pricing_id ?? '',   // ADD
  });
  setIsModalVisible(true);
};
```

**Change 3 — Fix the `stop_id` input: replace the plain `TextInput` with a `CustomDropdown`.**

You need stop data filtered by the selected route. Add this hook call near the top of the component:

```ts
// ADD this import at the top of the file:
import { useRouteStops } from '../../hooks/use-transport';

// ADD this inside the component (after formData state):
const { data: routeStopsData } = useRouteStops({
  route_id: formData.route_id || undefined,
});
const stopOptions = (routeStopsData ?? []).map(s => ({
  label: `${s.name} (Stop #${s.number})`,
  value: s.id
}));
```

Then in the modal, replace the stop `TextInput` with a `CustomDropdown`:

```tsx
{/* BEFORE — plain text input for stop_id: */}
<View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
  <ThemedText style={styles.label}>Stop *</ThemedText>
  <TextInput
    style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
    placeholder="Enter stop ID"
    placeholderTextColor={colors['muted-foreground']}
    value={formData.stop_id}
    onChangeText={(text) => setFormData(prev => ({ ...prev, stop_id: text }))}
  />
</View>

{/* AFTER — dropdown showing stops for the selected route: */}
<View style={styles.formGroup}>
  <ThemedText style={styles.label}>Stop *</ThemedText>
  <CustomDropdown
    data={stopOptions}
    value={formData.stop_id}
    onChange={(value) => setFormData(prev => ({ ...prev, stop_id: value?.toString() || '' }))}
    placeholder={formData.route_id ? 'Select stop' : 'Select route first'}
  />
</View>
```

> **Note:** Remove the `formRow` wrapper around the stop field since it now takes full width. Move trip type to its own row.

**Change 4 — Remove the `is_active` checkbox from the modal form entirely.**

Find and delete this block:
```tsx
// DELETE this entire block:
<View style={styles.checkboxContainer}>
  <TouchableOpacity
    style={styles.checkbox}
    onPress={() => setFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
  >
    <Ionicons
      name={formData.is_active ? "checkbox" : "square-outline"}
      size={24}
      color={colors.primary}
    />
  </TouchableOpacity>
  <ThemedText style={styles.checkboxLabel}>Active</ThemedText>
</View>
```

**Change 5 — Remove `is_active` from card display.** Find the status badge in `renderTransportItem` and remove it:

```tsx
// REMOVE this status badge from the transport card:
<View style={[styles.statusBadge, { backgroundColor: item.is_active ? '#10B981' : '#EF4444' }]}>
  <ThemedText style={styles.statusText}>
    {item.is_active ? 'Active' : 'Inactive'}
  </ThemedText>
</View>
```

**Test:** Open Transport → Student Transport → tap Add → route dropdown populates → stop dropdown shows stops for selected route → save works without 500 error.

---

## Fix 4 — Communication Tab (⛔ DEFER TO PHASE 3)

**DO NOT apply this fix now.** The communication screen files (`app/communication/compose.tsx`, `templates.tsx`, `logs.tsx`) do not exist yet. Adding the tab entry to `TAB_CONFIGS` before the screens exist will crash the app when a user with communication permissions taps that tab.

**Apply in Phase 3** after the communication screens are built.

For reference, here is what to add to `TAB_CONFIGS` in `app/(tabs)/_layout.tsx` when the time comes:

```ts
// Add this entry to TAB_CONFIGS (after 'exam', before 'profile'):
{
  name: 'communication',
  moduleResources: ['communications', 'communication_templates', 'communication_logs'],
  requireAll: false,
},
```

---

## Checklist

- [x] Fix 1: Hall tickets endpoint updated in `src/api/exam.ts`
- [x] Fix 1: Tested — Compute button works without error
- [x] Fix 2a: `RouteStop` type updated with `pickup_time`, `drop_time`
- [x] Fix 2b: Route stops form shows pickup/drop time fields
- [x] Fix 2b: Route stop cards show pickup/drop times
- [x] Fix 2b: Time fields use native time picker (bottom sheet Modal) — NOT plain TextInput
- [x] Fix 2b: DateTimePicker rendered in separate top-level Modal (not nested inside form Modal) to avoid Android z-order bug
- [x] Fix 2b: Tested — save and display works
- [x] Fix 3a: `StudentTransport` type updated — `pricing_id` added, `is_active` removed
- [x] Fix 3b: Stop field is now a dropdown (not free text)
- [x] Fix 3b: Stop dropdown auto-clears when route changes (prevents stale stop_id)
- [x] Fix 3b: `is_active` checkbox removed from form
- [x] Fix 3b: `is_active` badge removed from card display
- [x] Fix 3b: Tested — create and edit works without 500 error
- [x] Fix 4: Skipped — will apply in Phase 3

---

---

## Post-Fix Notes

### DateTimePicker with React Native Modal (Android)

`@react-native-community/datetimepicker` fails to render when nested inside a React Native `Modal`. The native picker ends up behind the modal overlay regardless of z-order.

**Pattern that works:** Render the `DateTimePicker` in its **own separate Modal** at the root component level, not inside any other Modal:

```tsx
return (
  <>
    <AppLayout>
      {/* ... */}
      <Modal visible={isFormOpen}>  {/* form modal — NO DateTimePicker here */}
      </Modal>
    </AppLayout>

    {/* Time picker Modal — completely independent, top-level */}
    <Modal visible={showTimePicker} animationType="slide" transparent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor, borderTopRadius }}>
          <DateTimePicker display="spinner" mode="time" ... />
        </View>
      </View>
    </Modal>
  </>
);
```

**Platform split (final working pattern):**

- **Android** — `display="default"`, no wrapper Modal needed. Renders as a native system clock dialog; auto-commits and dismisses when user taps OK.
- **iOS** — `display="spinner"`, wrapped in a separate `<Modal>` bottom-sheet with Cancel/Done buttons. Inline spinner wheels; commits only when Done is tapped.

`display="spinner"` on Android does NOT render visible content without explicit height — always use `"default"` on Android.

TypeScript `type` aliases must be at **module scope** (not inside the function body) — Metro Babel throws a syntax error otherwise.

Last updated: March 2026

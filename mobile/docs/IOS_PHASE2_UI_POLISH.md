# iOS Phase 2 — UI & UX Polish

**Status: ⏳ Pending**
**Goal:** Make every screen feel native on iOS — correct modals, pickers, gestures, and safe area handling.
**Depends on:** Phase 1 complete

---

## 2.1 — Date/Time Picker: iOS Spinner Mode

All date pickers already use `display={Platform.OS === 'ios' ? 'spinner' : 'default'}` ✅

However, on iOS the `spinner` mode renders **inline** by default unless wrapped in a modal. Verify each picker screen:

### Files to check:
- `app/students/admission.tsx`
- `app/staff/enrollment.tsx`
- `app/fees/terms.tsx`
- `app/masters/timetable.tsx`
- `app/transport/route-stops.tsx`

### Pattern to use on iOS (picker in a bottom sheet):
```tsx
{Platform.OS === 'ios' && showDatePicker && (
  <Modal transparent animationType="slide">
    <View style={styles.iosPickerBackdrop}>
      <View style={[styles.iosPickerContainer, { backgroundColor: colors.card }]}>
        <View style={styles.iosPickerHeader}>
          <TouchableOpacity onPress={() => setShowDatePicker(false)}>
            <Text style={{ color: '#EF4444', fontWeight: '600' }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowDatePicker(false)}>
            <Text style={{ color: '#556ee6', fontWeight: '600' }}>Done</Text>
          </TouchableOpacity>
        </View>
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="spinner"
          onChange={onDateChange}
          textColor={colors.foreground}
        />
      </View>
    </View>
  </Modal>
)}

{Platform.OS === 'android' && showDatePicker && (
  <DateTimePicker
    value={selectedDate}
    mode="date"
    display="default"
    onChange={onDateChange}
  />
)}
```

Add these styles:
```ts
iosPickerBackdrop: {
  flex: 1,
  justifyContent: 'flex-end',
  backgroundColor: 'rgba(0,0,0,0.4)',
},
iosPickerContainer: {
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  paddingBottom: 34, // safe area bottom
},
iosPickerHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  paddingHorizontal: 20,
  paddingVertical: 14,
  borderBottomWidth: 1,
  borderBottomColor: 'rgba(0,0,0,0.1)',
},
```

---

## 2.2 — Modal Presentation Style

React Native modals on iOS default to `pageSheet` (slides up from bottom). Ensure all modals in the app explicitly set `presentationStyle`.

### Files with `<Modal>` components:

Search for `<Modal` in: `app/`, `components/`

For full-screen modals (create/edit forms):
```tsx
<Modal
  visible={modalVisible}
  animationType="slide"
  presentationStyle="pageSheet"  // ← add this for iOS sheet feel
>
```

For picker/confirmation modals:
```tsx
<Modal
  visible={pickerVisible}
  animationType="fade"
  transparent={true}
  presentationStyle="overFullScreen"  // ← needed for transparent modals
>
```

> `presentationStyle` is iOS-only. Android ignores it. Safe to add to all modals.

---

## 2.3 — Back Navigation: iOS Swipe Gesture

The app uses `AppHeader` with no back button — relies on Android back gesture. On iOS, users expect a **left-edge swipe** to go back.

### Check expo-router navigation config:

In `app/_layout.tsx`, the Stack navigator should have `gestureEnabled: true` (default):

```tsx
<Stack
  screenOptions={{
    headerShown: false,
    gestureEnabled: true,          // ← enables iOS swipe-back (default true)
    gestureDirection: 'horizontal', // ← default
    animation: 'slide_from_right',
  }}
/>
```

> ⚠️ If `gestureEnabled: false` is set anywhere, iOS users cannot swipe back. Remove it unless the screen intentionally prevents back navigation (e.g., login screen after logout).

### Screens that should block back swipe:
- `app/login.tsx` — user must not swipe back after logout

Add to login stack entry:
```tsx
<Stack.Screen name="login" options={{ gestureEnabled: false }} />
```

---

## 2.4 — Scroll View Bounce

On iOS, `ScrollView` bounces by default (elastic overscroll). This is expected iOS behavior — do NOT disable it. Verify no screens have `bounces={false}` unless intentional.

Exception: Horizontal carousels/pagers — `bounces={false}` is acceptable there.

---

## 2.5 — TextField Cursor Color

On iOS, the cursor in `TextInput` uses the app's accent color. Set it globally:

**File:** `app/_layout.tsx` or a global style override

```tsx
// In the root stylesheet or per-input
<TextInput
  selectionColor="#556ee6"   // cursor + selection highlight color
  cursorColor="#556ee6"      // Android cursor color
/>
```

To apply globally, wrap in a custom `ThemedInput` component:

**File:** `components/ui/ThemedInput.tsx` (create new)
```tsx
import React from 'react';
import { TextInput, TextInputProps } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

export function ThemedInput(props: TextInputProps) {
  const { colors } = useTheme();
  return (
    <TextInput
      selectionColor="#556ee6"
      cursorColor="#556ee6"
      placeholderTextColor={colors['muted-foreground']}
      {...props}
    />
  );
}
```

---

## 2.6 — Action Sheet (iOS) vs Alert (Android)

For destructive actions (delete, logout confirmations), iOS expects `ActionSheet` style while Android uses `Alert.alert`. Currently the app uses `Alert.alert` everywhere.

This is acceptable — `Alert.alert` works on both platforms. No change required for Phase 2.

Optional improvement (Phase 3+): Use `@expo/react-native-action-sheet` for iOS-native destructive confirmation sheets.

---

## 2.7 — Keyboard Type: `email-address` and `phone-pad`

Verify all email and phone inputs use platform-correct keyboard types:

```tsx
// Email fields
<TextInput keyboardType="email-address" autoCapitalize="none" />

// Phone fields
<TextInput keyboardType="phone-pad" />

// Numeric fields (no decimal)
<TextInput keyboardType="number-pad" />  // better than "numeric" on iOS (no +/- sign)

// Decimal fields (salary, fees)
<TextInput keyboardType="decimal-pad" />
```

Files to audit:
- `app/students/admission.tsx` — email, phone, aadhar fields
- `app/staff/enrollment.tsx` — email, phone, salary fields
- `app/fees/terms.tsx` — amount fields
- `app/expense/transactions/create.tsx` — amount fields

---

## 2.8 — Tab Bar Appearance on iOS

The current tab bar uses `AppFooter` (custom) not `expo-router`'s default tab bar. Verify it respects iOS home indicator safe area.

**File:** `components/AppFooter.tsx`

Already uses `<SafeAreaView edges={['bottom']}>` ✅

Verify the tab bar height is not too short on iOS (home indicator takes ~34px at bottom):
```tsx
// AppFooter should add safe area bottom automatically via SafeAreaView edges={['bottom']}
// Do NOT add manual paddingBottom on top of SafeAreaView
```

---

## Testing Checklist (Phase 2)

- [ ] Date pickers open as bottom sheet on iOS (Cancel/Done buttons visible)
- [ ] Date pickers on Android open as native calendar dialog (unchanged)
- [ ] Swipe left from screen edge navigates back on all sub-screens
- [ ] Login screen does NOT allow swipe-back after logout
- [ ] Scroll views bounce naturally on iOS
- [ ] Email fields open email keyboard (@ key visible) on iOS
- [ ] Phone fields open numeric keyboard on iOS
- [ ] Amount/fee fields open decimal keyboard on iOS
- [ ] Tab bar bottom is not clipped by iOS home indicator

---

Last updated: March 2026
